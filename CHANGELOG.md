# Changelog

## Welcome flow and home animation — 2026-10-07

- Simplified the welcome screen to Offline and Online with shared setup dialogs, anonymous identity, host configuration, searchable rooms and approval flow.
- Made wobble opt-in on both client and server. Added responsive dialog navigation and room cleanup on close.
- Added floating home typography, moving cubes credited to Nawsome, contextual waiting indicators and icon feedback. Home motion has an independent saved on/off switch; the switch is visually compact with a larger invisible touch area.
- Added an in-game chat proposal to todo.md, preserving the previous roadmap; no chat implementation is included.
- Verification: production build, unit tests, desktop/mobile setup and online flow checks; live preview verified motion under its reduced-motion setting. The existing bundle-size warning remains.

All notable project changes are recorded here as implementation work progresses.

## Render WebSocket deployment — 2026-10-06

- Replaced the previous hosting configuration with a single Render Docker web service running Node 24, a Singapore free-playtest Blueprint, same-origin sockets and an HTTP health check.
- Removed the unused serverless/shared-datastore backend, its dependency and tests, obsolete provider configuration and references, and the unused duplicate physics module. Kept the persistent authoritative server, host approval and reconnect behavior.
- Simplified local environment files to the active server settings; no database credentials are required.
- Documented single-instance operation, restart-related match loss and free-service idle behavior. Earlier notes for the retired backend were removed to avoid conflicting setup instructions.
- Verification: all 29 retained tests and the production build passed. A production-entry-point smoke check verified the frontend, health endpoint, same-origin WebSocket identity and private-file isolation. The existing bundle-size warning remains.
- Aligned both Docker stages on Node 24, explicitly included build dependencies, limited copied build inputs, and connected the Blueprint to the Dockerfile. The runtime uses production dependencies and an unprivileged user.
- Built the image successfully with Docker Desktop and verified a healthy unprivileged container on localhost:31847. Live container checks passed for frontend assets, private-file isolation, two-player host approval, firing, disconnect pause, token reconnect and room cleanup.
- Changed the Docker and standalone default port to 31847; Render can still override PORT. Hosted deployment and physical-device verification remain pending.

## Noticeable airborne wind — 2026-10-05

- Replaced the nearly imperceptible ±0.1 acceleration components with shared, seeded turn winds of 0.6–1.8 m/s² in any horizontal direction. Local play and the authoritative online server use the same generator.
- Wind affects the ascent and descent independently of wobble. With no steering or wobble, three seconds of flight now produces 2.7–8.1 world units of downwind displacement; the aim guide uses the same acceleration.
- Recalibrated light/moderate/strong labels and flag extension for the new range, and displayed numeric acceleration in the wind HUD.
- Verification: all 29 unit tests and the production build passed. All six targeted desktop, touch-portrait and touch-landscape browser checks reported passing, covering airborne wind/aim-guide agreement and synchronized online matches. The runner again stalled during cleanup and was interrupted after the final case. Existing bundle-size warning remains.

## Recorded missile trails and interactive analytics — 2026-10-05

- Clarified the requested outlines as missile flight-path lines. Analytics now records actual launcher and recast positions, retains the latest 200 paths, and displays team-colored trails above the heatmap. All / P1 / P2 filters apply to trails as well as impacts.
- Added online shot/recast start and landing identifiers so paths include their endpoints and recasts remain separate from the original launcher shot.
- Brought the default analytics camera about 21% closer. Drag to pan, pinch or wheel to zoom, and use the on-screen +, − and Reset buttons. Analytics camera controls remain independent of aiming and missile selection.
- Kept terrain visible from the elevated portrait view and sized cannon markers for small screens.
- Verification: all 27 unit tests passed; production build passed with the existing bundle-size warning; all 15 focused desktop, touch-portrait and touch-landscape browser cases reported passing, including online matches. Reviewed desktop and portrait trail screenshots. The browser runner stalled during cleanup and was interrupted after its final case. Physical-device testing remains outstanding.

## Missile controls, wind and analytics — 2026-10-05

