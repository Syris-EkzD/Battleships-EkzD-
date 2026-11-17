import {
  FLEETS, createGame, toggleShip, autoPlace, confirmPlacement,
  continueGame, selectTarget, fire, coordinate,
} from './game.js';

const app = document.querySelector('#app');
const vessels = [
  { name: 'Destroyer', image: './assets/destroyer.svg' },
  { name: 'Frigate', image: './assets/frigate.svg' },
  { name: 'Stealth ship', image: './assets/stealth.svg' },
];
let screen = 'menu';
let game = null;
let mode = 'pvp';
let size = 7;
let notice = '';

function button(action, label, classes = '', disabled = false) {
  return `<button class="btn ${classes}" data-action="${action}" ${disabled ? 'disabled' : ''}>${label}</button>`;
}

function vessel(index, extraClass = '') {
  const ship = vessels[index % vessels.length];
  return `<img class="ship-sprite ${extraClass}" src="${ship.image}" alt="" draggable="false">`;
}

function shell(content) {
  const active = game && screen === 'game';
  app.innerHTML = `
    <header class="topbar">
      <button class="brand" data-action="menu" aria-label="Battleships main menu">
        <span class="brand-mark" aria-hidden="true"><span></span></span>
        <span class="brand-copy">BATTLESHIPS <small>NAVAL COMMAND</small></span>
      </button>
      <div class="top-status" aria-label="${active ? 'Operation in progress' : 'Local operation ready'}">
        <span class="status-dot" aria-hidden="true"></span>${active ? 'OPERATION IN PROGRESS' : 'LOCAL SYSTEM // ONLINE'}
      </div>
    </header>
    ${content}
    <footer class="footer"><span>BTL / NAVAL COMMAND</span><span>SINGLE-CELL FLEETS <b>•</b> OFFLINE PLAY <b>•</b> NO ACCOUNTS</span></footer>
    <div class="sr-only" role="status" aria-live="polite">${notice}</div>
  `;
}

function menuView() {
  return `<section class="hero panel">
    <div class="hero-copy">
      <span class="eyebrow"><span class="eyebrow-line"></span> TACTICAL NAVAL WARFARE / 001</span>
      <h1 tabindex="-1">RULE THE<br><em>DEEP.</em></h1>
      <p class="lead">Two fleets. One ocean. Zero room for error. Deploy your ships, lock onto enemy coordinates, and own the battlefield.</p>
      <div class="hero-actions">${button('configure', 'BEGIN OPERATION <span aria-hidden="true">→</span>', 'primary')}${button('instructions', 'FIELD MANUAL', 'outline')}</div>
      <div class="hero-stats"><div><strong>02</strong><span>GAME MODES</span></div><div><strong>03</strong><span>GRID SIZES</span></div><div><strong>01</strong><span>DEVICE NEEDED</span></div></div>
    </div>
    <div class="hero-art" aria-hidden="true">
      <div class="radar-rings"><span class="radar-sweep"></span><i class="radar-cross radar-cross-a"></i><i class="radar-cross radar-cross-b"></i></div>
      <div class="hero-ship-shadow"></div>${vessel(0, 'hero-ship')}
      <span class="art-tag art-tag-top">SECTOR 07 / NORTH ATLANTIC</span>
      <span class="art-tag art-tag-bottom">VESSEL DDG-01 <b>◆</b> SIGNAL ACTIVE</span>
      <span class="radar-dot dot-one"></span><span class="radar-dot dot-two"></span>
    </div>
    <div class="hero-bottom"><span>01 // DEPLOY</span><span>02 // TARGET</span><span>03 // DOMINATE</span><span class="hero-bottom-end">ALL SYSTEMS NOMINAL</span></div>
  </section>`;
}

