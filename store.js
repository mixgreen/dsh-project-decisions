import { createHash, randomUUID } from 'node:crypto';
import { lstat, readFile, writeFile, rename, unlink, realpath } from 'node:fs/promises';
import { join } from 'node:path';

export const FILE_NAME = 'PROJECT_DECISIONS.md';
export const COLUMNS = [['pending', '待定事项'], ['confirmed', '已确认共识']];
// Rows: [id, title, Markdown body, status]. No second persistent index.
export function fail(code, message) {
  return Object.assign(new Error(message), { code });
}
export function version(text) {
  return text === null ? 'missing' : createHash('sha256').update(text).digest('hex');
}

export function parse(text) {
  const rows = [];
  const seen = new Set();
  const sections = new Set();
  let status, current, fence;
  let header = false;
  const finish = () => {
    if (current) rows.push([current[0], current[1], current[2].join('\n').trim(), status]);
    current = undefined;
  };
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      current[2].push(line);
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
      continue;
    }
    if (marker && current) {
      fence = marker[1];
      current[2].push(line);
      continue;
    }
    if (!header && line === '# 项目决议') { header = true; continue; }
    const column = COLUMNS.find(([, label]) => line === `## ${label}`);
    if (column) {
      finish();
      if (!header || sections.has(column[0])) throw fail('FORMAT', '决议文档分区重复或缺少「# 项目决议」。');
      status = column[0];
      sections.add(status);
      continue;
    }
    const heading = line.match(/^### \[(d-[a-zA-Z0-9-]+)\] (.+)$/);
    if (heading) {
      finish();
      if (!status || seen.has(heading[1])) throw fail('FORMAT', '决议 ID 重复或条目不在分区内。');
      seen.add(heading[1]);
      current = [heading[1], heading[2], []];
      continue;
    }
    if (current) current[2].push(line);
    else if (line.trim()) throw fail('FORMAT', '文档格式不匹配；原文未修改。请使用「# 项目决议」、两个状态分区和「### [d-ID] 标题」。');
  }
  finish();
  if (!header || sections.size !== 2 || fence) throw fail('FORMAT', '决议文档缺少状态分区，或 Markdown 代码块未闭合。');
  return rows;
}

export function serialize(rows) {
  return '# 项目决议\n\n' + COLUMNS.map(([status, label]) =>
    `## ${label}\n\n` + rows.filter(row => row[3] === status).map(([id, title, body]) =>
      `### [${id}] ${title}\n\n${body.trim()}\n\n`).join('')).join('').trimEnd() + '\n';
}

function normalizedRow(id, title, body, status) {
  if (!title.trim() || /[\r\n]/.test(title)) throw fail('FORMAT', '标题须为非空单行文本。');
  if (!COLUMNS.some(([key]) => key === status)) throw fail('FORMAT', '未知决议状态。');
  const row = [id, title.trim(), body.trim(), status];
  const parsed = parse(serialize([row]));
  if (parsed.length !== 1 || JSON.stringify(parsed[0]) !== JSON.stringify(row)) {
    throw fail('FORMAT', '正文含有保留的分区或条目标题；请放入代码块。');
  }
  return row;
}

export class DecisionStore {
  queues = new Map();

  async read(root) {
    const path = join(await realpath(root), FILE_NAME);
    let text;
    try {
      if ((await lstat(path)).isSymbolicLink()) throw fail('PATH', '决议文件不能是符号链接。');
      text = await readFile(path, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      text = null;
    }
    return { path, version: version(text), exists: text !== null, rows: text === null ? [] : parse(text) };
  }

  async mutate(root, input, canCreate = false) {
    const canonical = await realpath(root);
    const previous = this.queues.get(canonical) ?? Promise.resolve();
    const operation = previous.catch(() => {}).then(() => this.commit(canonical, input, canCreate));
    this.queues.set(canonical, operation);
    try { return await operation; }
    finally { if (this.queues.get(canonical) === operation) this.queues.delete(canonical); }
  }

  async commit(root, input, canCreate) {
    const before = await this.read(root);
    if (input.version !== before.version) throw fail('CONFLICT', '文档已被修改。请刷新并比较最新内容，再重新保存；当前编辑内容仍保留。');
    const rows = before.rows.map(row => [...row]);
    if (input.action === 'create') {
      if (!canCreate) throw fail('USER_ONLY', '只有用户能在面板中新增决议。');
      rows.push(normalizedRow(`d-${randomUUID()}`, input.title, input.body ?? '', 'pending'));
    } else if (input.action === 'update') {
      const index = rows.findIndex(row => row[0] === input.id);
      if (index < 0) throw fail('NOT_FOUND', '找不到该决议；修改不会创建新条目。');
      const row = rows[index];
      rows[index] = normalizedRow(row[0], input.title ?? row[1], input.body ?? row[2], input.status ?? row[3]);
    } else throw fail('ACTION', '不支持的操作。');
    const text = serialize(rows);
    const temporary = `${before.path}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, text, { flag: 'wx' });
      if ((await this.read(root)).version !== before.version) throw fail('CONFLICT', '保存前文件发生变化，请刷新后重试。');
      // Both paths are constructed from the canonical project root and fixed filename.
      await rename(temporary, before.path);
    } finally {
      await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
    return { path: before.path, version: version(text), exists: true, rows: parse(text) };
  }
}
