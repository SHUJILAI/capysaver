'use strict';

const capy = document.getElementById('capy');
const dismiss = document.getElementById('dismiss');
const snoozeBtn = document.getElementById('snooze');
const stage = document.getElementById('stage');
const backdrop = document.getElementById('backdrop');
const dust = document.getElementById('dust');

let clickCount = 0;
let exiting = false;

// Three independent seamless-loop animated WebPs, each with full alpha.
// Picked at random every time the overlay opens.
const LOOPS = ['loop_sleep.webp', 'loop_alert.webp', 'loop_blink.webp'];

async function init() {
  const pick = LOOPS[Math.floor(Math.random() * LOOPS.length)];
  capy.src = await window.capy.clipUrl(pick);
}
init();

function flashShake() {
  if (exiting) return;
  capy.classList.remove('shake');
  void capy.offsetWidth; // reflow to restart animation
  capy.classList.add('shake');
  setTimeout(() => {
    if (exiting) return;
    capy.classList.remove('shake');
  }, 800);
}

function playExitLeap(done) {
  exiting = true;
  capy.classList.remove('shake');
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
  capy.classList.remove('shake');
  capy.style.animation = 'none';
  void capy.offsetWidth;

  capy.classList.add('exit-curl');
  stage.classList.add('exit-curl');
  backdrop.classList.add('exit-soft');

  setTimeout(done, 740);
}

dismiss.addEventListener('click', () => {
  if (exiting) return;
  clickCount += 1;
  if (clickCount === 1) {
    flashShake();
    dismiss.classList.remove('size-20');
    dismiss.classList.add('size-14');
    return;
  }
  if (clickCount === 2) {
    flashShake();
    dismiss.classList.remove('size-14');
    dismiss.classList.add('size-10');
    return;
  }
  // 3rd click: leap exit, then main process closes + counts the nap
  playExitLeap(() => window.capy.overlayDismissed());
});

snoozeBtn.addEventListener('click', () => {
  if (exiting) return;
  playExitCurl(() => window.capy.overlaySnooze());
});

// Escape is intentionally NOT handled. The capybara wants you to rest.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    flashShake();
  }
});
