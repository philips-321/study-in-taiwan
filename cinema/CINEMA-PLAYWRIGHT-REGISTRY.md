# Registry bioskop Taiwan dan koleksi browser resmi

Terakhir disusun: 2026-11-02

## Tujuan

Daftar induk untuk workflow cinema adalah `cinema/data/canonical/cinema-source-registry.json`. Setiap Actions run membaca registry itu, memvalidasi seluruh cinema, lalu menulis satu hasil per cinema ke `cinema/data/reports/cinema-browser-source-run.json`.

Browser Actions adalah Playwright dengan Chromium pada runner GitHub Actions. URL yang dikunjungi harus berasal dari situs resmi operator/bioskop yang sudah ditinjau. URL aggregator tidak dipakai sebagai pengganti saat URL resmi hilang atau diblokir.

## Cakupan registry

Registry memuat **107 record bioskop** dari seluruh 22 file kota/kabupaten pada master BAMID Kementerian Kebudayaan tahun 2025. Ini adalah record administratif, bukan klaim bahwa ada 107 gedung berbeda yang semuanya masih beroperasi. Pada 2 November 2026, 19 record tercatat aktif, 4 tercatat tutup berdasarkan pengumuman/sumber berita, dan 84 belum diketahui; ketiadaan jadwal tidak dianggap bukti penutupan.

Dari 107 record:

- **49** memiliki URL jadwal/situs resmi yang sudah tercatat pada bukti riset.
- **54 bioskop yang belum tutup** belum memiliki URL resmi terverifikasi; empat record yang tutup sengaja tidak dicari URL jadwalnya.
- Semua 107 tetap punya satu baris source binding dan satu hasil di laporan setiap run.
- Binding bioskop tutup berstatus `closed` dan tidak masuk pencarian URL/kunjungan browser. Binding aktif tanpa URL resmi berstatus `needs_official_schedule_url`; workflow tidak mencari jadwal pengganti di aggregator.
- Aplikasi peta/daftar memuat `cinema/data/canonical/closed-cinema-index.json` yang dibuat dari Oracle registry setiap audit, lalu menyembunyikan cabang tutup dari marker, daftar bioskop, dan jadwal publik. Rekamannya tetap tersimpan di Oracle.

### Penutupan terverifikasi

| Bioskop | Tutup sejak | Bukti |
|---|---|---|
| 新民生戲院 | 2026-01-31 | https://news.tvbs.com.tw/life/3091529 |
| 金門昇恆昌國賓影城 | 2026-05-04 | https://www.cna.com.tw/news/aloc/202604080368.aspx |
| in89豪華數位影城 | 2026-05-31 | https://news.ttv.com.tw/news/11505200003300W |
| 金獅影城 | 2026-10-31 | https://www.kinmen.gov.tw/News_Content2.aspx?n=98E3CA7358C89100&s=A3A77E7A0EFAC8EE |

Status tutup hanya mengubah status cabang dan tampilan jadwal; arsip jadwal serta poster film tidak dihapus. Jika cabang buka kembali, perbarui status dan bukti di Oracle registry.

Daftar ini mengikuti master lokal yang ada di repo. Jika penelitian menemukan bioskop baru yang belum tercatat di master, tambahkan record dengan ID stabil dan catat bukti sumber sebelum menganggap census fisik Taiwan lengkap.

## Bentuk data seperti tabel Oracle

JSON memakai tabel relasional dan primary/foreign keys:

- `CINEMA`: identitas cabang, wilayah, alamat, operator, dan status yang sudah tersedia.
- `SOURCE`: host/situs resmi serta metode browser.
- `CINEMA_SOURCE_BINDING`: satu hubungan cinema-ke-sumber per record. `cinema_id` dan `source_id` adalah foreign keys; ID cinema yang belum punya URL tetap punya binding unresolved.
- `keys`: deklarasi primary key dan foreign key.

