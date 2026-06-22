const WIDTH = 6;
const HEIGHT = 8;
const CHARGE_SIZE = 3;
const TYPES = ["rock", "paper", "scissors"];
const BEATS = {
  rock: "scissors",
  scissors: "paper",
  paper: "rock",
};

const LABELS = {
  rock: "Pierre",
  paper: "Feuille",
  scissors: "Ciseaux",
};

const SVG_NS = "http://www.w3.org/2000/svg";
const PARTICLE_COUNT = 14;
const SCRAMBLE_CHARS = "01#%<>[]{}/*+-";
const RAIN_WORDS = ["rock", "paper", "scissors", "block", "combo", "push", "pfc", "0101", "[]"];

const els = {
  homeScreen: document.querySelector("#homeScreen"),
  gameScreen: document.querySelector("#gameScreen"),
  homeBootText: document.querySelector("#homeBootText"),
  homeTitle: document.querySelector("#homeTitle"),
  homePrompt: document.querySelector("#homePrompt"),
  codeRain: document.querySelector("#codeRain"),
  board: document.querySelector("#board"),
  boardWrap: document.querySelector(".board-wrap"),
  effectsLayer: document.querySelector("#effectsLayer"),
  score: document.querySelector("#scoreValue"),
  combo: document.querySelector("#comboValue"),
  shield: document.querySelector("#shieldValue"),
  currentPiece: document.querySelector("#currentPiece"),
  nextOne: document.querySelector("#nextPieceOne"),
  nextTwo: document.querySelector("#nextPieceTwo"),
  swap: document.querySelector("#swapButton"),
  home: document.querySelector("#homeButton"),
  restart: document.querySelector("#restartButton"),
  startPlacement: document.querySelector("#startPlacementButton"),
  startArcade: document.querySelector("#startArcadeButton"),
  modeTitle: document.querySelector("#modeTitle"),
  arcadeMeter: document.querySelector("#arcadeMeter"),
  rise: document.querySelector("#riseValue"),
  comboPop: document.querySelector("#comboPop"),
  modal: document.querySelector("#gameOverModal"),
  finalScore: document.querySelector("#finalScore"),
  gameOverReason: document.querySelector("#gameOverReason"),
  revive: document.querySelector("#reviveButton"),
  newGame: document.querySelector("#newGameButton"),
};

const state = {
  grid: makeGrid(),
  screen: "home",
  mode: "placement",
  score: 0,
  combo: 0,
  bestCombo: 0,
  shields: 0,
  current: null,
  queue: [],
  history: [],
  moves: 0,
  riseCountdown: 8,
  locked: false,
  gameOver: false,
  revivesUsed: 0,
  previewTarget: null,
  previewKillKeys: new Set(),
  burstKeys: new Set(),
  newLineKeys: new Set(),
};

let dragging = false;
let dragTarget = null;
let scrambleTimers = [];

function makeGrid() {
  return Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(null));
}

function keyOf(row, col) {
  return `${row},${col}`;
}

function fromKey(key) {
  const [row, col] = key.split(",").map(Number);
  return { row, col };
}

