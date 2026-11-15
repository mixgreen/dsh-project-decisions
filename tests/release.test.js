import test from 'node:test';
import assert from 'node:assert/strict';
import { nextVersion, notesFor, prepareChangelog, checkVersion } from '../scripts/release.mjs';

const previous = '## [0.1.0] - 2026-11-13\n\n- Initial local version.\n';
const log = '# Changelog\n\n## [Unreleased]\n\n### Added\n- Release packaging.\n\n' + previous;

test('semantic bumps reset lower version components', () => {
  assert.equal(nextVersion('0.1.9', 'patch'), '0.1.10');
  assert.equal(nextVersion('0.1.9', 'minor'), '0.2.0');
  assert.equal(nextVersion('0.1.9', 'major'), '1.0.0');
  assert.throws(() => nextVersion('0.1.0', 'typo'));
});

test('version preparation moves Unreleased notes and preserves history', () => {
  const next = prepareChangelog(log, '0.1.1', '2026-11-15');
  assert.ok(next.includes('## [Unreleased]\n\n## [0.1.1] - 2026-11-15'));
  assert.ok(next.endsWith(previous));
  assert.match(notesFor(next, '0.1.1'), /Release packaging/);
  assert.doesNotMatch(notesFor(next, '0.1.1'), /Initial local/);
  assert.throws(() => prepareChangelog(next, '0.1.2', '2026-11-16'));
  assert.throws(() => prepareChangelog(log, '0.1.0', '2026-11-15'));
});

test('release version must agree across manifest, lock and tag', () => {
  const pkg = { name: '@local/dsh-project-decisions', version: '0.1.0' };
  const lock = { ...pkg, packages: { '': { ...pkg } } };
  assert.equal(checkVersion(pkg, lock, log, 'v0.1.0'), previous);
  assert.throws(() => checkVersion(pkg, lock, log, 'v0.2.0'));
  assert.throws(() => checkVersion(pkg, { ...lock, version: '0.0.0' }, log));
  assert.throws(() => checkVersion(pkg, { ...lock, packages: { '': { version: '0.0.0' } } }, log));
  assert.throws(() => checkVersion(pkg, lock, '# No release notes'));
});

test('release notes require a nonempty body', () => {
  assert.throws(() => notesFor('## [0.1.0] - 2026-11-13\n\n', '0.1.0'));
});
