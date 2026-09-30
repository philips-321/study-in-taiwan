#!/usr/bin/env python3
import html
import json
import os
import re
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urljoin
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
CFG = json.loads((Path(__file__).with_name("config.json")).read_text(encoding="utf-8"))
TAIPEI = ZoneInfo("Asia/Taipei")
TODAY = datetime.now(TAIPEI).date()
DATE_ISO = TODAY.isoformat()
DATE_LONG = TODAY.strftime("%d %B %Y")
MODEL = os.getenv("CF_AI_MODEL", CFG["model"])
MAX_ARTICLES = int(os.getenv("MAX_ARTICLES", CFG["max_articles"]))
MAX_SOURCE_CHARS = int(CFG["max_source_chars"])
MAX_COMPLETION_TOKENS = int(CFG["max_completion_tokens"])
LOOKBACK = timedelta(hours=int(CFG["lookback_hours"]))
CF_ACCOUNT = os.getenv("CLOUDFLARE_ACCOUNT_ID", "").strip()
CF_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN", "").strip()

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "study-in-taiwan-rti-study-bot/1.0 (+https://study-in-taiwan.com/news/)",
    "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.5",
})

COLORS = [
    "#B71C1C", "#0D47A1", "#1B5E20", "#4A148C", "#E65100", "#006064",
    "#880E4F", "#263238", "#3E2723", "#1A237E", "#33691E", "#BF360C",
    "#004D40", "#311B92", "#827717", "#01579B", "#C62828", "#2E7D32",
    "#6A1B9A", "#EF6C00", "#00838F", "#AD1457", "#37474F", "#5D4037",
    "#283593", "#558B2F", "#D84315", "#00796B", "#4527A0", "#9E9D24"
]


def die(msg: str):
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


def get(url: str, timeout=30) -> requests.Response:
    r = SESSION.get(url, timeout=timeout)
    r.raise_for_status()
    return r


def clean_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()


def discover_rti_urls() -> list[str]:
    seeds = [
        "https://www.rti.org.tw/news",
        "https://www.rti.org.tw/news?page=2",
    ]
    found, seen = [], set()
    patterns = (
        re.compile(r"/news/view/id/\d+"),
        re.compile(r"/news\?pid=\d+(?:&amp;|&)uid=\d+"),
    )
    for seed in seeds:
        try:
            soup = BeautifulSoup(get(seed).text, "html.parser")
        except Exception as e:
            print(f"WARN discover {seed}: {e}")
            continue
        for a in soup.find_all("a", href=True):
            href = a.get("href", "")
            if not any(p.search(href) for p in patterns):
                continue
            href = html.unescape(href)
            url = urljoin("https://www.rti.org.tw", href)
            if url not in seen:
                seen.add(url)
                found.append(url)
    return found


def parse_datetime(text: str, soup: BeautifulSoup):
    for key in ["article:published_time", "datePublished", "date"]:
        tag = soup.find("meta", attrs={"property": key}) or soup.find("meta", attrs={"name": key})
        if tag and tag.get("content"):
            raw = tag["content"].strip()
            try:
                dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=TAIPEI)
                return dt.astimezone(TAIPEI)
            except ValueError:
                pass
    m = re.search(r"(?:時間|發布時間)\s*[：:]\s*(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\s+(\d{1,2}):(\d{2})", text)
    if m:
        y, mo, d, h, mi = map(int, m.groups())
        return datetime(y, mo, d, h, mi, tzinfo=TAIPEI)
    return None


def classify_source(page_text: str) -> str:
    line = ""
    m = re.search(r"新聞引據\s*[：:]\s*([^\n|]{1,80})", page_text)
    if m:
        line = m.group(1)
    hay = line or page_text[:2500]
    if "中央社" in hay:
        return "RTI ← CNA"
    if "路透" in hay or "Reuters" in hay:
        return "RTI ← REUTERS"
    if "法新" in hay or "AFP" in hay:
        return "RTI ← AFP"
    if "美聯社" in hay or re.search(r"\bAP\b", hay):
        return "RTI ← AP"
    if "採訪" in hay or "央廣" in hay or "Rti" in hay:
        return "RTI ORIGINAL"
    return "RTI ORIGINAL"