function inBounds(row, col) {
  return row >= 0 && row < HEIGHT && col >= 0 && col < WIDTH;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomScrambleChar() {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

function buildCodeRain() {
  els.codeRain.textContent = "";

  for (let column = 0; column < 12; column += 1) {
    const stream = document.createElement("span");
    const lines = [];

    for (let row = 0; row < 28; row += 1) {
      lines.push(randomItem(RAIN_WORDS));
    }

    stream.className = "code-column";
    stream.textContent = lines.join("\n");
    stream.style.setProperty("--delay", `${-Math.random() * 10}s`);
    stream.style.setProperty("--speed", `${8 + Math.random() * 7}s`);
    els.codeRain.append(stream);
  }
}

function clearScrambleTimers() {
  for (const timer of scrambleTimers) {
    window.clearInterval(timer);
    window.clearTimeout(timer);
  }
  scrambleTimers = [];
}

function scrambleText(element, finalText, delay = 0) {
  const start = window.setTimeout(() => {
    let frame = 0;
    const maxFrames = 24;
    const timer = window.setInterval(() => {
      const settled = Math.floor((frame / maxFrames) * finalText.length);
      let output = "";

      for (let index = 0; index < finalText.length; index += 1) {
        const char = finalText[index];
        if (char === " ") {
          output += " ";
        } else if (index < settled) {
          output += char;
        } else {
          output += randomScrambleChar();
        }
      }

      element.textContent = output;
      frame += 1;

      if (frame > maxFrames) {
        element.textContent = finalText;
        window.clearInterval(timer);
      }
    }, 34);

    scrambleTimers.push(timer);
  }, delay);

  scrambleTimers.push(start);
}

function playHomeIntro() {
  clearScrambleTimers();
  scrambleText(els.homeBootText, els.homeBootText.dataset.text, 80);
  scrambleText(els.homeTitle, els.homeTitle.dataset.text, 220);
  scrambleText(els.homePrompt, els.homePrompt.dataset.text, 560);
}

function cloneGrid(grid) {
  return grid.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function drawType() {
  const last = state.history[state.history.length - 1];
  const beforeLast = state.history[state.history.length - 2];
  const blocked = last && last === beforeLast ? last : null;
  const recent = state.history.slice(-12);
  const counts = Object.fromEntries(TYPES.map((type) => [type, recent.filter((item) => item === type).length]));
  const choices = TYPES.filter((type) => type !== blocked);
  const weighted = choices.map((type) => ({
    type,
    weight: Math.max(1, 6 - counts[type]),
  }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;

  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) {
      state.history.push(item.type);
      return item.type;
    }
  }

  const fallback = weighted[0].type;
  state.history.push(fallback);
  return fallback;
}

function ensureQueue() {
  while (state.queue.length < 2) {
    state.queue.push(drawType());
  }
}

function advancePiece() {
  state.current = state.queue.shift();
  ensureQueue();
}

function createSymbol(type) {
  const symbol = document.createElementNS(SVG_NS, "svg");
  symbol.setAttribute("viewBox", "0 0 64 64");
  symbol.setAttribute("aria-hidden", "true");
  symbol.classList.add("symbol", type);

  if (type === "rock") {
    symbol.append(
      svgNode("path", {
        d: "M8 35 L18 16 L38 10 L55 24 L59 42 L45 56 L22 58 L8 47 Z",
        fill: "rgba(255,255,255,0.96)",
      }),
      svgNode("path", {
        d: "M19 18 L27 31 L39 12 M24 56 L32 42 L47 55",
        fill: "none",
        stroke: "rgba(12,20,24,0.2)",
        "stroke-width": "4",
        "stroke-linecap": "round",
      }),
    );
  }

  if (type === "paper") {
    symbol.append(
      svgNode("path", {
        d: "M16 9 H42 L54 21 V55 H16 Z",
        fill: "rgba(255,255,255,0.96)",
      }),
      svgNode("path", {
        d: "M42 9 V22 H54",
        fill: "none",
        stroke: "rgba(20,34,24,0.28)",
        "stroke-width": "5",
        "stroke-linejoin": "round",
      }),
      svgNode("path", {
        d: "M24 30 H45 M24 39 H45 M24 48 H38",
        fill: "none",
        stroke: "rgba(20,34,24,0.24)",
        "stroke-width": "5",
        "stroke-linecap": "round",
      }),
    );
  }

  if (type === "scissors") {
    symbol.append(
      svgNode("circle", {
        cx: "19",
        cy: "45",
        r: "8",
        fill: "none",
        stroke: "rgba(255,255,255,0.94)",
        "stroke-width": "6",
      }),
      svgNode("circle", {
        cx: "45",
        cy: "45",
        r: "8",
        fill: "none",
        stroke: "rgba(255,255,255,0.94)",
        "stroke-width": "6",
      }),
      svgNode("path", {
        d: "M25 39 L52 13",
        fill: "none",
        stroke: "rgba(255,255,255,0.94)",
        "stroke-width": "7",
        "stroke-linecap": "round",
      }),
      svgNode("path", {
        d: "M39 39 L12 13",
        fill: "none",
        stroke: "rgba(255,255,255,0.94)",
        "stroke-width": "7",
        "stroke-linecap": "round",
      }),
      svgNode("circle", {
        cx: "32",
        cy: "35",
        r: "4",
        fill: "rgba(255,255,255,0.94)",
      }),
    );
  }

  return symbol;
}

function svgNode(name, attrs) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }
  return node;
}

function setPieceElement(element, type) {
  element.className = element.className
    .split(" ")
    .filter((name) => !TYPES.includes(name) && name !== "piece")
    .join(" ");
  element.classList.add("piece", type);
  element.textContent = "";
  element.setAttribute("aria-label", LABELS[type]);
  element.append(createSymbol(type));
}

function render() {
  els.board.textContent = "";

  for (let row = 0; row < HEIGHT; row += 1) {
    for (let col = 0; col < WIDTH; col += 1) {
      const cell = document.createElement("button");
      const key = keyOf(row, col);
      const value = state.grid[row][col];
      const isPreviewTarget =
        state.previewTarget && state.previewTarget.row === row && state.previewTarget.col === col;
      const shownType = value?.type ?? (isPreviewTarget ? state.current : null);

      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.setAttribute("aria-label", shownType ? LABELS[shownType] : "Case vide");

      if (shownType) {
        cell.classList.add(shownType);
        cell.append(createSymbol(shownType));
      } else {
        cell.classList.add("empty");
      }

      if (isPreviewTarget) {
        cell.classList.add("preview-target", "ghost");
      }

      if (state.previewKillKeys.has(key)) {
        cell.classList.add("preview-kill");
      }

      if (state.burstKeys.has(key)) {
        cell.classList.add("burst");
      }

      if (state.newLineKeys.has(key)) {
        cell.classList.add("new-line");
      }

      els.board.append(cell);
    }
  }

  setPieceElement(els.currentPiece, state.current);
  setPieceElement(els.nextOne, state.queue[0]);
  setPieceElement(els.nextTwo, state.queue[1]);

  els.score.textContent = state.score.toLocaleString("fr-FR");
  els.combo.textContent = state.combo;
  els.shield.textContent = state.shields;
  els.modeTitle.textContent = state.mode === "placement" ? "Placement" : "Arcade";
  els.arcadeMeter.classList.toggle("visible", state.mode === "arcade");
  els.rise.textContent = state.riseCountdown;
  els.revive.disabled = state.revivesUsed >= 1;
  els.revive.textContent = state.revivesUsed >= 1 ? "Revive utilisé" : "Revive";
}

function showCombo(text) {
  els.comboPop.textContent = text;
  els.comboPop.classList.remove("show");
  void els.comboPop.offsetWidth;
  els.comboPop.classList.add("show");
}

function colorForType(type) {
  if (type === "rock") return "#5da8ff";
  if (type === "paper") return "#25d486";
  return "#f4519a";
}

function triggerImpact(detonation, wave) {
  const removedKeys = [...detonation.removeKeys];
  if (!removedKeys.length) {
    return;
  }

  els.boardWrap.classList.remove("impact", "impact-heavy");
  void els.boardWrap.offsetWidth;
  els.boardWrap.classList.add(wave >= 3 || removedKeys.length >= 8 ? "impact-heavy" : "impact");
  window.setTimeout(() => {
    els.boardWrap.classList.remove("impact", "impact-heavy");
  }, 420);

  if (navigator.vibrate) {
    navigator.vibrate(wave >= 3 ? [18, 24, 28] : 18);
  }

  const firstCell = fromKey(removedKeys[0]);
  const firstType = state.grid[firstCell.row][firstCell.col]?.type ?? "rock";
  spawnBoardFlash(colorForType(firstType), wave);

  for (const key of removedKeys) {
    const { row, col } = fromKey(key);
    const cell = els.board.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    const type = state.grid[row][col]?.type ?? "rock";

    if (cell) {
      spawnExplosion(cell, colorForType(type), wave);
    }
  }
}

function spawnBoardFlash(color, wave) {
  const flash = document.createElement("span");
  flash.className = "impact-flare";
  flash.style.setProperty("--fx-color", color);
  flash.style.setProperty("--flare-scale", Math.min(1.35, 0.95 + wave * 0.12));
  els.effectsLayer.append(flash);
  window.setTimeout(() => flash.remove(), 460);
}

function spawnExplosion(cell, color, wave) {
  const layerRect = els.effectsLayer.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();
  const x = cellRect.left - layerRect.left + cellRect.width / 2;
  const y = cellRect.top - layerRect.top + cellRect.height / 2;
  const strength = Math.min(1.8, 0.95 + wave * 0.18);

  const shockwave = document.createElement("span");
  shockwave.className = "shockwave";
  shockwave.style.left = `${x}px`;
  shockwave.style.top = `${y}px`;
  shockwave.style.setProperty("--fx-color", color);
  shockwave.style.setProperty("--fx-scale", strength);
  shockwave.style.setProperty("--shock-scale", 1.35 * strength);
  els.effectsLayer.append(shockwave);

  const flash = document.createElement("span");
  flash.className = "blast-flash";
  flash.style.left = `${x}px`;
  flash.style.top = `${y}px`;
  flash.style.setProperty("--fx-color", color);
  flash.style.setProperty("--fx-scale", strength);
  flash.style.setProperty("--flash-scale", 1.15 * strength);
  els.effectsLayer.append(flash);

  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const angle = (Math.PI * 2 * index) / PARTICLE_COUNT + Math.random() * 0.34;
    const distance = 24 + Math.random() * 28 + wave * 7;
    const particle = document.createElement("span");

    particle.className = "spark";
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.setProperty("--fx-color", color);
    particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    particle.style.setProperty("--angle", `${angle}rad`);
    particle.style.setProperty("--delay", `${Math.random() * 45}ms`);
    particle.style.setProperty("--spark-w", `${7 + Math.random() * 8}px`);
    particle.style.setProperty("--spark-h", `${3 + Math.random() * 3}px`);
    els.effectsLayer.append(particle);
  }

  window.setTimeout(() => {
    shockwave.remove();
    flash.remove();
  }, 620);

  window.setTimeout(() => {
    els.effectsLayer.querySelectorAll(".spark").forEach((spark) => {
      if (spark.getAnimations().every((animation) => animation.playState === "finished")) {
        spark.remove();
      }
    });
  }, 780);
}

