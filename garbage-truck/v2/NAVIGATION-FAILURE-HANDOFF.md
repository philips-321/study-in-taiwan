# Garbage Truck V2 — City Navigation Failure Handoff

Status: **BROKEN IN LIVE USER TEST**

Last verified `main` before this handoff document:

- `1835f44b172bc76d01839af9a49362da9077d0ab`
- commit message: `garbage-v2: use one city navigation controller`
- GitHub Pages build/deploy for that commit completed successfully.
- V2 validation workflow also passed on the relevant JS state.
- **Despite green CI and successful deploy, the user tested the live V2 and reported that changing cities still does not make the map jump to the selected city.**

Do not treat the green workflow as proof that navigation works. The existing validator checks syntax/structure/data assumptions, not end-to-end browser behavior.

## User-visible failure

The unresolved acceptance criterion is simple:

1. Open Garbage Truck V2.
2. Change the city/county dropdown, e.g. Taipei -> Taichung -> Kaohsiung -> Hualien.
3. The map must visibly move to the selected jurisdiction/start anchor.

Actual result reported by the user after the latest deployed commit:

- city selection UI can be changed;
- map does **not** jump between cities;
- therefore all navigation fixes listed below must be considered unsuccessful until a real browser runtime test proves otherwise.

Do not confuse this failure with city data coverage. Some jurisdictions intentionally have pending/schedule-only data. Even if a city has no imported truck markers yet, the map itself must still move to the selected city's navigation anchor.

## Current architecture relevant to the bug

V2 is an outer same-origin wrapper:

- outer page: `garbage-truck/v2/index.html`
- iframe: `garbage-truck/` via `<iframe id="appFrame" src="../">`
- production map implementation remains in `garbage-truck/index.html`
- production map is MapLibre.

Current V2 script order in `garbage-truck/v2/index.html`:

1. i18n scripts
2. `data/city-start-points.js?v=20261024c`
3. `nationwide.js?v=20261024c`
4. `city-source-filter.js?v=20261024c`
5. `city-navigation.js?v=20261024e`
6. `mobile-parity.js?v=20261024e`

`patchV2()` waits for the iframe load event, applies translations, and calls `window.installNationwideV2(frame)`.

`nationwide.js` inserts the `#cityV2` selector and owns city state/data swapping.

The city dropdown flow in `nationwide.js` is conceptually:

```js
select.addEventListener('change', () =>
  setCity(select.value, { moveMap: true, persist: true })
);
```

`setCity(... moveMap:true)` calls `flyToCity()` before committing city data.

The current `flyToCity()` still calls the iframe property `w.map`:

```js
w.map.once('moveend', finish);
w.map.flyTo({
  center: city.center,
  zoom: city.kind === 'city' ? 13.5 : 11.8,
  essential: true
});
```

The current `syncCityFromMap()` also calls `w.map`, and installation ends with a `w.map.on('moveend', syncCityFromMap)` registration.

## High-confidence suspected root cause in CURRENT code

This is the most important handoff finding.

Production `garbage-truck/index.html` declares the map as a lexical top-level binding:

```js
const map = new maplibregl.Map(...)
```

A top-level lexical `const map` is accessible through `eval('map')` in the iframe realm but is not guaranteed to exist as the property `window.map`.

The newest navigation controller, `garbage-truck/v2/city-navigation.js`, currently bridges the lexical map like this:

```js
const map = w.eval('map');
if (map) {
  w.__v2MapBridge = map;
  return map;
}
```

It **does not assign**:

```js
w.map = map;
```

However, `nationwide.js` still directly uses `w.map` for:

- `w.map.flyTo(...)`
- `w.map.once(...)`
- `w.map.off(...)`
- `w.map.getCenter()`
- `w.map.on('moveend', ...)`

Therefore the current code has a strong internal inconsistency:

- `city-navigation.js` may successfully obtain the real MapLibre instance as `w.__v2MapBridge`;
- but `nationwide.js` may still see `w.map === undefined`;
- `flyToCity()` catches failures around the movement call and resolves anyway;
- city state/data can therefore continue changing while the map never moves.

That failure mode is highly consistent with the user's report.

**This is a high-confidence code-level lead, not yet a runtime-confirmed diagnosis. The next AI should verify it in a real browser before changing code.**

## Current `city-navigation.js` behavior

Current file: `garbage-truck/v2/city-navigation.js`

It:

1. reads `window.V2_CITY_START_POINTS.points` from the outer V2 page;
2. captures the existing `window.installNationwideV2` from `nationwide.js`;
3. uses `frame.contentWindow.eval('map')` to access the iframe's lexical MapLibre instance;
4. stores the instance only as `w.__v2MapBridge`;
5. monkey-patches the map instance's `flyTo()`;
6. recognizes city-center requests and substitutes the university/campus anchor using `jumpTo()`;
7. wraps `installNationwideV2(frame)` so it tries to install that patch before calling the original nationwide installer.

The intended city-center -> campus-anchor mapping comes from:

- `garbage-truck/v2/data/city-start-points.js`

That file currently contains all 22 jurisdictions with both:

