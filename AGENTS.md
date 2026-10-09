# Study in Taiwan — Repository Operating Rules

These instructions apply to every coding agent working in this repository.

## Site identity and objective

- Public site: `https://study-in-taiwan.com/`.
- The repository contains multiple independent content areas, including Study in Taiwan guidance, Mandarin-learning material, Korean-learning material, and news/exam-practice material.
- Preserve existing project boundaries. Do not merge unrelated content systems merely because they share one repository.

## Scope discipline

- Inspect the task scope before editing.
- Work inside the requested path only unless the task explicitly requires broader changes.
- In particular, treat `belajar-korea/**` and `news/**` as independent workstreams.
- Do not modify RTI/news material while doing Korean-course work, and do not modify Korean-course material while doing news work, unless explicitly requested.
- Before changing shared root configuration, check whether the change can affect multiple sections.

## Privacy and exposure

- Never commit passwords, API tokens, private keys, cookies/sessions, recovery codes, raw credentials, or secret values.
- Do not expose Cloudflare account details, authentication data, internal operational notes, private configuration, deployment internals, or private contact data in the public interface.
- If contact details are intentionally indirect or obfuscated, preserve that behavior unless the owner explicitly requests a change.
- Inspect unusual helpers or indirection before replacing them.

## Technical files stay backstage

Do not add crawler/security/deployment resources to normal visitor navigation or footer links unless explicitly requested, including:

- `robots.txt`
- `sitemap.xml`
- `llms.txt`
- `.well-known/security.txt`
- deployment configuration
- repository/internal documentation
- automation logs or diagnostic files

## AI/search discoverability

- Keep important public facts and educational content in semantic crawlable HTML.
- Do not make important content available only through JavaScript, canvas, WebGL, animation, or images.
- Treat advanced interactions as progressive enhancement.
- Preserve canonical URLs, metadata, structured data, `robots.txt`, `sitemap.xml`, and `llms.txt` where appropriate.
- Do not introduce crawler blocking unless explicitly requested.
- Do not invent school requirements, immigration rules, tuition, government policy, exam rules, language facts, or institutional claims for SEO.
- Preserve source provenance and clearly separate sourced facts, translations, learning examples, and generated explanatory material.

## Learning-content safety

- Preserve the site's established language-learning structures, including pronunciation, pinyin/romanization, translations, color mapping, exercises, and audio hooks when they are part of the target page.
- Do not silently remove accessibility or learning aids during a redesign.
- Do not simplify away content merely to make the page visually cleaner if that content is part of the lesson design.

## Change safety

- Read the existing implementation before replacing it.
- Preserve behavior that appears intentionally defensive, indirect, or privacy-related unless explicitly overridden.
- Do not change DNS, registrar settings, Cloudflare configuration, authentication, or production-domain bindings unless the task explicitly requests those changes.
- Do not change authentication just because an optional tool scope warning appears.
- Do not rewrite Git history or purge prior versions unless explicitly authorized.
- If a requested redesign conflicts with these rules, preserve these rules and report the conflict.
