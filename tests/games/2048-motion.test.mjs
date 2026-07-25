import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function createManager() {
  const deterministicMath = Object.create(Math);
  deterministicMath.random = () => 0;
  const context = vm.createContext({ console, Math: deterministicMath });

  for (const file of ['tile.js', 'grid.js', 'game_manager.js']) {
    const source = await readFile(`public/games/2048/js/${file}`, 'utf8');
    vm.runInContext(source, context, { filename: file });
  }

  class Input {
    constructor() {
      this.events = {};
    }

    on(name, callback) {
      this.events[name] = callback;
    }

    move(command) {
      this.events.move(command);
    }
  }

  class Actuator {
    constructor() {
      this.completions = [];
    }

    actuate(_grid, _metadata, onComplete) {
      if (onComplete) this.completions.push(onComplete);
    }

    complete() {
      const callback = this.completions.shift();
      if (!callback) throw new Error('没有等待完成的移动动画。');
      callback();
    }

    cancelMotion() {
      this.completions = [];
    }

    continueGame() {}
  }

  class Storage {
    constructor() {
      this.best = 0;
    }

    getGameState() { return null; }
    setGameState() {}
    clearGameState() {}
    getBestScore() { return this.best; }
    setBestScore(value) { this.best = value; }
  }

  const manager = new context.GameManager(4, Input, Actuator, Storage);

  function setSingleTile(x, y, value = 2) {
    manager.grid = new context.Grid(4);
    manager.grid.insertTile(new context.Tile({ x, y }, value));
    manager.score = 0;
    manager.over = false;
    manager.won = false;
    manager.keepPlaying = false;
  }

  return { manager, setSingleTile };
}

async function createKeyboardInput() {
  const documentListeners = {};
  const boardListeners = {};
  const passiveControl = { addEventListener() {} };
  const board = {
    addEventListener(name, callback) {
      boardListeners[name] = callback;
    }
  };
  const document = {
    addEventListener(name, callback) {
      documentListeners[name] = callback;
    },
    getElementsByClassName() {
      return [board];
    },
    querySelector() {
      return passiveControl;
    }
  };
  const window = { navigator: { msPointerEnabled: false } };
  const context = vm.createContext({ document, window });
  const source = await readFile('public/games/2048/js/keyboard_input_manager.js', 'utf8');
  vm.runInContext(source, context, { filename: 'keyboard_input_manager.js' });

  return {
    input: new context.KeyboardInputManager(),
    documentListeners,
    boardListeners
  };
}

test('holds a second direction until the current move finishes', async () => {
  const { manager, setSingleTile } = await createManager();
  setSingleTile(3, 0);

  manager.inputManager.move(3);
  const afterLeft = manager.grid.serialize();
  manager.inputManager.move(2);

  assert.deepEqual(manager.grid.serialize(), afterLeft);
  assert.deepEqual(Array.from(manager.moveQueue), [2]);
  assert.equal(manager.motionActive, true);

  manager.actuator.complete();
  assert.notDeepEqual(manager.grid.serialize(), afterLeft);
  assert.deepEqual(Array.from(manager.moveQueue), []);
});

test('an invalid direction does not lock the following valid move', async () => {
  const { manager, setSingleTile } = await createManager();
  setSingleTile(0, 0);

  manager.inputManager.move(3);
  assert.equal(manager.motionActive, false);

  manager.inputManager.move(1);
  assert.equal(manager.motionActive, true);
  assert.equal(manager.grid.cellContent({ x: 3, y: 0 }).value, 2);
});

test('restart clears an active move and every queued direction', async () => {
  const { manager, setSingleTile } = await createManager();
  setSingleTile(3, 0);

  manager.inputManager.move(3);
  manager.inputManager.move(2);
  manager.restart();

  assert.equal(manager.motionActive, false);
  assert.deepEqual(Array.from(manager.moveQueue), []);
  assert.deepEqual(manager.actuator.completions, []);
});

test('keeps at most three queued moves and collapses only auto-repeat duplicates', async () => {
  const { manager, setSingleTile } = await createManager();
  setSingleTile(3, 0);

  manager.inputManager.move({ direction: 3, repeat: false, source: 'keyboard' });
  manager.inputManager.move({ direction: 2, repeat: true, source: 'keyboard' });
  manager.inputManager.move({ direction: 2, repeat: true, source: 'keyboard' });
  manager.inputManager.move({ direction: 1, repeat: false, source: 'keyboard' });
  manager.inputManager.move({ direction: 1, repeat: false, source: 'keyboard' });
  manager.inputManager.move({ direction: 0, repeat: false, source: 'keyboard' });

  assert.deepEqual(Array.from(manager.moveQueue), [2, 1, 1]);
});

test('emits repeat metadata for keyboard moves and touch metadata for swipes', async () => {
  const { input, documentListeners, boardListeners } = await createKeyboardInput();
  const commands = [];
  input.on('move', (command) => commands.push(JSON.parse(JSON.stringify(command))));

  documentListeners.keydown({
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    which: 37,
    repeat: true,
    preventDefault() {}
  });

  boardListeners.touchstart({
    touches: [{ clientX: 180, clientY: 80 }],
    targetTouches: [{ clientX: 180, clientY: 80 }],
    preventDefault() {}
  });
  boardListeners.touchend({
    touches: [],
    targetTouches: [],
    changedTouches: [{ clientX: 80, clientY: 80 }]
  });

  assert.deepEqual(commands, [
    { direction: 3, repeat: true, source: 'keyboard' },
    { direction: 3, repeat: false, source: 'touch' }
  ]);
});