Registry menyimpan konfigurasi sumber yang ditinjau. Hasil akses per run disimpan terpisah pada report, jadi status browser harian tidak menimpa identitas cinema atau riwayat jadwal kanonis.

## Aturan tiap GitHub Actions run

1. Validasi 107 ID dari semua shard kota terhadap 107 baris `CINEMA` dan 107 binding. Run gagal bila satu record hilang atau duplikat.
2. Kumpulkan jadwal dari URL resmi dengan Playwright Chromium. Sumber yang sudah punya parser resmi menggunakan parser itu; sumber resmi lain tetap dibuka oleh audit browser dan dicatat sebagai page probe.
3. Buat hasil untuk semua 107 binding; bioskop berstatus `closed` dicatat sebagai `cinema_closed` tanpa membuka browser. URL hilang, HTTP 403/451, timeout, halaman terbuka tanpa pola jadwal, serta jadwal yang berhasil diparse memiliki status yang berbeda.
4. Setelah host memberi 403, hentikan request tambahan ke host itu untuk run tersebut. Simpan waktu dan aktifkan cooldown tujuh hari. Cinema lain tetap diproses.
5. Jangan pindah ke 場次通, AtMovies, atau aggregator lain saat source resmi gagal. Jangan menulis jadwal kanonis dari pola waktu generik; hanya parser sumber yang memahami struktur halaman boleh menghasilkan session rows.
6. Simpan last-known-good dan baris JSONL kanonis. Kegagalan refresh tidak menghapus jadwal atau poster yang sudah tersimpan.

## Adapter dan hasil browser yang sudah terbukti

- **Eslite:** Playwright membuka URL resmi dan mengekstrak 63 sesi untuk 2, 3, 4, 5, 8, 15, dan 22 November 2026. Saat dibandingkan dengan JSON sebelum run, 47 sesi dengan film/tanggal/jam yang sama sudah ada; 16 sesi menambah kombinasi unik.
- **ShowTimes:** 15 cabang punya URL resmi di registry. Pada run `41363447066`, 3 halaman pertama mendapat HTTP 403 dari runner GitHub; circuit breaker menghentikan request tambahan ke host itu. Hasil koleksi browser ShowTimes adalah 0 sesi pada run tersebut.
- **Situs resmi lain:** registry menyimpan URL yang sudah ditinjau. Audit membuka URL itu lewat browser dan mencatat status halaman serta indikator tanggal/jam. Indikator generik hanya bukti halaman; ia tidak otomatis menjadi jadwal publik tanpa parser khusus sumber.

Laporan hasil browser adalah bukti untuk satu run, bukan klaim bahwa semua 107 jadwal sudah berhasil diekstrak. Kolom `run_status`, `http_status`, `schedule_rows`, dan `time_marker_count` membantu menentukan sumber berikutnya yang perlu diberi parser.

## Yang berubah pada workflow

Workflow sekarang memakai registry ini untuk menemukan URL resmi ShowTimes dan Eslite. Pemanggilan AtMovies dan 場次通 sebagai fallback dinonaktifkan. Setiap run memproses seluruh 107 binding: adapter Playwright khusus membuka ShowTimes/Eslite, audit browser membuka URL resmi lain yang sudah dikonfirmasi, dan baris tanpa URL resmi tetap dilaporkan. Adapter API resmi yang masih ada untuk operator lain tetap berjalan sampai parser browser per sumber terbukti siap; audit browser tidak mengklaim bahwa probe halaman generik sudah menghasilkan jadwal terstruktur. Data fallback lama yang sudah tersimpan tidak dihapus, tetapi tidak ditarik lagi oleh collector baru.

Saat ini hanya sumber dengan parser yang sudah ada yang bisa langsung menulis jadwal terstruktur. URL resmi dengan parser belum tersedia tetap dicoba lewat browser dan tercatat, tetapi tidak menghasilkan jadwal palsu. Penambahan adapter selanjutnya harus memakai URL resmi dari registry dan menyimpan bukti parsing di source health report.