- `city_center`: expected center passed by `nationwide.js`
- `center`: representative campus/navigation anchor
- `zoom`

Examples:

- Taipei city center -> NTNU anchor
- Taichung city center -> Feng Chia University anchor
- Kaohsiung city center -> NSYSU anchor
- Hualien city center -> National Dong Hwa University anchor

These anchors are navigation/test viewport anchors only. They are not garbage-truck source data.

## Failed navigation attempt chronology

The following commits are navigation-related attempts made on 2026-10-24. They are preserved here so another AI does not repeat the same approaches blindly.

### 1. `2e4152cee9d6bc05788834a9684b2c38b764b4f8`

`garbage-v2: make city dropdown move map before swapping data`

Goal:

- make dropdown selection move the map first, then swap city data;
- avoid data/state changes racing ahead of viewport navigation.

Result:

- not sufficient; later navigation patches were required;
- live behavior remained unresolved.

### 2. `97711bbcae72ef732f4118181643c2e821430164`

`garbage-v2: remove competing city-switch listeners`

Goal:

- reduce duplicate listeners and competing city-switch behavior.

Result:

- did not solve the live map-jump failure.

### 3. `b6cfff28fecf2732c8faa09eb20ead863536f7f7`

`garbage-v2: add university viewport anchors for 22 jurisdictions`

Goal:

- add deterministic target locations for every city/county.

Result:

- anchor data exists and is still useful;
- adding anchor data alone did not make runtime navigation work.

### 4. `1adc53862954dca5f80cf11cc881044643304fc8`

`garbage-v2: preload city campus anchors before navigation`

Goal:

- ensure anchors are loaded before navigation code executes.

Result:

- load ordering alone did not solve the map-jump failure.

### 5. `44ad9fd52ae2517c5e796419d45e1737f48e3b53`

`garbage-v2: restore mobile sheet and use campus jump anchors`

Goal:

- use campus anchors as jump targets while preserving mobile sheet behavior.

Result:

- later replaced by additional navigation changes;
- did not produce reliable live navigation.

### 6. `896128129b01bb86c76945dfe9ddd6f36c108fe8`

`garbage-v2: bust cached V2 navigation and mobile scripts`

Goal:

- rule out stale browser/CDN script cache.

Result:

- cache busting did not solve the failure;
- do not assume this is merely a stale cache problem.

### 7. `fc02bf9bdea04ec1260af904962725d89245cb52`

`garbage-v2: bridge lexical map before city navigation`

Goal:

- account for production's lexical `const map` instead of assuming `window.map` exists.

Result:

- approach still did not produce reliable live navigation;
- later bootstrap changes were made and then rolled back.

### 8. `46daf685a863b82f1d4f3b3f5601267fa12b61b0`

`garbage-v2: make V2 boot resilient to cached iframe load race`

Goal:

- handle a suspected iframe load/bootstrap race.

Result:

- did not resolve the user-visible issue;
- later reverted back toward a known baseline.

### 9. `39d4e2e1412d51bd37988c40227bc9307c40b916`

`garbage-v2: restore pre-navigation bootstrap baseline`

Goal:

- back away from navigation/bootstrap changes that were not proving reliable.

Meaning for next AI:

- this commit is evidence that earlier bridge/bootstrap fixes were considered unsuccessful enough to restore baseline behavior.

### 10. `6f3fcb99fbff3b56f4de6212d2db9f7429faeceb`

`garbage-v2: enable tested city map warp bridge`

Goal:

- reintroduce a map warp bridge after baseline restoration.

Result:

- subsequent live user test still failed;
- the word "tested" in the commit message must **not** be interpreted as proven end-to-end browser success.

### 11. `050a57137ec9eb49a9d20bbf907d29f103819547`

`garbage-v2: make city selector warp deterministic after nationwide move`

Goal:

- add direct reassert/jump behavior after the normal nationwide movement;
- compensate for possible race/snap-back.

Result:

- user reported the map still did not jump.

### 12. `b3ba89d128af4ae5539cea08e087270bbfe0330f`

`garbage-v2: bridge map before installing campus navigation`

Goal:

- fix a timing/load-order problem where `mobile-parity.js` could install its style once and then never install the map patch if `w.map` was not available on first execution.

Result:

- validator passed;
- user still reported no working city jumps.

### 13. `29f22e43ae61725d411bcb484c28f3a6d5166129`

`garbage-v2: load fixed mobile navigation bridge`

Goal:

- cache-bust the previous bridge patch.

Result:

- Pages deployment succeeded;
- user tested it and said it still did not work.

### 14. `dee4c9df92f8e3103ff40ab420591ceacd2093f8`

`garbage-v2: install city navigation before nationwide controller`

Goal:

- move navigation responsibility into a dedicated controller and install it before the nationwide installer runs.

Result:

- part of the final architecture, but not sufficient.

### 15. `ffe3b8224ca77342303094820193717e8f19d4a5`

`garbage-v2: keep mobile parity layout-only`

Goal:

- remove map/navigation monkey-patching from `mobile-parity.js`;
- leave mobile parity responsible only for layout.

Result:

- cleanup is reasonable and should probably be preserved;
- does not itself fix navigation.

