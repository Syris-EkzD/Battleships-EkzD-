import {
  FLEETS, createGame, toggleShip, autoPlace, confirmPlacement,
  continueGame, selectTarget, fire, coordinate,
} from './game.js';

const app = document.querySelector('#app');
let screen = 'menu';
let game = null;
let mode = 'pvp';
let size = 7;
let notice = '';

function button(action, label, classes = '', disabled = false) {
  return `<button class="btn ${classes}" data-action="${action}" ${disabled ? 'disabled' : ''}>${label}</button>`;
}

function shell(content) {
  app.innerHTML = `
    <header class="topbar">
      <button class="brand" data-action="menu" aria-label="Battleships main menu"><span class="brand-mark">⌖</span> BATTLESHIPS<span class="brand-dim">.WEB</span></button>
      <span class="top-status"><span class="status-dot"></span> LOCAL PLAY · NO INSTALL</span>
    </header>
    ${content}
    <footer class="footer">Single-cell ship rules · Local play · No accounts or servers</footer>
    <div class="sr-only" role="status" aria-live="polite">${notice}</div>
  `;
}

function menuView() {
  return `<section class="hero panel">
    <div class="hero-visual" aria-hidden="true"><div class="ship-silhouette">✦<span>⚓</span>✦</div></div>
    <span class="eyebrow">CLASSIC STRATEGY, NEW WATERS</span>
    <h1>FIND. FIRE.<br><em>FINISH.</em></h1>
    <p class="lead">Hide your fleet. Hunt theirs. Take turns until the last ship goes under — all from your browser.</p>
    <div class="hero-actions">${button('configure', 'START GAME →', 'primary')}${button('instructions', 'HOW TO PLAY', 'outline')}</div>
    <div class="hero-meta"><span>01 / LOCAL TWO-PLAYER</span><span>02 / PLAY VS COMPUTER</span><span>03 / THREE BOARD SIZES</span></div>
  </section>`;
}

function instructionsView() {
  return `<section class="panel section">
    <span class="eyebrow">FIELD MANUAL</span><h1 class="section-title">HOW TO PLAY</h1>
    <div class="steps">
      <article><span class="step-number">01</span><h2>Place your fleet</h2><p>Choose any open cells on your board. Each ship occupies exactly <strong>one cell</strong>. Place all ships before confirming.</p></article>
      <article><span class="step-number">02</span><h2>Take your shot</h2><p>Choose an untried coordinate on your opponent’s hidden board, then confirm. A hit is marked <strong>×</strong>; a miss is marked <strong>•</strong>.</p></article>
      <article><span class="step-number">03</span><h2>Sink every ship</h2><p>Players alternate one shot per turn. The first player to hit every enemy ship wins.</p></article>
    </div>
    <p class="note">Two-player mode uses one shared device. Pass it only when the handoff screen appears. The computer in PvE picks its targets randomly.</p>
    ${button('menu', '← BACK TO MENU', 'outline')}
  </section>`;
}

function configView() {
  return `<section class="panel section setup-panel">
    <span class="eyebrow">MISSION CONFIGURATION</span><h1 class="section-title">CHOOSE YOUR BATTLE</h1>
    <h2 class="minor-title">GAME MODE</h2>
    <div class="choice-grid">
      <button class="choice ${mode === 'pvp' ? 'active' : ''}" data-action="mode" data-value="pvp" aria-pressed="${mode === 'pvp'}"><strong>PLAYER VS PLAYER</strong><small>Two people · Pass-and-play</small></button>
      <button class="choice ${mode === 'pve' ? 'active' : ''}" data-action="mode" data-value="pve" aria-pressed="${mode === 'pve'}"><strong>PLAYER VS COMPUTER</strong><small>Solo · Random computer opponent</small></button>
    </div>
    <h2 class="minor-title">BATTLEFIELD SIZE</h2>
    <div class="choice-grid size-options">${[5, 7, 10].map((n) => `<button class="choice ${size === n ? 'active' : ''}" data-action="size" data-value="${n}" aria-pressed="${size === n}"><strong>${n} × ${n}</strong><small>${FLEETS[n]} ships per player</small></button>`).join('')}</div>
    <div class="action-row">${button('menu', '← BACK', 'outline')}${button('begin', 'DEPLOY FLEET →', 'primary')}</div>
  </section>`;
}

