// App bootstrap. Core engine, post pass and scenes are added by later tasks.
const canvas = document.getElementById('gl');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resize();
window.addEventListener('resize', resize);