### 16. `1835f44b172bc76d01839af9a49362da9077d0ab`

`garbage-v2: use one city navigation controller`

Goal:

- remove duplicate direct warp listeners from `v2/index.html`;
- centralize navigation in `city-navigation.js`;
- avoid three layers fighting over the same map.

CI/deploy result:

- relevant validator state passed;
- GitHub Pages build: success;
- deploy: success;
- report-build-status: success.

**Actual live user result:** still broken. The map does not jump between selected cities.

This is the current code state immediately before this handoff document was added.

## Approaches that should NOT simply be repeated

Do not repeat these as first-line fixes without runtime evidence:

- another cache-bust suffix only;
- another delayed `setTimeout(... jumpTo ...)` reassert;
- another duplicate city dropdown `change` listener;
- patching `map.flyTo` in both `mobile-parity.js` and another file;
- adding more campus anchors;
- declaring success because GitHub Actions or Pages deployment is green;
- assuming the problem is missing city data;
- changing production `/garbage-truck/` while debugging the V2 wrapper unless evidence proves production code itself must change.

## Runtime checks the next AI should perform FIRST

Before editing code, inspect the live V2 in a real browser/runtime and record actual values.

Assuming the outer page has:

```js
const frame = document.getElementById('appFrame');
const w = frame.contentWindow;
```

Check:

```js
typeof w.map
```

and compare with:

```js
w.eval('typeof map')
```

Then:

```js
!!w.__v2MapBridge
w.__v2MapBridge?.getCenter?.()
w.__v2MapBridge?.__v2CityNavigationInstalled
```

Also inspect:

```js
frame.contentDocument.getElementById('cityV2')?.value
```

and before/after a dropdown change:

```js
w.eval('map.getCenter()')
w.eval('map.getZoom()')
```

If `typeof w.map === 'undefined'` but `w.eval('typeof map') === 'object'`, the current suspected bridge mismatch is confirmed.

Check browser console for at least:

- `V2 city navigation could not access map`
- `V2 city jump failed`
- `V2 city flyTo failed`
- `V2 map city detection failed`
- `v2 patch failed`

Also confirm whether `window.installNationwideV2(frame)` returns/rejects because of:

```js
w.map.on('moveend', syncCityFromMap)
```

If `w.map` is undefined there, the installer can partially set up the dropdown/listener and then fail later, which would explain a UI that appears present but has broken map behavior.

## Minimal fix hypothesis to evaluate, NOT yet approved as proven

Do not apply blindly. Verify runtime first.

The simplest consistency repair may be one of these:

### Option A — expose the bridged map under the property expected by `nationwide.js`

In the lexical-map bridge:

```js
const map = w.eval('map');
if (map) {
  w.__v2MapBridge = map;
  w.map = map;
}
```

Then `nationwide.js`'s existing `w.map.*` calls operate on the actual MapLibre object.

### Option B — remove `w.map` assumptions from `nationwide.js`

Use one helper everywhere, e.g. resolve the map via `w.eval('map')` once, then use that resolved object for movement/event registration/getCenter.

This is architecturally cleaner than relying on an ad-hoc global alias, but it touches more code.

### Option C — eliminate `flyTo` interception completely

Make `nationwide.js` itself choose the authoritative navigation target from `V2_CITY_START_POINTS` and call the resolved MapLibre instance directly.

This removes monkey-patching entirely, but should only be done after confirming the map-object mismatch and understanding why the current listener is not moving the map.

## Important constraints for the next AI

- Production `garbage-truck/` is the stable page. Do not casually break it while fixing V2.
- V2 may continue to wrap production with a same-origin iframe for now.
- Multi-language and 22-jurisdiction work should not be removed just to make navigation easier.
- `city-start-points.js` contains navigation anchors, not official garbage-truck coordinates.
- Pending/schedule-only cities are allowed to have no truck markers, but selecting them must still move the map.
- Do not add completion percentages.
- Preserve failures in history; do not rewrite them as successes.
- Verify the live browser behavior before claiming the issue is fixed.

## Definition of done for this bug

Do not close/mark fixed until all of these are observed in a real deployed browser session:

1. Select Taipei -> map visibly moves to Taipei/NTNU anchor.
2. Select Taichung -> map visibly moves to Taichung/Feng Chia anchor.
3. Select Kaohsiung -> map visibly moves to Kaohsiung/NSYSU anchor.
4. Select Hualien -> map visibly moves to Hualien/NDHU anchor.
5. Re-select Taipei -> map returns to Taipei.
6. City dropdown value, brand label, city data state, and map viewport remain consistent after movement.
7. No snap-back to the previous city after `moveend`.
8. No duplicate change listeners or competing `jumpTo`/`flyTo` controllers are needed.
9. Behavior is checked on the actual deployed V2 page, not inferred only from source code or CI.

## Current conclusion

The navigation bug is **not fixed**.

The strongest current code-level suspicion is the mismatch between:

- the actual production lexical map object obtained as `w.eval('map')` and stored as `w.__v2MapBridge`, versus
- `nationwide.js` continuing to call `w.map`.

The next AI should start by proving or disproving that mismatch at runtime before making another patch.
