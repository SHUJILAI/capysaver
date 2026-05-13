# CapySaver

**The screensaver that actually stops you.**

Most screensavers are polite. They wait. They defer. They let you keep typing through your
eighth hour in a row. This one does not.

CapySaver schedules forced breaks using a capybara who lives in your menu bar. When the timer
fires, the capybara slides onto your screen, sits on your work, and locks the dismiss button
for **30 seconds of mandatory stillness** with a live countdown. Only after the timer runs
out does the "let me work :(" button unlock — one click and the capybara curls up and slides
away. By the time it's gone, your shoulders have already dropped.

<p align="center">
  <img src="docs/demo.gif" alt="CapySaver demo" width="720" />
  <br/>
  <sub>(replace <code>docs/demo.gif</code> with your own recording — see "Contributing")</sub>
</p>

---

## Download

| Platform | File |
|---|---|
| macOS (Apple Silicon) | [CapySaver-arm64.dmg](https://github.com/SHUJILAI/capysaver/releases/latest/download/CapySaver-0.1.6-arm64.dmg) |
| macOS (Intel)         | [CapySaver-x64.dmg](https://github.com/SHUJILAI/capysaver/releases/latest/download/CapySaver-0.1.6.dmg) |
| Windows               | [CapySaver-Setup.exe](https://github.com/SHUJILAI/capysaver/releases/latest/download/CapySaver-Setup-0.1.6.exe) |
| Linux                 | [CapySaver.AppImage](https://github.com/SHUJILAI/capysaver/releases/latest/download/CapySaver-0.1.6.AppImage) |

> **macOS note:** the `.app` is **ad-hoc signed in CI** but **not Apple-notarized**, because
> notarization requires a paid Apple Developer account (US$99/yr). What you'll see depends on
> your macOS version:
>
> - **macOS Sequoia 15+ ("Apple cannot verify… is free of malware")**: Sequoia removed the
>   right-click → Open bypass for unnotarized apps. Two ways to allow it:
>
>   - **Easiest, one Terminal line** — strip the quarantine flag and double-click works:
>
>     ```bash
>     sudo xattr -dr com.apple.quarantine /Applications/CapySaver.app
>     ```
>
>   - **No-Terminal version** — when the warning appears, click **Done**, then open
>     **System Settings → Privacy & Security**, scroll to the bottom, and click
>     **Open Anyway** next to the line about CapySaver. Confirm with your password.
>
> - **macOS Sonoma / Ventura and earlier ("unidentified developer")**: right-click the app
>   in `/Applications` and choose **Open**, then confirm. First launch only.
>
> - **"CapySaver is damaged and can't be opened"** _(rare in 0.1.6+)_: this used to happen on
>   unsigned Apple Silicon builds. The 0.1.6 release ships ad-hoc signed binaries so this
>   should be gone. If it still fires, run:
>
>   ```bash
>   sudo xattr -cr /Applications/CapySaver.app
>   sudo codesign --force --deep --sign - /Applications/CapySaver.app
>   ```

## Install in 30 seconds

1. **Download** the file for your platform from the table above.
2. **Open it.**
   - macOS: drag `CapySaver.app` into `Applications`.
   - Windows: run the installer.
   - Linux: `chmod +x CapySaver.AppImage && ./CapySaver.AppImage`.
3. **Look at the menu bar / system tray.** There's a sleeping capybara up there now. Click it
   to open settings.

## How it works

When the interval fires, CapySaver opens a transparent, always-on-top window across your whole
screen. Three different animated capybara loops are bundled — sleeping, alert, and a
head-close-up blink — and the overlay picks one at random each time so you don't get bored of
the same nap.

Then it locks the dismiss button for 30 seconds:

- **0 → 30 seconds** — the "let me work :(" button is dashed and faded, with a live countdown
  underneath: *"rest 27s before you can leave"*. Clicking it just shakes the screen.
  The capybara is asleep on your work and you can't argue with it.
- **at 30 seconds** — the countdown ends, the button solidifies, and the line under it flips
  to *"rest done. go ahead"*.
- **one click** — the capybara curls up and slides off-screen, the window fades, you're back
  to your work.

That's the whole loop. It's not gamified. It's not productivity-tracked. The 30 seconds is
the entire point — long enough that you'll actually look away from the screen, short enough
that you don't resent it.

## Settings

Open settings from the tray menu → **Settings…**

- **Interval** — how often the capybara wakes up. Default: every 45 minutes. Or set an exact
  time of day (e.g. `14:00`).
- **Snooze** — click from the tray menu to skip the next nap by 10 minutes.
- **Launch at login** — CapySaver starts quietly when you log in, no dock icon on macOS.
- **Naps today** — the tray tooltip tracks how many times the capybara has visited you today.

## Why bother

RSI, eye strain, and burnout all respond extremely well to *"stop for 30 seconds every
hour."* The advice is boring. The capybara is not. CapySaver is the boring advice, repackaged
as a pet you can't ignore.

It's free, open source (MIT), and runs on macOS, Windows, and Linux. It does not phone home,
collect telemetry, or know anything about you. It just sits in your tray and waits.

## Contributing

Pull requests welcome — especially if you want to replace the capybara with a different
animal.

- `assets/clips/` — three animated WebPs picked at random per overlay (sleeping / alert /
  blink). Drop in replacements at the same dimensions.
- `assets/sprites/` — tray icon + the small "thinking" pose used by the settings window.
- `src/overlay/overlay.css` — animation, palette, tagline, button shrink curve.
- `src/main.js` — scheduling logic, tray menu, IPC bridge to the overlay.

To record the demo GIF: clone the repo on your machine, run `npm run dev`, set the trigger to
`every 1 minute`, screen-record the overlay, and drop the GIF at `docs/demo.gif`.

```bash
git clone https://github.com/SHUJILAI/capysaver.git
cd capysaver
npm install
npm run dev
```

## License

MIT. Credits to [happycapy.ai](https://happycapy.ai).

— a capybara