function grid(game, type) {
  const viewer = type === 'target' ? game.players[game.current] : game.players[type === 'placement' ? game.placementPlayer : game.current];
  const incoming = game.players[1 - game.current]?.shots ?? new Map();
  const cells = Array.from({ length: game.size * game.size }, (_, i) => {
    let symbol = '', state = 'water', description = 'Water', action = '', disabled = false;
    if (type === 'placement') {
      if (viewer.ships.has(i)) { state = 'ship'; symbol = '◆'; description = 'Your ship'; }
      else if (viewer.ships.size === game.shipCount) disabled = true;
      action = 'place';
    } else if (type === 'target') {
      const result = viewer.shots.get(i);
      if (result) { state = result; symbol = result === 'hit' ? '×' : '•'; description = result; disabled = true; }
      if (game.selected === i) { state = 'selected'; symbol = '⌖'; description = 'Selected target'; }
      action = 'target';
    } else {
      if (viewer.ships.has(i)) { state = 'ship'; symbol = '◆'; description = 'Your ship'; }
      const result = incoming.get(i);
      if (result) {
        state = result === 'hit' ? 'hit' : 'miss';
        symbol = result === 'hit' ? '×' : '•';
        description = `Enemy ${result}`;
      }
      disabled = true;
    }
    const label = `${coordinate(game, i)}: ${description}`;
    return type === 'own'
      ? `<div class="cell ${state}" aria-label="${label}" title="${label}">${symbol}</div>`
      : `<button class="cell ${state}" data-action="${action}" data-cell="${i}" aria-label="${label}" title="${label}" ${disabled ? 'disabled' : ''}>${symbol}</button>`;
  }).join('');
  return `<div class="board-container" style="--size:${game.size}"><div class="row-labels">${Array.from({ length: game.size }, (_, i) => `<span>${String.fromCharCode(65 + i)}</span>`).join('')}</div><div class="board-frame"><div class="column-labels">${Array.from({ length: game.size }, (_, i) => `<span>${i + 1}</span>`).join('')}</div><div class="board" style="--size:${game.size}" aria-label="${type === 'target' ? 'Enemy targeting board' : 'Your fleet board'}">${cells}</div></div></div>`;
}

function placementView() {
  const player = game.players[game.placementPlayer];
  const remaining = game.shipCount - player.ships.size;
  return `<section class="panel section game-panel"><span class="eyebrow">DEPLOYMENT / ${game.size} × ${game.size} GRID</span>
    <h1 class="section-title">${player.name.toUpperCase()}, DEPLOY YOUR FLEET</h1>
    <p class="lead compact">Select ${game.shipCount} cells to hide your ships. Select a ship again to move it.</p>
    <div class="board-layout"><div class="board-card"><div class="panel-heading"><span>YOUR WATERS</span><span>${player.ships.size} / ${game.shipCount} SHIPS</span></div>${grid(game, 'placement')}</div>
    <aside class="side-card"><span class="eyebrow">FLEET STATUS</span><div class="metric">${remaining.toString().padStart(2, '0')}<span>ships remaining</span></div>
    <p>${remaining === 0 ? 'Fleet ready for deployment.' : 'Every ship is one cell. Place all ships to continue.'}</p>
    ${button('autoplace', 'AUTO-PLACE', 'outline')}${button('confirm-placement', 'CONFIRM PLACEMENT →', 'primary', remaining !== 0)}</aside></div>
  </section>`;
}

