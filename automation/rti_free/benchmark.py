#!/usr/bin/env python3
import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

from generate import extract_article

HERE = Path(__file__).resolve().parent
REF = json.loads((HERE / "benchmark_reference.json").read_text(encoding="utf-8"))
CF_ACCOUNT = os.getenv("CLOUDFLARE_ACCOUNT_ID", "").strip()
CF_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN", "").strip()

MODELS = [
    "@cf/zai-org/glm-4.7-flash",
    "@cf/aisingapore/gemma-sea-lion-v4-27b-it",
    "@cf/openai/gpt-oss-120b",
]

SESSION = requests.Session()


def prompt(article):
    return f"""You are being evaluated for factual preservation and Mandarin-Indonesian accuracy.

SOURCE ARTICLE
Title: {article['title']}
URL: {article['url']}
Text:
---
{article['body']}
---

Return ONLY a compact valid JSON object:
{{
  "title_zh": "short Traditional Chinese headline",
  "sentences": [
    {{"zh":"Traditional Chinese factual reconstruction","id":"natural Indonesian translation"}}
  ],
  "summary_id": "one concise natural Indonesian summary"
}}

Requirements:
- Use 5-7 Traditional Chinese sentences.
- Preserve ALL substantive facts from the source: names, organizations, dates, numbers, countries, locations, event sequence, exhibition structure, statements, and purpose.
- Do not invent facts.
- Paraphrase; do not copy long passages verbatim.
- Indonesian must be natural and faithful to the Chinese sentence.
- No pinyin, vocabulary table, explanations, reasoning, or markdown.
- Output JSON immediately.
"""


def parse_json_text(text):
    text = (text or "").strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.I)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def call_glm(article):
    endpoint = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/ai/v1/chat/completions"
    payload = {
        "model": "@cf/zai-org/glm-4.7-flash",
        "messages": [
            {"role":"system","content":"Answer immediately without thinking text. Return only valid JSON."},
            {"role":"user","content":prompt(article)}
        ],
        "temperature": 0.1,
        "max_completion_tokens": 1400,
        "chat_template_kwargs": {"enable_thinking": False},
        "response_format": {"type":"json_object"}
    }
    r = SESSION.post(endpoint, headers={"Authorization":f"Bearer {CF_TOKEN}","Content-Type":"application/json"}, json=payload, timeout=90)
    if r.status_code >= 400:
        raise RuntimeError(f"HTTP {r.status_code}: {r.text[:1400]}")
    data = r.json()
    msg = data["choices"][0]["message"]
    content = msg.get("content")
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError(f"No final content: {json.dumps(data, ensure_ascii=False)[:1600]}")
    return parse_json_text(content), data.get("usage", {})


def call_sealion(article):
    endpoint = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/ai/run/@cf/aisingapore/gemma-sea-lion-v4-27b-it"
    payload = {
        "messages": [
            {"role":"system","content":"Return only valid compact JSON."},
            {"role":"user","content":prompt(article)}
        ],
        "temperature": 0.1,
        "max_tokens": 1800,
        "response_format": {"type":"json_object"}
    }
    r = SESSION.post(endpoint, headers={"Authorization":f"Bearer {CF_TOKEN}","Content-Type":"application/json"}, json=payload, timeout=90)
    if r.status_code >= 400:
        raise RuntimeError(f"HTTP {r.status_code}: {r.text[:1400]}")
    data = r.json()
    result = data.get("result", data)
    value = result.get("response") if isinstance(result, dict) else result
    if isinstance(value, dict):
        return value, result.get("usage", {}) if isinstance(result, dict) else {}
    if isinstance(value, str):
        return parse_json_text(value), result.get("usage", {}) if isinstance(result, dict) else {}
    if isinstance(result, dict):
        for key in ("text","content","output_text"):
            value = result.get(key)
            if isinstance(value, str) and value.strip():
                return parse_json_text(value), result.get("usage", {})
    raise RuntimeError(f"No usable output: {json.dumps(data, ensure_ascii=False)[:1600]}")


