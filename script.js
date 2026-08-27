const canvas = document.getElementById("starfieldCanvas");
const context = canvas.getContext("2d");

const speedControl = document.getElementById("speedControl");
const speedOutput = document.getElementById("speedOutput");
const boostButton = document.getElementById("boostButton");
const pauseButton = document.getElementById("pauseButton");

const starCountDisplay = document.getElementById("starCount");
const velocityDisplay = document.getElementById("velocityDisplay");
const statusDisplay = document.getElementById("statusDisplay");
const animationStatus = document.getElementById("animationStatus");

const stars = [];

const STAR_DENSITY = 0.00032;
const MIN_STARS = 220;
const MAX_STARS = 850;
const DEPTH = 1400;
const FOCAL_LENGTH = 420;

let width = 0;
let height = 0;
let centerX = 0;
let centerY = 0;
let devicePixelRatio = 1;

let normalSpeed = Number(speedControl.value);
let currentSpeed = normalSpeed;
let targetSpeed = normalSpeed;

let isPaused = false;
let isBoosting = false;
let animationFrameId = null;
let lastTimestamp = 0;

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

class Star {
  constructor(randomDepth = true) {
    this.reset(randomDepth);
  }

  reset(randomDepth = false) {
    const spread = Math.max(width, height);

    this.x = (Math.random() - 0.5) * spread * 2.4;
    this.y = (Math.random() - 0.5) * spread * 2.4;
    this.z = randomDepth ? Math.random() * DEPTH + 1 : DEPTH;

    this.previousZ = this.z;
    this.brightness = 0.45 + Math.random() * 0.55;
    this.size = 0.5 + Math.random() * 1.3;
  }
}

function getDesiredStarCount() {
  return Math.min(
    MAX_STARS,
    Math.max(MIN_STARS, Math.round(width * height * STAR_DENSITY)),
  );
}

function updateStarPopulation() {
  const desiredCount = getDesiredStarCount();

  while (stars.length < desiredCount) {
    stars.push(new Star(true));
  }

  if (stars.length > desiredCount) {
    stars.length = desiredCount;
  }

  starCountDisplay.textContent = stars.length.toLocaleString();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();

  width = rect.width;
  height = rect.height;
  centerX = width / 2;
  centerY = height / 2;

  devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(width * devicePixelRatio);
  canvas.height = Math.round(height * devicePixelRatio);

  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  updateStarPopulation();

  for (const star of stars) {
    star.reset(true);
  }
}

function projectStar(star, depth) {
  const scale = FOCAL_LENGTH / depth;

  return {
    x: centerX + star.x * scale,
    y: centerY + star.y * scale,
  };
}

function recycleStarIfNeeded(star, projectedX, projectedY) {
  const margin = 100;

  const outsideScreen =
    projectedX < -margin ||
    projectedX > width + margin ||
    projectedY < -margin ||
    projectedY > height + margin;

  if (star.z <= 1 || outsideScreen) {
    star.reset(false);
  }
}

function drawBackground() {
  context.fillStyle = "#020617";
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    Math.max(width, height) * 0.7,
  );

  glow.addColorStop(0, "rgba(8, 47, 73, 0.18)");
  glow.addColorStop(0.45, "rgba(15, 23, 42, 0.08)");
  glow.addColorStop(1, "rgba(2, 6, 23, 0)");

  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
}