- Added team-colored cannon outlines above the heatmap, aligned to barrel direction and hidden for destroyed launchers. Fit the full arena to portrait and landscape views; kept the analytics panel and wind indicator responsive. Online events now populate shot and impact analytics.
- Tap or click a friendly spent missile to select it, including switching directly between missiles. Added a movement threshold so swipes orbit and pinches zoom without accidentally selecting; cancelled gestures cannot select.
- Added the Missile wobble setup switch for launcher and recast flight. Online hosts supply the setting to both players. Removed the extra frame-dependent velocity wobble that affected the climb, preserving seeded descent drift when enabled.
- Reduced airborne launcher steering from 1.4 to 0.55 radians per second, retaining the one-side, one-hold rule.
- Unified wind as horizontal acceleration, included it in the aim guide, and corrected integration across step sizes. Turret flags and the windsock point downwind; the left-hand HUD arrow follows the current camera view.
- Removed the obsolete database provider dependencies, configuration, emulator tests and documentation references. Updated run/release instructions for the existing Node WebSocket server and retained the original request in toaddup.md.
- Verification: unit tests and production build passed with the existing bundle-size warning. The 57-case browser run reported 54 passes and three obsolete fixed-height assertions; those assertions were updated for responsive framing and all 12 focused rerun cases passed. The runner stalled during cleanup and was interrupted after its final case. Physical-device testing remains outstanding.

## Sky lobby, stencil type and camera transitions — 2026-10-02

- Redesigned pre-match settings using the supplied Blue Cloudy Clean Modern direction: a sky gradient, soft atmospheric light, restrained framing, a bright settings panel, and a prominent start button. Settings remain scrollable on small screens and retain their existing behavior.
- Bundled Black Ops One and its SIL license locally for military stencil titles and main controls, with clean sans-serif labels, stronger HUD surfaces, keyboard focus outlines, and accessible selected states. Draw country flag previews so Windows does not substitute letter codes.
- Removed the battlefield grid. Smoothed entry, exit, and interrupted switches for director/heatmap views. Explosion recovery now frames the next player's launcher directly, preserving the close-up hold, input lock, and reduced-motion cuts.
- Added regression checks for camera transitions, single turn handoff after an explosion, local font loading, responsive settings, and match-option selection.
- Verification: production build and 14 unit tests passed; all 48 desktop/emulated portrait/landscape browser checks reported passing. Reviewed settings and grid-free gameplay screenshots. The browser runner again stalled during cleanup and was interrupted after its final check. Physical-device motion and touch testing remains outstanding.

## Last launcher and missed-shot camera — 2026-10-02

- A player's sole surviving launcher no longer reloads after firing. Clear any earlier reload lock when its next turn starts, so losing the other launchers cannot force a reload-only turn. Multiple surviving launchers retain their reload cycle.
- Hold the follow camera's position and zoom on an ordinary miss, focus on the landed missile, then move directly to the incoming player instead of returning to the outgoing launcher first.
- Add browser regressions for both players' final launchers, normal reload recovery, and the missed-shot camera hold and handoff.
- Verification: production build and 12 unit tests passed; all 39 desktop/emulated-touch browser checks reported passing. The browser runner stalled during cleanup and was interrupted after the final check. Existing bundle-size warning remains; physical-device testing is still outstanding.

## Explosion focus with system reduced motion — 2026-10-01

- Removed the reduced-motion bypass that skipped explosion focus and slow motion entirely, including when inherited from the operating system.
- Reduced motion now uses a stationary close-up with cuts, preserving the explosion focus without camera travel.
- Browser tests now retain default motion preferences and cover recast missile hits against cannons as well as direct shots and interceptions.

## Stationary explosion focus by default — 2026-10-01

- The follow camera approaches the explosion from its existing direction, settles nearby, and holds both position and zoom instead of orbiting or alternating angles.
- Removed the Cinema button and explosion-camera setup switch; explosion focus and slow motion are now default behavior, respecting reduced motion and inspection views.
- Browser checks verify that camera position and field of view remain unchanged during the hold.

## Tighter close-ups for every explosion — 2026-10-01

- More than halved the impact camera distance, from 14 to 6.5 units, with portrait framing adjustment.
- Every blast now refocuses the camera and restarts a two-second close-up at 12% speed, including blasts that occur during another cinematic.
- Added regression coverage for explosions interrupting the return to gameplay.

## Explosion close-ups and slow motion — 2026-10-01

