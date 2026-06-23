const WIDTH = 6;
const HEIGHT = 8;
const CHARGE_SIZE = 3;
const TYPES = ["rock", "paper", "scissors"];
const BEATS = {
  rock: "scissors",
  scissors: "paper",
  paper: "rock",
};
const SPECIALS = {
  rock: {
    4: { id: "onyx", label: "Onix" },
    5: { id: "gold", label: "Pépite d'or" },
    6: { id: "diamond", label: "Diamant" },
  },
  paper: {
    4: { id: "green-paper", label: "Feuille verte" },
    5: { id: "bag", label: "Sac en plastique" },
    6: { id: "money", label: "Liasse de billets" },
  },
  scissors: {
    4: { id: "pruner", label: "Sécateur" },
    5: { id: "saber", label: "Sabre" },
    6: { id: "chainsaw", label: "Tronçonneuse" },
  },
};
const SPECIAL_BY_ID = Object.fromEntries(
  Object.entries(SPECIALS).flatMap(([type, tiers]) =>
    Object.entries(tiers).map(([tier, special]) => [special.id, { ...special, type, tier: Number(tier) }]),
  ),
);
const MATCH_DIRECTIONS = [
  { dr: 0, dc: 1, orientation: "horizontal" },
  { dr: 1, dc: 0, orientation: "vertical" },
];
const TETROMINOES = [
  { id: "I", cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }] },
  { id: "O", cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }] },
  { id: "T", cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }] },
  { id: "L", cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }] },
  { id: "J", cells: [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 2, col: 0 }] },
  { id: "S", cells: [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }] },
  { id: "Z", cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 2 }] },
];

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
  handPanel: document.querySelector("#handPanel"),
  swap: document.querySelector("#swapButton"),
  home: document.querySelector("#homeButton"),
  restart: document.querySelector("#restartButton"),
  startPlacement: document.querySelector("#startPlacementButton"),
  startArcade: document.querySelector("#startArcadeButton"),
  startTetris: document.querySelector("#startTetrisButton"),
  tetrisControls: document.querySelector("#tetrisControls"),
  tetrisLeft: document.querySelector("#tetrisLeftButton"),
  tetrisRotate: document.querySelector("#tetrisRotateButton"),
  tetrisRight: document.querySelector("#tetrisRightButton"),
  tetrisDrop: document.querySelector("#tetrisDropButton"),
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
  createdKeys: new Set(),
  previewFusionKeys: new Set(),
  lastAction: null,
  fallingPiece: null,
};

let dragging = false;
let dragTarget = null;
let scrambleTimers = [];
let tetrisTimer = null;

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

function isSpecial(tile) {
  return Boolean(tile?.special);
}

function isBasic(tile) {
  return Boolean(tile) && !isSpecial(tile);
}

function createBasicTile(type) {
  return { type };
}

function createSpecialTile(type, tier) {
  const special = SPECIALS[type][tier];
  return { type, special: special.id, tier };
}

