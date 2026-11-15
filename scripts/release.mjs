import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = name => readFile(join(root, name), 'utf8');
const json = async name => JSON.parse(await read(name));
const run = (command, args, cwd = root) => execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const npm = args => process.env.npm_execpath
  ? run(process.execPath, [process.env.npm_execpath, ...args])
  : run('npm', args);

export function nextVersion(current, bump) {
  assert.match(current, /^\d+\.\d+\.\d+$/);
  const index = ['major', 'minor', 'patch'].indexOf(bump);
  assert.ok(index >= 0, 'Choose major, minor, or patch.');
  const parts = current.split('.').map(Number);
  parts[index]++;
  parts.fill(0, index + 1);
  return parts.join('.');
}

export function notesFor(changelog, version) {
  const heading = `## [${version}] - `;
  const start = changelog.indexOf(heading);
  assert.ok(start >= 0, `CHANGELOG.md is missing ${version}.`);
  const end = changelog.indexOf('\n## [', start + heading.length);
  const section = changelog.slice(start, end < 0 ? undefined : end).trim();
  const newline = section.indexOf('\n');
  assert.ok(newline >= 0 && section.slice(newline + 1).trim(), 'Release notes must not be empty.');
  return section + '\n';
}

export function prepareChangelog(text, version, date) {
  const marker = '## [Unreleased]';
  const start = text.indexOf(marker);
  assert.ok(start >= 0, 'Add an Unreleased section first.');
  const end = text.indexOf('\n## [', start + marker.length);
  const pending = text.slice(start + marker.length, end < 0 ? undefined : end).trim();
  assert.match(pending, /^- .+/m, 'Write user-facing Unreleased notes before preparing a version.');
  assert.ok(!text.includes(`## [${version}]`), 'That changelog version already exists.');
  return text.slice(0, start) + `${marker}\n\n## [${version}] - ${date}\n\n${pending}\n`
    + (end < 0 ? '' : text.slice(end));
}

export function checkVersion(pkg, lock, changelog, tag) {
  assert.equal(lock.version, pkg.version, 'Lockfile version differs.');
  assert.equal(lock.packages[''].version, pkg.version, 'Lockfile root version differs.');
  assert.equal(lock.name, pkg.name, 'Lockfile name differs.');
  if (tag) assert.equal(tag, `v${pkg.version}`, 'Tag must match package.json version.');
  return notesFor(changelog, pkg.version);
}

async function check(tag) {
  const pkg = await json('package.json');
  const notes = checkVersion(pkg, await json('package-lock.json'), await read('CHANGELOG.md'), tag);
  const patch = await read(pkg.dsh.bundle.patch);
  assert.ok(patch.includes(`name: '${pkg.name}'`), 'DSH patch package name differs.');
  for (const file of pkg.files) await read(file);
  console.log(`Release metadata OK: ${pkg.name}@${pkg.version}`);
  return { pkg, notes };
}

async function prepare(bump) {
  assert.equal(run('git', ['status', '--porcelain']).trim(), '', 'Commit code and Unreleased notes before preparing a release.');
  const pkg = await json('package.json');
  const lock = await json('package-lock.json');
  const changelog = await read('CHANGELOG.md');
  checkVersion(pkg, lock, changelog);
  const version = nextVersion(pkg.version, bump);
  assert.equal(run('git', ['tag', '--list', `v${version}`]).trim(), '', 'The target tag already exists.');
  const updatedLog = prepareChangelog(changelog, version, new Date().toISOString().slice(0, 10));
  pkg.version = version;
  lock.version = lock.packages[''].version = version;
  for (const [name, value] of [['package.json', pkg], ['package-lock.json', lock]]) {
    await writeFile(join(root, name), JSON.stringify(value, null, 2) + '\n');
  }
  await writeFile(join(root, 'CHANGELOG.md'), updatedLog);
  console.log(`Prepared ${version}. No commit, tag, push, or publication was performed.\nNext: npm run release:pack; review git diff; commit; create v${version} tag.`);
}

async function pack() {
  process.stdout.write(npm(['run', 'verify']));
  const { pkg, notes } = await check();
  const dist = join(root, 'dist', `v${pkg.version}`);
  await mkdir(dist, { recursive: true });
  const [packed] = JSON.parse(npm(['pack', '--ignore-scripts', '--json', '--pack-destination', dist]));
  const expected = ['package.json', ...pkg.files].sort();
  assert.deepEqual(packed.files.map(item => item.path).sort(), expected, 'Unexpected or missing files in npm package.');
  const archive = join(dist, packed.filename);
  const members = run('tar', ['-tzf', archive]).trim().split('\n').map(name => name.replace(/^package\//, '')).sort();
  assert.deepEqual(members, expected, 'Tarball contents differ from the release allowlist.');

  const temporary = await mkdtemp(join(tmpdir(), 'dsh-prd-package-'));
  try {
    run('tar', ['-xzf', archive, '-C', temporary]);
    const unpacked = join(temporary, 'package');
    for (const file of ['host.js', 'store.js', 'client.js']) run(process.execPath, ['--check', join(unpacked, file)]);
    const host = await import(pathToFileURL(join(unpacked, 'host.js')));
    const store = await import(pathToFileURL(join(unpacked, 'store.js')));
    assert.equal(typeof host.apply, 'function');
    const rows = [['d-package', 'Package smoke test', 'No project files are written.', 'pending']];
    assert.deepEqual(store.parse(store.serialize(rows)), rows);
    // Resolve the installed package exports in an isolated consumer, not the development checkout.
    const consumer = join(temporary, 'consumer');
    await mkdir(consumer);
    process.stdout.write(npmInstall(consumer, archive));
    run(process.execPath, ['--input-type=module', '-e', `import { apply } from '${pkg.name}'; import { readFile } from 'node:fs/promises'; if(typeof apply !== 'function') throw Error('Missing Host export'); for(const name of ['client','icon','locale/en.json','locale/zh.json']) await readFile(new URL(import.meta.resolve('${pkg.name}/'+name)));`], consumer);
  } finally {
    // Only remove the exact temporary directory created by this invocation above.
    assert.equal(dirname(temporary), tmpdir());
    assert.ok(temporary.startsWith(join(tmpdir(), 'dsh-prd-package-')));
    await rm(temporary, { recursive: true });
  }
  const digest = createHash('sha256').update(await readFile(archive)).digest('hex');
  await writeFile(join(dist, 'SHA256SUMS'), `${digest}  ${packed.filename}\n`);
  await writeFile(join(dist, 'release-notes.md'), notes);
  console.log(`Verified package: dist/v${pkg.version}/${packed.filename}\nSHA-256: ${digest}\nNo remote publication performed.`);
}

function npmInstall(cwd, archive) {
  const args = ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', archive];
  return process.env.npm_execpath ? run(process.execPath, [process.env.npm_execpath, ...args], cwd) : run('npm', args, cwd);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, argument, tag] = process.argv.slice(2);
  try {
    if (action === 'prepare') await prepare(argument);
    else if (action === 'pack') await pack();
    else if (action === 'check') await check(argument === '--tag' ? tag : undefined);
    else throw new Error('Usage: release.mjs prepare <patch|minor|major> | pack | check [--tag vX.Y.Z]');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