- Cut immediately to cannon and missile explosions, keeping the blast centered with an inward-facing angle that avoids the fort wall and extra framing space in portrait mode.
- Slow simulation, debris, fireballs, and shockwaves to 16% speed during the close-up, then ease back to normal speed and the live gameplay camera.
- Prevent chain reactions from restarting the cinematic. Ordinary missed launcher shots no longer trigger an explosion close-up.
- Preserve Cinema off and reduced-motion preferences, plus director/heatmap overrides.
- Added camera lifecycle tests and browser collision fixtures for cannon hits, missile interceptions, and reduced motion.

## Keyboard and on-screen controls — 2026-10-01

- Fixed a JavaScript syntax error blocking startup and removed stale references to deleted music selectors.
- Gameplay shortcuts now work while game buttons have focus; text inputs keep normal editing behavior.
- Track each held key and pointer independently; capture on-screen holds and cancel safely on interruption without firing.
- Keep steering buttons available during launcher flight and clear held input between turns and at match end.
- Corrected two truncated music paths and guarded playback against late promises, repeated failed tracks, and restarting after match end.
- Updated obsolete music tests for the current shuffled jukebox and added input regression coverage.

## Apex-triggered launcher wobble — 2026-10-01

- Launcher wobble now starts at the trajectory apex, calculated from initial vertical speed and gravity, instead of a fixed 1.2-second delay. The climb stays stable at every power/elevation; drift grows during descent.
- Steps crossing the apex apply wobble only to their descending portion. Recast drift and camera behavior are unchanged.
- Regression tests cover early/late apexes, crossing steps, preserved horizontal speed, and step-size consistency.

## Missile view and accuracy follow-up — 2026-10-01

- Added independent orbit/pitch/zoom controls during missile selection and recast flight, centered on the missile. Default distance is 95 instead of 135 for flight (previous selection framing was 240); zoom spans 35–240. Reset, smoothing, pointer cleanup, and launcher controls remain separate.
- Added seeded horizontal wobble to launcher shots after a 1.2-second stable interval; gravity and horizontal speed are preserved. Reused the recast waveform with a bounded late-flight ramp. Recast steering and temporary straight boost remain available.
- Added drift grace-period, speed-preservation, step-size consistency, and bird-camera limit/reset regression tests, plus browser takeover/orbit/zoom/reset/launch/boost checks.
- The ideal aim guide does not predict drift. Difficulty still needs human playtesting; full render-independent simulation remains future work.

## Camera framing follow-up — 2026-10-01

- Raised and pulled back the default aiming camera, with a wider portrait view and focus ahead of the selected launcher so the arena is easier to read.
- Shared elevated defaults between normal framing, orbit, and reset; expanded zoom range and pulled the missile-follow camera back/up.
- Hide decorative clouds when the camera is above them to prevent battlefield occlusion.
- Verified production build, four regression tests, and shot/turn browser checks at desktop, portrait, and landscape sizes. Reviewed framing screenshots; physical phone testing remains outstanding.

## 0.6.0 — local repair pass (2026-10-01)

- Split the preserved prototype into Vite entry HTML, CSS, and JavaScript; extracted music lifecycle and camera pointer controls. Pinned/bundled Three.js r128 to retain the existing renderer API and remove the runtime CDN dependency.
- Changed Hosting public directory to dist to avoid publishing source and configuration files.
- Replaced the unsafe database draft with a deny-client-writes policy and existing-member reads. This closes unvalidated membership/command creation while the trusted backend is absent. Rules emulator checks passed; this does not implement PvP.
- Fixed independent per-player music resume, empty sources, media failures, autoplay retries, mute, volume, backgrounding, and match end. Both setup selectors now offer the same list and None.
- Added pointer-ID tracking, pinch, touch reset, bounded/team-relative orbit, smooth camera position/look targets, and capture cleanup. Replaced the exact-zero bird-view test with a transition threshold so free orbit becomes available again.
- Guarded gameplay keys before match setup and fixed selected launcher chips inheriting fixed positioning.
- Verification: production build and four Node regression tests passed; desktop and emulated portrait/landscape shot/turn smoke tests passed without page errors. Real generated-tone playback tests also passed in all three viewport setups (six browser tests total). No physical-device, online, or live-site verification is claimed.

