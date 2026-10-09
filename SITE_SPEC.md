# Study in Taiwan — Site Experience Specification

## Product goal

Create a distinctive, modern learning/information platform for Study in Taiwan guidance and language learning. The site should feel more like an interactive educational environment than a generic content portal.

The repository contains multiple independent workstreams, so visual ambition must respect scope boundaries and established lesson/content structures.

## 3D/spatial design language

A 3D/spatial identity is encouraged across the site, but it should improve orientation and learning rather than overwhelm content.

Possible uses include:

- interactive Taiwan/campus/city maps in depth;
- language-learning objects, cards, characters, or word units arranged spatially;
- 3D pronunciation/mouth/phonetic concepts where useful;
- layered timelines for study/application processes;
- immersive lesson entry scenes;
- spatial progress paths;
- floating vocabulary or grammar objects;
- scroll-controlled educational storytelling;
- depth-based navigation between major learning/reference areas;
- subtle 3D typography and scene transitions in site-level pages.

For dense lessons, exercises, news, exam practice, tables, and long reading content, readability remains the priority. 3D can frame or support the learning experience without forcing every paragraph into a moving scene.

## Creative freedom

Within `AGENTS.md` and the task's path/scope, agents may substantially redesign layout, typography, hierarchy, navigation, interaction, animation, and 3D/spatial presentation. The current visual design does not need to be preserved merely because it exists.

Creative freedom does NOT permit merging independent workstreams or removing required learning structures.

## Workstream preservation

Treat major content areas independently unless explicitly tasked otherwise. In particular:

- `belajar-korea/**` and `news/**` are separate workstreams;
- do not redesign one by modifying the other;
- preserve established pronunciation, romanization/pinyin, translation, word-color mapping, exercises, scores, audio hooks, and source/provenance behavior when they are part of the target lesson/page;
- do not remove useful study content merely to make a page visually cleaner.

## Possible site-level storytelling

A site/home experience may use spatial scenes for:

1. discovering Taiwan and study pathways;
2. selecting Mandarin/Korean/other learning areas;
3. navigating schools, cities, courses, or learning tracks;
4. entering language-learning environments;
5. showing progress or topic relationships.

These are examples, not mandatory structure.

## Technology

Use the lightest appropriate mix of semantic HTML/CSS, SVG, CSS 3D, Canvas, WebGL, Three.js, maps, shaders, GSAP/ScrollTrigger, or native browser animation. Avoid large frameworks without a clear educational/technical benefit.

## Progressive enhancement

Important guidance, lessons, vocabulary, translations, exercises, and sourced facts remain available in semantic HTML. 3D/WebGL/Canvas enhances the experience rather than replacing essential content.

The site should remain understandable if JavaScript or WebGL is unavailable and should respect `prefers-reduced-motion`.

## Motion quality

Motion should support orientation, explanation, memory, hierarchy, or delight. Avoid random movement, repeated template reveals, and effects that make reading/practice harder.

## Mobile

Mobile learning is a first-class use case. Preserve strong spatial identity while simplifying scene complexity and GPU cost. Keep text, buttons, exercises, audio controls, and handwriting/practice interactions usable on touch screens. Essential information cannot depend on hover.

## Performance

- Show core lesson/reference HTML quickly.
- Do not block learning content on a heavy 3D bundle.
- Lazy-load non-critical visual scenes.
- Optimize models, textures, audio, and images.
- Keep low-memory/mobile devices in mind.
- Avoid unnecessary dependencies.

## Search and AI discoverability

Preserve/improve semantic factual/educational text, headings, canonical URLs, metadata, structured data where appropriate, internal linking, `robots.txt`, `sitemap.xml`, and `llms.txt` where present.

Do not hide important study guidance or lesson content only inside Canvas/WebGL/images/video. Preserve source provenance and do not invent school requirements, tuition, immigration rules, exam rules, or language facts for SEO.

## Public versus backstage

Follow `AGENTS.md`. Do not promote crawler/security/deployment files, automation logs, repository documentation, or internal configuration into normal visitor navigation.

## Completion standard

For any redesigned area, test desktop/mobile, reduced motion, graceful no-WebGL/no-JS behavior where practical, learning usability, crawlability, links, source/provenance integrity, privacy exposure, and performance.

Iterate if visual spectacle interferes with studying, or if the result still feels like a generic flat portal with decorative 3D rather than a coherent interactive learning environment.
