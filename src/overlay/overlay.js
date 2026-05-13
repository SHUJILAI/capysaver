'use strict';

const capy = document.getElementById('capy');
const dismiss = document.getElementById('dismiss');
const snoozeBtn = document.getElementById('snooze');
const stage = document.getElementById('stage');
const backdrop = document.getElementById('backdrop');
const dust = document.getElementById('dust');

let exiting = false;

// Three independent seamless-loop animated WebPs, each with full alpha.
// Picked at random every time the overlay opens.
const LOOPS = ['loop_sleep.webp', 'loop_alert.webp', 'loop_blink.webp'];

async function init() {
  const pick = LOOPS[Math.floor(Math.random() * LOOPS.length)];
  capy.src = await window.capy.clipUrl(pick);
}
init();

function playExitLeap(done) {
  exiting = true;
  capy.style.animation = 'none';
  void capy.offsetWidth;

  capy.classList.add('exit-leap');
  stage.classList.add('exit-leap');
  backdrop.classList.add('exit-flash');

  setTimeout(() => dust.classList.add('go'), 220);
  setTimeout(done, 1020);
}

function playExitCurl(done) {
  exiting = true;
  capy.style.animation = 'none';
  void capy.offsetWidth;

  capy.classList.add('exit-curl');
  stage.classList.add('exit-curl');
  backdrop.classList.add('exit-soft');

  setTimeout(done, 740);
}

// Single click — immediate dismiss, no countdown, no shrinking, no gating.
dismiss.addEventListener('click', () => {
  if (exiting) return;
  playExitLeap(() => window.capy.overlayDismissed());
});

snoozeBtn.addEventListener('click', () => {
  if (exiting) return;
  playExitCurl(() => window.capy.overlaySnooze());
});

// Escape also dismisses now (the capybara has been polite long enough).
document.addEventListener('keydown', (e) => {
  if (exiting) return;
  if (e.key === 'Escape') {
    playExitLeap(() => window.capy.overlayDismissed());
  }
});
