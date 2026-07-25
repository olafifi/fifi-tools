# Third-party notices

The following MIT-licensed projects are vendored at fixed commits and adapted for local, offline use inside FIFI Lab. Their full license texts are preserved under `public/games/licenses/`.

| Project | Source and pinned commit | Files used | Fifi changes |
|---|---|---|---|
| 2048 | https://github.com/gabrielecirulli/2048 at `478b6ec346e3787f589e4af751378d06ded4cbbc` | HTML, JavaScript and compiled CSS | Removed remote/social content; added local bridge and responsive shell. |
| sudoku.js | https://github.com/robatron/sudoku.js at `4362a13510925f03a2f749b4657a8e4c5f36a869` | `sudoku.js` engine | Added an accessible Fifi board UI and bridge lifecycle. |
| javascript-tetris | https://github.com/jakesgordon/javascript-tetris at `e5c0c42f7dac0f3514a55eff656c6e22e95d68ed` | Gameplay reference | Adapted to a responsive canvas with lifecycle cleanup and touch controls. |
| JavaScript-Snake | https://github.com/patorjk/JavaScript-Snake at `68d0ef1a53d6a4191a9c4e4b851d5d4fdc86ce05` | Snake engine reference | Simplified theme/UI and added touch controls plus explicit cleanup. |
| Matter.js | https://github.com/liabru/matter-js at `acb99b6f8784c809b940f1d2cf745427e088e088` | `matter.min.js` | Used locally for circular Danbai physics; no library source changes. |

No runtime game asset is loaded from those repositories or any third-party server.