function findClusters(grid) {
  const visited = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(false));
  const clusters = [];
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (let row = 0; row < HEIGHT; row += 1) {
    for (let col = 0; col < WIDTH; col += 1) {
      const start = grid[row][col];
      if (!start || visited[row][col]) {
        continue;
      }

      const cells = [];
      const queue = [{ row, col }];
      visited[row][col] = true;

      while (queue.length) {
        const current = queue.shift();
        cells.push(current);

        for (const [dr, dc] of directions) {
          const nextRow = current.row + dr;
          const nextCol = current.col + dc;
          const next = inBounds(nextRow, nextCol) ? grid[nextRow][nextCol] : null;

          if (next && !visited[nextRow][nextCol] && next.type === start.type) {
            visited[nextRow][nextCol] = true;
            queue.push({ row: nextRow, col: nextCol });
          }
        }
      }

      clusters.push({ type: start.type, cells });
    }
  }

  return clusters;
}

function findDetonations(grid) {
  const clusters = findClusters(grid);
  const removeKeys = new Set();
  const detonations = [];
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (const cluster of clusters) {
    if (cluster.cells.length < CHARGE_SIZE) {
      continue;
    }

    const victimKeys = new Set();
    const victimType = BEATS[cluster.type];

    for (const cell of cluster.cells) {
      for (const [dr, dc] of directions) {
        const row = cell.row + dr;
        const col = cell.col + dc;
        const neighbor = inBounds(row, col) ? grid[row][col] : null;

        if (neighbor?.type === victimType) {
          victimKeys.add(keyOf(row, col));
        }
      }
    }

    if (victimKeys.size > 0) {
      const clusterKeys = cluster.cells.map((cell) => keyOf(cell.row, cell.col));
      for (const key of clusterKeys) removeKeys.add(key);
      for (const key of victimKeys) removeKeys.add(key);
      detonations.push({
        type: cluster.type,
        size: cluster.cells.length,
        clusterKeys,
        victimKeys: [...victimKeys],
      });
    }
  }

  return { removeKeys, detonations };
}

