/* Adapted from javascript-tetris by Jake Gordon, MIT licensed. */
(function () {
  const canvas = document.querySelector('canvas');
  const context = canvas.getContext('2d');
  const shell = document.querySelector('.tetris-shell');
  const scoreNode = document.querySelector('[data-score]');
  const buttons = [...document.querySelectorAll('[data-action]')];
  const cols = 10;
  const rows = 20;
  const cell = 24;
  const colors = ['#0000', '#a43828', '#d1a447', '#376b61', '#c9798d', '#7e3048', '#efe3c9', '#6f9b86'];
  const shapes = [
    [[1, 1, 1, 1]],
    [[1, 1], [1, 1]],
    [[0, 1, 0], [1, 1, 1]],
    [[1, 0, 0], [1, 1, 1]],
    [[0, 0, 1], [1, 1, 1]],
    [[0, 1, 1], [1, 1, 0]],
    [[1, 1, 0], [0, 1, 1]]
  ];

  let board = [];
  let piece;
  let score = 0;
  let frameId = 0;
  let lastDrop = 0;
  let paused = false;
  let destroyed = false;

  const randomPiece = () => {
    const index = Math.floor(Math.random() * shapes.length);
    return { x: 3, y: -1, color: index + 1, shape: shapes[index].map((row) => [...row]) };
  };

  function collides(next = piece) {
    return next.shape.some((row, y) => row.some((filled, x) => {
      if (!filled) return false;
      const boardX = next.x + x;
      const boardY = next.y + y;
      return boardX < 0 || boardX >= cols || boardY >= rows || (boardY >= 0 && board[boardY][boardX]);
    }));
  }

  function merge() {
    piece.shape.forEach((row, y) => row.forEach((filled, x) => {
      const boardY = piece.y + y;
      if (filled && boardY >= 0) board[boardY][piece.x + x] = piece.color;
    }));

    let cleared = 0;
    board = board.filter((row) => {
      if (row.every(Boolean)) { cleared += 1; return false; }
      return true;
    });
    while (board.length < rows) board.unshift(Array(cols).fill(0));
    score += [0, 100, 300, 600, 1000][cleared];
    scoreNode.textContent = String(score);
    scoreNode.dataset.score = String(score);
    piece = randomPiece();
    if (collides()) {
      shell.dataset.gameState = 'ended';
      paused = true;
    }
  }

  function move(dx, dy) {
    const next = { ...piece, x: piece.x + dx, y: piece.y + dy };
    if (!collides(next)) { piece = next; return true; }
    if (dy > 0) merge();
    return false;
  }

  function rotate() {
    const rotated = piece.shape[0].map((_, index) => piece.shape.map((row) => row[index]).reverse());
    const next = { ...piece, shape: rotated };
    if (!collides(next)) piece = next;
  }

  function hardDrop() { while (move(0, 1)) {} }

  function perform(action) {
    if (paused) return;
    if (action === 'left') move(-1, 0);
    if (action === 'right') move(1, 0);
    if (action === 'down') move(0, 1);
    if (action === 'rotate') rotate();
    if (action === 'drop') hardDrop();
  }

  function onKeyDown(event) {
    const actions = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'rotate', ' ': 'drop' };
    if (actions[event.key]) { event.preventDefault(); perform(actions[event.key]); }
  }

  function drawCell(x, y, color) {
    context.fillStyle = colors[color];
    context.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
  }

  function draw() {
    context.fillStyle = '#211c17';
    context.fillRect(0, 0, canvas.width, canvas.height);
    board.forEach((row, y) => row.forEach((value, x) => value && drawCell(x, y, value)));
    piece.shape.forEach((row, y) => row.forEach((filled, x) => {
      if (filled && piece.y + y >= 0) drawCell(piece.x + x, piece.y + y, piece.color);
    }));
  }

  function frame(time) {
    if (!destroyed) {
      if (!paused && time - lastDrop > 650) { move(0, 1); lastDrop = time; }
      draw();
      frameId = requestAnimationFrame(frame);
    }
  }

  function restart() {
    board = Array.from({ length: rows }, () => Array(cols).fill(0));
    piece = randomPiece();
    score = 0;
    scoreNode.textContent = '0';
    scoreNode.dataset.score = '0';
    shell.dataset.gameState = 'running';
    paused = false;
    lastDrop = performance.now();
  }

  function destroy() {
    destroyed = true;
    paused = true;
    cancelAnimationFrame(frameId);
    window.removeEventListener('keydown', onKeyDown);
    buttons.forEach((button) => button.replaceWith(button.cloneNode(true)));
  }

  window.addEventListener('keydown', onKeyDown);
  buttons.forEach((button) => button.addEventListener('click', () => perform(button.dataset.action)));
  FifiGameBridge.register({ restart, pause() { paused = true; }, resume() { paused = false; }, destroy });
  restart();
  frameId = requestAnimationFrame(frame);
})();
