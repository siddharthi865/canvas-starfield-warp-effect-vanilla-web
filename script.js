const canvas = document.getElementById("starfield");
const ctx = canvas.getContext("2d");

let width, height;
let stars = [];
const STAR_COUNT = 800;
let speed = 8;

let mouseX = 0;
let mouseY = 0;

function resizeCanvas() {
  width = canvas.clientWidth;
  height = canvas.clientHeight;

  canvas.width = width;
  canvas.height = height;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Star class
class Star {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = (Math.random() - 0.5) * width;
    this.y = (Math.random() - 0.5) * height;
    this.z = Math.random() * width;
    this.pz = this.z;
  }

  update() {
    this.z -= speed;

    if (this.z <= 1) {
      this.reset();
      this.z = width;
      this.pz = this.z;
    }
  }

  draw() {
    const sx = (this.x / this.z) * width + width / 2;
    const sy = (this.y / this.z) * height + height / 2;

    const px = (this.x / this.pz) * width + width / 2;
    const py = (this.y / this.pz) * height + height / 2;

    this.pz = this.z;

    // Brightness based on depth
    const brightness = Math.max(0, 255 - this.z * 0.5);

    ctx.strokeStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(sx, sy);
    ctx.stroke();
  }
}

// Initialize stars
function initStars() {
  stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push(new Star());
  }
}

initStars();

// Mouse / touch control
function updateMouse(x, y) {
  mouseX = x - width / 2;
  mouseY = y - height / 2;
}

window.addEventListener("mousemove", (e) => {
  updateMouse(e.clientX, e.clientY);
});

window.addEventListener("touchmove", (e) => {
  const touch = e.touches[0];
  updateMouse(touch.clientX, touch.clientY);
});

// Animation loop
function animate() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(0, 0, width, height);

  ctx.save();

  // Slight camera shift based on mouse
  ctx.translate(mouseX * 0.05, mouseY * 0.05);

  stars.forEach((star) => {
    star.update();
    star.draw();
  });

  ctx.restore();

  requestAnimationFrame(animate);
}

animate();
