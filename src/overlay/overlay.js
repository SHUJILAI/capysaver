'use strict';

const capy = document.getElementById('capy');
const vEnter = document.getElementById('capy-enter');
const vLoop  = document.getElementById('capy-loop');
const vExit  = document.getElementById('capy-exit');
const dismiss = document.getElementById('dismiss');
const snoozeBtn = document.getElementById('snooze');
const stage = document.getElementById('stage');
const backdrop = document.getElementById('backdrop');
const dust = document.getElementById('dust');

let clickCount = 0;
let exiting = false;
let phase = 'idle'; // 'enter' | 'loop' | 'exit'

function showClip(active) {
  for (const v of [vEnter, vLoop, vExit]) {
    v.classList.toggle('active', v === active);
  }
}

async function init() {
  const [enterUrl, loopUrl, exitUrl] = await Promise.all([
    window.capy.clipUrl('capy_enter.mp4'),
    window.capy.clipUrl('capy_sleep_loop.mp4'),
    window.capy.clipUrl('capy_exit.mp4'),
  ]);
  vEnter.src = enterUrl;
  vLoop.src  = loopUrl;
  vExit.src  = exitUrl;

  // entrance plays once, then crossfade to seamless loop
  vEnter.addEventListener('ended', () => {
    if (exiting) return;
    phase = 'loop';
    vLoop.currentTime = 0;
    vLoop.play().catch(() => {});
    showClip(vLoop);
  });

  // exit clip ends -> notify main to close + count nap
  vExit.addEventListener('ended', () => {
    window.capy.overlayDismissed();
  });

  // start the show
  phase = 'enter';
  showClip(vEnter);
  // small delay so the capyDrop transform finishes before motion starts
  setTimeout(() => { vEnter.play().catch(() => {}); }, 950);
}
init();

function flashShake() {
  if (exiting) return;
  capy.classList.remove('shake');
  // reflow to restart animation
  void capy.offsetWidth;
  capy.classList.add('shake');
  setTimeout(() => {
    if (exiting) return;
    capy.classList.remove('shake');
  }, 800);
}

function startExitClip() {
  exiting = true;
  phase = 'exit';
  vLoop.pause();
  vExit.currentTime = 0;
  showClip(vExit);
  vExit.play().catch(() => {});
}

function playExitCurl(done) {
  exiting = true;
  capy.classList.remove('shake');

  // curl-snooze uses CSS animation since the wake-and-walk-out clip
  // is reserved for the "I really need to work" dismissal.
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
  // 3rd click: capybara wakes up and walks off-screen to the right,
  // then main process closes the window and counts the nap.
  startExitClip();
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
