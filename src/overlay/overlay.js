'use strict';

const capyVideo = document.getElementById('capy');
const capyFallback = document.getElementById('capy-fallback');
const capyWrap = document.getElementById('capy-wrap');
const dismiss = document.getElementById('dismiss');
const snoozeBtn = document.getElementById('snooze');
const stage = document.getElementById('stage');
const backdrop = document.getElementById('backdrop');
const dust = document.getElementById('dust');

let clickCount = 0;
let exiting = false;

async function init() {
  // Video: looping breathing clip (dark forest-green background designed to
  // blend with the overlay backdrop via the radial mask in CSS).
  const videoUrl = await window.capy.assetUrl('capy_sleep.mp4');
  // Fallback static photo if the platform can't decode the video.
  const fallbackUrl = await window.capy.assetUrl('capy_sleep.png');
  capyFallback.src = fallbackUrl;

  capyVideo.src = videoUrl;
  capyVideo.addEventListener('error', () => capyWrap.classList.add('video-failed'));
  // ensure autoplay actually starts (some platforms require explicit play())
  const playAttempt = capyVideo.play();
  if (playAttempt && typeof playAttempt.catch === 'function') {
    playAttempt.catch(() => {
      // muted+playsinline should always allow autoplay; if it doesn't, fall back to PNG
      capyWrap.classList.add('video-failed');
    });
  }
}
init();

function flashShake() {
  if (exiting) return;
  capyWrap.classList.remove('shake');
  void capyWrap.offsetWidth; // reflow to restart
  capyWrap.classList.add('shake');
  setTimeout(() => {
    if (exiting) return;
    capyWrap.classList.remove('shake');
  }, 800);
}

function playExitLeap(done) {
  exiting = true;
  capyWrap.classList.remove('shake');
  capyWrap.style.animation = 'none';
  void capyWrap.offsetWidth;

  capyWrap.classList.add('exit-leap');
  stage.classList.add('exit-leap');
  backdrop.classList.add('exit-flash');

  // dust puff timed to land at the moment of leap takeoff (~hop end)
  setTimeout(() => dust.classList.add('go'), 220);

  // 240 hop + 720 leap + small buffer
  setTimeout(done, 1020);
}

function playExitCurl(done) {
  exiting = true;
  capyWrap.classList.remove('shake');
  capyWrap.style.animation = 'none';
  void capyWrap.offsetWidth;

  capyWrap.classList.add('exit-curl');
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