def extract_article(url: str):
    r = get(url)
    soup = BeautifulSoup(r.text, "html.parser")
    title = ""
    og = soup.find("meta", property="og:title")
    if og and og.get("content"):
        title = clean_text(og["content"])
    if not title:
        h1 = soup.find("h1")
        title = clean_text(h1.get_text(" ", strip=True) if h1 else "")
    if not title:
        title = clean_text(soup.title.get_text(" ", strip=True) if soup.title else "")

    page_text = soup.get_text("\n", strip=True)
    published = parse_datetime(page_text, soup)
    category = classify_source(page_text)

    paras = []
    for p in soup.find_all(["p", "div"]):
        if p.name == "div" and p.find(["p", "div"], recursive=False):
            continue
        t = clean_text(p.get_text(" ", strip=True))
        if len(t) < 28:
            continue
        if t in paras:
            continue
        if any(x in t for x in ["財團法人中央廣播電臺", "TEL:", "FAX:", "隱私權政策", "Copyright", "Podcast訂閱"]):
            continue
        han = len(re.findall(r"[\u3400-\u9fff]", t))
        if han < 12:
            continue
        paras.append(t)

    body = "\n".join(paras)
    if len(body) > MAX_SOURCE_CHARS:
        body = body[:MAX_SOURCE_CHARS]
    if len(body) < 120:
        return None
    return {
        "url": url,
        "title": title,
        "published": published.isoformat() if published else None,
        "category": category,
        "body": body,
    }


def latest_articles() -> list[dict]:
    urls = discover_rti_urls()
    print(f"Discovered {len(urls)} RTI candidate URLs")
    now = datetime.now(TAIPEI)
    articles = []
    for url in urls:
        if len(articles) >= MAX_ARTICLES:
            break
        try:
            a = extract_article(url)
        except Exception as e:
            print(f"WARN fetch article {url}: {e}")
            continue
        if not a:
            continue
        if a["published"]:
            dt = datetime.fromisoformat(a["published"])
            if now - dt > LOOKBACK:
                continue
        articles.append(a)
        print(f"  + {len(articles):02d} {a['category']}: {a['title'][:90]}")
    return articles


def ai_prompt(article: dict) -> str:
    return f"""You are preparing Mandarin-to-Indonesian study material for an Indonesian learner preparing for an RTI language/voice test.

SOURCE ARTICLE
Title: {article['title']}
URL: {article['url']}
Source category: {article['category']}
Published: {article['published'] or 'unknown'}
Full accessible article text follows:
---
{article['body']}
---

TASK
Reconstruct the article faithfully in Traditional Chinese as study material. Do NOT copy long passages verbatim. Preserve all substantive facts that appear in the source: people, organizations, dates, numbers, places, sequence of events, conditions, exceptions, warnings, and material context. Do not invent missing facts.

Return ONLY valid JSON, no markdown fences, using exactly this structure:
{{
  "title_zh": "concise Traditional Chinese study headline",
  "sentences": [
    {{
      "zh": "Traditional Chinese reconstructed sentence",
      "tokens": [
        {{"hz":"small semantic unit", "py":"Hanyu pinyin with tone marks", "lit":"literal Indonesian meaning"}}
      ],
      "natural_segments": [
        {{"token":0, "text":"natural Indonesian segment corresponding to token index 0"}}
      ]
    }}
  ],
  "vocabulary": [
    {{"hz":"word/unit actually used", "py":"pinyin with tone marks", "meaning":"Indonesian meaning", "pos":"jenis kata in Indonesian"}}
  ]
}}

RULES
- Use 5-12 reconstructed sentences as needed; coverage is more important than brevity.
- Tokenize every Chinese sentence completely into small semantic units. Do not omit particles, numbers, names, countries, cities, verbs, nouns, adverbs, conjunctions, or measure words.
- Pinyin must correspond exactly to each hz unit and include tone marks where applicable.
- literal Indonesian is per token/unit, not an entire phrase translation.
- natural_segments must together form one fluent Indonesian translation. They may reorder token indices to produce natural Indonesian. Every segment must reference a valid token index so the website can color the Indonesian segment consistently with its Chinese unit.
- Include all meaningful vocabulary appearing in the reconstructed sentences.
- No markdown. JSON only.
"""


