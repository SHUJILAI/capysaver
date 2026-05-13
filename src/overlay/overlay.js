'use strict';

const capyImg = document.getElementById('capy');
const dismiss = document.getElementById('dismiss');
const snoozeBtn = document.getElementById('snooze');
const stage = document.getElementById('stage');
const backdrop = document.getElementById('backdrop');
const dust = document.getElementById('dust');

let clickCount = 0;
let exiting = false;
let sleepUrl = '';
let shakeUrl = '';

async function init() {
  sleepUrl = await window.capy.assetUrl('capy_sleep.png');
  shakeUrl = await window.capy.assetUrl('capy_shake.png');
  capyImg.src = sleepUrl;
}
init();

function flashShake() {
  if (!shakeUrl || exiting) return;
  capyImg.src = shakeUrl;
  capyImg.classList.remove('shake');
  // reflow to restart animation
  void capyImg.offsetWidth;
  capyImg.classList.add('shake');
  setTimeout(() => {
    if (exiting) return;
    capyImg.src = sleepUrl;
    capyImg.classList.remove('shake');
  }, 800);
}

function playExitLeap(done) {
  exiting = true;
  // freeze breathing/shake before exit choreography
  capyImg.classList.remove('shake');
  capyImg.style.animation = 'none';
  void capyImg.offsetWidth;

  // hop -> leap is one combined animation defined in CSS via .exit-leap
  capyImg.classList.add('exit-leap');
  stage.classList.add('exit-leap');
  backdrop.classList.add('exit-flash');

  // dust puff timed to land at the moment of leap takeoff (~240ms in)
  setTimeout(() => dust.classList.add('go'), 220);

  // Total exit length ~960ms (240 hop + 720 leap). Add small buffer.
  setTimeout(done, 1020);
}

function playExitCurl(done) {
  exiting = true;
  capyImg.classList.remove('shake');
  capyImg.style.animation = 'none';
  void capyImg.offsetWidth;

  capyImg.classList.add('exit-curl');
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
  // 3rd click: play exit, THEN tell main to close + count nap
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