function breakView() {
  const isSetup = game.phase === 'handoff';
  const nextName = isSetup ? 'Player 2' : game.players[game.current].name;
  return `<section class="panel intermission"><span class="eyebrow">${isSetup ? 'FLEET HANDOFF' : 'SECURE TURN HANDOFF'}</span>
    <div class="shield">◈</div><h1>${isSetup ? 'PASS THE DEVICE' : `${nextName.toUpperCase()}, YOU'RE UP`}</h1>
    <p>${isSetup ? 'Player 1 has placed their ships. Give the device to Player 2 before continuing.' : `Only ${nextName} should view the next screen. Make sure the previous player has turned away.`}</p>
    ${button('continue', isSetup ? 'PLAYER 2 IS READY →' : 'REVEAL MY BOARD →', 'primary')}</section>`;
}

function battleView() {
  const player = game.players[game.current];
  const canFire = game.selected !== null;
  return `<section class="panel section game-panel"><span class="eyebrow">LIVE OPERATION / ${game.mode === 'pve' ? 'SOLO' : 'PASS-AND-PLAY'}</span>
    <h1 class="section-title">${player.name.toUpperCase()}'S TURN</h1><p class="lead compact">Select an untried coordinate on the enemy radar, then fire.</p>
    <div class="board-layout battle-layout"><div class="board-card"><div class="panel-heading"><span>ENEMY RADAR</span><span>${player.shots.size} SHOTS FIRED</span></div>${grid(game, 'target')}</div>
    <aside class="side-card fleet-preview"><div class="panel-heading"><span>YOUR FLEET</span></div>${grid(game, 'own')}
      <div class="legend"><span><b class="key ship-key"></b> Ship</span><span><b class="key hit-key"></b> Hit</span><span><b class="key miss-key"></b> Miss</span></div>
      <div class="target-display">${canFire ? `TARGET LOCKED: <strong>${coordinate(game, game.selected)}</strong>` : 'NO TARGET SELECTED'}</div>
      ${button('fire', 'FIRE AT TARGET →', 'primary', !canFire)}</aside></div>
  </section>`;
}

function resultView() {
  const shot = game.lastShot;
  const isAI = game.phase === 'ai-result';
  const heading = isAI ? (shot.hit ? 'YOUR FLEET WAS HIT' : 'THE ENEMY MISSED') : (shot.hit ? 'DIRECT HIT!' : 'SHOT MISSED');
  const message = isAI ? `The computer fired at ${coordinate(game, shot.cell)}.` : `Shot at ${coordinate(game, shot.cell)}: ${shot.hit ? 'enemy ship destroyed.' : 'open water.'}`;
  const next = shot.won ? 'VIEW RESULTS →' : isAI ? 'RETURN TO BATTLE →' : game.mode === 'pvp' ? 'END TURN & PASS →' : 'COMPUTER TURN →';
  return `<section class="panel intermission result-screen"><span class="eyebrow">BATTLE REPORT / ${shot.hit ? 'HIT' : 'MISS'}</span>
    <div class="result-icon ${shot.hit ? 'hit-icon' : 'miss-icon'}">${shot.hit ? '×' : '•'}</div>
    <h1>${heading}</h1><p>${message}</p>${button('continue', next, 'primary')}</section>`;
}

function gameoverView() {
  const winner = game.players[game.winner];
  return `<section class="panel intermission win-screen"><span class="eyebrow">MISSION COMPLETE</span><div class="shield trophy">★</div>
    <h1>${winner.name.toUpperCase()} WINS!</h1><p>All enemy ships have been found and sunk. Another round?</p>
    <div class="hero-actions">${button('again', 'PLAY AGAIN →', 'primary')}${button('menu', 'MAIN MENU', 'outline')}</div></section>`;
}

function render() {
  if (screen === 'menu') return shell(menuView());
  if (screen === 'instructions') return shell(instructionsView());
  if (screen === 'configure') return shell(configView());
  if (!game) return shell(menuView());
  if (game.phase === 'placement') return shell(placementView());
  if (['handoff', 'turn-ready'].includes(game.phase)) return shell(breakView());
  if (game.phase === 'battle') return shell(battleView());
  if (['result', 'ai-result'].includes(game.phase)) return shell(resultView());
  return shell(gameoverView());
}

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target || target.disabled) return;
  const action = target.dataset.action;
  const cell = Number(target.dataset.cell);
  notice = '';
  try {
    switch (action) {
      case 'menu':
        if (game && !['gameover'].includes(game.phase) && !window.confirm('Abandon the current game?')) return;
        game = null;
        screen = 'menu';
        break;
      case 'instructions': screen = 'instructions'; break;
      case 'configure': screen = 'configure'; break;
      case 'mode': mode = target.dataset.value; break;
      case 'size': size = Number(target.dataset.value); break;
      case 'begin':
      case 'again': game = createGame(mode, size); screen = 'game'; break;
      case 'place': toggleShip(game, cell); break;
      case 'autoplace': autoPlace(game); break;
      case 'confirm-placement':
        if (!confirmPlacement(game)) notice = 'Place all required ships first.';
        break;
      case 'target': selectTarget(game, cell); break;
      case 'fire': if (!fire(game)) notice = 'Select a valid target.'; break;
      case 'continue': continueGame(game); break;
    }
  } catch (error) {
    console.error(error);
    notice = 'Unable to complete that action.';
  }
  render();
});

render();