function tileLabel(tile) {
  if (!tile) return "Case vide";
  return isSpecial(tile) ? SPECIAL_BY_ID[tile.special].label : LABELS[tile.type];
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

function createSymbol(tileOrType) {
  const tile = typeof tileOrType === "string" ? createBasicTile(tileOrType) : tileOrType;
  const type = tile.type;
  const symbol = document.createElementNS(SVG_NS, "svg");
  symbol.setAttribute("viewBox", "0 0 64 64");
  symbol.setAttribute("aria-hidden", "true");
  symbol.classList.add("symbol", isSpecial(tile) ? tile.special : type);

  if (isSpecial(tile)) {
    return createSpecialSymbol(symbol, tile);
  }

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

function createSpecialSymbol(symbol, tile) {
  const light = "rgba(255,255,255,0.96)";
  const shade = "rgba(20,0,35,0.3)";

  if (tile.special === "onyx") {
    symbol.append(
      svgNode("path", { d: "M10 35 L22 12 L43 10 L56 31 L47 55 L21 57 Z", fill: light }),
      svgNode("path", { d: "M22 12 L29 33 L10 35 M43 10 L36 33 L56 31 M21 57 L29 33 L47 55", fill: "none", stroke: shade, "stroke-width": "4" }),
    );
  }

  if (tile.special === "gold") {
    symbol.append(
      svgNode("path", { d: "M10 37 L18 19 L37 13 L55 28 L49 49 L27 55 L12 48 Z", fill: light }),
      svgNode("path", { d: "M27 22 L31 31 L41 34 L31 38 L27 47 L23 38 L14 34 L23 31 Z", fill: "none", stroke: shade, "stroke-width": "4", "stroke-linejoin": "round" }),
    );
  }

  if (tile.special === "diamond") {
    symbol.append(
      svgNode("path", { d: "M32 7 L55 27 L32 58 L9 27 Z", fill: light }),
      svgNode("path", { d: "M9 27 H55 M22 16 L32 58 L42 16 M9 27 L32 37 L55 27", fill: "none", stroke: shade, "stroke-width": "4", "stroke-linejoin": "round" }),
    );
  }

  if (tile.special === "green-paper") {
    symbol.append(
      svgNode("path", { d: "M15 8 H42 L54 20 V56 H15 Z", fill: light }),
      svgNode("path", { d: "M42 8 V21 H54 M24 33 H45 M34 24 V43", fill: "none", stroke: shade, "stroke-width": "5", "stroke-linecap": "round", "stroke-linejoin": "round" }),
    );
  }

  if (tile.special === "bag") {
    symbol.append(
      svgNode("path", { d: "M14 25 H50 L54 55 H10 Z", fill: light }),
      svgNode("path", { d: "M23 25 C23 10 41 10 41 25 M20 36 H44 M20 45 H44", fill: "none", stroke: shade, "stroke-width": "5", "stroke-linecap": "round" }),
    );
  }

  if (tile.special === "money") {
    symbol.append(
      svgNode("rect", { x: "10", y: "19", width: "44", height: "30", rx: "3", fill: light }),
      svgNode("path", { d: "M16 13 H50 V43 M15 29 H49 M31 25 C25 25 25 37 32 37 C39 37 39 29 33 29", fill: "none", stroke: shade, "stroke-width": "4", "stroke-linecap": "round", "stroke-linejoin": "round" }),
    );
  }

  if (tile.special === "pruner") {
    symbol.append(
      svgNode("circle", { cx: "19", cy: "46", r: "8", fill: "none", stroke: light, "stroke-width": "6" }),
      svgNode("circle", { cx: "45", cy: "46", r: "8", fill: "none", stroke: light, "stroke-width": "6" }),
      svgNode("path", { d: "M25 39 L49 12 M39 39 L15 12", fill: "none", stroke: light, "stroke-width": "7", "stroke-linecap": "round" }),
      svgNode("path", { d: "M27 29 L37 29", fill: "none", stroke: shade, "stroke-width": "4", "stroke-linecap": "round" }),
    );
  }

  if (tile.special === "saber") {
    symbol.append(
      svgNode("path", { d: "M15 51 C29 38 41 24 52 9 C52 27 42 43 22 55 Z", fill: light }),
      svgNode("path", { d: "M15 52 L28 39 M19 43 L31 55", fill: "none", stroke: shade, "stroke-width": "5", "stroke-linecap": "round" }),
    );
  }

  if (tile.special === "chainsaw") {
    symbol.append(
      svgNode("path", { d: "M9 28 H42 L56 36 L42 44 H9 Z", fill: light }),
      svgNode("path", { d: "M39 28 L55 18 V51 L39 44 M14 23 V14 H29 V23 M22 33 A6 6 0 1 0 22.1 33", fill: "none", stroke: shade, "stroke-width": "5", "stroke-linecap": "round", "stroke-linejoin": "round" }),
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

function getFallingCells(piece = state.fallingPiece) {
  if (!piece) return [];
  return piece.cells.map((cell) => ({ row: piece.row + cell.row, col: piece.col + cell.col }));
}

function getFallingTileMap() {
  const tiles = new Map();
  if (state.mode !== "tetris" || !state.fallingPiece) return tiles;
  for (const cell of getFallingCells()) {
    if (inBounds(cell.row, cell.col)) {
      tiles.set(keyOf(cell.row, cell.col), createBasicTile(state.fallingPiece.type));
    }
  }
  return tiles;
}

function render() {
  els.board.textContent = "";
  const fallingTiles = getFallingTileMap();

  for (let row = 0; row < HEIGHT; row += 1) {
    for (let col = 0; col < WIDTH; col += 1) {
      const cell = document.createElement("button");
      const key = keyOf(row, col);
      const value = state.grid[row][col];
      const fallingTile = fallingTiles.get(key);
      const isPreviewTarget =
        state.previewTarget && state.previewTarget.row === row && state.previewTarget.col === col;
      const shownTile = value ?? fallingTile ?? (isPreviewTarget ? createBasicTile(state.current) : null);

      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.setAttribute("aria-label", tileLabel(shownTile));

      if (shownTile) {
        if (isSpecial(shownTile)) {
          cell.classList.add("special", shownTile.special, `tier-${shownTile.tier}`);
        } else {
          cell.classList.add(shownTile.type);
        }
        cell.append(createSymbol(shownTile));
      } else {
        cell.classList.add("empty");
      }

      if (isPreviewTarget) {
        cell.classList.add("preview-target", "ghost");
      }

      if (fallingTile) {
        cell.classList.add("falling-tile");
      }

      if (state.previewKillKeys.has(key)) {
        cell.classList.add("preview-kill");
      }

      if (state.previewFusionKeys.has(key)) {
        cell.classList.add("preview-fusion");
      }

      if (state.burstKeys.has(key)) {
        cell.classList.add("burst");
      }

      if (state.newLineKeys.has(key)) {
        cell.classList.add("new-line");
      }

      if (state.createdKeys.has(key)) {
        cell.classList.add("created");
      }

      els.board.append(cell);
    }
  }

  const displayedCurrent = state.mode === "tetris" && state.fallingPiece ? state.fallingPiece.type : state.current;
  setPieceElement(els.currentPiece, displayedCurrent);
  setPieceElement(els.nextOne, state.queue[0]);
  setPieceElement(els.nextTwo, state.queue[1]);

  els.score.textContent = state.score.toLocaleString("fr-FR");
  els.combo.textContent = state.combo;
  els.shield.textContent = state.shields;
  els.modeTitle.textContent =
    state.mode === "placement" ? "Placement" : state.mode === "arcade" ? "Arcade" : "Tetris Arcade";
  els.arcadeMeter.classList.toggle("visible", state.mode === "arcade");
  els.tetrisControls.classList.toggle("visible", state.mode === "tetris");
  els.handPanel.classList.toggle("tetris-hand", state.mode === "tetris");
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
  if (detonation.kind === "power") {
    for (const activation of detonation.activations) {
      spawnSkillEffect(activation);
    }
  }

  const removedKeys = [...detonation.removeKeys].filter((key) => {
    const { row, col } = fromKey(key);
    return Boolean(state.grid[row][col]);
  });
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
    const isPower = detonation.kind === "power";
    navigator.vibrate(isPower ? [22, 30, 38] : wave >= 3 ? [18, 24, 28] : 18);
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

function cellPoint(row, col) {
  const cell = els.board.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  if (!cell) return null;

  const layerRect = els.effectsLayer.getBoundingClientRect();
  const rect = cell.getBoundingClientRect();
  return {
    left: rect.left - layerRect.left,
    top: rect.top - layerRect.top,
    right: rect.right - layerRect.left,
    bottom: rect.bottom - layerRect.top,
    x: rect.left - layerRect.left + rect.width / 2,
    y: rect.top - layerRect.top + rect.height / 2,
  };
}

function createSkillOverlay(color) {
  const layerRect = els.effectsLayer.getBoundingClientRect();
  const overlay = document.createElementNS(SVG_NS, "svg");
  overlay.classList.add("skill-overlay");
  overlay.setAttribute("viewBox", `0 0 ${layerRect.width} ${layerRect.height}`);
  overlay.setAttribute("width", `${layerRect.width}`);
  overlay.setAttribute("height", `${layerRect.height}`);
  overlay.style.setProperty("--fx-color", color);
  els.effectsLayer.append(overlay);
  window.setTimeout(() => overlay.remove(), 760);
  return overlay;
}

function addSkillLine(overlay, start, end, width = 8) {
  if (!start || !end) return;
  overlay.append(
    svgNode("line", {
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      class: "skill-line",
      "stroke-width": width,
    }),
  );
}

function addSkillZone(overlay, topRow, bottomRow, leftCol, rightCol) {
  const topLeft = cellPoint(Math.max(0, topRow), Math.max(0, leftCol));
  const bottomRight = cellPoint(Math.min(HEIGHT - 1, bottomRow), Math.min(WIDTH - 1, rightCol));
  if (!topLeft || !bottomRight) return;
  overlay.append(
    svgNode("rect", {
      x: topLeft.left,
      y: topLeft.top,
      width: bottomRight.right - topLeft.left,
      height: bottomRight.bottom - topLeft.top,
      rx: "8",
      class: "skill-zone",
    }),
  );
}

function diagonalEnds(row, col, dr, dc) {
  let startRow = row;
  let startCol = col;
  let endRow = row;
  let endCol = col;

  while (inBounds(startRow - dr, startCol - dc)) {
    startRow -= dr;
    startCol -= dc;
  }
  while (inBounds(endRow + dr, endCol + dc)) {
    endRow += dr;
    endCol += dc;
  }

  return [cellPoint(startRow, startCol), cellPoint(endRow, endCol)];
}

function spawnSkillEffect(activation) {
  const { row, col } = activation.specialCell;
  const { special, type } = activation.special;
  const overlay = createSkillOverlay(colorForType(type));

  if (special === "onyx") {
    addSkillLine(overlay, ...diagonalEnds(row, col, 1, 1), 9);
    addSkillLine(overlay, ...diagonalEnds(row, col, 1, -1), 9);
  }

  if (special === "green-paper") {
    addSkillZone(overlay, row - 1, row + 1, col - 1, col + 1);
  }

  if (special === "pruner") {
    addSkillLine(overlay, cellPoint(row, 0), cellPoint(row, WIDTH - 1), 10);
    addSkillLine(overlay, cellPoint(0, col), cellPoint(HEIGHT - 1, col), 10);
  }

  if (special === "gold") {
    const center = cellPoint(row, col);
    const up = cellPoint(Math.max(0, row - 2), col);
    const right = cellPoint(row, Math.min(WIDTH - 1, col + 2));
    const down = cellPoint(Math.min(HEIGHT - 1, row + 2), col);
    const left = cellPoint(row, Math.max(0, col - 2));
    if (center && up && right && down && left) {
      overlay.append(
        svgNode("polygon", {
          points: `${up.x},${up.y} ${right.x},${right.y} ${down.x},${down.y} ${left.x},${left.y}`,
          class: "skill-zone",
        }),
      );
    }
  }

  if (special === "bag") {
    if (activation.orientation === "horizontal") {
      addSkillZone(overlay, row - 1, row + 1, col - 1, col + 2);
    } else {
      addSkillZone(overlay, row - 1, row + 2, col - 1, col + 1);
    }
  }

  if (special === "saber") {
    if (activation.orientation === "horizontal") {
      addSkillZone(overlay, row, row < HEIGHT - 1 ? row + 1 : row - 1, 0, WIDTH - 1);
    } else {
      addSkillZone(overlay, 0, HEIGHT - 1, col, col < WIDTH - 1 ? col + 1 : col - 1);
    }
  }

  if (["diamond", "money", "chainsaw"].includes(special)) {
    addSkillZone(overlay, 0, HEIGHT - 1, 0, WIDTH - 1);
  }
}

function sameCell(first, second) {
  return Boolean(first && second && first.row === second.row && first.col === second.col);
}

function containsCell(cells, cell) {
  return cells.some((candidate) => sameCell(candidate, cell));
}

function findBasicRuns(grid) {
  const runs = [];

  for (const direction of MATCH_DIRECTIONS) {
    for (let row = 0; row < HEIGHT; row += 1) {
      for (let col = 0; col < WIDTH; col += 1) {
        const tile = grid[row][col];
        const previousRow = row - direction.dr;
        const previousCol = col - direction.dc;
        const previous = inBounds(previousRow, previousCol) ? grid[previousRow][previousCol] : null;

        if (!isBasic(tile) || (isBasic(previous) && previous.type === tile.type)) {
          continue;
        }

        const cells = [];
        let nextRow = row;
        let nextCol = col;

        while (inBounds(nextRow, nextCol)) {
          const next = grid[nextRow][nextCol];
          if (!isBasic(next) || next.type !== tile.type) {
            break;
          }
          cells.push({ row: nextRow, col: nextCol });
          nextRow += direction.dr;
          nextCol += direction.dc;
        }

        if (cells.length >= CHARGE_SIZE) {
          runs.push({ type: tile.type, cells, orientation: direction.orientation });
        }
      }
    }
  }

  return runs;
}

function selectBasicRuns(grid, lastAction) {
  const runs = findBasicRuns(grid);
  const occupied = new Set();
  const selected = [];

  runs.sort((first, second) => {
    const firstHasAction = containsCell(first.cells, lastAction) ? 1 : 0;
    const secondHasAction = containsCell(second.cells, lastAction) ? 1 : 0;
    if (firstHasAction !== secondHasAction) return secondHasAction - firstHasAction;
    if (first.cells.length !== second.cells.length) return second.cells.length - first.cells.length;
    return first.orientation.localeCompare(second.orientation);
  });

  for (const run of runs) {
    const keys = run.cells.map((cell) => keyOf(cell.row, cell.col));
    if (keys.some((key) => occupied.has(key))) {
      continue;
    }
    for (const key of keys) occupied.add(key);
    selected.push(run);
  }

  return selected;
}

function findSpecialActivations(grid, lastAction) {
  const activations = [];

  for (let row = 0; row < HEIGHT; row += 1) {
    for (let col = 0; col < WIDTH; col += 1) {
      const special = grid[row][col];
      if (!isSpecial(special)) {
        continue;
      }

      const candidates = [];
      for (const direction of MATCH_DIRECTIONS) {
        for (let specialIndex = 0; specialIndex < 3; specialIndex += 1) {
          const startRow = row - specialIndex * direction.dr;
          const startCol = col - specialIndex * direction.dc;
          const cells = [0, 1, 2].map((offset) => ({
            row: startRow + offset * direction.dr,
            col: startCol + offset * direction.dc,
          }));

          if (!cells.every((cell) => inBounds(cell.row, cell.col))) {
            continue;
          }

          const matchingBasics = cells.filter((_, index) => index !== specialIndex);
          if (
            matchingBasics.every((cell) => {
              const tile = grid[cell.row][cell.col];
              return isBasic(tile) && tile.type === special.type;
            })
          ) {
            candidates.push({
              special,
              specialCell: { row, col },
              cells,
              orientation: direction.orientation,
            });
          }
        }
      }

      if (candidates.length) {
        candidates.sort(
          (first, second) =>
            Number(containsCell(second.cells, lastAction)) - Number(containsCell(first.cells, lastAction)),
        );
        activations.push(candidates[0]);
      }
    }
  }

  return activations;
}

function addCell(keys, row, col) {
  if (inBounds(row, col)) {
    keys.add(keyOf(row, col));
  }
}

function addRow(keys, row) {
  for (let col = 0; col < WIDTH; col += 1) addCell(keys, row, col);
}

function addColumn(keys, col) {
  for (let row = 0; row < HEIGHT; row += 1) addCell(keys, row, col);
}

function addSpecialEffectCells(keys, grid, activation) {
  const { row, col } = activation.specialCell;
  const { special, type } = activation.special;

  for (const cell of activation.cells) addCell(keys, cell.row, cell.col);

  if (special === "onyx") {
    for (let offset = -Math.max(WIDTH, HEIGHT); offset <= Math.max(WIDTH, HEIGHT); offset += 1) {
      addCell(keys, row + offset, col + offset);
      addCell(keys, row + offset, col - offset);
    }
  }

  if (special === "green-paper") {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) addCell(keys, row + dr, col + dc);
    }
  }

  if (special === "pruner") {
    addRow(keys, row);
    addColumn(keys, col);
  }

  if (special === "gold") {
    for (let dr = -2; dr <= 2; dr += 1) {
      for (let dc = -2; dc <= 2; dc += 1) {
        if (Math.abs(dr) + Math.abs(dc) <= 2) addCell(keys, row + dr, col + dc);
      }
    }
  }

  if (special === "bag") {
    const rowRange = activation.orientation === "horizontal" ? [-1, 0, 1] : [-1, 0, 1, 2];
    const colRange = activation.orientation === "horizontal" ? [-1, 0, 1, 2] : [-1, 0, 1];
    for (const dr of rowRange) {
      for (const dc of colRange) addCell(keys, row + dr, col + dc);
    }
  }

  if (special === "saber") {
    if (activation.orientation === "horizontal") {
      addRow(keys, row);
      addRow(keys, row < HEIGHT - 1 ? row + 1 : row - 1);
    } else {
      addColumn(keys, col);
      addColumn(keys, col < WIDTH - 1 ? col + 1 : col - 1);
    }
  }

  if (["diamond", "money", "chainsaw"].includes(special)) {
    const victimType = BEATS[type];
    for (let targetRow = 0; targetRow < HEIGHT; targetRow += 1) {
      for (let targetCol = 0; targetCol < WIDTH; targetCol += 1) {
        const target = grid[targetRow][targetCol];
        if (target?.type === victimType) addCell(keys, targetRow, targetCol);
      }
    }
  }
}

function findResolutionWave(grid, lastAction) {
  const activations = findSpecialActivations(grid, lastAction);
  if (activations.length) {
    const removeKeys = new Set();
    for (const activation of activations) addSpecialEffectCells(removeKeys, grid, activation);
    return { kind: "power", removeKeys, activations, fusions: [], creations: new Map() };
  }

  const runs = selectBasicRuns(grid, lastAction);
  if (!runs.length) {
    return null;
  }

  const removeKeys = new Set();
  const creations = new Map();
  const fusions = [];

  for (const run of runs) {
    for (const cell of run.cells) addCell(removeKeys, cell.row, cell.col);

    if (run.cells.length >= 4) {
      const tier = Math.min(run.cells.length, 6);
      const anchor = containsCell(run.cells, lastAction)
        ? lastAction
        : run.cells[Math.floor((run.cells.length - 1) / 2)];
      const tile = createSpecialTile(run.type, tier);
      creations.set(keyOf(anchor.row, anchor.col), tile);
      fusions.push({ ...run, tier, anchor, tile });
    }
  }

  return { kind: "match", removeKeys, activations: [], fusions, creations };
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

function findTileKeys(tiles) {
  const keys = new Set();
  const tileSet = new Set(tiles);
  for (let row = 0; row < HEIGHT; row += 1) {
    for (let col = 0; col < WIDTH; col += 1) {
      if (tileSet.has(state.grid[row][col])) {
        keys.add(keyOf(row, col));
      }
    }
  }
  return keys;
}

async function resolveCascade(chain, animate) {
  if (chain.waves >= 20) return;

  const resolution = findResolutionWave(state.grid, state.lastAction);
  if (!resolution) return;

  chain.waves += 1;
  state.combo = chain.waves;
  const removedCells = [...resolution.removeKeys]
    .map(fromKey)
    .filter(({ row, col }) => state.grid[row][col]);

  for (const { row, col } of removedCells) {
    chain.removedTypes.add(state.grid[row][col].type);
  }

  const blockPoints = removedCells.length * 10 * chain.waves;
  const fusionBonus = resolution.fusions.reduce((sum, fusion) => sum + ({ 4: 60, 5: 150, 6: 280 }[fusion.tier]), 0);
  const powerBonus = resolution.activations.reduce(
    (sum, activation) => sum + ({ 4: 80, 5: 160, 6: 300 }[activation.special.tier]),
    0,
  );
  const waveScore = blockPoints + fusionBonus + powerBonus;
  state.score += waveScore;
  chain.score += waveScore;

  if (animate) {
    state.burstKeys = resolution.removeKeys;
    render();
    triggerImpact(resolution, chain.waves);
    const label =
      resolution.kind === "power"
        ? SPECIAL_BY_ID[resolution.activations[0].special.special].label
        : resolution.fusions.length
          ? `Fusion ${SPECIAL_BY_ID[resolution.fusions[0].tile.special].label}`
          : `x${chain.waves}`;
    showCombo(label);
    await sleep(300);
  }

  for (const { row, col } of removedCells) {
    state.grid[row][col] = null;
  }

  for (const [key, tile] of resolution.creations) {
    const { row, col } = fromKey(key);
    state.grid[row][col] = tile;
  }

  applyGravity();
  state.createdKeys = findTileKeys([...resolution.creations.values()]);
  state.lastAction = null;

  if (animate) {
    state.burstKeys = new Set();
    render();
    await sleep(220);
    state.createdKeys = new Set();
  } else {
    state.createdKeys = new Set();
  }

  await resolveCascade(chain, animate);
}

async function resolveBoard({ animate = true } = {}) {
  const chain = { waves: 0, score: 0, removedTypes: new Set() };
  await resolveCascade(chain, animate);

  let shifumiBonus = 0;
  if (chain.waves > 0 && chain.removedTypes.size === TYPES.length) {
    shifumiBonus = Math.max(150, Math.round(chain.score * 0.6));
    state.score += shifumiBonus;
    showCombo(`Shifumi +${shifumiBonus}`);
    if (animate) await sleep(520);
  }

  if (chain.waves >= 3 || shifumiBonus > 0) {
    state.shields = Math.min(3, state.shields + 1);
  }

  state.combo = chain.waves;
  state.bestCombo = Math.max(state.bestCombo, chain.waves);
  render();

  return { waves: chain.waves, score: chain.score + shifumiBonus };
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

function clearTetrisTimer() {
  if (tetrisTimer) {
    window.clearTimeout(tetrisTimer);
    tetrisTimer = null;
  }
}

function getTetrisDropDelay() {
  return Math.max(280, 760 - Math.floor(state.moves / 5) * 45);
}

function normalizeTetromino(cells) {
  const minRow = Math.min(...cells.map((cell) => cell.row));
  const minCol = Math.min(...cells.map((cell) => cell.col));
  return cells.map((cell) => ({ row: cell.row - minRow, col: cell.col - minCol }));
}

function canPlaceTetromino(piece, row = piece.row, col = piece.col, cells = piece.cells) {
  return cells.every((cell) => {
    const targetRow = row + cell.row;
    const targetCol = col + cell.col;
    return inBounds(targetRow, targetCol) && !state.grid[targetRow][targetCol];
  });
}

function spawnTetromino() {
  const template = randomItem(TETROMINOES);
  const cells = template.cells.map((cell) => ({ ...cell }));
  const width = Math.max(...cells.map((cell) => cell.col)) + 1;
  const piece = {
    id: template.id,
    type: state.current,
    cells,
    row: 0,
    col: Math.floor((WIDTH - width) / 2),
  };

  if (!canPlaceTetromino(piece)) {
    endGame("Les pièces atteignent le haut du plateau.");
    return false;
  }

  state.fallingPiece = piece;
  advancePiece();
  return true;
}

function moveTetromino(rowDelta, colDelta) {
  const piece = state.fallingPiece;
  if (!piece || !canPlaceTetromino(piece, piece.row + rowDelta, piece.col + colDelta)) {
    return false;
  }

  piece.row += rowDelta;
  piece.col += colDelta;
  return true;
}

function rotateTetromino() {
  const piece = state.fallingPiece;
  if (!piece || piece.id === "O") {
    return false;
  }

  const rotated = normalizeTetromino(piece.cells.map((cell) => ({ row: cell.col, col: -cell.row })));
  for (const kick of [0, -1, 1, -2, 2]) {
    if (canPlaceTetromino(piece, piece.row, piece.col + kick, rotated)) {
      piece.cells = rotated;
      piece.col += kick;
      return true;
    }
  }

  return false;
}

function scheduleTetrisDrop() {
  clearTetrisTimer();
  if (state.mode !== "tetris" || state.gameOver || !state.fallingPiece) {
    return;
  }

  tetrisTimer = window.setTimeout(async () => {
    await tetrisTick();
  }, getTetrisDropDelay());
}

async function clearTetrisLines() {
  const fullRows = [];
  for (let row = 0; row < HEIGHT; row += 1) {
    if (state.grid[row].every(Boolean)) {
      fullRows.push(row);
    }
  }

  if (!fullRows.length) {
    return;
  }

  const removeKeys = new Set();
  for (const row of fullRows) {
    for (let col = 0; col < WIDTH; col += 1) {
      removeKeys.add(keyOf(row, col));
    }
  }

  state.score += fullRows.length * 100;
  state.burstKeys = removeKeys;
  render();
  triggerImpact({ kind: "line", removeKeys, activations: [] }, 1);
  showCombo(fullRows.length > 1 ? `${fullRows.length} Lignes` : "Ligne");
  await sleep(260);

  for (const row of fullRows) {
    state.grid[row] = Array(WIDTH).fill(null);
  }
  applyGravity();
  state.burstKeys = new Set();
  render();
  await sleep(150);
}

async function lockTetromino() {
  const piece = state.fallingPiece;
  if (!piece) {
    return;
  }

  clearTetrisTimer();
  state.locked = true;
  for (const cell of getFallingCells(piece)) {
    state.grid[cell.row][cell.col] = createBasicTile(piece.type);
  }
  state.fallingPiece = null;
  state.lastAction = null;
  state.moves += 1;
  render();

  await sleep(80);
  await clearTetrisLines();
  await resolveBoard();

  if (!state.gameOver && spawnTetromino()) {
    state.locked = false;
    render();
    scheduleTetrisDrop();
  }
}

async function tetrisTick() {
  if (state.mode !== "tetris" || state.gameOver || state.locked) {
    scheduleTetrisDrop();
    return;
  }

  if (moveTetromino(1, 0)) {
    render();
    scheduleTetrisDrop();
  } else {
    await lockTetromino();
  }
}

function moveTetrisSideways(delta) {
  if (state.mode !== "tetris" || state.locked || state.gameOver) {
    return;
  }

  if (moveTetromino(0, delta)) {
    render();
  }
}

function rotateTetris() {
  if (state.mode !== "tetris" || state.locked || state.gameOver) {
    return;
  }

  if (rotateTetromino()) {
    render();
  }
}

async function hardDropTetromino() {
  if (state.mode !== "tetris" || state.locked || state.gameOver) {
    return;
  }

  while (moveTetromino(1, 0)) {
  }
  render();
  await lockTetromino();
}

async function placeAt(row, col) {
  if (state.mode === "tetris" || state.locked || state.gameOver || !inBounds(row, col) || state.grid[row][col]) {
    return;
  }

  state.locked = true;
  clearPreview();
  state.grid[row][col] = createBasicTile(state.current);
  state.lastAction = { row, col };
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
  if (state.mode === "tetris" || state.locked || state.gameOver || !inBounds(row, col) || state.grid[row][col]) {
    clearPreview();
    render();
    return;
  }

  const previewGrid = cloneGrid(state.grid);
  previewGrid[row][col] = createBasicTile(state.current);
  const resolution = findResolutionWave(previewGrid, { row, col });

  state.previewTarget = { row, col };
  state.previewKillKeys = resolution?.removeKeys ?? new Set();
  state.previewFusionKeys = new Set(resolution?.creations?.keys() ?? []);
  render();
}

function clearPreview() {
  state.previewTarget = null;
  state.previewKillKeys = new Set();
  state.previewFusionKeys = new Set();
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
  state.fallingPiece = null;
  clearTetrisTimer();
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
  clearTetrisTimer();
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

  if (state.mode === "tetris") {
    if (!state.gameOver && spawnTetromino()) {
      state.locked = false;
      render();
      scheduleTetrisDrop();
    }
    return;
  }

  if (!hasEmptyCell()) {
    endGame("Plus aucune case libre.");
    return;
  }

  state.locked = false;
  render();
}

function swapWithNext() {
  if (state.mode === "tetris" || state.locked || state.gameOver) {
    return;
  }

  const next = state.queue[0];
  state.queue[0] = state.current;
  state.current = next;
  clearPreview();
  render();
}

function newGame() {
  clearTetrisTimer();
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
  state.createdKeys = new Set();
  state.previewFusionKeys = new Set();
  state.lastAction = null;
  state.fallingPiece = null;
  clearPreview();
  els.effectsLayer.textContent = "";
  els.boardWrap.classList.remove("impact", "impact-heavy");
  els.modal.classList.add("hidden");
  if (state.mode === "tetris") {
    spawnTetromino();
  }
  render();
  if (state.mode === "tetris" && !state.gameOver) {
    scheduleTetrisDrop();
  }
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
  if (state.mode === "tetris" || state.locked || state.gameOver) {
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
els.tetrisLeft.addEventListener("click", () => moveTetrisSideways(-1));
els.tetrisRotate.addEventListener("click", rotateTetris);
els.tetrisRight.addEventListener("click", () => moveTetrisSideways(1));
els.tetrisDrop.addEventListener("click", hardDropTetromino);
els.home.addEventListener("click", showHome);
els.restart.addEventListener("click", newGame);
els.newGame.addEventListener("click", newGame);
els.revive.addEventListener("click", revive);
els.startPlacement.addEventListener("click", () => startGame("placement"));
els.startArcade.addEventListener("click", () => startGame("arcade"));
els.startTetris.addEventListener("click", () => startGame("tetris"));

window.addEventListener("keydown", (event) => {
  if (state.mode !== "tetris" || state.screen !== "game" || state.gameOver) {
    return;
  }

  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) {
    event.preventDefault();
  }
  if (event.key === "ArrowLeft") moveTetrisSideways(-1);
  if (event.key === "ArrowRight") moveTetrisSideways(1);
  if (event.key === "ArrowUp") rotateTetris();
  if (event.key === "ArrowDown" || event.key === " ") hardDropTetromino();
});

buildCodeRain();
playHomeIntro();
newGame();
