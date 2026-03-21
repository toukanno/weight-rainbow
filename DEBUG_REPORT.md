# Debug Report

## Scope

- Target: `weight-rainbow`
- Date: 2026-03-15
- Method: static review of source, tests, and build scripts
- Limitation: this environment does not have `node` or `npm`, so runtime verification and automated test execution could not be performed here

## Findings

### 1. Test suite cannot start because `test/logic.test.js` has duplicate imports

- Severity: High
- Files:
  - `test/logic.test.js:80`
  - `test/logic.test.js:151`
  - `test/logic.test.js:75`
  - `test/logic.test.js:155`
- Detail:
  - `calcGoalCountdown` is imported twice from `../src/logic.js`
  - `calcWeightConfidence` is imported twice from `../src/logic.js`
- Impact:
  - ES module parsing fails before any test runs, so the advertised regression suite cannot actually validate changes.
- Recommended fix:
  - Remove the duplicated import specifiers and re-run the Vitest suite.

### 2. Google Drive backup/restore is implemented but not reachable from the UI

- Severity: High
- Files:
  - `src/app.js:2094`
  - `src/app.js:2095`
  - `src/app.js:3457`
  - `src/app.js:3514`
  - `README.md:78`
- Detail:
  - The app contains full backup/restore handlers and translation keys for Google Drive.
  - The settings screen does not render any button with `data-action="google-backup"` or `data-action="google-restore"`.
- Impact:
  - Users cannot access a feature that the README and product docs claim exists.
- Recommended fix:
  - Add visible settings actions for backup/restore, or remove the feature claim until the UI entry point is restored.

### 3. Chart tooltip hit-testing is incorrect on high-DPI/mobile displays

- Severity: Medium
- Files:
  - `src/app.js:2990`
  - `src/app.js:2991`
  - `src/app.js:2992`
  - `src/app.js:3258`
  - `src/app.js:3263`
- Detail:
  - The chart is rendered using a device-pixel-ratio scaled canvas.
  - Tooltip hit-testing compares `clientX - rect.left` in CSS pixels against `toX(...)` values derived from canvas drawing coordinates after scaling logic.
  - Because the drawing buffer and hit-test coordinates are mixed, point selection drifts on retina/mobile layouts.
- Impact:
  - Users may tap or hover near one point and get the wrong record, or no tooltip at all.
- Recommended fix:
  - Normalize both drawing and hit-testing to the same coordinate space. The simplest fix is to keep hit-testing entirely in CSS pixels using `rect.width`/`rect.height`.

### 4. Auto theme mode does not preserve the latest manually selected light theme

- Severity: Medium
- Files:
  - `src/app.js:180`
  - `src/app.js:181`
  - `src/app.js:182`
  - `src/app.js:2178`
- Detail:
  - When auto theme is enabled, `_savedTheme` is only initialized once.
  - If the user changes the theme while auto mode remains on, the new choice is written to `state.settings.theme` but `_savedTheme` is not updated.
  - On the next system theme change, the app falls back to the stale cached theme.
- Impact:
  - Theme selection appears to work temporarily, then reverts unexpectedly when dark/light mode changes.
- Recommended fix:
  - Update `_savedTheme` whenever a manual theme swatch is selected while auto mode is enabled.

## Suggested next pass

1. Repair `test/logic.test.js` import syntax so the regression suite becomes runnable.
2. Decide whether Google Drive backup should be shipped now or removed from docs/UI claims.
3. Fix chart hit-testing and verify on a retina display or iPhone simulator.
4. Fix auto theme persistence and verify theme switching across system mode changes.
