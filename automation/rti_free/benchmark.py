#!/usr/bin/env python3
import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from pypinyin import Style, lazy_pinyin

from generate import extract_article, ai_prompt, validate_material

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
REF = json.loads((HERE / "benchmark_reference.json").read_text(encoding="utf-8"))
CF_ACCOUNT = os.getenv("CLOUDFLARE_ACCOUNT_ID", "").strip()
CF_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN", "").strip()
MODELS = [
    "@cf/zai-org/glm-4.7-flash",
    "@cf/aisingapore/gemma-sea-lion-v4-27b-it",
    "@cf/openai/gpt-oss-120b",
]
SESSION = requests.Session()

def norm(s):
    return re.sub(r"[^0-9A-Za-z\u3400-\u9fff]+", "", str(s or "")).lower()

def call(model, article):
    endpoint = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/ai/v1/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role":"system","content":"Return strict valid JSON only. Use Traditional Chinese and Indonesian exactly as requested."},
            {"role":"user","content":ai_prompt(article)}
        ],
        "temperature": 0.2,
        "max_completion_tokens": 2600
    }
    r = SESSION.post(endpoint, headers={
        "Authorization": f"Bearer {CF_TOKEN}",
        "Content-Type":"application/json"
    }, json=payload, timeout=90)
    if r.status_code >= 400:
        raise RuntimeError(f"HTTP {r.status_code}: {r.text[:1200]}")
    data = r.json()
    content = data["choices"][0]["message"]["content"].strip()
    content = re.sub(r"^```(?:json)?\s*", "", content, flags=re.I)
    content = re.sub(r"\s*```$", "", content)
    return json.loads(content), data.get("usage", {})

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

def token_coverage(mat):
    rows = []
    for idx, s in enumerate(mat.get("sentences", []), 1):
        zh = norm(s.get("zh",""))
        tok = norm("".join(str(t.get("hz","")) for t in s.get("tokens", [])))
        rows.append({"sentence":idx,"ok":zh == tok,"zh_norm":zh,"tokens_norm":tok})
    return rows

def strip_marks(s):
    return norm(s.replace("ü","v"))

def pinyin_heuristic(mat):
    checked = 0
    exact = 0
    details = []
    for si, s in enumerate(mat.get("sentences", []),1):
        for ti, t in enumerate(s.get("tokens", []),1):
            hz = str(t.get("hz",""))
            given = str(t.get("py","")).strip()
            if not hz or not re.search(r"[\u3400-\u9fff]", hz) or not given:
                continue
            expected = " ".join(lazy_pinyin(hz, style=Style.TONE, neutral_tone_with_five=False))
            checked += 1
            ok = strip_marks(given) == strip_marks(expected)
            exact += int(ok)
            if not ok and len(details) < 25:
                details.append({"sentence":si,"token":ti,"hz":hz,"given":given,"dictionary":expected})
    return {"checked":checked,"exact":exact,"rate":(exact/checked if checked else None),"mismatches":details,
            "note":"Heuristic only: proper names/polyphonic characters may make dictionary pinyin disagree with context."}

def main():
    if not CF_ACCOUNT or not CF_TOKEN:
        raise SystemExit("Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN")
    article = extract_article(REF["article_url"])
    if not article:
        raise SystemExit("Could not extract benchmark RTI article")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    outdir = HERE / "benchmark-results" / stamp
    outdir.mkdir(parents=True, exist_ok=True)
    summary = {
        "timestamp":stamp,
        "source":{"url":REF["article_url"],"title":REF["article_title"]},
        "models":[]
    }
    for model in MODELS:
        print(f"START {model}", flush=True)
        slug = model.split("/")[-1]
        row = {"model":model}
        try:
            mat, usage = call(model, article)
            valid = validate_material(mat)
            facts = fact_score(mat) if valid else []
            coverage = token_coverage(mat) if valid else []
            pinyin = pinyin_heuristic(mat) if valid else {}
            row.update({
                "json_valid":True,
                "structure_valid":valid,
                "facts_passed":sum(1 for x in facts if x["ok"]),
                "facts_total":len(facts),
                "fact_results":facts,
                "token_coverage_rate":(sum(1 for x in coverage if x["ok"])/len(coverage) if coverage else None),
                "token_coverage":coverage,
                "pinyin":pinyin,
                "usage":usage
            })
            print(f"DONE {model}: facts={row['facts_passed']}/{row['facts_total']}", flush=True)
            (outdir / f"{slug}.json").write_text(json.dumps(mat,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        except Exception as e:
            print(f"FAIL {model}: {e}", flush=True)
            row.update({"json_valid":False,"error":str(e)})
        summary["models"].append(row)
        time.sleep(1.0)
    (outdir/"summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

    md = ["# RTI model benchmark", "", f"Source: {REF['article_url']}", "",
          "| Model | JSON/structure | Source facts | Token coverage | Pinyin heuristic |",
          "|---|---:|---:|---:|---:|"]
    for row in summary["models"]:
        if row.get("structure_valid"):
            pin = row["pinyin"].get("rate")
            md.append(f"| {row['model']} | yes | {row['facts_passed']}/{row['facts_total']} | {row['token_coverage_rate']:.1%} | {pin:.1%} |")
        else:
            md.append(f"| {row['model']} | no | — | — | — |")
    md += ["", "## Important", "",
           "The factual score checks preservation of a fixed checklist from the RTI source. It does not automatically prove absence of hallucinations.",
           "Pinyin score is a dictionary heuristic and must be manually reviewed for names and polyphonic characters.",
           "Natural Indonesian translation quality must be manually reviewed side-by-side from the raw JSON outputs."]
    (outdir/"REPORT.md").write_text("\n".join(md)+"\n",encoding="utf-8")
    print((outdir/"REPORT.md").read_text(encoding="utf-8"))

if __name__ == "__main__":
    main()