def call_gptoss(article):
    endpoint = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/ai/v1/responses"
    payload = {
        "model": "@cf/openai/gpt-oss-120b",
        "reasoning": {"effort":"low"},
        "input": [
            {"role":"system","content":"Return only valid compact JSON. Do not include reasoning."},
            {"role":"user","content":prompt(article)}
        ],
        "max_output_tokens": 1600
    }
    r = SESSION.post(endpoint, headers={"Authorization":f"Bearer {CF_TOKEN}","Content-Type":"application/json"}, json=payload, timeout=90)
    if r.status_code >= 400:
        raise RuntimeError(f"HTTP {r.status_code}: {r.text[:1400]}")
    data = r.json()

    texts = []
    for item in data.get("output", []):
        if not isinstance(item, dict) or item.get("type") != "message":
            continue
        for part in item.get("content", []):
            if isinstance(part, dict) and part.get("type") in ("output_text","text") and isinstance(part.get("text"), str):
                texts.append(part["text"])
    if not texts and isinstance(data.get("output_text"), str):
        texts = [data["output_text"]]
    if not texts:
        raise RuntimeError(f"No final output text: {json.dumps(data, ensure_ascii=False)[:1600]}")
    return parse_json_text("\n".join(texts)), data.get("usage", {})


def call(model, article):
    if model.endswith("glm-4.7-flash"):
        return call_glm(article)
    if model.endswith("gemma-sea-lion-v4-27b-it"):
        return call_sealion(article)
    if model.endswith("gpt-oss-120b"):
        return call_gptoss(article)
    raise ValueError(model)


def fact_score(mat):
    text = json.dumps(mat, ensure_ascii=False)
    results = []
    for fact in REF["facts"]:
        ok = True
        matched = []
        for alternatives in fact["all_of"]:
            hit = next((x for x in alternatives if x in text), None)
            if not hit:
                ok = False
            matched.append(hit)
        results.append({"id":fact["id"],"ok":ok,"matched":matched,"description":fact["description"]})
    return results


def valid_output(mat):
    return (
        isinstance(mat, dict)
        and isinstance(mat.get("title_zh"), str)
        and isinstance(mat.get("summary_id"), str)
        and isinstance(mat.get("sentences"), list)
        and 1 <= len(mat["sentences"]) <= 10
        and all(isinstance(x, dict) and isinstance(x.get("zh"), str) and isinstance(x.get("id"), str) for x in mat["sentences"])
    )


def main():
    if not CF_ACCOUNT or not CF_TOKEN:
        raise SystemExit("Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN")

    article = extract_article(REF["article_url"])
    if not article:
        raise SystemExit("Could not extract benchmark source")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    outdir = HERE / "benchmark-results" / stamp
    outdir.mkdir(parents=True, exist_ok=True)

    summary = {
        "timestamp": stamp,
        "source": {"url":REF["article_url"],"title":REF["article_title"]},
        "models": []
    }

    for model in MODELS:
        print(f"START {model}", flush=True)
        slug = model.split("/")[-1]
        row = {"model":model}
        try:
            mat, usage = call(model, article)
            valid = valid_output(mat)
            facts = fact_score(mat) if valid else []
            row.update({
                "json_valid": True,
                "structure_valid": valid,
                "facts_passed": sum(1 for x in facts if x["ok"]),
                "facts_total": len(facts),
                "fact_results": facts,
                "sentence_count": len(mat.get("sentences", [])) if isinstance(mat, dict) else None,
                "usage": usage
            })
            (outdir / f"{slug}.json").write_text(json.dumps(mat, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"DONE {model}: facts={row['facts_passed']}/{row['facts_total']}", flush=True)
        except Exception as e:
            print(f"FAIL {model}: {e}", flush=True)
            row.update({"json_valid":False,"structure_valid":False,"error":str(e)})
        summary["models"].append(row)
        time.sleep(0.5)

    (outdir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md = [
        "# RTI factual-accuracy benchmark",
        "",
        f"Source: {REF['article_url']}",
        "",
        "| Model | Valid structured output | Source facts preserved |",
        "|---|---:|---:|"
    ]
    for row in summary["models"]:
        if row.get("structure_valid"):
            md.append(f"| {row['model']} | yes | {row['facts_passed']}/{row['facts_total']} |")
        else:
            md.append(f"| {row['model']} | no | — |")
    md += [
        "",
        "Fact preservation is checked against a fixed 14-item checklist derived from the source.",
        "Raw model JSON is included for manual Mandarin-Indonesian review."
    ]
    (outdir / "REPORT.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    print("\n".join(md), flush=True)


if __name__ == "__main__":
    main()
