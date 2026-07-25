function HTMLActuator() {
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");
  this.gameContainer    = document.querySelector(".game-container");

  this.score            = 0;
  this.motionTimers     = [];
  this.motionGeneration = 0;
}

HTMLActuator.prototype.actuate = function (grid, metadata, onMotionComplete) {
  var self = this;
  var animated = typeof onMotionComplete === "function";
  this.clearMotionTimers();
  var generation = ++this.motionGeneration;

  window.requestAnimationFrame(function () {
    if (generation !== self.motionGeneration) return;

    self.gameContainer.setAttribute(
      "data-motion-phase",
      animated ? "sliding" : "settled"
    );
    self.clearContainer(self.tileContainer);

    grid.cells.forEach(function (column) {
      column.forEach(function (cell) {
        if (cell) {
          self.addTile(cell, animated);
        }
      });
    });

    self.updateScore(metadata.score);
    self.updateBestScore(metadata.bestScore);

    if (metadata.terminated) {
      if (metadata.over) {
        self.message(false); // You lose
      } else if (metadata.won) {
        self.message(true); // You win!
      }
    }

    if (!animated) return;

    var durations = self.motionDurations();
    window.requestAnimationFrame(function () {
      if (generation !== self.motionGeneration) return;

      self.motionTimers.push(window.setTimeout(function () {
        if (generation !== self.motionGeneration) return;
        self.gameContainer.setAttribute("data-motion-phase", "resolving");
      }, durations.slide));

      self.motionTimers.push(window.setTimeout(function () {
        if (generation !== self.motionGeneration) return;
        self.gameContainer.setAttribute("data-motion-phase", "settled");
        self.motionTimers = [];
        onMotionComplete();
      }, durations.slide + durations.result));
    });
  });
};

HTMLActuator.prototype.clearMotionTimers = function () {
  this.motionTimers.forEach(function (timer) {
    window.clearTimeout(timer);
  });
  this.motionTimers = [];
};

HTMLActuator.prototype.cancelMotion = function () {
  this.motionGeneration += 1;
  this.clearMotionTimers();
  this.gameContainer.setAttribute("data-motion-phase", "settled");
};

HTMLActuator.prototype.motionDurations = function () {
  var reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return reduced ? { slide: 0, result: 0 } : { slide: 240, result: 120 };
};

// Continues the game (both restart and keep playing)
HTMLActuator.prototype.continueGame = function () {
  this.clearMessage();
};

HTMLActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

HTMLActuator.prototype.addTile = function (tile, staged) {
  var self = this;

  var wrapper   = document.createElement("div");
  var inner     = document.createElement("div");
  var position  = tile.previousPosition || { x: tile.x, y: tile.y };
  var positionClass = this.positionClass(position);

  // We can't use classlist because it somehow glitches when replacing classes
  var classes = ["tile", "tile-" + tile.value, positionClass];

  if (tile.value > 2048) classes.push("tile-super");

  this.applyClasses(wrapper, classes);

  inner.classList.add("tile-inner");
  inner.textContent = tile.value;

  if (tile.previousPosition) {
    // Make sure that the tile gets rendered in the previous position first
    window.requestAnimationFrame(function () {
      classes[2] = self.positionClass({ x: tile.x, y: tile.y });
      self.applyClasses(wrapper, classes); // Update the position
    });
  } else if (tile.mergedFrom) {
    classes.push("tile-merged");
    if (staged) classes.push("tile-result-staged");
    this.applyClasses(wrapper, classes);

    // Render the tiles that merged
    tile.mergedFrom.forEach(function (merged) {
      self.addTile(merged, false);
    });
  } else {
    classes.push("tile-new");
    if (staged) classes.push("tile-result-staged");
    this.applyClasses(wrapper, classes);
  }

  // Add the inner part of the tile to the wrapper
  wrapper.appendChild(inner);

  // Put the tile on the board
  this.tileContainer.appendChild(wrapper);
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
  element.setAttribute("class", classes.join(" "));
};

HTMLActuator.prototype.normalizePosition = function (position) {
  return { x: position.x + 1, y: position.y + 1 };
};

HTMLActuator.prototype.positionClass = function (position) {
  position = this.normalizePosition(position);
  return "tile-position-" + position.x + "-" + position.y;
};

HTMLActuator.prototype.updateScore = function (score) {
  var scoreCard = this.scoreContainer.parentNode;
  var previousAddition = scoreCard.querySelector(".score-addition");
  if (previousAddition) {
    scoreCard.removeChild(previousAddition);
  }
  this.clearContainer(this.scoreContainer);

  var difference = score - this.score;
  this.score = score;

  this.scoreContainer.textContent = this.score;
  this.updateScoreSize(this.scoreContainer, this.score);

  if (difference > 0) {
    var addition = document.createElement("div");
    addition.classList.add("score-addition");
    addition.textContent = "+" + difference;

    scoreCard.appendChild(addition);
  }
};

HTMLActuator.prototype.updateBestScore = function (bestScore) {
  this.bestContainer.textContent = bestScore;
  this.updateScoreSize(this.bestContainer, bestScore);
};

HTMLActuator.prototype.updateScoreSize = function (container, value) {
  var digits = String(value).length;
  container.setAttribute("data-digits", String(digits));
  container.classList.toggle("score-value--compact", digits >= 7);
  container.classList.toggle("score-value--tiny", digits >= 9);
};

HTMLActuator.prototype.message = function (won) {
  var type    = won ? "game-won" : "game-over";
  var message = won ? "You win!" : "Game over!";

  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;
};

HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};
