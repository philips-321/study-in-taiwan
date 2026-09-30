# RTI Daily News — zero-payment automation

Production path:

GitHub Actions -> RTI public pages -> Cloudflare Workers AI Free -> canonical HTML renderer -> git commit -> GitHub Pages

This intentionally does not use ChatGPT scheduled tasks, the ChatGPT GitHub connector, or the separately billed OpenAI API.

## Cost guardrail

Use a Cloudflare Workers Free account. The workflow uses `@cf/zai-org/glm-4.7-flash`, caps each article completion at 2,600 tokens, and scheduled runs generate at most 20 articles.

If Cloudflare free quota/capacity refuses a request, the workflow fails. There is no fallback to OpenAI API or another paid provider.

Do not enable a paid Cloudflare Workers plan for this workflow if the goal is strict zero additional payment.

## One-time setup

Create these GitHub Actions repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Do not commit tokens or credentials into the repository.

Then open GitHub -> Actions -> `RTI Daily News - Zero Payment` -> Run workflow and start with 1-3 articles for quality verification.

The scheduled run is 00:15 UTC, approximately 08:15 Taipei. GitHub scheduled jobs can start later during busy periods.

## Files

- `.github/workflows/rti-daily-free.yml` — scheduler and commit step
- `automation/rti_free/generate.py` — RTI discovery, extraction, Workers AI call, validation, rendering, index update
- `automation/rti_free/config.json` — model and limits
- `news/templates/v1/news-template.html` — existing canonical presentation shell; read at runtime and not overwritten

Generated files:

- `news/news-YYYY-MM-DD.html`
- `news/news-YYYY-MM-DD.json` — source/provenance manifest, no secrets

## Failure behavior

- Missing Cloudflare secret -> fail with no website change.
- No current RTI articles -> fail with no website change.
- Invalid output for one article -> skip that article.
- All AI outputs invalid -> fail with no website change.
- Cloudflare free quota/capacity failure -> fail; no paid fallback.
- Commit uses GitHub Actions' built-in `GITHUB_TOKEN` for this repository; no personal GitHub token is needed.
