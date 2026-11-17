import test from 'node:test';
import assert from 'node:assert/strict';
import { FLEETS, createGame, toggleShip, autoPlace, confirmPlacement, continueGame, selectTarget, fire, coordinate } from '../src/game.js';

function place(game, cells) {
  for (const cell of cells) assert.equal(toggleShip(game, cell), true);
  assert.equal(confirmPlacement(game), true);
}

function shoot(game, cell) {
  assert.equal(selectTarget(game, cell), true);
  assert.equal(fire(game), true);
  return game.lastShot;
}

test('only the planned three board sizes and modes are accepted', () => {
  for (const [size, count] of Object.entries(FLEETS)) {
    assert.equal(createGame('pvp', Number(size)).shipCount, count);
  }
  assert.throws(() => createGame('online', 5));
  assert.throws(() => createGame('pvp', 6));
});

test('placement requires exact ship count; toggling and boundaries work on each board', () => {
  for (const size of [5, 7, 10]) {
    const game = createGame('pvp', size);
    assert.equal(confirmPlacement(game), false);
    assert.equal(toggleShip(game, -1), false);
    assert.equal(toggleShip(game, size * size), false);
    const cells = Array.from({ length: game.shipCount }, (_, i) => i);
    for (const cell of cells) assert.equal(toggleShip(game, cell), true);
    assert.equal(toggleShip(game, size * size - 1), false);
    assert.equal(toggleShip(game, cells[0]), true);
    assert.equal(confirmPlacement(game), false);
    assert.equal(toggleShip(game, cells[0]), true);
    assert.equal(confirmPlacement(game), true);
    assert.equal(game.phase, 'handoff');
  }
});

test('PvP setup keeps boards separated and starts with Player 1', () => {
  const game = createGame('pvp', 5);
  place(game, [0, 1, 2]);
  continueGame(game);
  assert.equal(game.placementPlayer, 1);
  assert.equal(game.phase, 'placement');
  place(game, [22, 23, 24]);
  assert.equal(game.phase, 'turn-ready');
  continueGame(game);
  assert.equal(game.current, 0);
  assert.equal(game.phase, 'battle');
  assert.deepEqual([...game.players[0].ships], [0, 1, 2]);
  assert.deepEqual([...game.players[1].ships], [22, 23, 24]);
});

test('shots mark hit/miss and prevent duplicate targets across alternating turns', () => {
  const game = createGame('pvp', 5);
  place(game, [0, 1, 2]);
  continueGame(game);
  place(game, [22, 23, 24]);
  continueGame(game);
  assert.equal(shoot(game, 22).hit, true);
  assert.equal(game.players[0].shots.get(22), 'hit');
  continueGame(game);
  assert.equal(game.current, 1);
  continueGame(game);
  assert.equal(shoot(game, 20).hit, false);
  continueGame(game);
  continueGame(game);
  assert.equal(selectTarget(game, 22), false);
  assert.equal(selectTarget(game, 24), true);
  assert.equal(game.players[1].shots.get(20), 'miss');
});

test('game only ends when all one-cell ships have been hit; replay is fresh', () => {
  const game = createGame('pvp', 5);
  place(game, [0, 1, 2]);
  continueGame(game);
  place(game, [22, 23, 24]);
  continueGame(game);
  for (const [index, target] of [22, 23, 24].entries()) {
    assert.equal(shoot(game, target).won, index === 2);
    continueGame(game);
    if (index < 2) {
      continueGame(game);
      shoot(game, index + 3);
      continueGame(game);
      continueGame(game);
    }
  }
  assert.equal(game.phase, 'gameover');
  assert.equal(game.winner, 0);
  const replay = createGame('pvp', 10);
  assert.equal(replay.winner, null);
  assert.equal(replay.players[0].shots.size, 0);
  assert.equal(replay.shipCount, 5);
});

test('PvE places a separate fleet and computer takes valid, unique shots', () => {
  const game = createGame('pve', 7, () => 0.5);
  autoPlace(game);
  assert.equal(game.players[0].ships.size, 4);
  assert.equal(confirmPlacement(game), true);
  assert.equal(game.players[1].ships.size, 4);
  continueGame(game);
  const enemyFleet = game.players[1].ships;
  let safe = 0;
  while (enemyFleet.has(safe)) safe++;
  for (let turn = 0; turn < 3; turn++) {
    while (enemyFleet.has(safe) || game.players[0].shots.has(safe)) safe++;
    shoot(game, safe);
    continueGame(game);
    assert.equal(game.players[1].shots.size, turn + 1);
    assert.equal(game.phase, 'ai-result');
    continueGame(game);
    safe++;
  }
  assert.equal(new Set(game.players[1].shots.keys()).size, 3);
  assert.equal(game.current, 0);
});

test('coordinates use rows A-J and columns 1-10', () => {
  const game = createGame('pvp', 10);
  assert.equal(coordinate(game, 0), 'A1');
  assert.equal(coordinate(game, 99), 'J10');
  assert.throws(() => coordinate(game, -1));
});
