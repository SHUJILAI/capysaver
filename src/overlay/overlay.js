'use strict';

const capyImg = document.getElementById('capy');
const dismiss = document.getElementById('dismiss');
const snoozeBtn = document.getElementById('snooze');
const stage = document.getElementById('stage');
const backdrop = document.getElementById('backdrop');
const dust = document.getElementById('dust');
const countdown = document.getElementById('countdown');
const countdownNum = document.getElementById('countdown-num');

let exiting = false;
const REST_SECONDS = 30;
let restRemaining = REST_SECONDS;
let countdownTimer = null;

function renderCountdown() {
  if (restRemaining > 0) {
    if (countdownNum) countdownNum.textContent = String(restRemaining);
  } else {
    if (countdown) countdown.innerHTML = 'rest done. <span class="num">go ahead</span>';
    if (dismiss) dismiss.classList.remove('locked');
  }
}

function startCountdown() {
  renderCountdown();
  countdownTimer = setInterval(() => {
    if (exiting) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      return;
    }
    restRemaining -= 1;
    renderCountdown();
    if (restRemaining <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }, 1000);
}

function flashShake() {
  if (!capyImg) return;
  capyImg.classList.remove('shake');
  void capyImg.offsetWidth;
  capyImg.classList.add('shake');
  setTimeout(() => capyImg.classList.remove('shake'), 700);
}

const LOOPS = ['loop_sleep.webp', 'loop_alert.webp', 'loop_blink.webp'];

function diag(msg) {
  try { window.capy.diag(msg); } catch (_e) {}
  try { console.log('[capy]', msg); } catch (_e) {}
}

capyImg.addEventListener('load', () => diag('img load ok size=' + capyImg.naturalWidth + 'x' + capyImg.naturalHeight));
capyImg.addEventListener('error', (e) => diag('img error src.length=' + (capyImg.src ? capyImg.src.length : 0)));

async function init() {
  try {
    const pick = LOOPS[Math.floor(Math.random() * LOOPS.length)];
    diag('init pick=' + pick);
    const url = await window.capy.clipUrl(pick);
    diag('init got url type=' + (url ? url.slice(0, 32) : 'null') + ' len=' + (url ? url.length : 0));
    if (url) {
      capyImg.src = url;
    } else {
      diag('init clip url was null — main process could not read file');
    }
  } catch (e) {
    diag('init throw: ' + (e && e.message));
  }
  startCountdown();
}
init();

function playExitLeap(done) {
  exiting = true;
  capyImg.style.animation = 'none';
  void capyImg.offsetWidth;

  capyImg.classList.add('exit-leap');
  stage.classList.add('exit-leap');
  backdrop.classList.add('exit-flash');

  setTimeout(() => dust.classList.add('go'), 220);
  setTimeout(done, 1020);
}

function playExitCurl(done) {
  exiting = true;
  capyImg.style.animation = 'none';
  void capyImg.offsetWidth;

  capyImg.classList.add('exit-curl');
  stage.classList.add('exit-curl');
  backdrop.classList.add('exit-soft');

  setTimeout(done, 740);
}

dismiss.addEventListener('click', () => {
  if (exiting) return;
  if (restRemaining > 0) {
    diag('dismiss click while locked, remaining=' + restRemaining);
    flashShake();
    return;
  }
  diag('dismiss click');
  playExitLeap(() => window.capy.overlayDismissed());
});

snoozeBtn.addEventListener('click', () => {
  if (exiting) return;
  if (restRemaining > 0) {
    diag('snooze click while locked, remaining=' + restRemaining);
    flashShake();
    return;
  }
  diag('snooze click');
  playExitCurl(() => window.capy.overlaySnooze());
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    diag('escape keydown in renderer remaining=' + restRemaining);
    if (exiting) return;
    if (restRemaining > 0) {
      flashShake();
      return;
    }
    playExitLeap(() => window.capy.overlayDismissed());
  }
});

// Renderer-side belt-and-suspenders: triple-click anywhere on the page also
// hard-closes via main, in case the dismiss button is somehow unrendered.
let triple = 0;
let tripleTimer = null;
document.addEventListener('click', () => {
  triple += 1;
  clearTimeout(tripleTimer);
  tripleTimer = setTimeout(() => { triple = 0; }, 800);
  if (triple >= 3) {
    diag('triple-click panic close');
    window.capy.overlayForceClose();
  }
});
