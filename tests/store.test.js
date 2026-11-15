import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, readdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DecisionStore, FILE_NAME, parse, serialize } from '../store.js';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-prd-test-'));
  t.after(() => rm(root, { recursive: true })); // Only this test's freshly allocated temporary directory.
  return [root, new DecisionStore()];
}

test('Markdown round trip preserves Chinese, lists, headings and fenced markers', () => {
  const body = '背景\n\n- 甲\n- 乙\n\n### 子标题\n\n```md\n## 已确认共识\n### [d-fake] 示例\n```';
  const rows = [['d-one', '中文标题', body, 'pending'], ['d-two', '结论', '', 'confirmed']];
  assert.deepEqual(parse(serialize(rows)), rows);
  assert.deepEqual(parse(serialize([])), []);
  assert.deepEqual(parse(serialize(rows).replace(/\n/g, '\r\n')), rows);
});

test('rejects unknown documents, duplicate IDs and unclosed code fences', () => {
  assert.throws(() => parse('# Existing PRD\nhello'), { code: 'FORMAT' });
  assert.throws(() => parse(serialize([['d-x', 'a', '', 'pending'], ['d-x', 'b', '', 'confirmed']])), { code: 'FORMAT' });
  assert.throws(() => parse('# 项目决议\n\n## 待定事项\n\n### [d-x] a\n```\n## 已确认共识'), { code: 'FORMAT' });
});

test('read is side-effect free; human create, update and move survive a fresh store', async t => {
  const [root, store] = await fixture(t);
  const empty = await store.read(root);
  assert.equal(empty.exists, false);
  assert.deepEqual(await readdir(root), []);
  const created = await store.mutate(root, { action: 'create', version: empty.version, title: '选型', body: '比较两种方案' }, true);
  const id = created.rows[0][0];
  assert.match(id, /^d-/);
  const edited = await store.mutate(root, { action: 'update', version: created.version, id, body: '采用 A', status: 'confirmed' });
  assert.deepEqual(edited.rows, [[id, '选型', '采用 A', 'confirmed']]);
  assert.deepEqual(await new DecisionStore().read(root), edited);
  const reopened = await store.mutate(root, { action: 'update', version: edited.version, id, status: 'pending' });
  assert.equal(reopened.rows[0][0], id);
  assert.equal(reopened.rows[0][3], 'pending');
  assert.deepEqual(await readdir(root), [FILE_NAME]);
});

test('agent cannot create, upsert, inject a second row through body or alter the ID', async t => {
  const [root, store] = await fixture(t);
  await assert.rejects(store.mutate(root, { action: 'create', version: 'missing', title: 'AI' }), { code: 'USER_ONLY' });
  await assert.rejects(store.mutate(root, { action: 'update', version: 'missing', id: 'd-unknown' }), { code: 'NOT_FOUND' });
  const first = await store.mutate(root, { action: 'create', version: 'missing', title: 'Human' }, true);
  await assert.rejects(store.mutate(root, { action: 'update', version: first.version, id: first.rows[0][0], body: 'text\n\n### [d-injected] another\n\nbody' }), { code: 'FORMAT' });
  assert.deepEqual(await store.read(root), first);
});

test('concurrent writes detect conflict; external edits are never silently normalized away', async t => {
  const [root, store] = await fixture(t);
  const results = await Promise.allSettled(['A', 'B'].map(title => store.mutate(root, { action: 'create', version: 'missing', title }, true)));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.code, 'CONFLICT');
  const first = await store.read(root);
  await writeFile(join(root, FILE_NAME), '# A pre-existing document\n');
  await assert.rejects(store.mutate(root, { action: 'update', id: first.rows[0][0], version: first.version, body: 'replace' }), { code: 'FORMAT' });
  assert.equal(await readFile(join(root, FILE_NAME), 'utf8'), '# A pre-existing document\n');
});

test('symlink and failed target directory do not produce false success', async t => {
  const [root, store] = await fixture(t);
  await writeFile(join(root, 'other.md'), 'untouched');
  await symlink(join(root, 'other.md'), join(root, FILE_NAME));
  await assert.rejects(store.read(root), { code: 'PATH' });
  await assert.rejects(store.mutate(join(root, 'missing-directory'), { action: 'create', version: 'missing', title: 'No' }, true));
  assert.equal(await readFile(join(root, 'other.md'), 'utf8'), 'untouched');
});
