# Dueling Missiles

Local and online two-player artillery game built with Three.js and Vite. The original `Missile Duel – Prototype 0.5.html` is retained as a historical reference; use `index.html` through Vite for the repaired game.

## Run locally

Requires Node.js 22.12+ (verified with Node 24.18.1).

```sh
npm ci
npm run dev
```

Open the address printed by Vite. `npm run build` generates `dist`; `npm run preview` serves that production build locally. Three.js r128 is pinned and bundled, so the game no longer depends on a runtime CDN.

## Controls and sound

The pre-match lobby uses a blue sky background, a clear settings panel, country flag previews, and scrollable controls on smaller screens. Titles, announcements, and primary game controls use the locally bundled **Black Ops One** military stencil font; smaller labels use a plain sans-serif for readability. The typeface comes from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/blackopsone); its SIL Open Font License is included in `public/fonts/BlackOpsOne-OFL.txt`. The battlefield has no grid overlay.

When a player has only one surviving launcher, it can fire on every turn without reloading. Any existing reload lock clears at the start of that player's next turn. Players with multiple launchers retain the usual reload cycle, and spent missiles remain available for takeover.

Hold Space or FIRE to charge; release to launch. A/D or arrow keys aim; Q/E and number keys select launchers; M selects spent missiles for takeover. With Missile wobble enabled in setup, launcher shots develop smooth seeded wobble from the peak of their arc as they descend. The peak timing follows each shot’s launch power and elevation; gravity remains unchanged. Disable Missile wobble for stable shots and recasts. Wind remains active during both ascent and descent, even with wobble disabled. Each turn supplies 0.6–1.8 m/s² of constant horizontal acceleration (2.7–8.1 world units of drift over a three-second unsteered flight); the aim guide includes wind, but excludes steering and random wobble. Airborne launcher steering is reduced to 0.55 radians per second. Recast missiles retain one-hold steering, growing drift (bounded late in flight), and a one-time boost that temporarily flies straight.

Tap or click your spent missiles to select them, then FIRE to take over. Swipes and pinches move the camera without selecting missiles. Drag the playfield to orbit while aiming, pinch or use the wheel to zoom, and press C or **Reset view** to return. The default camera is raised and pulled back, with extra viewing distance in portrait mode. Orbit and reset share this elevated framing; zoom covers a wider range. Camera motion is smoothed and framed relative to the current team. Camera gestures are cancelled when changing modes, losing focus, or backgrounding. Camera input does not write shot aim. In missile selection and recast mode, drag the field to orbit freely, pinch or scroll to zoom (35–240 units), and use Reset view/C to restore the closer 95-unit bird’s-eye framing. This view tracks the selected or active missile and uses independent controls from the launcher camera.

Music shuffles through the bundled tracks continuously across turns. The sound button mutes music and effects; music pauses when backgrounded and stays stopped at match end. Music volume is adjustable in setup. Failed tracks are removed from the current queue, and autoplay failures can retry after input. Playback tests use an original generated test tone.

Keyboard gameplay remains active after clicking game buttons. On-screen holds capture the pointer until release, even outside the button. Cancelled touches, lost focus, hidden tabs, and hiding the pad cancel charging without firing. Multiple keys or fingers can hold the same action without releasing each other. Aiming and steering still follow the existing one-side, one-hold rule: releasing locks the angle.

On every explosion, the follow camera moves closer along its current approach direction, then stays still with the blast centered while effects play at 12% speed. It holds its position and zoom until easing back to gameplay. After a resolved shot, the incoming player's turn starts during the return so the camera travels directly to their launcher; firing remains blocked until the cinematic and turn transition finish. New explosions renew the focus and slow motion. This is the default camera behavior; there is no Cinema toggle or explosion-camera setup switch. Reduced motion keeps the close focus and slow motion, using stationary cuts instead of camera travel. Director/heatmap inspection views override the effect and ease in and out from the current camera position, including when switched mid-transition; reduced motion uses cuts. On an ordinary launcher miss, the camera holds its follow position and zoom, settles its focus on the spent missile during the turn delay, then moves directly to the next player's launcher.

## Structure

- `index.html`: setup and game HUD.
- `src/game.css`: presentation and responsive layout.
- `src/main.js`: existing game, simulation, scene, HUD, and synthesized sound effects.
- `src/audio/music-manager.js`: shuffled music playback and lifecycle.
- `src/camera/touch-look.js`: tracked pointers, pinch, bounded orbit, and gesture cleanup.

