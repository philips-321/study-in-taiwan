# RTI News Templates

`TEMPLATE_REGISTRY.json` is the authoritative version registry. `CURRENT` contains the default template version used by the RTI Daily News automation.

Rules:
- Never overwrite an existing version to introduce a redesign; create `v2`, `v3`, etc.
- Existing versions remain available for rollback or explicit selection.
- The automation must read the registry and the selected template before generating a daily page.
- Preserve the selected template's presentation structure, CSS, JavaScript, controls, spacing, and component hierarchy unless explicitly instructed otherwise.
- Replace only date/news/source/learning-content fields needed for the new daily page.
- A future template may be marked experimental without changing `current`.
