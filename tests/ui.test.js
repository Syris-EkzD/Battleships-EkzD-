import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

let interfaceInstance = 0;
function launchInterface() {
  let onClick;
  const root = {
    innerHTML: '',
    addEventListener(name, handler) { if (name === 'click') onClick = handler; },
  };
  globalThis.document = { querySelector: () => root };
  return import(`../src/app.js?test=${++interfaceInstance}`).then(() => ({
    root,
    click(action, fields = {}) {
      const element = { disabled: false, dataset: { action, ...fields } };
      element.closest = () => element;
      onClick({ target: element, detail: 1 });
    },
  }));
}

test('original vessel artwork is local and ships stay in one cell', () => {
  for (const vessel of ['destroyer', 'frigate', 'stealth']) {
    const path = `assets/${vessel}.svg`;
    assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), true);
    const art = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.match(art, /<svg\s/);
    assert.match(art, /shape-rendering="crispEdges"/);
    assert.match(art, /<\/svg>/);
  }
});

test('screens retain board sizes, handoff privacy, and shot feedback', async () => {
  const { root, click } = await launchInterface();
  assert.match(root.innerHTML, /RULE THE/);
  assert.match(root.innerHTML, /hero-ship/);
  click('instructions');
  assert.match(root.innerHTML, /exactly one cell/);
  click('menu');
  click('configure');
  for (const [size, count] of [[5, 3], [7, 4], [10, 5]]) {
    click('size', { value: String(size) });
    click('begin');
    assert.equal((root.innerHTML.match(/data-action="place"/g) ?? []).length, size * size);
    for (let i = 0; i < count; i++) click('place', { cell: String(i) });
    assert.equal((root.innerHTML.match(/class="cell ship"/g) ?? []).length, count);
    assert.equal((root.innerHTML.match(/class="ship-sprite /g) ?? []).length >= count, true);
    click('confirm-placement');
    assert.match(root.innerHTML, /PASS THE DEVICE/);
    assert.doesNotMatch(root.innerHTML, /class="board"/);
    click('continue');
    assert.equal((root.innerHTML.match(/data-action="place"/g) ?? []).length, size * size);
    for (let i = 0; i < count; i++) click('place', { cell: String(size * size - 1 - i) });
    click('confirm-placement');
    assert.doesNotMatch(root.innerHTML, /class="board"/);
    click('continue');
    click('target', { cell: String(size * size - 1) });
    assert.match(root.innerHTML, /TARGET LOCK CONFIRMED/);
    click('fire');
    assert.match(root.innerHTML, /DIRECT HIT/);
    assert.match(root.innerHTML, /HIT \/ CONFIRMED/);
    click('continue');
    assert.doesNotMatch(root.innerHTML, /class="board"/);
    // Reset through a new configuration; no need to abandon a live game.
    globalThis.window = { confirm: () => true };
    click('menu');
    click('configure');
  }
});

test('solo mode retains computer turns and a private enemy fleet', async () => {
  const { root, click } = await launchInterface();
  click('configure');
  click('mode', { value: 'pve' });
  click('size', { value: '7' });
  click('begin');
  click('autoplace');
  click('confirm-placement');
  assert.match(root.innerHTML, /PRIVATE HANDOFF REQUIRED/);
  assert.doesNotMatch(root.innerHTML, /class="board"/);
  click('continue');
  assert.match(root.innerHTML, /HOSTILE WATERS/);
  assert.equal((root.innerHTML.match(/data-action="target"/g) ?? []).length, 49);
  click('target', { cell: '0' });
  click('fire');
  assert.match(root.innerHTML, /COMBAT INTELLIGENCE/);
  click('continue');
  assert.match(root.innerHTML, /INCOMING FIRE/);
  click('continue');
  assert.match(root.innerHTML, /FIRING SOLUTION/);
});