function drawStar(star, deltaFactor) {
  star.previousZ = star.z;

  if (!isPaused) {
    star.z -= currentSpeed * deltaFactor;
  }

  const currentPoint = projectStar(star, Math.max(star.z, 1));
  const previousPoint = projectStar(star, Math.max(star.previousZ, 1));

  recycleStarIfNeeded(star, currentPoint.x, currentPoint.y);

  if (star.z >= DEPTH || star.z <= 1) {
    return;
  }

  const depthProgress = 1 - star.z / DEPTH;
  const alpha = Math.min(1, (0.2 + depthProgress * 0.9) * star.brightness);

  const speedStretch = isPaused ? 1 : 1 + currentSpeed / 8;

  const trailX =
    previousPoint.x + (previousPoint.x - currentPoint.x) * speedStretch;

  const trailY =
    previousPoint.y + (previousPoint.y - currentPoint.y) * speedStretch;

  const lineWidth = Math.min(3.5, star.size * (0.4 + depthProgress * 2.2));

  context.beginPath();
  context.moveTo(trailX, trailY);
  context.lineTo(currentPoint.x, currentPoint.y);

  context.strokeStyle = `rgba(224, 242, 254, ${alpha})`;
  context.lineWidth = lineWidth;
  context.lineCap = "round";
  context.stroke();

  if (depthProgress > 0.72) {
    context.beginPath();
    context.arc(
      currentPoint.x,
      currentPoint.y,
      lineWidth * 0.55,
      0,
      Math.PI * 2,
    );

    context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    context.fill();
  }
}

function easeSpeed() {
  if (isPaused) {
    return;
  }

  currentSpeed += (targetSpeed - currentSpeed) * 0.06;

  if (Math.abs(targetSpeed - currentSpeed) < 0.01) {
    currentSpeed = targetSpeed;
  }
}

function updateInterface() {
  const roundedSpeed = Math.round(currentSpeed);

  velocityDisplay.textContent = `${roundedSpeed}x`;

  if (isPaused) {
    statusDisplay.textContent = "Paused";
    return;
  }

  statusDisplay.textContent = isBoosting ? "Warp" : "Active";
}

function animate(timestamp) {
  const elapsed = lastTimestamp
    ? Math.min(timestamp - lastTimestamp, 50)
    : 16.67;

  lastTimestamp = timestamp;

  const deltaFactor = elapsed / 16.67;

  drawBackground();
  easeSpeed();

  for (const star of stars) {
    drawStar(star, deltaFactor);
  }

  updateInterface();

  animationFrameId = requestAnimationFrame(animate);
}

function setSpeed(value) {
  normalSpeed = Number(value);

  if (!isBoosting) {
    targetSpeed = normalSpeed;
  }

  speedOutput.textContent = normalSpeed;
}

function toggleBoost() {
  isBoosting = !isBoosting;

  if (isBoosting) {
    targetSpeed = 55;
    boostButton.textContent = "Disengage Warp";
    boostButton.setAttribute("aria-pressed", "true");
    animationStatus.textContent = "Warp drive engaged.";
  } else {
    targetSpeed = normalSpeed;
    boostButton.textContent = "Engage Warp";
    boostButton.setAttribute("aria-pressed", "false");
    animationStatus.textContent = "Warp drive disengaged.";
  }
}

function togglePause() {
  isPaused = !isPaused;

  pauseButton.setAttribute("aria-pressed", String(isPaused));
  pauseButton.textContent = isPaused ? "Resume" : "Pause";

  if (isPaused) {
    statusDisplay.textContent = "Paused";
    animationStatus.textContent = "Starfield animation paused.";
  } else {
    lastTimestamp = performance.now();
    animationStatus.textContent = "Starfield animation resumed.";
  }
}

function handleReducedMotionPreference(event) {
  if (event.matches && !isPaused) {
    isPaused = true;
    pauseButton.setAttribute("aria-pressed", "true");
    pauseButton.textContent = "Resume";
    statusDisplay.textContent = "Paused";
    animationStatus.textContent =
      "Animation paused because reduced motion is enabled.";
  }
}

speedControl.addEventListener("input", (event) => {
  setSpeed(event.target.value);
});

boostButton.addEventListener("click", toggleBoost);
pauseButton.addEventListener("click", togglePause);

window.addEventListener("resize", resizeCanvas);

if (typeof prefersReducedMotion.addEventListener === "function") {
  prefersReducedMotion.addEventListener(
    "change",
    handleReducedMotionPreference,
  );
}

resizeCanvas();
setSpeed(speedControl.value);

if (prefersReducedMotion.matches) {
  isPaused = true;
  pauseButton.setAttribute("aria-pressed", "true");
  pauseButton.textContent = "Resume";
  statusDisplay.textContent = "Paused";
}

animationFrameId = requestAnimationFrame(animate);

window.addEventListener("beforeunload", () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
});