Gameplay advances at a fixed 120 Hz. Online matches use the authoritative Node WebSocket server in `server/duel.js`; clients submit controls and receive snapshots. No measured optimization gain is claimed.

## Verification

```sh
npm test
npm run test:browser
```

Browser tests use installed Microsoft Edge, headlessly, in desktop and emulated touch portrait/landscape viewports. Screenshots are written to ignored `test-results/`. Tests cover setup, pre-start input, camera reset, sound toggle, shot/turn progression, and playback with generated audio. These checks do not replace testing on two physical phones or listening on real devices.

## Environment settings

Local configuration lives in the git-ignored `.env`; `.env.example` lists supported settings. Vite reads it for development/build, and `npm start` loads it for the Node server. Render uses the environment settings in `render.yaml`; the local file is not uploaded.

`VITE_GAME_SERVER_URL=/socket` connects to the same service as the page and automatically uses secure WebSockets on HTTPS. Leave `PUBLIC_ORIGINS` empty for this setup; only add exact comma-separated origins if hosting the frontend separately. Never put credentials in variables prefixed with `VITE_`. Render supplies `PORT`; the server binds to `0.0.0.0`.

## Deploy on Render

Use one Docker **Web Service** running Node 24, serving both the built frontend and `/socket`. No external database is required. The included `render.yaml` selects the free playtest plan in Singapore, one instance, using the root Dockerfile:

- Build: multi-stage Docker build; installs build dependencies and compiles the frontend.
- Start: `node server/start.js` as the unprivileged `node` user, with production dependencies only.
- Health check: `/healthz`

Push this revision to your repository, then select **New > Blueprint** in the [Render dashboard](https://dashboard.render.com/) and connect that repository. Render reads `render.yaml` and builds the Docker image. For manual Web Service setup, select **Docker** and use `./Dockerfile`; leave the Docker command override empty. After deployment, open the assigned service URL and verify `/healthz` returns `ok: true`. Test host approval, firing, and reconnecting from two browsers or devices. No live deployment has been performed yet.

Keep this service at **one instance**: rooms and anonymous sessions live in process memory. A brief player disconnect pauses the match and can reconnect within 30 seconds, provided the server has not restarted. Restarts, redeployments, and instance replacement reset all rooms; players must create a new match. Shared storage would be required before scaling across instances. See [Render WebSockets](https://render.com/docs/websocket).

The free plan is for playtests: Render spins down idle services after 15 minutes without inbound traffic, and waking one can take about a minute. Usage limits also apply; review [Render free-service limits](https://render.com/docs/free). An always-on paid instance avoids idle spin-down, but this implementation still loses rooms on restart.

### Local Docker verification

With Docker installed, run:

```sh
docker build -t dueling-missiles .
docker run --rm -p 31847:31847 -e MAX_CONNECTIONS_PER_IP=256 dueling-missiles
```

Open http://localhost:31847 and check http://localhost:31847/healthz. The same port serves HTTP and WebSockets. Override `PORT` and the port mapping together if needed. Local environment files are excluded from the image; pass optional server settings with `-e`. The public socket address defaults to `/socket`; a separate frontend requires rebuilding with `--build-arg VITE_GAME_SERVER_URL=...`. See [Docker on Render](https://render.com/docs/docker).

## Online play and release status

Development and preview include the WebSocket lobby automatically. For the production server:

```sh
npm run build
npm start
```

The server serves only `dist` and listens on port 31847 (override with `PORT` and `HOST`). Choose an anonymous name, host a match, or search for a host and request to join. The host approves requests and supplies match settings, including wobble. The server validates turn ownership and ordered controls; disconnected matches pause and can resume using the same browser session token. Rooms are held in memory and disappear on server restart.

The left wind indicator points downwind relative to your current camera. Turret flags and the windsock point in the same world direction. Flight analytics starts with a closer arena view and draws recorded missile trails, including launcher shots and recasts, over the heat layer. Drag to pan, pinch or scroll to zoom, or use the +, − and Reset buttons. All / P1 / P2 filters affect trails and impacts. The latest 200 trails observed during the session are retained, and team-colored cannon outlines mark surviving launchers.

No live deployment is claimed. Render runs the persistent Node server described above. The build reports a large JavaScript chunk; physical-device performance and human difficulty tuning remain outstanding.

See [todo.md](todo.md) for remaining work and [CHANGELOG.md](CHANGELOG.md) for implementation evidence.
