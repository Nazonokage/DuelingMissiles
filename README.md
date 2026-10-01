# Dueling Missiles

Local two-player artillery game built with Three.js and Vite. The original `Missile Duel – Prototype 0.5.html` is retained as a historical reference; use `index.html` through Vite for the repaired game.

## Run locally

Requires Node.js 22.12+ (verified with Node 24.18.1).

```sh
npm ci
npm run dev
```

Open the address printed by Vite. `npm run build` generates `dist`; `npm run preview` serves that production build locally. Three.js r128 is pinned and bundled, so the game no longer depends on a runtime CDN.

## Controls and sound

Hold Space or FIRE to charge; release to launch. A/D or arrow keys aim; Q/E and number keys select launchers; M selects spent missiles for takeover. Launcher shots climb without sideways drift, then develop smooth seeded wobble from the peak of their arc as they descend. The peak timing follows each shot’s launch power and elevation; gravity remains unchanged. The aim guide shows the ideal arc, not the random deviation. Recast missiles retain one-hold steering, growing drift (bounded late in flight), and a one-time boost that temporarily flies straight.

Drag the upper playfield to orbit while aiming, pinch or use the wheel to zoom, and press C or **Reset view** to return. The default camera is raised and pulled back, with extra viewing distance in portrait mode. Orbit and reset share this elevated framing; zoom covers a wider range. Camera motion is smoothed and framed relative to the current team. Camera gestures are cancelled when changing modes, losing focus, or backgrounding. Camera input does not write shot aim. In missile selection and recast mode, drag the upper field to orbit freely, pinch or scroll to zoom (35–240 units), and use Reset view/C to restore the closer 95-unit bird’s-eye framing. This view tracks the selected or active missile and uses independent controls from the launcher camera.

Music shuffles through the bundled tracks continuously across turns. The sound button mutes music and effects; music pauses when backgrounded and stays stopped at match end. Music volume is adjustable in setup. Failed tracks are removed from the current queue, and autoplay failures can retry after input. Playback tests use an original generated test tone.

Keyboard gameplay remains active after clicking game buttons. On-screen holds capture the pointer until release, even outside the button. Cancelled touches, lost focus, hidden tabs, and hiding the pad cancel charging without firing. Multiple keys or fingers can hold the same action without releasing each other. Aiming and steering still follow the existing one-side, one-hold rule: releasing locks the angle.

On every explosion, the follow camera moves closer along its current approach direction, then stays still with the blast centered while effects play at 12% speed. It holds its position and zoom until easing back to gameplay. New explosions renew the focus and slow motion. This is the default camera behavior; there is no Cinema toggle or explosion-camera setup switch. Reduced motion keeps the close focus and slow motion, using stationary cuts instead of camera travel. Director/heatmap inspection views override the effect. Ordinary missed launcher shots retain the follow camera.

## Structure

- `index.html`: setup and game HUD.
- `src/game.css`: presentation and responsive layout.
- `src/main.js`: existing game, simulation, scene, HUD, and synthesized sound effects.
- `src/audio/music-manager.js`: shuffled music playback and lifecycle.
- `src/camera/touch-look.js`: tracked pointers, pinch, bounded orbit, and gesture cleanup.

The simulation is still coupled to rendering. No deterministic online simulation or measured optimization gain is claimed.

## Verification

```sh
npm test
npm run test:browser
npm run test:rules
```

Browser tests use installed Microsoft Edge, headlessly, in desktop and emulated touch portrait/landscape viewports. Screenshots are written to ignored `test-results/`. Tests cover setup, pre-start input, camera reset, sound toggle, shot/turn progression, and playback with generated audio. These checks do not replace testing on two physical phones or listening on real devices.

Database tests require Java 21+ and download the Firebase database emulator on first run. They use only `demo-dueling-missiles`, never the live database. The isolated `firebase.test.json` binds port 9001 and explicitly aligns the database instance with the test namespace. Tests read their endpoint from the emulator-provided environment variable. Startup INFO, mock service-account-token messages, and permission_denied messages from rejection tests are expected; a passing run ends with PASS and exit code 0. Existing members can read their match; anonymous users and nonmembers cannot; all client writes are denied, including player identities, commands, snapshots, metadata, and turns.

## Firebase and release status

Hosting now serves **only `dist`**. No live deployment or push was performed. No Firebase Web app configuration, Hosting site association, client Auth integration, or trusted match resolver exists yet.

The previous database rules allowed unsafe player and command writes. The replacement is a tested, fail-closed interim policy: only a future trusted backend using Admin privileges may create membership or change match state. It deliberately does not provide room creation/joining or playable online PvP.

Before online release, implement the trusted service and a validated ordered action protocol covering launch, missile takeover, steering, and boost; test uniqueness, turn ownership, replay rejection, reconnects, and canonical outcomes. Obtain the Firebase Web app config and confirm project/site and backend billing requirements. Never put service-account credentials in the browser.

The production dependency audit reports no vulnerabilities. Firebase **development/test tooling** currently has 10 transitive audit findings (5 moderate, 5 high); compatible automatic fixes were unavailable. Revisit that tooling before release. The build reports a large bundled-JavaScript chunk warning; no performance claim is made from build size or desktop emulation.

See [todo.md](todo.md) for remaining work and [CHANGELOG.md](CHANGELOG.md) for implementation evidence.