def call_cloudflare(article: dict) -> dict:
    if not CF_ACCOUNT or not CF_TOKEN:
        die("Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN")
    endpoint = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/ai/v1/chat/completions"
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "Return strict valid JSON only. Use Traditional Chinese and Indonesian exactly as requested."},
            {"role": "user", "content": ai_prompt(article)},
        ],
        "temperature": 0.2,
        "max_completion_tokens": MAX_COMPLETION_TOKENS,
    }
    headers = {"Authorization": f"Bearer {CF_TOKEN}", "Content-Type": "application/json"}
    r = SESSION.post(endpoint, headers=headers, json=payload, timeout=180)
    if r.status_code >= 400:
        raise RuntimeError(f"Cloudflare AI HTTP {r.status_code}: {r.text[:1000]}")
    data = r.json()
    try:
        content = data["choices"][0]["message"]["content"]
    except Exception:
        raise RuntimeError(f"Unexpected Cloudflare response: {json.dumps(data)[:1200]}")
    content = content.strip()
    content = re.sub(r"^```(?:json)?\s*", "", content, flags=re.I)
    content = re.sub(r"\s*```$", "", content)
    return json.loads(content)


def validate_material(m: dict) -> bool:
    if not isinstance(m, dict) or not m.get("sentences"):
        return False
    for s in m["sentences"]:
        toks = s.get("tokens") or []
        if not s.get("zh") or not toks:
            return False
        for seg in s.get("natural_segments") or []:
            idx = seg.get("token")
            if not isinstance(idx, int) or idx < 0 or idx >= len(toks):
                return False
    return True


def esc(s) -> str:
    return html.escape(str(s or ""), quote=True)


def render_sentence(s: dict) -> str:
    toks = s["tokens"]
    token_html = []
    for i, t in enumerate(toks):
        color = COLORS[i % len(COLORS)]
        token_html.append(
            f'<div class="tok"><div class="hz" style="color:{color}">{esc(t.get("hz"))}</div>'
            f'<div class="py" style="color:{color}">{esc(t.get("py"))}</div>'
            f'<div class="lit" style="color:{color}">{esc(t.get("lit"))}</div></div>'
        )
    nat = []
    segments = s.get("natural_segments") or []
    if segments:
        for seg in segments:
            idx = int(seg["token"])
            color = COLORS[idx % len(COLORS)]
            nat.append(f'<span style="color:{color}">{esc(seg.get("text"))}</span>')
    else:
        nat.append(esc(s.get("natural", "")))
    return (
        f'<div class="sentence" data-zh="{esc(s["zh"])}">'
        '<div class="listenrow"><button type="button" onclick="speakText(this.closest(\'.sentence\').dataset.zh)">▶ Dengarkan</button></div>'
        f'<div class="tokenrow">{"".join(token_html)}</div>'
        '<div class="natural-label">Terjemahan natural</div>'
        f'<div class="natural">{" ".join(nat)}</div></div>'
    )


def render_vocab(vocab: list[dict]) -> str:
    if not vocab:
        return ""
    rows = []
    for i, v in enumerate(vocab):
        color = COLORS[i % len(COLORS)]
        rows.append(
            f'<tr><td><span class="swatch" style="background:{color}"></span>{esc(v.get("hz"))}</td>'
            f'<td>{esc(v.get("py"))}</td><td>{esc(v.get("meaning"))}</td><td>{esc(v.get("pos"))}</td></tr>'
        )
    return '<h3>Kosakata</h3><table><thead><tr><th>Mandarin</th><th>Pinyin</th><th>Arti</th><th>Jenis kata</th></tr></thead><tbody>' + "".join(rows) + '</tbody></table>'


