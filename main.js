const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const p1ScoreEl = document.getElementById("p1Score");
const p2ScoreEl = document.getElementById("p2Score");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");
const twoPlayerEl = document.getElementById("twoPlayer");

const W = canvas.width;
const H = canvas.height;
const PADDLE_W = 12;
const PADDLE_H = 90;
const BALL_SIZE = 12;
const PLAYER_X = 30;
const AI_X = W - 30 - PADDLE_W;
const PLAYER_SPEED = 360;       // make user faster
const AI_SPEED = 320;           // make ai slower
const BALL_START_SPEED = 360;   
const BALL_SPEED_GROWTH = 1.03;

let running = true;
let twoPlayer = false;
let p1Score = 0;
let p2Score = 0;

let samples = [];          //array of collected training examples
let collecting = true;     //still collecting more, will sto when set to false
let useBrain = false;      //when false teacher controls paddle when true its neural network
let trained = false;        //set true if trained and change certan UI components
let net = null;             //start neural net as null

const MAX_FOR_NORM = 900; //max velocity so that brainjs can deal with values consistently between 0 and 1

let brainReady = null; //set initial state of brainReady to null
function loadBrain() {
  if (window.brain) return Promise.resolve(window.brain); //starts as false but then returns a promise
  if (brainReady) return brainReady; //starts as false but we return a promise
  brainReady = new Promise((resolve, reject) => {
    const s = document.createElement("script"); //create a script tag element to import link
    s.src = "https://unpkg.com/brain.js@1.6.1/dist/brain-browser.min.js"; //CDN URL to a file inside of the brain.js package
    s.onload = () => resolve(window.brain);
    s.onerror = () => reject(new Error("Failed to load Brain.js"));
    document.head.appendChild(s); //add script tag to head
  });
  return brainReady;
}


const state = {
    playerY: H/2 - PADDLE_H/2,
    aiY: H/2 - PADDLE_H/2,
    ballX: W/2 - BALL_SIZE/2,
    ballY: H/2 - BALL_SIZE/2,
    ballVX: randDir() * BALL_START_SPEED,
    ballVY: BALL_START_SPEED * (Math.random() * 0.5 - 0.25),
    lastTime: 0
  };

const keys = {
    up: false, down: false,    
    p2up: false, p2down: false 
  };

  function randDir(){ return Math.random() < 0.5 ? 1 : -1; }

  function resetBall(towards = 1) {
    state.ballX = W/2 - BALL_SIZE/2;
    state.ballY = H/2 - BALL_SIZE/2;
    state.ballVX = BALL_START_SPEED * towards;
    state.ballVY = BALL_START_SPEED * (Math.random() * 0.5 - 0.25);
  }
  
  function restartGame() {
      p1Score = 0; p2Score = 0;
      state.playerY = H/2 - PADDLE_H/2;
      state.aiY = H/2 - PADDLE_H/2;
      resetBall(randDir());
      state.lastTime = 0;
      running = true;
      updateScoreUI();
    }
  
  function updateScoreUI() {
      p1ScoreEl.textContent = p1Score;
      p2ScoreEl.textContent = p2Score;
    }
  

  window.addEventListener("keydown", (e) => {
    switch (e.code) {
      case "ArrowUp": case "KeyW": keys.up = true; break;
      case "ArrowDown": case "KeyS": keys.down = true; break;
      case "KeyO": keys.p2up = true; break;
      case "KeyL": keys.p2down = true; break;
      case "Space": running = !running; break;
      case "KeyR": restartGame(); break;
        //ai keys
      case "KeyT": trainNow(); break; //trains neeural network using collected samples
      case "KeyB":
        if (!twoPlayer) { //if not in 2 player, then ai wil be playing
          useBrain = !useBrain; // turn brain on and off with B
          console.log("[pong] Mode:", useBrain ? "Brain" : "Teacher"); //log brain if brain is being used else log teacher
        }
        break;
        case "KeyC":
            if (!twoPlayer) { //onlyworks in one player
              collecting = !collecting; //toggle if training samles are being collected
              console.log("[pong] Collecting:", collecting ? "ON" : "OFF");
            }
            break;
    }
  });

  window.addEventListener("keyup", (e) => {
    switch (e.code) {
      case "ArrowUp": case "KeyW": keys.up = false; break;
      case "ArrowDown": case "KeyS": keys.down = false; break;
      case "KeyO": keys.p2up = false; break;
      case "KeyL": keys.p2down = false; break;
    }
  });

  canvas.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const y = ((t.clientY - rect.top) / rect.height) * H;
    state.playerY = Math.max(0, Math.min(H - PADDLE_H, y - PADDLE_H/2));
  }, { passive: true });

