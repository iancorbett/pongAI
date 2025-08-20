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