# Security Audit: Next Steps

Reviewed: 2026-11-05  
Repository: `study-in-taiwan`

This handoff records actionable findings from a static repository review. No production code, workflow, secret, or deployment setting was changed by the audit. Preserve the independent workstreams described in `AGENTS.md` and implement unrelated items in separate commits.

## P1 — Reduce Cloudflare-secret exposure in RTI workflows

Affected workflows:

- `.github/workflows/rti-daily-free.yml`
- `.github/workflows/rti-model-benchmark.yml`

Cloudflare credentials are available at job scope, so setup actions, dependency installation, and unrelated commands inherit them. Move the secret variables to only the invocation step that needs them. Use `persist-credentials: false` for checkout unless a later, deliberately separated publication step needs repository write access.

**Done when:** setup/install steps receive no Cloudflare credentials; generation and publication are separated; logs/artifacts contain no secrets; permissions are least-privilege.

## P1 — Pin GitHub Actions to immutable SHAs

Workflows under `.github/workflows/` use mutable major-version tags for checkout, setup, cache, and artifact actions. Replace every external tag with a reviewed 40-character commit SHA, retain the release version as a comment, and configure reviewable update PRs.

**Done when:** no external `uses:` entry points to a tag or branch.

## P1 — Remove or integrity-protect browser CDN dependencies

Known examples include MapLibre, Tailwind, GSAP, and `pinyin-pro@3` in `cinema/index.html`, legacy root experiments, and generated news pages. Some URLs float at a major version and none of the reviewed executable assets had SRI.

Prefer vendored exact assets. If a CDN remains, use an immutable exact version with verified `integrity` and `crossorigin="anonymous"`. Replace the Tailwind browser runtime with compiled CSS. Inventory inline code before designing a CSP and verify the policy on deployed responses.

**Done when:** no production page executes a floating/unversioned remote script and all remaining remote executable/style assets have verified integrity protection.

## P2 — Remove the plain-HTTP Keelung probe

`garbage-truck/v2/scripts/probe_keelung.py` includes the HTTP endpoint `210.61.25.6`; `.github/workflows/probe-garbage-v2-keelung.yml` can derive committed probe metadata from it. Find an official HTTPS equivalent or remove the source from automated publish-relevant probing. Do not disable TLS verification. Preserve last-known-good data on failure.

**Done when:** no publish-relevant collector trusts a plain-HTTP response.

## P2 — Upgrade Requests

`automation/rti_free/requirements.txt` pins `requests==2.32.5`, affected by CVE-2026-25645 / GHSA-gc5v-m9x4-r6x2. Repository code did not call the vulnerable `extract_zipped_paths()` helper, so current exposure appears low, but upgrade to `2.33.0` or a later reviewed compatible patch and run `pip-audit` plus RTI validation.

**Done when:** the resolved requirements have no applicable known finding and RTI parsing/rendering tests pass.

## P2 — Replace review-queue `innerHTML`

`belajar-korea/progress.html` parses objects from `localStorage` and interpolates lesson fields into `innerHTML`. Validate the object schema and allowed paths, create elements with DOM APIs, and assign text with `textContent`.

**Done when:** an item containing HTML/event attributes renders as text and invalid paths cannot become links.

## P3 — Remove cross-frame `eval`

Garbage Truck V2 files including `nationwide.js`, `city-source-filter.js`, `city-navigation.js`, and `facility-markers.js` call `contentWindow.eval()`. No direct injection was confirmed, but the design blocks a strong CSP and is fragile. Replace it with a narrow, argument-validating frame bridge API.

**Done when:** application code under `garbage-truck/v2` no longer uses `eval` and city/map/mobile regression tests pass.

## P3 — Harden generated external links

`automation/rti_free/generate.py` emits `_blank` links without explicit `rel="noopener noreferrer"`; existing generated news pages inherit the pattern. Fix the generator/template, backfill existing pages mechanically, and add a check.

## Review notes

- No critical exploit or private credential was confirmed in the current tree.
- SHA-1 uses reviewed in importers generate deterministic IDs, not security signatures.
- Dynamic RTI content was HTML-escaped before insertion; no direct AI-output XSS was confirmed.
- Do not dispatch collectors or deploy merely to verify these documentation items; follow the repository's source-snapshot and Actions policies.

