# Super Mario · Retro Worlds

A retro Mario-style platformer built with [Kaboom.js](https://kaboomjs.com) v0.5.0 —
now with four themed worlds, mobile touch controls, chiptune sound effects, and a
CRT-flavored pixel aesthetic.

## Worlds

| World | Theme | Backdrop |
|-------|-----------|----------------------------------------------|
| 1 | SPACE | Starfield, ringed planet, shooting stars |
| 2 | SUNSET | Synthwave sun, drifting dusk clouds |
| 3 | PRAIRIE | Blue skies, pixel clouds, rolling green hills |
| 4 | SPOOKY | Pumpkin moon, bats, a ghost, and creeping fog |

## Controls

**Keyboard**
- `←` `→` (or `A` `D`) — move
- `Space` / `↑` / `W` — jump
- `↓` — enter a pipe (warps to the next world)
- `Esc` — open the Warp Zone (jump to any world, pauses enemies)
- `1`–`4` — quick world select from any menu

**Touch (phones & tablets)**
- On-screen D-pad + `A` jump button appear automatically
- `⚡WARP` button in the HUD opens the Warp Zone

## Play it

No build step — it's plain HTML/JS. Serve the folder and open it:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

To play on your phone, either open the same URL from your phone while on the
same Wi-Fi network (use your computer's LAN IP, e.g. `http://192.168.1.x:8000`),
or enable **GitHub Pages** for this repo (Settings → Pages → deploy from the
`main` branch) and play from anywhere.

## Features

- Smooth-follow camera with coyote-time jumping
- Score popups, stomp screen-shake, and a persistent high score (localStorage)
- WebAudio chiptune SFX — no audio files needed
- Parallax CSS backdrops behind a transparent game canvas
- Survives phone rotation (auto-resumes your run)
