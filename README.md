# study-in-taiwan

Source repository for https://study-in-taiwan.com/

Study in Taiwan is a multi-area public information and language-learning site. The repository contains several independent workstreams, including Study in Taiwan guidance, Mandarin-learning material, Korean-learning material, and news/exam-practice material.

## Read before material changes

1. `AGENTS.md` — non-negotiable scope, privacy, crawlability, learning-content, provenance, and change-safety rules.
2. `SITE_SPEC.md` — product, visual, 3D/spatial, interaction, performance, and UX direction.
3. This `README.md` — repository and architecture orientation.

## Scope discipline

This is a shared repository with independent content systems. Do not treat the whole repository as one redesign target unless the task explicitly says so.

Important examples:

- `belajar-korea/**` — Korean-learning system.
- `news/**` — news / RTI-style exam-practice material.
- Mandarin-learning pages and Study in Taiwan guidance are separate content areas.

Read `AGENTS.md` before touching shared/root files.

## Architecture

The site is static-first. Current public serving has historically used GitHub Pages with Cloudflare DNS, with Workers Static Assets as the broader portfolio target. Do not change hosting/deployment architecture merely because this documentation exists; deployment changes require an explicit task.

Important public information and learning content must remain semantic HTML. CSS 3D, Canvas, WebGL, Three.js, shaders, and scroll animation may enhance the experience without becoming the only representation of essential content.

## Development principles

- Static-first and progressively enhanced.
- Preserve project boundaries and established learning structures.
- Semantic HTML and AI/search crawlability survive redesigns.
- 3D/spatial visual language is encouraged for site identity, navigation, geography, language concepts, learning interactions, and storytelling where it improves understanding.
- Content-heavy lessons/news pages prioritize readability; 3D should not bury study material.
- Mobile is a first-class experience.
- Accessibility and `prefers-reduced-motion` matter.
- Load core content quickly; progressive-load heavier visual assets.
- Backstage technical resources stay out of normal visitor navigation.

## Creative freedom

Within `AGENTS.md` and the target workstream's requirements, the existing visual layout is not sacred. Agents may substantially redesign typography, layout, navigation, hierarchy, interactions, motion, and spatial/3D presentation when the task calls for it. Do not use visual cleanup as a reason to remove learning aids, source provenance, color mapping, audio hooks, pronunciation aids, or required content.

## Security

Never commit passwords, API tokens, private keys, cookies/sessions, recovery codes, raw credentials, or secret values. Do not expose internal deployment/account information or private contact data in the public UI.
