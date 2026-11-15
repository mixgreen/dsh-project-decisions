import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('client registers only a session view, never a global panel or plugin-detail launcher', async () => {
  const code = await readFile(new URL('../client.js', import.meta.url), 'utf8');
  let registration;
  vm.runInNewContext(code, { window: { __ModuleLoader__: { load(value) { registration = value; } } } });
  // Registration contract only: do not render or emulate a DOM.
  const plugin = registration.factory(name => { assert.equal(name, 'react'); return {}; });
  const slots = [];
  plugin.apply({
    locale: { register() {}, bind: () => key => key },
    slots: {
      inject(name, install) { assert.equal(name, 'conversation.view'); return install(); },
      register(options, component) { slots.push([options.name, options.id, typeof component]); },
    },
  });
  assert.deepEqual(slots, [['conversation.view', 'project-decisions', 'function']]);
  assert.doesNotMatch(code, /currentSessionId|selectedProjects|setWorkspace|selectPanel/);
});
