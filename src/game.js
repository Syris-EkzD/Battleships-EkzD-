/** Simplified Battleships: every ship occupies exactly one cell. */
export const FLEETS = Object.freeze({ 5: 3, 7: 4, 10: 5 });
export const MODES = Object.freeze(['pvp', 'pve']);

function cellIsValid(game, cell) {
  return Number.isInteger(cell) && cell >= 0 && cell < game.size * game.size;
}

function requirePhase(game, phase) {
  if (game.phase !== phase) throw new Error(`Expected ${phase}, got ${game.phase}`);
}

function randomCells(size, count, rng) {
  const cells = Array.from({ length: size * size }, (_, index) => index);
  for (let i = 0; i < count; i++) {
    const roll = rng();
    if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error('Invalid random value');
    const j = i + Math.floor(roll * (cells.length - i));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return new Set(cells.slice(0, count));
}

export function createGame(mode, size, rng = Math.random) {
  if (!MODES.includes(mode)) throw new Error('Invalid game mode');
  if (!Object.hasOwn(FLEETS, size)) throw new Error('Invalid board size');
  if (typeof rng !== 'function') throw new Error('Expected a random function');
  return {
    mode, size: Number(size), shipCount: FLEETS[size], rng,
    players: [
      { name: 'Player 1', ships: new Set(), shots: new Map() },
      { name: mode === 'pve' ? 'Computer' : 'Player 2', ships: new Set(), shots: new Map() },
    ],
    phase: 'placement', placementPlayer: 0, current: 0,
    selected: null, lastShot: null, winner: null,
  };
}

export function toggleShip(game, cell) {
  requirePhase(game, 'placement');
  if (!cellIsValid(game, cell)) return false;
  const ships = game.players[game.placementPlayer].ships;
  if (ships.has(cell)) ships.delete(cell);
  else if (ships.size < game.shipCount) ships.add(cell);
  else return false;
  return true;
}

export function autoPlace(game) {
  requirePhase(game, 'placement');
  game.players[game.placementPlayer].ships = randomCells(game.size, game.shipCount, game.rng);
}

export function confirmPlacement(game) {
  requirePhase(game, 'placement');
  if (game.players[game.placementPlayer].ships.size !== game.shipCount) return false;
  if (game.placementPlayer === 0 && game.mode === 'pvp') {
    game.phase = 'handoff';
  } else {
    if (game.mode === 'pve') game.players[1].ships = randomCells(game.size, game.shipCount, game.rng);
    game.current = 0;
    game.phase = 'turn-ready';
  }
  return true;
}

export function continueGame(game) {
  if (game.phase === 'handoff') {
    game.placementPlayer = 1;
    game.phase = 'placement';
    return;
  }
  if (game.phase === 'turn-ready') {
    game.phase = 'battle';
    return;
  }
  if (game.phase === 'ai-result') {
    game.phase = 'battle';
    game.lastShot = null;
    return;
  }
  requirePhase(game, 'result');
  if (game.winner !== null) {
    game.phase = 'gameover';
    return;
  }
  if (game.mode === 'pve') {
    game.current = 1;
    const computer = game.players[1];
    const untried = Array.from({ length: game.size * game.size }, (_, cell) => cell)
      .filter((cell) => !computer.shots.has(cell));
    if (untried.length === 0) throw new Error('Computer has no available targets');
    const roll = game.rng();
    if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error('Invalid random value');
    applyShot(game, untried[Math.floor(roll * untried.length)]);
    game.current = 0;
    game.phase = game.winner !== null ? 'gameover' : 'ai-result';
  } else {
    game.current = 1 - game.current;
    game.lastShot = null;
    game.phase = 'turn-ready';
  }
}

export function selectTarget(game, cell) {
  requirePhase(game, 'battle');
  if (!cellIsValid(game, cell) || game.players[game.current].shots.has(cell)) return false;
  game.selected = cell;
  return true;
}

function applyShot(game, cell) {
  const shooter = game.current;
  const opponent = game.players[1 - shooter];
  const hit = opponent.ships.has(cell);
  game.players[shooter].shots.set(cell, hit ? 'hit' : 'miss');
  const won = [...opponent.ships].every((ship) => game.players[shooter].shots.get(ship) === 'hit');
  game.lastShot = { shooter, cell, hit, won };
  if (won) game.winner = shooter;
}

export function fire(game) {
  requirePhase(game, 'battle');
  const cell = game.selected;
  if (!cellIsValid(game, cell) || game.players[game.current].shots.has(cell)) return false;
  applyShot(game, cell);
  game.selected = null;
  game.phase = 'result';
  return true;
}

export function coordinate(game, cell) {
  if (!cellIsValid(game, cell)) throw new Error('Invalid cell');
  return `${String.fromCharCode(65 + Math.floor(cell / game.size))}${(cell % game.size) + 1}`;
}