## Unreleased — roadmap consolidation

- Consolidated the project direction into [todo.md](todo.md).
- Defined the target repository as `Nazonokage/DuelingMissiles`.
- Documented the planned mobile camera, music-theme, field-polish, PvP, security, QA, and release work.

## Unreleased — mobile rendering baseline

- Added device-aware renderer quality defaults using touch capability and `navigator.deviceMemory` when available.
- Reduced pixel ratio, antialiasing, and particle limits on constrained mobile devices.
- Preserved adaptive resolution scaling when frame time rises, with a safe floor of 1x pixel ratio.

## Unreleased — free aiming camera baseline

- Added a bounded local camera orbit and zoom layer while aiming.
- Kept camera orbit independent from projectile shot aim.
- Added camera reset with the `C` key and pointer/touch drag support in the upper playfield.


- Added pre-match Player 1 and Player 2 music-theme selectors.
- Added a persistent music manager that pauses and resumes each player’s saved playback position.
- Kept theme URLs empty until licensed arrangements are added to `public/audio`.
- Added a restrictive `database.rules.json` baseline for authenticated match access, player slots, and one-time commands.

## 0.5 — existing prototype baseline

- Turn-based local artillery duel with launcher selection and health.
- Charge-and-fire missile interaction with missile takeover mode.
- Mobile touch controls and desktop keyboard controls.
- Paper, blueprint, and night visual themes.
- Director/heatmap views and basic scenery, flags, HUD, sound, and effects.



# Dueling Missiles — next implementation checklist

## Completed

- Renamed the game title to Dueling Missiles.
- Added README.md, CHANGELOG.md, and .gitignore.
- Added mobile-aware Three.js quality settings.
- Added adaptive resolution scaling.
- Added free-look camera orbit while aiming.
- Added camera zoom and C-key reset.
- Kept camera movement separate from projectile aim.
- Added Player 1/Player 2 music selectors.
- Added persistent music pause/resume behavior.
- Added initial Realtime Database security rules.
- Confirmed anonymous authentication is enabled.
- Node.js and Git are installed.
- Local Git repository was initialized.

## Next tasks

1. Verify workspace file and command access.
2. Split the single HTML file into:
   - index.html
   - css/game.css
   - js/main.js
   - js/camera.js
   - js/audio.js
   - js/countries.js
   - js/game-state.js
3. Replace temporary music selectors with country selection.
4. Make each country control:
   - Flag
   - Color palette
   - Banner
   - Launcher styling
   - BGM selection
5. Add countries:
   - Italy — Funiculì, Funiculà-inspired arrangement
   - France — verified Chanson-inspired theme
   - Finland — Säkkijärven Polkka-inspired arrangement
   - UK — British Grenadiers-inspired arrangement
   - Germany — Erika-inspired arrangement with historical context
   - Russia — Katyusha-inspired arrangement
6. Use only original or properly licensed recordings.
7. Add hit-camera cinematic:
   - Focus camera on impact location.
   - Show explosion clearly.
   - Add bounded shake and hit-stop.
   - Return smoothly to the active launcher.
   - Support reduced-motion mode.
9. Add room creation and room joining.
10. Add player presence and disconnect handling.
11. Add synchronized turns.
13. Keep camera movement and particles local.
14. Add authoritative shot validation/resolution.
15. Add reconnect grace period.
16. Add duplicate, stale, forged, and out-of-turn command protection.
17. Add licensed audio files and attribution records.
18. Add mobile QA:
   - Portrait
   - Landscape
   - Low-memory device
   - Reduced motion
   - Muted audio
   - Background/resume
   - Two-device PvP
20. Test the live deployment.
21. Connect the project to:
   https://github.com/Nazonokage/DuelingMissiles
22. Commit and push only after the build passes live smoke testing.

## Important constraints

- Keep Three.js + Vite instead of React or Next.js.
- Do not copy Girls und Panzer characters, logos, uniforms, dialogue, or assets.
- Keep flags, countries, and music cosmetic only.
- Do not use extremist symbols as casual or celebratory cosmetics.
- Do not sync camera movement frame-by-frame.
- Do not mark tasks complete until they are actually implemented and tested.
