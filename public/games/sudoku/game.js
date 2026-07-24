(function () {
  let puzzle = '';
  let solution = '';
  const grid = document.querySelector('[role="grid"]');
  const status = document.querySelector('[data-status]');
  const newGameButton = document.querySelector('[data-new-game]');

  function validateCell(cell, index) {
    cell.value = cell.value.replace(/[^1-9]/g, '').slice(0, 1);
    const valid = !cell.value || cell.value === solution[index];
    cell.dataset.valid = String(valid);

    const entries = [...grid.querySelectorAll('input')].map((input) => input.value || '.').join('');
    status.textContent = entries === solution
      ? '完成！蛋白宣布你非常清醒。'
      : valid ? '继续填吧。' : '这一格好像不太对。';
  }

  function newGame() {
    puzzle = sudoku.generate('medium');
    solution = sudoku.solve(puzzle);
    const cells = [...puzzle].map((value, index) => {
      const cell = document.createElement('input');
      cell.type = 'text';
      cell.inputMode = 'numeric';
      cell.maxLength = 1;
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `第 ${Math.floor(index / 9) + 1} 行第 ${index % 9 + 1} 列`);
      const fixed = value !== '.';
      cell.dataset.fixed = String(fixed);
      cell.dataset.valid = 'true';
      cell.value = fixed ? value : '';
      cell.readOnly = fixed;
      cell.addEventListener('input', () => validateCell(cell, index));
      return cell;
    });
    grid.replaceChildren(...cells);
    status.textContent = '慢慢来，不着急。';
  }

  newGameButton.addEventListener('click', newGame);
  FifiGameBridge.register({
    restart: newGame,
    destroy() {
      puzzle = '';
      solution = '';
      newGameButton.removeEventListener('click', newGame);
      grid.replaceChildren();
    }
  });
  newGame();
})();
