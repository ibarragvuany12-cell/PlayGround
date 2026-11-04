# Secret Santa Wheel

A complete, client-side Secret Santa game: add your crew, take turns at the wheel, and let a properly randomized draw decide who buys for whom.

## Play

- **Add 3–16 names** to the guest list.
- **Pass the device** to the player whose turn it is, then spin once.
- **Reveal privately**, keep the name under your Santa hat, and pass it on.
- **Host's secret list** keeps a private record of the full draw after the last spin.

The draw is a true derangement: nobody draws themselves and every name is used exactly once. Names and the current round stay in this browser tab, so a refresh picks up where you left off. No server, accounts, or tracking.

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 3002
```

Then visit http://localhost:3002.

## Stack

Vanilla HTML, CSS, and JavaScript. The wheel is responsive SVG, with Web Audio ticks, CSS snowfall, and a canvas confetti burst. Sound can be muted from the header.

Bundled fonts: **Fraunces** and **DM Sans**, both licensed under the SIL Open Font License 1.1. See `assets/fonts/OFL.txt`.

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://go.ondev.store/).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://go.ondev.store/ibarragvuany12-cell/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/ibarragvuany12-cell/PlayGround)

- 🎮 [Open the project](https://go.ondev.store/ibarragvuany12-cell/PlayGround).
- ✨ [Remix this project](https://go.ondev.store/ibarragvuany12-cell/PlayGround?remix=1).
- 💻 [Explore the source](https://github.com/ibarragvuany12-cell/PlayGround).
- 🛠️ [Check build runs](https://github.com/ibarragvuany12-cell/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/ibarragvuany12-cell/PlayGround/issues).
- 👤 [Explore the creator's projects](https://go.ondev.store/ibarragvuany12-cell).
- 🌍 [Create with OMGithub](https://go.ondev.store/).
<!-- omgithub:readme:end -->