function instructionsView() {
  return `<section class="panel section manual-panel">
    <div class="section-head"><div><span class="eyebrow">OPERATIONS / FIELD MANUAL</span><h1 class="section-title" tabindex="-1">KNOW YOUR MISSION<span class="accent">.</span></h1></div><span class="section-code">REF / BTL-001</span></div>
    <div class="steps">
      <article><span class="step-number">01 / DEPLOY</span><div class="instruction-art">${vessel(0)}<span>FLEET POSITIONING</span></div><h2>Position your fleet</h2><p>Place ships on open coordinates. Each vessel occupies <strong>exactly one cell</strong>, regardless of its appearance. Select an existing ship to move it.</p></article>
      <article><span class="step-number">02 / ENGAGE</span><div class="instruction-art"><span class="reticle instruction-reticle"></span><span>TARGET ACQUISITION</span></div><h2>Lock on and fire</h2><p>Select an untried enemy coordinate, then fire. A <strong class="text-hit">red blast</strong> means hit; a <strong class="text-miss">blue ripple</strong> means miss.</p></article>
      <article><span class="step-number">03 / VICTORY</span><div class="instruction-art"><span class="victory-mark">V</span><span>MISSION COMPLETE</span></div><h2>Eliminate the fleet</h2><p>Take one shot per turn. The first player to find and destroy every enemy ship wins the operation.</p></article>
    </div>
    <div class="manual-note"><strong>PASS-AND-PLAY PROTOCOL</strong><p>In local PvP, hand the device over only at the secure transition screen. Keep your opponent from seeing your fleet. In solo mode, the computer targets random untried cells.</p></div>
    ${button('menu', '← RETURN TO BASE', 'outline')}
  </section>`;
}

function configView() {
  return `<section class="panel section setup-panel">
    <div class="section-head"><div><span class="eyebrow">PRE-FLIGHT / OPERATION SETUP</span><h1 class="section-title" tabindex="-1">CONFIGURE MISSION<span class="accent">.</span></h1><p class="section-subtitle">Choose your opponent and the size of your operating area.</p></div><span class="section-code">01 / 02</span></div>
    <h2 class="minor-title"><span>01</span> ENGAGEMENT MODE</h2>
    <div class="choice-grid mode-options">
      <button class="choice mode-choice ${mode === 'pvp' ? 'active' : ''}" data-action="mode" data-value="pvp" aria-pressed="${mode === 'pvp'}"><span class="choice-graphic players-graphic" aria-hidden="true"><i></i><i></i></span><span class="choice-text"><strong>LOCAL PvP</strong><small>Two commanders. One shared device. Private turn handoffs.</small></span><span class="choice-check" aria-hidden="true"></span></button>
      <button class="choice mode-choice ${mode === 'pve' ? 'active' : ''}" data-action="mode" data-value="pve" aria-pressed="${mode === 'pve'}"><span class="choice-graphic cpu-graphic" aria-hidden="true"><i></i></span><span class="choice-text"><strong>SOLO vs CPU</strong><small>Challenge a computer opponent with random targeting.</small></span><span class="choice-check" aria-hidden="true"></span></button>
    </div>
    <h2 class="minor-title"><span>02</span> OPERATIONAL GRID</h2>
    <div class="choice-grid size-options">${[5, 7, 10].map((n) => `<button class="choice size-choice ${size === n ? 'active' : ''}" data-action="size" data-value="${n}" aria-pressed="${size === n}"><span class="mini-grid" style="--mini:${n > 7 ? 5 : n}" aria-hidden="true"></span><span class="choice-text"><strong>${n} × ${n}</strong><small>${FLEETS[n]} single-cell ships</small></span><span class="choice-check" aria-hidden="true"></span></button>`).join('')}</div>
    <div class="config-summary"><span>MISSION LOADOUT</span><strong>${mode === 'pvp' ? 'LOCAL PvP' : 'SOLO vs CPU'} <b>/</b> ${size}×${size} SECTOR <b>/</b> ${FLEETS[size]} SHIPS PER FLEET</strong></div>
    <div class="action-row">${button('menu', '← RETURN TO BASE', 'outline')}${button('begin', 'DEPLOY FLEET →', 'primary')}</div>
  </section>`;
}