def render_section(n: int, article: dict, mat: dict) -> str:
    allzh = "".join(s["zh"] for s in mat["sentences"])
    pub = article["published"][:10] if article.get("published") else DATE_ISO
    sentences = "".join(render_sentence(s) for s in mat["sentences"])
    note = "Isi artikel RTI dibaca dan direkonstruksi menjadi materi belajar; fakta yang tidak tersedia pada sumber tidak ditambahkan."
    return (
        f'<section class="news" data-allzh="{esc(allzh)}">'
        f'<h2>{n}. {esc(pub)} — {esc(mat.get("title_zh") or article["title"])}</h2>'
        f'<div class="meta">{esc(pub)}</div><div class="badge">{esc(article["category"])}</div>'
        f'<div class="source">Sumber: <a href="{esc(article["url"])}" target="_blank">Rti 中央廣播電臺</a></div>'
        f'<div class="note">{esc(note)}</div>'
        '<div class="audioctl"><button type="button" onclick="speakText(this.closest(\'.news\').dataset.allzh)">▶ Dengarkan semua</button></div>'
        f'{sentences}{render_vocab(mat.get("vocabulary") or [])}</section>'
    )


def render_page(items: list[tuple[dict, dict]]) -> str:
    template = (ROOT / CFG["template"]).read_text(encoding="utf-8")
    first_section = template.find('<section class="news"')
    last_script = template.rfind("<script>")
    if first_section < 0 or last_script < 0:
        die("Canonical template markers not found")
    prefix = template[:first_section]
    suffix = template[last_script:]
    prefix = re.sub(r"<title>RTI Daily News — .*?</title>", f"<title>RTI Daily News — {DATE_LONG}</title>", prefix, count=1, flags=re.S)
    prefix = re.sub(r"<h1>RTI Daily News — .*?</h1>", f"<h1>RTI Daily News — {DATE_LONG}</h1>", prefix, count=1, flags=re.S)
    sections = "".join(render_section(i + 1, a, m) for i, (a, m) in enumerate(items))
    return prefix + sections + suffix


def update_index(count: int):
    path = ROOT / CFG["index"]
    text = path.read_text(encoding="utf-8")
    href = f"news-{DATE_ISO}.html"
    if href in text:
        return
    text = re.sub(
        r'(<div class="card"><a[^>]*>)(\d+)\.',
        lambda m: m.group(1) + str(int(m.group(2)) + 1) + ".",
        text,
    )
    card = (
        f'<div class="card"><a href="{href}">1. Berita {esc(DATE_LONG)} — {count} berita terbaru</a><br>'
        '<small>Zero-payment automation: RTI source → Cloudflare Workers AI Free → canonical study page; color mapping, pinyin, terjemahan Indonesia, kosakata, dan audio Mandarin.</small></div>\n'
    )
    marker = "<h1>RTI Study</h1>\n"
    if marker not in text:
        die("Index insertion marker not found")
    path.write_text(text.replace(marker, marker + card, 1), encoding="utf-8")


def main():
    print(f"RTI free automation date={DATE_ISO}, model={MODEL}, max_articles={MAX_ARTICLES}")
    articles = latest_articles()
    if not articles:
        die("No suitable RTI articles discovered")

    results = []
    for i, article in enumerate(articles, 1):
        print(f"AI {i}/{len(articles)}: {article['title'][:100]}")
        try:
            mat = call_cloudflare(article)
            if not validate_material(mat):
                raise ValueError("AI JSON failed structural validation")
            results.append((article, mat))
        except Exception as e:
            print(f"WARN AI skipped article {article['url']}: {e}")
        time.sleep(0.4)

    if not results:
        die("No article produced valid study material")

    out = ROOT / CFG["output_dir"] / f"news-{DATE_ISO}.html"
    out.write_text(render_page(results), encoding="utf-8")
    update_index(len(results))
    manifest = {
        "date": DATE_ISO,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": MODEL,
        "article_count": len(results),
        "sources": [{"title": a["title"], "url": a["url"], "category": a["category"]} for a, _ in results],
    }
    manifest_path = ROOT / CFG["output_dir"] / f"news-{DATE_ISO}.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {out.relative_to(ROOT)} with {len(results)} articles")


if __name__ == "__main__":
    main()
