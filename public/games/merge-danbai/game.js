import { DANBAI_TIERS, mergeResult, updateDangerTimer } from './merge-rules.js';
import { apiBaseFromLocation, createLeaderboardClient } from './leaderboard-client.js';
import { createLeaderboardView } from './leaderboard-view.js';
import { applyGameOverView, resetGameOverView } from './session-view.js';

const { Engine, Render, Runner, Bodies, Composite, Events } = Matter;
const stage = document.querySelector('[data-merge-stage]');
const aimBubble = document.querySelector('[data-aim-bubble]');
const aimPiece = document.querySelector('[data-aim-piece]');
const guide = document.querySelector('[data-drop-guide]');
const gameOverPanel = document.querySelector('[data-game-over]');
const finalScoreNode = document.querySelector('[data-final-score]');
const localRestart = document.querySelector('[data-local-restart]');
const nextImage = document.querySelector('[data-next-danbai] img');
const scoreNode = document.querySelector('[data-score]');
const statusNode = document.querySelector('[data-status]');
const mergeShell = document.querySelector('.merge-shell');
const leaderboardStatus = document.querySelector('[data-leaderboard-status]');
const leaderboardList = document.querySelector('[data-leaderboard-list]');
const openLeaderboard = document.querySelector('[data-open-leaderboard]');
const closeLeaderboard = document.querySelector('[data-close-leaderboard]');
const retryLeaderboard = document.querySelector('[data-retry-leaderboard]');
const qualifyingForm = document.querySelector('[data-qualifying-form]');
const nicknameInput = document.querySelector('[data-nickname]');
const submitScore = document.querySelector('[data-submit-score]');
const submitStatus = document.querySelector('[data-submit-status]');
const apiBase = apiBaseFromLocation();
const leaderboardClient = apiBase ? createLeaderboardClient({ apiBase }) : null;
const leaderboardView = createLeaderboardView({
  status: leaderboardStatus,
  list: leaderboardList,
  form: qualifyingForm,
  input: nicknameInput,
  submit: submitScore,
  submitStatus,
  retry: retryLeaderboard
});
const width = 420;
const height = 520;
const engine = Engine.create();
const runner = Runner.create();
const render = Render.create({
  element: stage,
  engine,
  options: {
    width,
    height,
    wireframes: false,
    background: '#fff9df',
    pixelRatio: Math.min(devicePixelRatio, 2)
  }
});

let score = 0;
let aimX = width / 2;
let currentTier = 0;
let nextTier = 1;
let canDrop = true;
let gameOver = false;
let gameRunId = 0;
let activeSubmission = null;
let scoreSubmitted = false;
let destroyed = false;
let dangerSince = null;
let leaderboardState = {
  entries: [],
  cutoffScore: 0,
  available: false
};
const merging = new Set();
const faceImages = new Map();

function randomStarterTier() {
  return Math.floor(Math.random() * 4);
}

function makeWalls() {
  const options = { isStatic: true, render: { fillStyle: '#312c68' } };
  return [
    Bodies.rectangle(width / 2, height + 10, width + 40, 30, options),
    Bodies.rectangle(-10, height / 2, 30, height + 40, options),
    Bodies.rectangle(width + 10, height / 2, 30, height + 40, options)
  ];
}

function addDanbai(x, y, tierIndex) {
  const tier = DANBAI_TIERS[tierIndex];
  const body = Bodies.circle(x, y, tier.radius, {
    restitution: 0.12,
    friction: 0.25,
    density: 0.0012,
    render: {
      fillStyle: tier.fill,
      strokeStyle: tier.stroke,
      lineWidth: 3
    }
  });
  body.plugin.tier = tierIndex;
  Composite.add(engine.world, body);
  return body;
}

function refreshQueue() {
  const tier = DANBAI_TIERS[currentTier];
  aimPiece.src = tier.image;
  aimBubble.style.setProperty('--bubble-size', `${tier.radius * 2}px`);
  aimBubble.style.setProperty('--bubble-fill', tier.fill);
  aimBubble.style.setProperty('--bubble-stroke', tier.stroke);
  aimBubble.style.left = `${(aimX / width) * 100}%`;
  guide.style.left = aimBubble.style.left;
  nextImage.src = DANBAI_TIERS[nextTier].image;
}

function getFaceImage(src) {
  if (!faceImages.has(src)) {
    const image = new Image();
    image.src = src;
    faceImages.set(src, image);
  }
  return faceImages.get(src);
}

