'use strict';

const $ = (id) => document.getElementById(id);

async function load() {
  const s = await window.capy.getSettings();
  $('enabled').checked = !!s.enabled;
  $('autolaunch').checked = !!s.autoLaunch;
  $('interval').value = s.intervalMinutes || 45;
  $('time').value = s.timeOfDay || '14:00';
  $('mode-interval').checked = s.triggerMode !== 'time';
  $('mode-time').checked = s.triggerMode === 'time';
}

async function save() {
  const mode = $('mode-time').checked ? 'time' : 'interval';
  await window.capy.saveSettings({
    enabled: $('enabled').checked,
    autoLaunch: $('autolaunch').checked,
    triggerMode: mode,
    intervalMinutes: parseInt($('interval').value, 10) || 45,
    timeOfDay: $('time').value || '14:00',
  });
  const badge = $('saved');
  badge.classList.add('show');
  setTimeout(() => badge.classList.remove('show'), 1200);
}

$('save').addEventListener('click', save);
$('cancel').addEventListener('click', () => window.close());

load();
