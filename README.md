# CapySaver

**The screensaver that actually stops you.**

A friendly capybara shows up on your screen at your chosen interval and refuses to leave until you
agree to rest. It takes three clicks on a shrinking dismiss button to send it away — just long enough
to make you take an actual breath. It lives quietly in your menu bar / system tray the rest of the
time.

<p align="center">
  <img src="docs/demo.gif" alt="CapySaver demo" width="720" />
  <br/>
  <sub>(replace <code>docs/demo.gif</code> with your own recording — see "Contributing")</sub>
</p>

---

## Download

| Platform | File |
|---|---|
| macOS (Apple Silicon) | [CapySaver-arm64.dmg](https://github.com/SHUJILAI/capysaver/releases/latest/download/CapySaver-0.1.0-arm64.dmg) |
| macOS (Intel)         | [CapySaver-x64.dmg](https://github.com/SHUJILAI/capysaver/releases/latest/download/CapySaver-0.1.0.dmg) |
| Windows               | [CapySaver-Setup.exe](https://github.com/SHUJILAI/capysaver/releases/latest/download/CapySaver-Setup-0.1.0.exe) |
| Linux                 | [CapySaver.AppImage](https://github.com/SHUJILAI/capysaver/releases/latest/download/CapySaver-0.1.0.AppImage) |

> **macOS note:** the build is unsigned for now. If macOS says _"CapySaver can't be opened because
> it is from an unidentified developer"_, right-click the app and choose **Open**, then confirm.
> You only need to do this the first time.

## Install in 30 seconds

1. **Download** the file for your platform from the table above.
2. **Open it.**
   - macOS: drag `CapySaver.app` into `Applications`.
   - Windows: run the installer.
   - Linux: `chmod +x CapySaver.AppImage && ./CapySaver.AppImage`.
3. **Look at the menu bar / system tray.** There's a sleeping capybara up there now. Click it to
   open settings.

## Settings

Open settings from the tray menu → **Settings…**

- **Interval** — how often the capybara wakes up. Default: every 45 minutes. Or set an exact time
  of day (e.g. `14:00`).
- **Snooze** — click from the tray menu to skip the next nap by 10 minutes.
- **Launch at login** — CapySaver starts quietly when you log in, no dock icon on macOS.
- **Naps today** — the tray tooltip tracks how many times the capybara has visited you today.

## What is this

Most screensavers are polite. They wait. They defer. They let you keep typing through your eighth
hour in a row. This one does not.

CapySaver is a small Electron app that schedules forced breaks using a capybara mascot. When the
timer fires, a transparent always-on-top window slides a sleeping capybara onto your screen with
a dimmed backdrop and some lazy little `z z z`s. To dismiss it, you have to click a "let me work :("
button that gets smaller and sadder each time you click it. Three clicks to escape. That's usually
enough to notice that you should, in fact, take a break.

Break enforcement is the whole point. RSI, eye strain, and burnout all respond extremely well to
"stop for 30 seconds every hour." CapySaver is a cute version of that advice, packaged as a pet.

## Contributing

Pull requests welcome — especially if you want to replace the capybara with a different animal.

- `assets/sprites/` — swap in your own PNGs (1024×1024 transparent for the two overlay poses, any
  square PNG for the icon).
- `src/overlay/overlay.css` — tweak the animation, palette, tagline.
- `src/main.js` — scheduling logic and tray menu.

To record the demo GIF: clone the repo on your machine, run `npm run dev`, set the trigger to
`every 1 minute`, screen-record the overlay slide-down, and drop the GIF at `docs/demo.gif`.

```bash
git clone https://github.com/SHUJILAI/capysaver.git
cd capysaver
npm install
npm run dev
```

## License

MIT. Credits to [happycapy.ai](https://happycapy.ai).

— a capybara