function drawDanbaiFaces() {
  const context = render.context;
  for (const body of Composite.allBodies(engine.world)) {
    const tierIndex = body.plugin?.tier;
    if (tierIndex === undefined) continue;
    const tier = DANBAI_TIERS[tierIndex];
    const image = getFaceImage(tier.image);
    if (!image.complete) continue;
    const size = tier.radius * 1.56;
    context.save();
    context.translate(body.position.x, body.position.y);
    context.rotate(body.angle);
    context.beginPath();
    context.arc(0, 0, tier.radius - 2, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(255,255,255,.9)';
    context.lineWidth = 2;
    context.stroke();
    context.drawImage(image, -size / 2, -size / 2, size, size);
    context.restore();
  }
}

function updateScore(points) {
  score += points;
  scoreNode.textContent = String(score);
}

async function loadLeaderboard() {
  if (!leaderboardClient) {
    leaderboardState.available = false;
    leaderboardView.setUnavailable(false);
    return;
  }
  try {
    leaderboardState.available = false;
    leaderboardView.setLoading();
    leaderboardState = { ...(await leaderboardClient.load()), available: true };
    leaderboardView.setReady();
    leaderboardView.render(leaderboardState.entries);
  } catch {
    leaderboardState.available = false;
    leaderboardView.setUnavailable();
  }
}

function drop() {
  if (!canDrop || gameOver || destroyed) return;
  canDrop = false;
  guide.hidden = true;
  addDanbai(aimX, 68, currentTier);
  currentTier = nextTier;
  nextTier = randomStarterTier();
  refreshQueue();
  window.setTimeout(() => {
    canDrop = !gameOver && !destroyed;
    guide.hidden = !canDrop;
  }, 430);
}

function moveAim(clientX) {
  const rect = stage.getBoundingClientRect();
  const scale = width / rect.width;
  const radius = DANBAI_TIERS[currentTier].radius;
  aimX = Math.max(radius + 8, Math.min(width - radius - 8, (clientX - rect.left) * scale));
  refreshQueue();
}

function onPointerMove(event) { moveAim(event.clientX); }
function onPointerDown(event) { moveAim(event.clientX); drop(); }

Events.on(engine, 'collisionStart', ({ pairs }) => {
  for (const { bodyA, bodyB } of pairs) {
    const result = mergeResult(bodyA.plugin.tier, bodyB.plugin.tier);
    if (!result || merging.has(bodyA.id) || merging.has(bodyB.id)) continue;
    merging.add(bodyA.id);
    merging.add(bodyB.id);
    const x = (bodyA.position.x + bodyB.position.x) / 2;
    const y = (bodyA.position.y + bodyB.position.y) / 2;
    Composite.remove(engine.world, bodyA);
    Composite.remove(engine.world, bodyB);
    addDanbai(x, y, result.nextTier);
    updateScore(result.score);
  }
});

Events.on(render, 'afterRender', drawDanbaiFaces);

Events.on(engine, 'afterUpdate', () => {
  if (gameOver || destroyed) return;
  const danger = updateDangerTimer(
    Composite.allBodies(engine.world),
    dangerSince,
    engine.timing.timestamp
  );
  dangerSince = danger.since;
  if (danger.gameOver) finishGame();
});

function finishGame() {
  gameOver = true;
  canDrop = false;
  runner.enabled = false;
  applyGameOverView({
    guide,
    panel: gameOverPanel,
    finalScore: finalScoreNode,
    status: statusNode
  }, score);
  leaderboardView.showQualification({
    available: leaderboardState.available,
    entryCount: leaderboardState.entries.length,
    cutoffScore: leaderboardState.cutoffScore,
    score
  });
}

function restart() {
  gameRunId += 1;
  activeSubmission = null;
  Composite.clear(engine.world, false, true);
  Composite.add(engine.world, makeWalls());
  merging.clear();
  score = 0;
  scoreNode.textContent = '0';
  currentTier = randomStarterTier();
  nextTier = randomStarterTier();
  canDrop = true;
  gameOver = false;
  scoreSubmitted = false;
  dangerSince = null;
  runner.enabled = true;
  qualifyingForm.hidden = true;
  leaderboardView.resetSubmission();
  resetGameOverView({
    guide,
    panel: gameOverPanel,
    finalScore: finalScoreNode,
    status: statusNode
  });
  refreshQueue();
}

function destroy() {
  destroyed = true;
  canDrop = false;
  stage.removeEventListener('pointermove', onPointerMove);
  stage.removeEventListener('pointerdown', onPointerDown);
  Runner.stop(runner);
  Render.stop(render);
  Events.off(engine);
  Composite.clear(engine.world, false, true);
  render.canvas.remove();
}

stage.addEventListener('pointermove', onPointerMove);
stage.addEventListener('pointerdown', onPointerDown);
localRestart.addEventListener('click', restart);
qualifyingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!leaderboardClient || activeSubmission || scoreSubmitted) return;
  const submission = { gameRunId };
  activeSubmission = submission;
  leaderboardView.setSubmitPending(true);

  let result;
  try {
    result = await leaderboardClient.submit({
      nickname: nicknameInput.value,
      score
    });
  } catch (error) {
    if (activeSubmission !== submission || submission.gameRunId !== gameRunId) return;
    activeSubmission = null;
    leaderboardView.setSubmitError(error?.message || '提交失败，请重试。');
    return;
  }

  if (activeSubmission !== submission || submission.gameRunId !== gameRunId) return;
  scoreSubmitted = true;
  activeSubmission = null;

  const entries = Array.isArray(result?.entries) ? result.entries : leaderboardState.entries;
  const cutoffScore = Number.isFinite(result?.cutoffScore)
    ? result.cutoffScore
    : leaderboardState.cutoffScore;
  leaderboardState = { entries, cutoffScore, available: true };
  leaderboardView.setSubmitResult(Number.isInteger(result?.rank) ? result.rank : 11);
  leaderboardView.render(entries);
});
openLeaderboard.addEventListener('click', () => {
  mergeShell.classList.add('is-leaderboard-open');
  closeLeaderboard.focus({ preventScroll: true });
});
closeLeaderboard.addEventListener('click', () => {
  mergeShell.classList.remove('is-leaderboard-open');
  stage.focus({ preventScroll: true });
});
retryLeaderboard.addEventListener('click', loadLeaderboard);
FifiGameBridge.register({ restart, pause() { runner.enabled = false; }, resume() { if (!gameOver) runner.enabled = true; }, destroy });
restart();
Render.run(render);
Runner.run(runner, engine);
loadLeaderboard();
