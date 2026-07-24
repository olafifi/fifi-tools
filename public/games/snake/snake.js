/* Gameplay adapted from JavaScript-Snake by Patrick Gillespie, MIT licensed. */
(function () {
  const canvas = document.querySelector('[data-snake-board]');
  const context = canvas.getContext('2d');
  const shell = document.querySelector('.snake-shell');
  const scoreNode = document.querySelector('[data-score]');
  const statusNode = document.querySelector('[data-status]');
  const buttons = [...document.querySelectorAll('[data-direction-button]')];
  const gridSize = 20;
  const cell = canvas.width / gridSize;
  const foodImage = new Image();
  foodImage.src = '../../danbai/expect.png';

  let snake = [];
  let food = { x: 15, y: 10 };
  let direction = 'right';
  let nextDirection = 'right';
  let score = 0;
  let timer = 0;
  let paused = false;

  function placeFood() {
    do {
      food = {
        x: Math.floor(Math.random() * gridSize),
        y: Math.floor(Math.random() * gridSize)
      };
    } while (snake.some((part) => part.x === food.x && part.y === food.y));
  }

  function focusGame() {
    shell.focus({ preventScroll: true });
  }

  function setDirection(next) {
    const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
    if (opposite[direction] !== next) nextDirection = next;
    shell.dataset.direction = nextDirection;
  }

  function tick() {
    if (paused) return;
    direction = nextDirection;
    const head = { ...snake[0] };
    if (direction === 'up') head.y -= 1;
    if (direction === 'down') head.y += 1;
    if (direction === 'left') head.x -= 1;
    if (direction === 'right') head.x += 1;

    const hitWall = head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize;
    const hitSelf = snake.some((part) => part.x === head.x && part.y === head.y);
    if (hitWall || hitSelf) {
      paused = true;
      statusNode.textContent = '撞到了！点窗口顶部的重开按钮再来一局。';
      draw();
      return;
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 1;
      scoreNode.textContent = String(score);
      placeFood();
    } else {
      snake.pop();
    }
    draw();
  }

  function draw() {
    context.fillStyle = '#f1efff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(41,38,65,.08)';
    for (let i = 0; i <= gridSize; i += 1) {
      context.beginPath(); context.moveTo(i * cell, 0); context.lineTo(i * cell, canvas.height); context.stroke();
      context.beginPath(); context.moveTo(0, i * cell); context.lineTo(canvas.width, i * cell); context.stroke();
    }
    if (foodImage.complete) context.drawImage(foodImage, food.x * cell, food.y * cell, cell, cell);
    else { context.fillStyle = '#ff6aa2'; context.fillRect(food.x * cell + 3, food.y * cell + 3, cell - 6, cell - 6); }
    snake.forEach((part, index) => {
      context.fillStyle = index === 0 ? '#312c68' : '#5c5cf0';
      context.beginPath();
      context.roundRect(part.x * cell + 2, part.y * cell + 2, cell - 4, cell - 4, 5);
      context.fill();
    });
  }

  function restart() {
    snake = [{ x: 7, y: 10 }, { x: 6, y: 10 }, { x: 5, y: 10 }];
    direction = 'right';
    nextDirection = 'right';
    shell.dataset.direction = 'right';
    score = 0;
    scoreNode.textContent = '0';
    statusNode.textContent = '用方向键或下方按钮开始巡逻。';
    paused = false;
    placeFood();
    draw();
    focusGame();
  }

  function onKeyDown(event) {
    const keyMap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    if (keyMap[event.key]) { event.preventDefault(); setDirection(keyMap[event.key]); }
  }

  function destroy() {
    clearInterval(timer);
    window.removeEventListener('keydown', onKeyDown);
    paused = true;
  }

  window.addEventListener('keydown', onKeyDown);
  buttons.forEach((button) => button.addEventListener('click', () => setDirection(button.dataset.directionButton)));
  FifiGameBridge.register({ restart, focus: focusGame, pause() { paused = true; }, resume() { paused = false; }, destroy });
  restart();
  timer = window.setInterval(tick, 220);
})();