pauseBtn.addEventListener("click", () => running = !running);
restartBtn.addEventListener("click", restartGame);
twoPlayerEl.addEventListener("change", (e) => {
    twoPlayer = e.target.checked;
    if (twoPlayer) {
        useBrain = false;
        collecting = false;
        console.log("[pong] 2P mode ON — brain OFF, collecting OFF");
      } else {
        collecting = true;
        console.log("[pong] 2P mode OFF — teacher/brain active, collecting ON");
      }
});

function tick(ts) {
    if (!state.lastTime) state.lastTime = ts; // sets to current ts if starting
    const dt = Math.min((ts - state.lastTime) / 1000, 0.033); // /1000 to convert to seconds and 0.033 caps the time step
    state.lastTime = ts; //update state with new most recent lastTime

    if (running) {
        update(dt);
    }
    draw();

    requestAnimationFrame(tick);
}

function update(dt) {
    // P1 movement
    let v1 = 0; // start at standstill
    //origin on canvas is top left, so thats why up is negative 
    if (keys.up) v1 -= 1;
    if (keys.down) v1 += 1;
    //keep player 1 from going off screen
    state.playerY = clamp(state.playerY + v1 * PLAYER_SPEED * dt, 0, H - PADDLE_H);

      // P2 movement if in 2p mode
  let v2 = 0; // start at standstill
  if (twoPlayer) {
    if (keys.p2up) v2 -= 1;
    if (keys.p2down) v2 += 1;
  } else {
    if (useBrain && net && trained) {
      v2 = brainMove(); //brain controls paddle
    } else {
      v2 = teacherMove();
      if (collecting) recordSample(v2); // collecting data to train neural net
    }
}
    state.aiY = clamp(state.aiY + v2 * AI_SPEED * dt, 0, H - PADDLE_H); //keep ai paddle on screen

    state.ballX += state.ballVX * dt; //increment state depending on speed and time elapsed
    state.ballY += state.ballVY * dt; //increment state depending on speed and time elapsed

    if (state.ballY <= 0) { //hits upper boundary of canvas
        state.ballY = 0; 
        state.ballVY = Math.abs(state.ballVY); //change direction of velocity
      } else if (state.ballY + BALL_SIZE >= H) { //hits lower boundary of canvas
        state.ballY = H - BALL_SIZE;
        state.ballVY = -Math.abs(state.ballVY); //change direction of velocity
      }
}


    // paddles are lighter for visibility
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(PLAYER_X, state.playerY, PADDLE_W, PADDLE_H);
    ctx.fillRect(AI_X, state.aiY, PADDLE_W, PADDLE_H);

    // ball is same color as paddles
    ctx.fillRect(state.ballX, state.ballY, BALL_SIZE, BALL_SIZE);

      // pause overlay
  if (!running) {
    ctx.fillStyle = "rgba(15,23,42,0.5)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#f1f5f9";
    ctx.font = "bold 28px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Paused — Space to Resume", W/2, H/2);
    ctx.font = "16px ui-sans-serif, system-ui";
    ctx.fillText("R = Restart", W/2, H/2 + 28);

    //left paddle
    if (
        state.ballX <= PLAYER_X + PADDLE_W &&
        state.ballX + BALL_SIZE >= PLAYER_X &&
        state.ballY + BALL_SIZE >= state.playerY &&
        state.ballY <= state.playerY + PADDLE_H
      ) {
        state.ballX = PLAYER_X + PADDLE_W; 
        state.ballVX = Math.abs(state.ballVX) * BALL_SPEED_GROWTH;
        const rel = collisionRel(state.ballY, state.playerY);
        state.ballVY = Math.abs(state.ballVX) * 0.45 * rel;
      }
  }
        //right paddle
  if (
    state.ballX + BALL_SIZE >= AI_X &&
    state.ballX <= AI_X + PADDLE_W &&
    state.ballY + BALL_SIZE >= state.aiY &&
    state.ballY <= state.aiY + PADDLE_H
  ) {
    state.ballX = AI_X - BALL_SIZE; 
    state.ballVX = -Math.abs(state.ballVX) * BALL_SPEED_GROWTH;
    const rel = collisionRel(state.ballY, state.aiY);
    state.ballVY = Math.abs(state.ballVX) * 0.45 * rel;
  }


    //cant move paddle up or down off screen
    function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

    //start game
    updateScoreUI();
    requestAnimationFrame(tick);

   