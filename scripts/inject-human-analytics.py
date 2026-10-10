#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TAG = '<script src="/human-analytics.js" defer></script>'
changed = 0
for p in ROOT.rglob('*.html'):
    if any(part.startswith('.git') for part in p.parts):
        continue
    text = p.read_text(encoding='utf-8', errors='ignore')
    if 'human-analytics.js' in text:
        continue
    lower = text.lower()
    idx = lower.rfind('</body>')
    if idx < 0:
        continue
    text = text[:idx] + '  ' + TAG + '\n' + text[idx:]
    p.write_text(text, encoding='utf-8')
    changed += 1
print(f'injected={changed}')
