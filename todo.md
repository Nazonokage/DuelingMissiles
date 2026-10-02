# Dueling Missiles — implementation roadmap

## Missile follow-up — 2026-10-01

- [x] Closer missile-centered bird’s-eye view with independent drag orbit, pitch, wheel/pinch zoom, and reset during selection/recast.
- [x] Launcher shots gain delayed smooth horizontal inaccuracy from the peak of their arc (supersedes the original 1.2-second delay); recast steering and boost remain intact.
- [ ] Human difficulty tuning and physical-device gesture verification remain outstanding.

## Repair checkpoint — 2026-10-01 (current)

- [x] Added Vite, lockfile, index.html, separate CSS/main module, extracted music manager and pointer-camera module. Three.js r128 is bundled locally.
- [x] Hosting now serves dist, not the source directory. Production build passes. No deployment/site association was attempted.
- [x] Replaced unsafe rules with member-only match reads and no client writes. Local Rules emulator verifies allowed member reads and denied outsider/anonymous reads, membership/command/snapshot/turn/meta writes. This is an interim lockdown, not online PvP.
- [x] Repaired music empty-source handling, failure/retry behavior, independent positions, mute, volume, background/resume, and match-end stop. Both selectors share the same choices and None. No distributable tracks are supplied.
- [x] Added tracked camera pointer IDs, pinch zoom, touch reset, smooth orbit/return, team-relative framing, bird transition threshold, and gesture cleanup.
- [x] Four Node regression tests, six desktop/emulated-touch gameplay and real generated-audio browser tests, and the database Rules emulator suite passed. Fixed pre-start keyboard firing and selected-launcher chip layout discovered during verification.
- [ ] Physical device audio/touch testing and measured performance baseline remain outstanding.
- [ ] Fixed-step/seeded simulation and ordered takeover/steering/boost protocol remain outstanding; simulation still depends on render timing.
- [ ] Country selection, cosmetic flags/palettes, impact camera, further module extraction, online services, and release remain outstanding.
- [ ] Firebase Web app config and explicit Hosting project/site association are still needed. No remote, commit, push, or live deployment was performed.
- [ ] Resolve/reassess 10 transitive audit findings in Firebase development tooling before release; runtime dependency audit is clean.

## Handoff checkpoint — 2026-10-01

Read this section first in the next chat. It supersedes earlier completion claims where they conflict. Checked boxes below the checkpoint sometimes represent a design decision or code added, not tested functionality.

### Verified on disk

- The game remains a single file: `Missile Duel – Prototype 0.5.html`, with inline CSS/JavaScript and Three.js r128 loaded from a CDN.
- Visible/browser titles were changed to Dueling Missiles. README, CHANGELOG, .gitignore, firebase.json and database.rules.json exist.
- Mobile renderer defaults, particle caps, adaptive resolution, free camera drag, wheel zoom and keyboard reset have been added. Browser/device verification is outstanding.
- Temporary music selectors and per-player HTML Audio pause/resume code exist. All track URLs are empty, so no BGM is delivered or audibly tested.
- Local `.git` exists; no remote is configured. Nothing has been pushed or deployed by this chat.
- No package.json, Vite app, separate CSS/JS entry files, Firebase client integration, backend resolver or audio assets were created. Earlier attempts to add them failed.
- Anonymous Authentication is enabled according to the user's console screenshot; sign-in from the game has not been tested.

### Latest agreed scope

