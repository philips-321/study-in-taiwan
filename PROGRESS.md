# Progress

- API deployed at https://study-in-taiwan-api.philips-kie.workers.dev using the existing D1 database; no ingestion, crawl, or D1 import was run.
- Added `program-chat.js` and `program-chat.css` to the root page and `/belajar-mandarin/` page.
- Chat queries the active program API, shows source links, and explicitly marks unavailable cost, deadline, admission, language, and scholarship details as unknown.
- Existing WhatsApp and Turnstile code in `/belajar-mandarin/` was left unchanged.
- Local syntax and diff checks pass. Local commit: `0c397d0 Add database-backed program consultant chat`.
- GitHub CLI authentication completed as `philips-321`; the existing commits were pushed with a normal non-force push. GitHub Pages published the changes at https://study-in-taiwan.com/.
- Public verification passed: root and `/belajar-mandarin/` expose the chat assets; `/belajar-mandarin/` still exposes the existing Turnstile and WhatsApp controls; the API engineering search returned 618 total results and the NTU filter returned 127; CORS preflight returned 204 for the allowed origin.
