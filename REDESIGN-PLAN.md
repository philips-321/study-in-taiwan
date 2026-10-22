# REDESIGN-PLAN.md — Garbage Truck Map (`/garbage-truck/`)

> Versi 2: sudah berdasarkan **source asli** repo `philips-321/study-in-taiwan`.
> Scope: **tampilan saja**. Tidak menyentuh JSON/data, script build, workflow, atau logika jadwal.

## 0. Temuan dari source

- Halaman = **satu file**: `garbage-truck/index.html` (~18 KB). CSS inline (satu baris minified di `<style>`), JS inline di `<script>`.
- Peta: **MapLibre GL 5.6.0** (unpkg) + tile OpenFreeMap "liberty".
- Layout sekarang: `#app` grid (header + `#content`); `#content` = `#map` | `#panel` 380px; di ≤800px ditumpuk (peta 62vh, panel di bawah).
- Data (TIDAK DISENTUH): `garbage-truck/data/**` (manifest, grid JSON, operations, facilities), `garbage-truck/scripts/**`, `.github/workflows/update-garbage-truck-grid.yml`.
- Aturan repo (`AGENTS.md`): kerja hanya di path yang diminta, jangan hilangkan fitur aksesibilitas/panduan, konten penting tetap di HTML yang bisa dicrawl, jangan sentuh `robots.txt`/`sitemap.xml`/config root.

## 1. Masalah tampilan yang terlihat di kode

1. Semua serba default: font sistem polos, warna #111/#fff, border abu #ddd, tombol & select bawaan browser.
2. Header: brand, tombol, select, dan `#status` menumpuk tanpa hierarki (status hanya teks kecil abu).
3. Panel kanan: judul, hint, legend, guide "What can I put out today?", dan daftar tidak punya pemisah visual yang jelas. Kartu hanya `border-top` tipis.
4. Legend: titik 9px + teks 12px; "Planning only" ungu vs "Fixed drop-off" hijau tua mirip, tidak ada bentuk pembeda untuk buta warna (kecuali facility persegi).
5. Marker jam (`.time-marker`) kecil dan datar, tanpa penunjuk/panah; sulit dibaca saat bertumpuk.
6. Popup MapLibre masih gaya default (belum disesuaikan dengan tema).
7. Loading = teks "Loading…" polos; layout lompat saat data masuk.
8. Mobile: peta `minmax(430px,62vh)` terlalu tinggi, panel harus scroll jauh; tap target kecil (chip 12px, tombol 9px padding).
9. Tidak ada dark mode, `:focus-visible`, `prefers-reduced-motion`.

## 2. Arah desain

Bersih, ramah, utilitas lokal. Satu aksen teal/hijau + warna status semantik. Kartu radius 12–14px, shadow tipis, whitespace lega.

### Tokens (`:root`)
| Token | Light | Dark |
|---|---|---|
| `--bg` | #F4F7F6 | #0E1513 |
| `--surface` | #FFFFFF | #17201D |
| `--surface-2` | #F0F4F2 | #1E2A26 |
| `--text` | #13201B | #E6EFEB |
| `--muted` | #5A6A63 | #92A29A |
| `--border` | #E0E7E3 | #26332E |
| `--accent` | #0F8B6D | #3CCBA4 |

Status (dipakai konsisten di marker, chip, legend, border kiri kartu):
- `past` abu `#8B8B8B` · `now` hijau `#18864B` · `upcoming` biru `#2463EB` · `offday` ungu `#8B5CF6` (dashed border) · `facility` teal `#087F5B` (persegi).
- Pembeda non-warna: marker `now` diberi ring/pulse; `offday` garis putus-putus; facility berbentuk persegi + ikon ♻.

Tipografi: system stack tetap (tanpa font eksternal, supaya cepat), skala 12/13/14/16/20; angka waktu `font-variant-numeric: tabular-nums`.
Spacing 4/8/12/16/24. Transisi 150–200ms.

## 3. Perubahan per komponen (selector asli = jangan di-rename)

### A. Header (`header`, `.brand`, `.controls`, `#locate`, `#lang`, `#status`)
- Brand dengan ikon kecil (CSS/emoji), ukuran 18–20px, bold.
- `#locate` jadi tombol primer (accent, radius pill, ikon 📍 via `::before`); `#lang` select bergaya pill selaras.
- `#status` jadi baris status dengan titik hijau kecil / chip muted, bukan teks abu mengambang.
- Header sticky, background `--surface`, shadow tipis.

### B. Peta (`#map`)
- Radius + border/shadow di desktop (padding pembungkus), tinggi desktop mengisi sisa layar; mobile `clamp(300px, 48vh, 460px)`.
- Restyle `.time-marker`: padding lebih lega, radius 8, panah kecil di bawah (`::after`), warna per status; `.time-marker.now` pulse halus.
- `.facility-marker`: ukuran 30px, radius 9, shadow lebih lembut.
- `.user-dot`: ring pulse halus.
- Kontrol zoom & attribution MapLibre: override CSS (radius, shadow, posisi tidak berubah).
- Popup (`.maplibregl-popup-content`): radius 12, padding 12–14, font sesuai tema, tombol close lebih besar.

### C. Panel (`#panel`, `#panelTitle`, `#hint`)
- Background `--bg`, padding 16; judul 18px; hint muted 13px.
- Panel dibagi jadi blok kartu: legend, `#todayGuide`, daftar.