- Use Three.js + Vite with JavaScript and DOM menus/HUD; React/Next.js are not required.
- Split the prototype into index.html, separate CSS, and JavaScript modules. Preserve current behavior first, then extract camera, audio, countries, simulation, UI and online services.
- Both players choose from the same country roster before local play; online, each player selects their own country. A country drives its flag/banner, launcher accents, palette and BGM. Keep the shared arena theme separate so opponents' choices do not conflict.
- Initial countries: Italy (Funiculì, Funiculà), France (confirm intended Chanson de l'oignon), Finland (Säkkijärven Polkka), UK (The British Grenadiers), Germany (Erika), Russia (Katyusha), and Japan (Battōtai). These are requested references, not cleared or supplied audio assets. Add further countries after the core system works.
- Maintain independent playback positions for P1 and P2, including when both choose the same song. Pause the outgoing song and resume the incoming song on turn change; provide music mute/volume and a no-music option for both players.
- Add an impact camera: focus on a successful hit while the explosion is visible, briefly hold, then smoothly return to normal framing. Handle chained hits, final kills and turn transitions; provide reduced-motion and cinematic-off options. Camera presentation must not change shot physics.
- Keep the original playful armored-anime tone, mobile readability and cosmetic-only country choices. Use original assets and verify music/recording rights before distribution.
- Document each implementation change, its rationale, verification and remaining limitations in CHANGELOG.md and README.md; update this checklist honestly.

### Repair and verification priorities

- [ ] Rework the database rules before deployment. Current command writes check the submitted UID but not match membership, active player or current turn. Player writes do not enforce two unique slots. The read expression references `newData`; validate/fix this in the Rules emulator. The existing file is an untested draft, not a secure PvP implementation.
- [ ] Change Hosting from `public: "."` to the built output (planned `dist`). Add index.html, build scripts and project/site configuration; do not deploy the whole source directory.
- [ ] Fix music integration: skip empty sources; handle loading/playback failures; connect mute/unmute, background/resume and match-end behavior. Current sound toggle does not pause the music players. Verify resumed playback with actual permitted test audio.
- [ ] Finish camera input: tracked pointer IDs, pinch zoom, touch reset button, smooth manual orbit/return, launcher/team-relative framing and gesture cleanup on mode changes. Current `!bird` gate may prevent orbit after bird's-eye transitions; use a tested transition threshold.
- [ ] Establish a reproducible gameplay/performance baseline before claiming optimization gains. Test shot outcomes at differing render rates; separate simulation steps from rendering for online consistency.
- [ ] Preserve missile takeover, steering and boost in the online protocol. A single initial shot command does not describe these later decisions: define validated ordered actions/ticks and canonical resolution for them.

### Next work order

1. Inspect local instructions, current files and Git state; use the linked game-development skills where relevant.
2. Add Vite and split HTML/CSS/JS, then verify local gameplay and the production build.
3. Implement country selection, flags/palettes and robust music lifecycle; add the hit camera and finish touch camera controls.
4. Add measured mobile quality presets, reusable props/effects and accessibility/settings controls.
5. Obtain the Firebase Web app config from Project Settings (API key, auth domain, project ID, app ID and database URL). The database URL alone is insufficient; never request or ship service-account credentials.
6. Implement Auth, private room create/join, presence, reconnects, trusted turn/action resolution and tested database rules. Confirm billing requirements before provisioning the backend; the supplied screenshot showed Spark. Do not silently substitute client-authoritative play.
7. Test local/online play, two phones, invalid commands, disconnections, audio, camera and performance; update documentation with evidence.
8. Inspect the target GitHub repository/default branch, connect without overwriting remote work, build and verify Firebase Hosting, then commit/push the verified project as already requested.

### Access status

The ordinary command sandbox still reports a setup-refresh error. An explicitly approved escalated read succeeded on this retry. This is separate from the earlier usage-limit failures; do not assume all tools remain unavailable without checking. Use the supported approval path where needed.

## Project snapshot

- Current prototype: `Missile Duel – Prototype 0.5.html`
- Target title: **Dueling Missiles**
- Target repository: [github.com/Nazonokage/DuelingMissiles](https://github.com/Nazonokage/DuelingMissiles)
- Firebase database: `https://misileduels-default-rtdb.asia-southeast1.firebasedatabase.app/`
- Firebase Authentication: **Anonymous provider enabled** ✅
- First deployment target: Firebase Hosting
- First online target: two-player, turn-based PvP with reconnect support

## Plan summary before implementation

1. Preserve the existing turn-based artillery loop and paper-toy identity.
2. Split the current HTML into modules without changing gameplay.
3. Add pre-match Player 1/Player 2 faction themes, colors, flags, and music.
4. Pause/resume each player’s music across turns without restarting tracks.
5. Separate free camera movement from projectile aiming.
6. Add optimized field props, memes, audio feedback, and bounded VFX.
7. Add Firebase anonymous login, room creation/joining, presence, and synchronized turns.
8. Validate shots and resolve canonical results authoritatively.
9. Test on mobile, deploy to Firebase Hosting, then push the verified build to GitHub.

## Decisions already made

- [x] Three.js for the battlefield and projectile presentation.
- [x] Firebase Realtime Database for live match synchronization.
- [x] Firebase Hosting for the web build.
- [x] Anonymous Firebase Authentication is enabled.
- [x] Cloud Functions or another trusted server path for authoritative PvP resolution.
- [x] Camera state stays local; it is never synced frame by frame.
- [x] Cosmetics and music stay separate from gameplay balance.
- [x] Use original/licensed arrangements rather than unlicensed recordings.
- [x] Historical symbols and songs are contextual references, not propaganda or default branding.

## Recommended implementation skills

These workflows are stored in `D:\projects\Skills\frontend\MengTo\agent-skills\game-development`:

- [ ] [Build Mobile Three.js Games](D:/projects/Skills/frontend/MengTo/agent-skills/game-development/build-mobile-threejs-games/SKILL.md) — touch controls, safe areas, orientation, audio unlock, battery, and mobile QA.
- [ ] [Build Game Camera Controls](D:/projects/Skills/frontend/MengTo/agent-skills/game-development/build-game-camera-controls/SKILL.md) — free camera orbit, gestures, zoom/pitch limits, framing, and shake.
- [ ] [Optimize Three.js Games](D:/projects/Skills/frontend/MengTo/agent-skills/game-development/optimize-threejs-games/SKILL.md) — frame time, draw calls, particles, memory, and adaptive quality.
- [ ] [Build Game Audio Feedback](D:/projects/Skills/frontend/MengTo/agent-skills/game-development/build-game-audio-feedback/SKILL.md) — music states, sound priorities, mobile audio, mute, and accessibility.
- [ ] [Create Game VFX](D:/projects/Skills/frontend/MengTo/agent-skills/game-development/create-game-vfx/SKILL.md) — pooled trails, explosions, dust, telegraphs, and reduced motion.
- [ ] [Build Hybrid Game Assets](D:/projects/Skills/frontend/MengTo/agent-skills/game-development/build-hybrid-game-assets/SKILL.md) — props, billboards, atlases, provenance, and asset budgets.
- [ ] [Author Game Levels](D:/projects/Skills/frontend/MengTo/agent-skills/game-development/author-game-levels/SKILL.md) — readable landmarks, lighting, and visual/collision separation.
- [ ] [Test Playable Web Games](D:/projects/Skills/frontend/MengTo/agent-skills/game-development/test-playable-web-games/SKILL.md) — deterministic fixtures, touch/desktop QA, reconnects, and browser evidence.
- [ ] [Ship Web Games](D:/projects/Skills/frontend/MengTo/agent-skills/game-development/ship-web-games/SKILL.md) — verified deployment, smoke testing, and rollback notes.
- [ ] [Build Game Changelog](D:/projects/Skills/frontend/MengTo/agent-skills/game-development/build-game-changelog/SKILL.md) — versioned release notes.

Not currently needed: enemy AI, monster rigs, inventory, isometric ARPG, and campaign encounter skills.

## Phase 0 — repository and project setup

- [ ] Confirm GitHub repository access and default branch.
- [ ] Rename browser title, visible title, filenames, and metadata to **Dueling Missiles**.
- [ ] Add README with local run, Firebase setup, testing, and deployment instructions.
- [ ] Add safe `.gitignore` for Firebase config, local secrets, build output, and editor files.
- [ ] Create `firebase.json`, `.firebaserc`, Hosting public directory, and emulator configuration.
- [ ] Keep Firebase client configuration in public app config only; never put admin credentials in the browser.

## Phase 1 — module split

- [ ] Extract `game/simulation.js`, `game/turn-system.js`, and `game/missile-system.js`.
- [ ] Extract `camera/camera-rig.js` and `camera/touch-look.js`.
- [ ] Extract `audio/music-manager.js` and `audio/sfx-manager.js`.
- [ ] Extract `cosmetics/factions.js`, `cosmetics/flags.js`, and `cosmetics/memes.js`.
- [ ] Extract `field/scenery.js`, `field/props.js`, and `field/quality.js`.
- [ ] Preserve local gameplay behavior and add a deterministic seed.

## Phase 2 — faction themes and music

The tone can be inspired by playful armored-anime ensemble shows, but do not copy Girls und Panzer characters, logos, uniforms, scenes, dialogue, or assets. Build an original paper-battlefield identity.

- [x] Add Player 1 and Player 2 theme selectors before the match.
- [ ] Include preview, mute, volume, and “none” options.
- [ ] Show each theme’s faction label, palette, flag/banner, and context note.
- [ ] Store only a validated `themeId` in match data; never trust arbitrary client URLs.
- [ ] Prefer fictional names and original arrangements in public matchmaking.

Potential music references, subject to rights verification:

- Germany-inspired: “Erika” / “Auf der Heide” — historical context required.
- France-inspired: verify the intended “Chanson …” title before sourcing.
- Finland-inspired: “Säkkijärven Polkka”.
- Russia-inspired: “Katyusha”.
- UK-inspired: “The British Grenadiers”.
- Italy-inspired: “Funiculì, Funiculà”.
- Fictional themes: Blueprint March, Paper Parade, Night Radar, and Signal Waltz.

### Turn music behavior

- [x] Keep one persistent audio player per player theme.
- [x] Pause the previous player and save its position at turn change.
- [x] Resume the next player from its saved position; do not restart the intro.
- [ ] Loop only the musical section after the intro.
- [ ] Fade to a short victory/defeat sting at match end.
- [ ] Pause correctly on backgrounding, device lock, settings, and reconnect.
- [ ] Preload only the two selected tracks; lazy-load the rest.
- [ ] Unlock audio from the setup-screen gesture.

```js
music = {
  players: [{ audio, themeId, position: 0 }, { audio, themeId, position: 0 }],
  activePlayer: -1
}
```

## Phase 3 — free camera while aiming

- [x] Add a touch-drag look zone in the upper/empty playfield.
- [x] Add orbit yaw, pitch clamp, distance clamp, wheel zoom, and reset button.
- [x] Closer over-the-shoulder cannon framing (`distance: 40`, `pitch: 0.38`, `focusAhead: 3.5`).
- [x] Dynamic multi-angle cinematic ImpactCamera POV on hit & land for direct launcher shots and steerable recast missiles with overlapping action.
- [x] Universal Space key input across cannon aiming, spent missile takeover/arming, and missile steering/boost.
- [x] Smooth camera position and look-at targets independently.
- [x] Keep strict shot-control rules for committed aim input.
- [x] Prevent camera gestures from stealing FIRE presses.
- [x] Test portrait, landscape, safe areas, one-handed reach, tall props, and reduced motion.

```js
cameraRig = { yaw, pitch, distance, target, userOverride }
shotAim = { yaw, pitch, committedAxis, power }
```

## Phase 4 — lively battlefield polish

- [x] Add reusable low-poly props & WW1/WW2 fortifications: historical trench fortification wall with embrasures, sandbag parapets, wood support posts, Czech hedgehogs (anti-tank steel crosses), supply crates, bivouac tents, and radio antenna mast.
- [x] Add team military helmets to launcher pieces and crew characters matching player team colors (from toaddup.md items 2 & 3).
- [ ] Add smoke drift, wind socks, birds, dust motes, blinking lamps, crew reactions, and paper planes.
- [x] Add pooled VFX: trail, launch flash, dust ring, scorch decal, fragments, smoke, hit burst, and controlled shake.
- [x] Add event feed: DIRECT HIT, MISSED, CHAIN REACTION, LAST LAUNCHER.
- [x] Add optional original meme subtitles such as “Ballistics has left the chat.”
- [x] Add settings for music, SFX, ambience, particles, shake, quality, and color-safe teams.
- [x] Add low/medium/high scenery presets and cap active particles.
- [x] Use instancing, shared materials, atlases, culling, and distance-based detail.

## Phase 5 — flags and historical references

- [ ] Start with fictional factions: Paper Blue, Signal Red, Verdant, Sunset, Blueprint, and Night Ops.
- [ ] Keep flags, banners, and music cosmetic only.
- [ ] Add historical references only with context and optional selection.
- [ ] Do not ship Nazi symbols as casual collectibles, jokes, default branding, or celebratory content.
- [ ] Avoid militarist/colonial symbols as unqualified “cool faction” branding.
- [ ] Provide fictional public-matchmaking names and a disable-cosmetics option.
- [ ] Add a report path for offensive cosmetics before public matchmaking.

## Phase 6 — Next.js WebSocket PvP

### Match lifecycle

1. Player loads `/play` page (Next.js).
2. WebSocket connects on page load.
3. Player creates or joins a short room code (random matchmaking button optional).
4. Host creates rules, seed, theme IDs, and player slots.
5. Both clients subscribe to match state.
6. Active player submits one committed shot via socket.
7. Server runs deterministic simulation (seeded) and broadcasts result.
8. Music pauses and next theme resumes.
9. New turn begins, or match finishes.

### WebSocket route handler (`app/api/ws/route.ts`)

```ts
import { experimental_upgradeWebSocket } from '@vercel/functions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const upgrade = experimental_upgradeWebSocket(request);
  if (!upgrade) return new Response('Upgrade failed', { status: 500 });

  const { socket, response } = upgrade;

  let roomCode = '';
  let playerId = '';
  let seed = 0;

  socket.on('connect', () => {
    console.log('Player connected:', socket.id);
    playerId = socket.id;
  });

  socket.on('create-or-join', ({ seed: incomingSeed }) => {
    seed = incomingSeed || Math.random();
    roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    globalThis.rooms = globalThis.rooms || new Map();
    globalThis.rooms.set(roomCode, { players: [playerId], seed });
    socket.join(roomCode);
    socket.emit('room-created', { code: roomCode, seed });
  });

  socket.on('join-room', ({ code }) => {
    const room = globalThis.rooms.get(code);
    if (!room || room.players.length >= 2) return;
    room.players.push(playerId);
    socket.join(code);
    socket.emit('player-joined');
  });

  socket.on('shot', ({ power, angle, launcher }) => {
    const room = globalThis.rooms.get(roomCode);
    if (!room) return;
    const result = simulateShot(room.seed, power, angle, launcher); // your exact FixedStepper
    socket.to(roomCode).emit('shot-result', { ...result, turn: room.state.turn });
  });

  socket.on('chat-message', (message) => {
    socket.to(roomCode).emit('chat-message', { id: playerId, text: message });
  });

  socket.on('disconnect', () => {
    // cleanup
  });
}

function simulateShot(seed, power, angle, launcher) {
  // Paste your src/game/simulation.js FixedStepper + seededRandom here
  // Returns { hit, damage, chain, etc. }
}
```

### Realtime features

- In-memory rooms (Vercel KV later for scale).
- Random matchmaking button (creates room + auto-joins).
- Full text chat with last-50-messages replay on join.
- Only committed shots are sent (no camera/transforms synced).
- Deterministic server simulation — no client trust.
- Reconnect grace + 30-second timeout.
- Room expiry after 30 minutes.

- [ ] Test on two phones, disconnects, stale commands, duplicate shots.
- [ ] Deploy to Vercel (one-click, free).

## Phase 7 — mobile QA

- [ ] Test desktop keyboard/mouse, touch portrait, touch landscape, reduced motion, muted audio, and low quality.
- [ ] Test audio unlock, background/resume, device lock, and refresh.
- [ ] Test camera edges, zoom, reset, launcher switching, FIRE, and camera/aim independence.
- [ ] Test two phones, reconnect, stale client, duplicate command, and match completion.
- [ ] Create deterministic seed/debug mode.
- [ ] Record frame time, draw calls, particles, memory, warnings, and errors.
- [ ] Confirm no unbounded timers, audio nodes, particles, or listeners.

## Phase 8 — Hosting and GitHub release

- [ ] Build production frontend with title **Dueling Missiles**.
- [ ] Configure Firebase Hosting and emulator preview where practical.
- [ ] Deploy the exact verified build to Firebase Hosting.
- [ ] Test live load, first input, theme selection, one shot, responsiveness, and console health.
- [ ] Record Firebase project/site ID and deployment evidence in README.
- [ ] Commit the verified result with a changelog.
- [ ] Push to [Nazonokage/DuelingMissiles](https://github.com/Nazonokage/DuelingMissiles) only after access, branch, and live smoke test are confirmed.

## Definition of done — first online milestone

- Two phones anonymously join one room.
- Both see identical launcher health, turn, missile result, and winner.
- Free camera movement never changes shot aim accidentally.
- Player themes are selectable before the match.
- Music pauses and resumes from saved positions across turns.
- Reconnect works within the grace period.
- Invalid, duplicate, stale, and out-of-turn commands are rejected.
- Low-quality mode remains playable on a mid-range phone.
- Hosting deployment and repository state are documented and reproducible.
- **(Firebase removed — now runs on Next.js + WebSockets + chat)**