function applyGravity(grid = state.grid) {
  for (let col = 0; col < WIDTH; col += 1) {
    const stack = [];
    for (let row = HEIGHT - 1; row >= 0; row -= 1) {
      if (grid[row][col]) {
        stack.push(grid[row][col]);
      }
    }

    for (let row = HEIGHT - 1; row >= 0; row -= 1) {
      grid[row][col] = stack.shift() ?? null;
    }
  }
}

async function resolveBoard({ animate = true } = {}) {
  let waves = 0;
  let chainScore = 0;
  const removedTypes = new Set();

  while (waves < 20) {
    const detonation = findDetonations(state.grid);
    if (detonation.detonations.length === 0) {
      break;
    }

    waves += 1;
    state.combo = waves;

    const removedCells = [...detonation.removeKeys]
      .map(fromKey)
      .filter(({ row, col }) => state.grid[row][col]);

    for (const { row, col } of removedCells) {
      removedTypes.add(state.grid[row][col].type);
    }

    const blockPoints = removedCells.length * 10 * waves;
    const sizeBonus = detonation.detonations.reduce((sum, item) => {
      if (item.size >= 7) return sum + 120;
      if (item.size >= 5) return sum + 50;
      return sum;
    }, 0);

    state.score += blockPoints + sizeBonus;
    chainScore += blockPoints + sizeBonus;

    if (animate) {
      state.burstKeys = detonation.removeKeys;
      render();
      triggerImpact(detonation, waves);
      showCombo(`x${waves}`);
      await sleep(280);
    }

    for (const { row, col } of removedCells) {
      state.grid[row][col] = null;
    }

    applyGravity();

    if (animate) {
      state.burstKeys = new Set();
      render();
      await sleep(160);
    }
  }

  let shifumiBonus = 0;
  if (waves > 0 && removedTypes.size === TYPES.length) {
    shifumiBonus = Math.max(150, chainScore);
    state.score += shifumiBonus;
    showCombo(`Shifumi +${shifumiBonus}`);
    if (animate) await sleep(520);
  }

  if (waves >= 3 || shifumiBonus > 0) {
    state.shields = Math.min(3, state.shields + 1);
  }

  state.combo = waves;
  state.bestCombo = Math.max(state.bestCombo, waves);
  render();

  return { waves, score: chainScore + shifumiBonus };
}

