'use strict';

const capy = document.getElementById('capy');
const dismiss = document.getElementById('dismiss');
const snoozeBtn = document.getElementById('snooze');
const stage = document.getElementById('stage');
const backdrop = document.getElementById('backdrop');
const dust = document.getElementById('dust');

let exiting = false;

const LOOPS = ['loop_sleep.webp', 'loop_alert.webp', 'loop_blink.webp'];

function diag(msg) {
  try { window.capy.diag(msg); } catch (_e) {}
  try { console.log('[capy]', msg); } catch (_e) {}
}

capy.addEventListener('load', () => diag('img load ok size=' + capy.naturalWidth + 'x' + capy.naturalHeight));
capy.addEventListener('error', (e) => diag('img error src.length=' + (capy.src ? capy.src.length : 0)));

async function init() {
  try {
    const pick = LOOPS[Math.floor(Math.random() * LOOPS.length)];
    diag('init pick=' + pick);
    const url = await window.capy.clipUrl(pick);
    diag('init got url type=' + (url ? url.slice(0, 32) : 'null') + ' len=' + (url ? url.length : 0));
    if (url) {
      capy.src = url;
    } else {
      diag('init clip url was null — main process could not read file');
    }
  } catch (e) {
    diag('init throw: ' + (e && e.message));
  }
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

dismiss.addEventListener('click', () => {
  if (exiting) return;
  diag('dismiss click');
  playExitLeap(() => window.capy.overlayDismissed());
});

snoozeBtn.addEventListener('click', () => {
  if (exiting) return;
  diag('snooze click');
  playExitCurl(() => window.capy.overlaySnooze());
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    diag('escape keydown in renderer');
    if (!exiting) playExitLeap(() => window.capy.overlayDismissed());
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
