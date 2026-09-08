# Progress

- API deployed at https://study-in-taiwan-api.philips-kie.workers.dev using the existing D1 database; no ingestion, crawl, or D1 import was run.
- Added `program-chat.js` and `program-chat.css` to the root page and `/belajar-mandarin/` page.
- Chat queries the active program API, shows source links, and explicitly marks unavailable cost, deadline, admission, language, and scholarship details as unknown.
- Existing WhatsApp and Turnstile code in `/belajar-mandarin/` was left unchanged.
- Local syntax and diff checks pass. Local commit: `0c397d0 Add database-backed program consultant chat`.
- Publishing is blocked by one external issue: this environment has no GitHub credentials, so `git push origin main` failed. Required action: authenticate GitHub for this environment or push commit `0c397d0` from an authenticated machine.
