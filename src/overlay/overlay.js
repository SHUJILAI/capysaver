'use strict';

const capyImg = document.getElementById('capy');
const dismiss = document.getElementById('dismiss');
const snoozeBtn = document.getElementById('snooze');

let clickCount = 0;
let sleepUrl = '';
let shakeUrl = '';

async function init() {
  sleepUrl = await window.capy.assetUrl('capy_sleep.png');
  shakeUrl = await window.capy.assetUrl('capy_shake.png');
  capyImg.src = sleepUrl;
}
init();

function flashShake() {
  if (!shakeUrl) return;
  capyImg.src = shakeUrl;
  capyImg.classList.remove('shake');
  // reflow to restart animation
  void capyImg.offsetWidth;
  capyImg.classList.add('shake');
  setTimeout(() => {
    capyImg.src = sleepUrl;
    capyImg.classList.remove('shake');
  }, 800);
}

dismiss.addEventListener('click', () => {
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
  // 3rd click: dismiss the overlay
  window.capy.overlayDismissed();
});

snoozeBtn.addEventListener('click', () => {
  window.capy.overlaySnooze();
});

// Escape is intentionally NOT handled. The capybara wants you to rest.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // Nope.
    flashShake();
  }
});
