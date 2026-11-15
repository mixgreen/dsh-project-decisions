import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, unlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apply, workspaceFor, requireWrite } from '../host.js';
import { serialize, FILE_NAME } from '../store.js';

function scope() {
  const handlers = new Map(), effects = [];
  return {
    handlers,
    get(key) { return this[key]; },
    effect(fn) { const dispose = fn(); effects.push(dispose); return dispose; },
    on(name, fn) { handlers.set(name, fn); const off = () => handlers.delete(name); effects.push(off); return off; },
    dispose() { for (const dispose of effects.reverse()) dispose?.(); },
  };
}
async function setup(t) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'dsh-prd-host-')));
  t.after(() => rm(root, { recursive: true }));
  const agent = { id: 'a', session: { header: { cwd: root } }, ctx: scope(), messages: [], inject(item) { this.messages.push(item); } };
  const workspace = { id: 'w', path: root, title: '测试项目', sessionIds: ['a'] };
  const ctx = Object.assign(scope(), {
    workspaceRegistry: { list: () => [workspace], get: id => id === 'w' ? workspace : undefined },
    agents: { list: () => [agent] },
    planMode: { get: () => ({ active: false }) },
    sandboxPolicy: { resolve: () => ({ mode: 'workspace-write', workspaceRoot: root }) },
    definitions: [], routes: [],
  });
  ctx.tools = { register: definition => { ctx.definitions.push(definition); } };
  ctx.connection = { fetch: { register: route => { ctx.routes.push(route); } } };
  apply(ctx);
  await agent.ctx.handlers.get('agent/pre-step')({}, async () => ({ kind: 'enter', messages: [], startsRequestSeries: true }));
  t.after(() => ctx.dispose());
  return { root, ctx, agent, workspace };
}
const call = (ctx, name, agent, args = {}) => ctx.definitions.find(d => d.name === name).execute(args, { agent });
async function ui(ctx, input) {
  const route = ctx.routes[0];
  const response = await route.fetch(new Request('http://localhost/api/project-decisions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'a', ...input }) }));
  return [response.status, await response.json()];
}

test('only two tools; UI creates and agent updates the identical document', async t => {
  const { ctx, agent } = await setup(t);
  assert.deepEqual(ctx.definitions.map(d => d.name), ['prd_read', 'prd_update']);
  const [status, created] = await ui(ctx, { action: 'create', version: 'missing', title: '人工事项', body: '待讨论' });
  assert.equal(status, 200);
  const { project, ...document } = created;
  assert.equal(project[0], 'w');
  assert.deepEqual(await call(ctx, 'prd_read', agent), document);
  const updated = await call(ctx, 'prd_update', agent, { id: created.rows[0][0], version: created.version, status: 'confirmed' });
  assert.equal(updated.rows[0][3], 'confirmed');
  const [conflict] = await ui(ctx, { action: 'update', id: created.rows[0][0], version: created.version, title: 'stale' });
  assert.equal(conflict, 409);
  await assert.rejects(call(ctx, 'prd_update', agent, { id: 'd-missing', version: updated.version }), { code: 'NOT_FOUND' });
});

test('agent write honors plan, read-only and workspace boundaries', async t => {
  const { ctx, agent, root } = await setup(t);
  ctx.planMode.get = () => ({ active: true });
  await assert.rejects(requireWrite(ctx, agent, root), { code: 'READ_ONLY' });
  ctx.planMode.get = () => ({ active: false, pending: true });
  await assert.rejects(requireWrite(ctx, agent, root), { code: 'READ_ONLY' });
  ctx.planMode.get = () => ({ active: false });
  ctx.sandboxPolicy.resolve = () => ({ mode: 'read-only', workspaceRoot: root });
  await assert.rejects(requireWrite(ctx, agent, root), { code: 'READ_ONLY' });
  ctx.sandboxPolicy.resolve = () => ({ mode: 'workspace-write', workspaceRoot: root });
  await assert.rejects(requireWrite(ctx, agent, '/another-project'), { code: 'READ_ONLY' });
  await requireWrite(ctx, agent, root);
});

test('context is deduplicated, preserves downstream fields, observes external edits and missing files', async t => {
  const { ctx, agent, root } = await setup(t);
  const boundary = agent.ctx.handlers.get('agent/pre-step');
  const next = async () => ({ kind: 'enter', messages: [], startsRequestSeries: true });
  assert.equal(agent.messages.length, 1);
  assert.match(agent.messages[0].content[0].text, /尚不存在/);
  assert.equal((await boundary({}, next)).messages.length, 0);
  await writeFile(join(root, FILE_NAME), serialize([['d-one', '问题', '内容', 'pending'], ['d-two', '共识', '结论', 'confirmed']]));
  const decision = await boundary({}, next);
  assert.equal(decision.startsRequestSeries, true);
  assert.equal(decision.messages.length, 1);
  assert.match(decision.messages[0].content[0].text, /待定事项/);
  assert.match(decision.messages[0].content[0].text, /已确认共识/);
  assert.equal((await boundary({}, next)).messages.length, 0);
  await unlink(join(root, FILE_NAME)); // Exact file created by this test above.
  assert.match((await boundary({}, next)).messages[0].content[0].text, /旧快照/);
  await writeFile(join(root, FILE_NAME), 'broken');
  assert.match((await boundary({}, next)).messages[0].content[0].text, /当前决议不可用/);
  ctx.dispose();
  assert.equal(agent.ctx.handlers.has('agent/pre-step'), false);
});

test('registered project identity does not follow temporary cwd; projects remain separate', () => {
  const first = { id: 'one', path: '/one', sessionIds: ['a'] };
  const second = { id: 'two', path: '/two', sessionIds: ['b'] };
  const registry = { list: () => [first, second] };
  assert.equal(workspaceFor(registry, { id: 'a', session: { header: { cwd: '/two' } } }), first);
  assert.equal(workspaceFor(registry, { id: 'new', session: { header: { cwd: '/two/sub' } } }), second);
  assert.equal(workspaceFor(registry, { id: 'new', session: { header: { cwd: '/two-other' } } }), undefined);
});

test('session view and agent agree on cwd fallback without listing other projects', async t => {
  const { ctx, agent, workspace } = await setup(t);
  workspace.sessionIds = [];
  const response = await ctx.routes[0].fetch(new Request(`http://localhost/api/project-decisions?sessionId=${agent.id}`));
  const value = await response.json();
  assert.deepEqual(value.project, [workspace.id, workspace.title, workspace.path]);
  assert.equal('projects' in value, false);
});

test('sessions in one project share decisions; another project stays separate', async t => {
  const { ctx, workspace } = await setup(t);
  const otherRoot = await realpath(await mkdtemp(join(tmpdir(), 'dsh-prd-project-b-')));
  t.after(() => rm(otherRoot, { recursive: true }));
  const other = { id: 'other', title: '另一个项目', path: otherRoot, sessionIds: ['b'] };
  workspace.sessionIds.push('a2');
  ctx.workspaceRegistry.list = () => [workspace, other];
  const [status, first] = await ui(ctx, { workspaceId: 'other', action: 'create', version: 'missing', title: '项目 A 决议' });
  assert.equal(status, 200);
  assert.equal(first.project[0], 'w');
  const readSession = async id => (await ctx.routes[0].fetch(new Request(`http://localhost/api/project-decisions?sessionId=${id}`))).json();
  assert.deepEqual((await readSession('a2')).rows, first.rows);
  const second = await readSession('b');
  assert.equal(second.project[0], 'other');
  assert.deepEqual(second.rows, []);
  assert.equal(second.exists, false);
  const [missingSession] = await ui(ctx, { sessionId: undefined, workspaceId: 'w', action: 'create', version: first.version, title: '不允许从全局写入' });
  assert.equal(missingSession, 400);
});

test('agent-scoped plan service takes precedence over Host fallback', async t => {
  const { ctx, agent, root } = await setup(t);
  agent.ctx.planMode = { get: () => ({ active: true }) };
  await assert.rejects(requireWrite(ctx, agent, root), { code: 'READ_ONLY' });
});

test('new agent receives initial context and unknown project does not write', async t => {
  const { ctx, root } = await setup(t);
  const newAgent = { id: 'new', ctx: scope(), session: { header: { cwd: root } }, messages: [], inject(item) { this.messages.push(item); } };
  await ctx.handlers.get('agent/created')({ agent: newAgent });
  assert.equal(newAgent.messages.length, 1);
  const [status] = await ui(ctx, { sessionId: 'missing', action: 'create', version: 'missing', title: 'x' });
  assert.equal(status, 400);
});