### D. Legend (`.legend`, `.dot`)
- Jadi chip pill horizontal (wrap), titik 10px + label 12–13px; facility tetap persegi.

### E. Today guide (`#todayGuide`, `.guide`)
- Kartu aksen: border-left 4px accent, background `--surface`, judul bold, list rapi dengan spasi; teks bag/`.meta` lebih kecil dan muted. **Isi teks tidak dikurangi** (panduan = konten edukasi).

### F. Daftar (`#list`, `.place-card`, `.addr`, `.meta`, `.times`, `.chip`, `.glink`, `.zoom-note`)
- `.place-card` jadi kartu (surface, border, radius 12, shadow tipis, margin-bottom 8), border-kiri 4px berwarna sesuai status terpenting.
  - Catatan: warna kiri butuh class status di kartu → perubahan kecil di template JS (menambah `${g.st}` ke class). Hanya string template, bukan logika. Kalau tidak mau sentuh JS, fallback: tanpa border berwarna.
- Hover: naik 1px + shadow; cursor pointer (kartu sudah clickable); `:focus-visible`.
- `.chip`: padding lebih besar, angka tabular, status tetap warna + (offday dashed).
- `.glink`: jadi tombol teks kecil dengan area tap ≥ 36px.
- `.zoom-note`: kartu info dengan ikon 🔍.
- Loading: ganti teks "Loading…" awal dengan skeleton CSS (3 kartu shimmer) via `#list:empty`/placeholder; teks asli tetap ada di HTML untuk crawler.

### G. Responsif
- Desktop ≥ 900px: panel 400px, peta mengisi sisanya, panel scroll sendiri.
- Tablet/mobile ≤ 800px: peta atas, panel bawah dengan sudut atas membulat (kesan sheet), handle kecil dekoratif.
- Tap target ≥ 40px.

### H. Global
- Dark mode via `prefers-color-scheme` (peta tetap tile terang; hanya UI + popup yang gelap).
- `prefers-reduced-motion`: matikan pulse/shimmer/transition.
- `:focus-visible` jelas di semua kontrol; kontras AA.
- `color-scheme: light dark`, `theme-color` meta ditambahkan (aman, tidak mengubah fungsi).

## 4. Yang TIDAK boleh berubah

- Semua file di `garbage-truck/data/**`, `garbage-truck/scripts/**`, `.github/**`.
- Logika JS: `needed`, `load`, `ensure`, `operates`, `state`, `groups`, `render` (kecuali penambahan class string di template, lihat F), geolokasi, i18n `T`.
- ID yang dipakai JS: `app, brand, locate, lang, status, content, map, panel, panelTitle, hint, lp, ln, lu, lo, lf, todayGuide, list`.
- Class yang dibuat JS: `time-marker(+past/now/upcoming/offday)`, `facility-marker`, `user-dot`, `popup-chip`, `popup-times`, `chip`, `place-card`, `addr`, `meta`, `times`, `glink`, `zoom-note`.
- Teks/terjemahan EN & ID, URL MapLibre/tiles, `<title>`, meta description.
- File root lain (`style.css`, `script.js`, `robots.txt`, `sitemap.xml`, dll.) dan folder lain.

## 5. Tahapan eksekusi (tiap tahap tetap menghasilkan halaman yang jalan)

1. **Backup**: salin `index.html` → `garbage-truck/index.before-redesign.html` (hapus/ignore sebelum merge jika tidak diinginkan; atau cukup andalkan git).
2. **Pecah CSS** minified menjadi blok `<style>` yang terbaca (urutan: tokens, base, header, map, panel, legend, cards, popup, responsive, dark, motion). Isi aturan lama dipertahankan sebagai dasar.
3. **Tokens + base + dark mode**.
4. **Header & kontrol**.
5. **Peta**: marker, popup, kontrol MapLibre.
6. **Panel**: legend, today guide, kartu daftar, skeleton.
7. **Responsif** (desktop / tablet / mobile).
8. **Polish & QA**: fokus keyboard, reduced-motion, cek 360px / 768px / 1280px, pastikan semua ID/class di §4 masih ada, `git diff --stat` hanya menunjukkan `garbage-truck/index.html` (+ plan ini).

## 6. Checklist progres

- [ ] 1 Backup
- [ ] 2 Pecah CSS jadi terbaca
- [ ] 3 Tokens + base + dark
- [ ] 4 Header & kontrol
- [ ] 5 Peta (marker/popup/kontrol)
- [ ] 6 Panel (legend/guide/kartu/skeleton)
- [ ] 7 Responsif
- [ ] 8 Polish & QA

## 7. Keputusan yang perlu dikonfirmasi

1. Boleh menambah class status ke template kartu di JS (1 string) supaya kartu berwarna per status? *(default: ya)*
2. Dark mode ikut sistem otomatis? *(default: ya)*
3. Commit langsung ke branch aktif atau bikin branch/PR baru? *(default: branch baru, tanpa push sampai lo setuju)*

## 8. Definition of done

- Tampilan konsisten light/dark, rapi di mobile & desktop.
- `git diff` hanya `garbage-truck/index.html` (dan file plan ini).
- Semua fitur lama tetap jalan: lokasi, ganti bahasa, marker status, popup, daftar, legend, panduan hari ini.