function grid(game, type) {
  const viewer = game.players[type === 'placement' ? game.placementPlayer : game.current];
  const incoming = game.players[1 - game.current]?.shots ?? new Map();
  const orderedShips = [...viewer.ships];
  const cells = Array.from({ length: game.size * game.size }, (_, i) => {
    let art = '', state = 'water', description = 'Water', action = '', disabled = false;
    if (type === 'placement') {
      if (viewer.ships.has(i)) { state = 'ship'; art = vessel(orderedShips.indexOf(i)); description = 'Your ship'; }
      else if (viewer.ships.size === game.shipCount) disabled = true;
      action = 'place';
    } else if (type === 'target') {
      const result = viewer.shots.get(i);
      if (result) { state = result; art = `<span class="impact ${result}" aria-hidden="true"></span>`; description = result; disabled = true; }
      if (game.selected === i) { state = 'selected'; art = '<span class="reticle" aria-hidden="true"></span>'; description = 'Selected target'; }
      action = 'target';
    } else {
      if (viewer.ships.has(i)) { state = 'ship'; art = vessel(orderedShips.indexOf(i)); description = 'Your ship'; }
      const result = incoming.get(i);
      if (result) {
        state = result;
        art = `<span class="impact ${result}" aria-hidden="true"></span>`;
        description = `Enemy ${result}`;
      }
      disabled = true;
    }
    const label = `${coordinate(game, i)}: ${description}`;
    return type === 'own'
      ? `<div class="cell ${state}" aria-label="${label}" title="${label}">${art}</div>`
      : `<button class="cell ${state}" data-action="${action}" data-cell="${i}" aria-label="${label}" title="${label}" ${disabled ? 'disabled' : ''}>${art}</button>`;
  }).join('');
  const heading = type === 'target' ? 'Enemy targeting grid' : type === 'placement' ? 'Your placement grid' : 'Your fleet status grid';
  return `<div class="board-container" style="--size:${game.size}"><div class="row-labels" aria-hidden="true">${Array.from({ length: game.size }, (_, i) => `<span>${String.fromCharCode(65 + i)}</span>`).join('')}</div><div class="board-frame"><div class="column-labels" aria-hidden="true">${Array.from({ length: game.size }, (_, i) => `<span>${i + 1}</span>`).join('')}</div><div class="board" style="--size:${game.size}" role="group" aria-label="${heading}">${cells}</div></div></div>`;
}

function fleetList(player, count, incoming = null) {
  const shipCells = [...player.ships];
  return `<div class="fleet-list">${Array.from({ length: count }, (_, i) => {
    const type = vessels[i % vessels.length];
    const placed = i < shipCells.length;
    const destroyed = placed && incoming?.get(shipCells[i]) === 'hit';
    return `<div class="fleet-item ${placed ? 'deployed' : 'pending'} ${destroyed ? 'destroyed' : ''}"><span class="fleet-art">${vessel(i)}</span><span class="fleet-name">${type.name}<small>UNIT ${String(i + 1).padStart(2, '0')} · 1 CELL</small></span><span class="fleet-state">${destroyed ? 'LOST' : placed ? 'READY' : 'EMPTY'}</span></div>`;
  }).join('')}</div>`;
}

