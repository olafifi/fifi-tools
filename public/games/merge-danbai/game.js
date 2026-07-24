import { DANBAI_TIERS, mergeResult } from './merge-rules.js';

const { Engine, Render, Runner, Bodies, Composite, Events } = Matter;
const stage = document.querySelector('[data-merge-stage]');
const aimPiece = document.querySelector('[data-aim-piece]');
const nextImage = document.querySelector('[data-next-danbai] img');
const scoreNode = document.querySelector('[data-score]');
const statusNode = document.querySelector('[data-status]');
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
let destroyed = false;
const merging = new Set();

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
      sprite: {
        texture: tier.image,
        xScale: tier.radius / 64,
        yScale: tier.radius / 64
      }
    }
  });
  body.plugin.tier = tierIndex;
  Composite.add(engine.world, body);
  return body;
}

function refreshQueue() {
  const tier = DANBAI_TIERS[currentTier];
  aimPiece.src = tier.image;
  aimPiece.style.width = `${tier.radius * 2}px`;
  aimPiece.style.left = `${(aimX / width) * 100}%`;
  nextImage.src = DANBAI_TIERS[nextTier].image;
}

function updateScore(points) {
  score += points;
  scoreNode.textContent = String(score);
}

function drop() {
  if (!canDrop || gameOver || destroyed) return;
  canDrop = false;
  addDanbai(aimX, 68, currentTier);
  currentTier = nextTier;
  nextTier = randomStarterTier();
  refreshQueue();
  window.setTimeout(() => { canDrop = true; }, 430);
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

Events.on(engine, 'afterUpdate', () => {
  if (gameOver || destroyed) return;
  const danger = Composite.allBodies(engine.world).some((body) =>
    !body.isStatic && body.position.y < 108 && body.speed < 0.18 && body.plugin.tier !== undefined
  );
  if (danger) {
    gameOver = true;
    canDrop = false;
    statusNode.textContent = '堆到危险线啦！点窗口顶部的重开按钮再来一局。';
  }
});

function restart() {
  Composite.clear(engine.world, false, true);
  Composite.add(engine.world, makeWalls());
  merging.clear();
  score = 0;
  scoreNode.textContent = '0';
  currentTier = randomStarterTier();
  nextTier = randomStarterTier();
  canDrop = true;
  gameOver = false;
  statusNode.textContent = '移动蛋白，点击或轻触投放。两个相同蛋白会合成。';
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
FifiGameBridge.register({ restart, pause() { runner.enabled = false; }, resume() { runner.enabled = true; }, destroy });
restart();
Render.run(render);
Runner.run(runner, engine);