function getArcadeInterval() {
  if (state.moves >= 58) return 5;
  if (state.moves >= 26) return 6;
  return 8;
}

function makeIncomingLine() {
  const line = Array(WIDTH).fill(null);
  const fillCount = Math.random() < 0.55 ? 3 : 4;
  const columns = [...Array(WIDTH).keys()].sort(() => Math.random() - 0.5).slice(0, fillCount);

  for (const col of columns) {
    line[col] = { type: TYPES[Math.floor(Math.random() * TYPES.length)] };
  }

  return line;
}

async function pushIncomingLine() {
  const overflowing = state.grid[0].some(Boolean);

  if (overflowing) {
    if (state.shields > 0) {
      state.shields -= 1;
      state.grid[0] = Array(WIDTH).fill(null);
      showCombo("Bouclier");
      render();
      await sleep(360);
    } else {
      endGame("La ligne pousse trop haut.");
      return false;
    }
  }

  for (let row = 0; row < HEIGHT - 1; row += 1) {
    state.grid[row] = state.grid[row + 1];
  }
  state.grid[HEIGHT - 1] = makeIncomingLine();
  state.newLineKeys = new Set([...Array(WIDTH).keys()].map((col) => keyOf(HEIGHT - 1, col)));
  render();
  await sleep(260);
  state.newLineKeys = new Set();
  await resolveBoard();
  return true;
}

function hasEmptyCell() {
  return state.grid.some((row) => row.some((cell) => !cell));
}

async function useShieldForFullBoard() {
  if (state.shields <= 0) {
    return false;
  }

  state.shields -= 1;
  clearBottomRows(2);
  showCombo("Bouclier");
  render();
  await sleep(360);
  await resolveBoard();
  return true;
}

function clearBottomRows(count) {
  for (let offset = 0; offset < count; offset += 1) {
    const row = HEIGHT - 1 - offset;
    if (row >= 0) {
      state.grid[row] = Array(WIDTH).fill(null);
    }
  }
  applyGravity();
}

async function placeAt(row, col) {
  if (state.locked || state.gameOver || !inBounds(row, col) || state.grid[row][col]) {
    return;
  }

  state.locked = true;
  clearPreview();
  state.grid[row][col] = { type: state.current };
  advancePiece();
  state.moves += 1;
  render();

  await sleep(80);
  await resolveBoard();

  if (state.mode === "arcade" && !state.gameOver) {
    state.riseCountdown -= 1;
    if (state.riseCountdown <= 0) {
      state.riseCountdown = getArcadeInterval();
      await pushIncomingLine();
    }
  }

  if (!state.gameOver && !hasEmptyCell()) {
    const saved = await useShieldForFullBoard();
    if (!saved && !hasEmptyCell()) {
      endGame("Plus aucune case libre.");
    }
  }

  state.locked = false;
  render();
}

function previewAt(row, col) {
  if (state.locked || state.gameOver || !inBounds(row, col) || state.grid[row][col]) {
    clearPreview();
    render();
    return;
  }

  const previewGrid = cloneGrid(state.grid);
  previewGrid[row][col] = { type: state.current };
  const detonation = findDetonations(previewGrid);

  state.previewTarget = { row, col };
  state.previewKillKeys = detonation.removeKeys;
  render();
}

function clearPreview() {
  state.previewTarget = null;
  state.previewKillKeys = new Set();
}