function placementView() {
  const player = game.players[game.placementPlayer];
  const remaining = game.shipCount - player.ships.size;
  return `<section class="panel section game-panel">
    <div class="section-head"><div><span class="eyebrow">DEPLOYMENT / SECTOR ${game.size}×${game.size}</span><h1 class="section-title" tabindex="-1">${player.name.toUpperCase()}: DEPLOY<span class="accent">.</span></h1><p class="section-subtitle">Select ${game.shipCount} cells to position your fleet. Select a ship again to reposition it.</p></div><span class="phase-tag">PHASE 01 / DEPLOY</span></div>
    <div class="board-layout"><div class="board-card"><div class="panel-heading"><span><b class="panel-beacon"></b> FRIENDLY WATERS</span><span>${player.ships.size} / ${game.shipCount} DEPLOYED</span></div>${grid(game, 'placement')}<div class="board-caption"><span>TACTICAL GRID // ${game.size}×${game.size}</span><span>SELECT OPEN WATER TO DEPLOY</span></div></div>
    <aside class="side-card"><span class="eyebrow">FLEET MANIFEST</span><div class="metric"><strong>${String(remaining).padStart(2, '0')}</strong><span>UNITS TO DEPLOY</span></div>${fleetList(player, game.shipCount)}<p class="side-note">Vessel classes are visual only. Each ship occupies one grid cell.</p><div class="side-actions">${button('autoplace', 'AUTO-DEPLOY', 'outline')}${button('confirm-placement', 'CONFIRM FLEET →', 'primary', remaining !== 0)}</div></aside></div>
  </section>`;
}

function breakView() {
  const isSetup = game.phase === 'handoff';
  const nextName = isSetup ? 'Player 2' : game.players[game.current].name;
  return `<section class="panel intermission secure-screen">
    <span class="eyebrow">SECURE CHANNEL / ${isSetup ? 'FLEET TRANSFER' : 'TURN TRANSFER'}</span>
    <div class="secure-symbol" aria-hidden="true"><span class="secure-lock"><i></i></span></div>
    <span class="intermission-kicker">PRIVATE HANDOFF REQUIRED</span>
    <h1 tabindex="-1">${isSetup ? 'PASS THE DEVICE.' : `${nextName.toUpperCase()}, REPORT IN.`}</h1>
    <p>${isSetup ? 'Player 1 deployment is secured. Hand the device to Player 2 before revealing the next fleet grid.' : `Only ${nextName} should view the next screen. Wait until the other player has turned away.`}</p>
    <div class="security-strip"><span class="status-dot"></span> FLEET COORDINATES CONCEALED</div>
    ${button('continue', isSetup ? 'PLAYER 2 IS READY →' : 'REVEAL MY BOARD →', 'primary')}
  </section>`;
}

function battleView() {
  const player = game.players[game.current];
  const canFire = game.selected !== null;
  const hits = [...player.shots.values()].filter((result) => result === 'hit').length;
  const incoming = game.players[1 - game.current].shots;
  return `<section class="panel section game-panel">
    <div class="section-head"><div><span class="eyebrow">ACTIVE COMBAT / ${game.mode === 'pve' ? 'SOLO' : 'LOCAL PvP'}</span><h1 class="section-title" tabindex="-1">${player.name.toUpperCase()}: ENGAGE<span class="accent">.</span></h1><p class="section-subtitle">Select an untried hostile coordinate to establish a target lock.</p></div><span class="phase-tag live-tag"><span class="status-dot"></span> LIVE OPERATION</span></div>
    <div class="battle-stats"><span><small>ENEMY UNITS DESTROYED</small><strong>${String(hits).padStart(2, '0')} <b>/ ${String(game.shipCount).padStart(2, '0')}</b></strong></span><span><small>ROUNDS FIRED</small><strong>${String(player.shots.size).padStart(2, '0')}</strong></span><span><small>FRIENDLY UNITS ACTIVE</small><strong>${String(game.shipCount - [...player.ships].filter((cell) => incoming.get(cell) === 'hit').length).padStart(2, '0')}</strong></span></div>
    <div class="board-layout battle-layout"><div class="board-card"><div class="panel-heading"><span><b class="panel-beacon hostile"></b> HOSTILE WATERS / TARGETING RADAR</span><span>${game.size} × ${game.size}</span></div>${grid(game, 'target')}<div class="board-caption"><span>UNTRIED SECTORS REMAIN VISIBLE</span><span>SELECT → FIRE</span></div></div>
    <aside class="side-card fleet-preview"><div class="panel-heading"><span>FRIENDLY FLEET</span><span>LIVE STATUS</span></div>${grid(game, 'own')}
      <div class="legend"><span><b class="key ship-key"></b> Ship</span><span><b class="key hit-key"></b> Hit</span><span><b class="key miss-key"></b> Miss</span><span><b class="key selected-key"></b> Target</span></div>
      <div class="target-display"><span>FIRING SOLUTION</span><strong>${canFire ? coordinate(game, game.selected) : '-- / --'}</strong><small>${canFire ? 'TARGET LOCK CONFIRMED' : 'AWAITING COORDINATES'}</small></div>
      ${button('fire', 'FIRE AT TARGET →', 'primary', !canFire)}</aside></div>
  </section>`;
}

