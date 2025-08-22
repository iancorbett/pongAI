# Pong AI (Canvas + Brain.js)

An addition to my last game of Pong, but this time with a learning bot. The right paddle starts as a simple “teacher” AI. While it plays, the game collects training samples. Press **T** to train a small Brain.js network; then the Brain can drive the paddle.

---

## Project Layout

/project-root
├── index.html
├── style.css
└── main.js

Open `index.html` in a modern browser. No build tools required.

---

## Controls

- **Player 1 (left):** `W / S` or `↑ / ↓`
- **Player 2 (right, 2P mode):** `O / L`
- **Space** → Pause/Resume
- **R** → Restart
- **2P Mode** (checkbox) A human controls right paddle

**AI keys** (when 2P is **OFF**):
- **T** → Train neural net on collected samples
- **B** → Toggle Between **Brain** and **Teacher**
- **C** → Toggle sample **Collecting** ON/OFF

---

## How It Works (Quick)

- **Teacher AI (rule-based):** tracks the ball when it’s moving right; otherwise it drifts to the center.
- **Samples:** while the teacher drives, we log each frame:
  - Inputs (normalized to ~`0..1`):
    - `bx = ballX / canvasWidth`
    - `by = ballY / canvasHeight`
    - `bvx, bvy` = velocities mapped from `[0, 1]`
    - `ay = aiY / canvasHeight`
  - Label: one of `{ up:1 }`, `{ down:1 }`, `{ stay:1 }`
- **Train (T):** builds the neural network
- **Run:**  returns scores like `{ up:0.2, stay:0.1, down:0.7 }`; we pick the max and move `-1/0/1`.

---

## Tuning (edit in `main.js`)

```js

// These can be adjusted to create different gameplay experience
const PLAYER_SPEED = 360;
const AI_SPEED = 320;
const BALL_START_SPEED = 360;
const BALL_SPEED_GROWTH = 1.03; // ball speeds up after paddle hits

// Network & training
//these can also be adjusted to modify how neural network learns
new brain.NeuralNetwork({ hiddenLayers: [8, 6] });
iterations: 100, learningRate: 0.01, errorThresh: 0.005;