function cellFromEventTarget(target) {
  const cell = target.closest?.(".cell");
  if (!cell) return null;
  return {
    row: Number(cell.dataset.row),
    col: Number(cell.dataset.col),
  };
}

function cellFromPoint(x, y) {
  const target = document.elementFromPoint(x, y);
  return target ? cellFromEventTarget(target) : null;
}

function showHome() {
  if (state.locked) {
    return;
  }

  state.screen = "home";
  state.gameOver = true;
  clearPreview();
  els.effectsLayer.textContent = "";
  els.modal.classList.add("hidden");
  els.gameScreen.classList.add("hidden");
  els.homeScreen.classList.remove("hidden");
  playHomeIntro();
}

function showGame() {
  state.screen = "game";
  els.homeScreen.classList.add("hidden");
  els.gameScreen.classList.remove("hidden");
}

function startGame(mode) {
  state.mode = mode;
  showGame();
  newGame();
}

function endGame(reason) {
  state.gameOver = true;
  state.locked = false;
  clearPreview();
  els.finalScore.textContent = state.score.toLocaleString("fr-FR");
  els.gameOverReason.textContent = reason;
  els.modal.classList.remove("hidden");
  render();
}

async function revive() {
  if (!state.gameOver || state.revivesUsed >= 1) {
    return;
  }

  state.revivesUsed += 1;
  state.gameOver = false;
  state.locked = true;
  els.modal.classList.add("hidden");
  clearBottomRows(2);
  render();
  await sleep(260);
  await resolveBoard();

  if (!hasEmptyCell()) {
    endGame("Plus aucune case libre.");
    return;
  }

  state.locked = false;
  render();
}

function swapWithNext() {
  if (state.locked || state.gameOver) {
    return;
  }

  const next = state.queue[0];
  state.queue[0] = state.current;
  state.current = next;
  clearPreview();
  render();
}

function newGame() {
  state.grid = makeGrid();
  state.score = 0;
  state.combo = 0;
  state.bestCombo = 0;
  state.shields = 0;
  state.queue = [];
  state.history = [];
  state.current = drawType();
  ensureQueue();
  state.moves = 0;
  state.riseCountdown = getArcadeInterval();
  state.locked = false;
  state.gameOver = false;
  state.revivesUsed = 0;
  state.burstKeys = new Set();
  state.newLineKeys = new Set();
  clearPreview();
  els.effectsLayer.textContent = "";
  els.boardWrap.classList.remove("impact", "impact-heavy");
  els.modal.classList.add("hidden");
  render();
}

els.board.addEventListener("click", (event) => {
  const cell = cellFromEventTarget(event.target);
  if (cell) {
    placeAt(cell.row, cell.col);
  }
});

els.board.addEventListener("pointermove", (event) => {
  if (dragging) return;
  const cell = cellFromEventTarget(event.target);
  if (cell) {
    previewAt(cell.row, cell.col);
  }
});

els.board.addEventListener("pointerleave", () => {
  if (!dragging) {
    clearPreview();
    render();
  }
});

els.currentPiece.addEventListener("pointerdown", (event) => {
  if (state.locked || state.gameOver) {
    return;
  }

  dragging = true;
  dragTarget = null;
  els.currentPiece.setPointerCapture(event.pointerId);
});

els.currentPiece.addEventListener("pointermove", (event) => {
  if (!dragging) {
    return;
  }

  const cell = cellFromPoint(event.clientX, event.clientY);
  dragTarget = cell;
  if (cell) {
    previewAt(cell.row, cell.col);
  } else {
    clearPreview();
    render();
  }
});

els.currentPiece.addEventListener("pointerup", (event) => {
  if (!dragging) {
    return;
  }

  dragging = false;
  els.currentPiece.releasePointerCapture(event.pointerId);
  const target = dragTarget;
  dragTarget = null;

  if (target) {
    placeAt(target.row, target.col);
  } else {
    clearPreview();
    render();
  }
});

els.currentPiece.addEventListener("pointercancel", () => {
  dragging = false;
  dragTarget = null;
  clearPreview();
  render();
});

els.swap.addEventListener("click", swapWithNext);
els.home.addEventListener("click", showHome);
els.restart.addEventListener("click", newGame);
els.newGame.addEventListener("click", newGame);
els.revive.addEventListener("click", revive);
els.startPlacement.addEventListener("click", () => startGame("placement"));
els.startArcade.addEventListener("click", () => startGame("arcade"));

buildCodeRain();
playHomeIntro();
newGame();