function resultView() {
  const shot = game.lastShot;
  const isAI = game.phase === 'ai-result';
  const heading = isAI ? (shot.hit ? 'FRIENDLY SHIP HIT.' : 'HOSTILE SHOT MISSED.') : (shot.hit ? 'DIRECT HIT.' : 'OPEN WATER.');
  const message = isAI ? `The computer fired at sector ${coordinate(game, shot.cell)}.` : `Shot confirmed at sector ${coordinate(game, shot.cell)}. ${shot.hit ? 'Hostile unit neutralized.' : 'No vessel detected.'}`;
  const next = shot.won ? 'VIEW RESULTS →' : isAI ? 'RETURN TO BATTLE →' : game.mode === 'pvp' ? 'END TURN & PASS →' : 'COMPUTER TURN →';
  return `<section class="panel intermission result-screen ${shot.hit ? 'result-hit' : 'result-miss'}">
    <span class="eyebrow">COMBAT INTELLIGENCE / ${isAI ? 'INCOMING FIRE' : 'STRIKE REPORT'}</span>
    <div class="combat-visual" aria-hidden="true"><span class="combat-ring ring-one"></span><span class="combat-ring ring-two"></span><span class="impact ${shot.hit ? 'hit' : 'miss'}"></span></div>
    <span class="intermission-kicker">${shot.hit ? 'CONTACT CONFIRMED' : 'NO CONTACT'}</span><h1 tabindex="-1">${heading}</h1><p>${message}</p>
    <div class="result-coordinate"><span>SECTOR</span><strong>${coordinate(game, shot.cell)}</strong><span class="result-status">${shot.hit ? 'HIT / CONFIRMED' : 'MISS / CONFIRMED'}</span></div>
    ${button('continue', next, 'primary')}
  </section>`;
}

function gameoverView() {
  const winner = game.players[game.winner];
  return `<section class="panel intermission win-screen"><span class="eyebrow">AFTER-ACTION REPORT / OPERATION COMPLETE</span>
    <div class="victory-emblem" aria-hidden="true">${vessel(2)}<span class="victory-wing left-wing"></span><span class="victory-wing right-wing"></span></div>
    <span class="intermission-kicker">TOTAL NAVAL SUPERIORITY</span><h1 tabindex="-1">${winner.name.toUpperCase()} WINS.</h1><p>All hostile vessels eliminated. The waters are yours, Commander.</p>
    <div class="hero-actions">${button('again', 'NEW OPERATION →', 'primary')}${button('menu', 'RETURN TO BASE', 'outline')}</div>
  </section>`;
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
  const keyboard = event.detail === 0;
  notice = '';
  try {
    switch (action) {
      case 'menu':
        if (game && game.phase !== 'gameover' && !window.confirm('Abandon the current game?')) return;
        game = null; screen = 'menu'; break;
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
  if (keyboard) {
    const sameControl = [...app.querySelectorAll('[data-action]')].find((candidate) =>
      candidate.dataset.action === action &&
      (!['place', 'target'].includes(action) || Number(candidate.dataset.cell) === cell) &&
      !candidate.disabled);
    (sameControl ?? app.querySelector('h1'))?.focus();
  }
});

render();
