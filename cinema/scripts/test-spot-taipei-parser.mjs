import assert from 'node:assert/strict';
import {
  discoverSpotTaipeiDetailUrls,
  parseSpotTaipeiDetail
} from './sources/spot-taipei.mjs';

const listing = `
<a href="http://www.spot.org.tw/movies/202610/m4/movies202610_m4.html"><img></a>
<a href="http://www.spot.org.tw/movies/202610/m4/movies202610_m4.html"><img></a>
<a href="http://www.spot.org.tw/movies/202610/m5/movies202610_m5.html"><img></a>
<a href="https://example.com/not-spot.html">x</a>`;

assert.deepEqual(discoverSpotTaipeiDetailUrls(listing), [
  'https://www.spot.org.tw/movies/202610/m4/movies202610_m4.html',
  'https://www.spot.org.tw/movies/202610/m5/movies202610_m5.html'
]);

const detail = `
<table>
<tr><td class="movie_title">蕭邦！蕭邦！</td></tr>
<tr><td class="movie_title_eng"><table><tr><td class="movie_title_eng">CHOPIN, CHOPIN!</td></tr></table></td></tr>
<tr><td class="movie_dir"><p>2025 | Polish/French | Color | Poland/France/Spain | 114min | C/E Subtitles | 輔12</p></td></tr>
</table>
<div>【本片放映時刻】<br>schedule</div>
<table>
<tr><td rowspan="2">10/29(四)</td><td>17:00</td></tr>
<tr><td>21:10</td></tr>
<tr><td>10/30(五)</td><td>15:00</td></tr>
</table>`;

const rows = parseSpotTaipeiDetail(
  detail,
  'https://www.spot.org.tw/movies/202610/m4/movies202610_m4.html'
);
assert.equal(rows.length, 3);
assert.equal(rows[0].cinema_id, '31d9eecd32050b08');
assert.equal(rows[0].movie_title, '蕭邦！蕭邦！');
assert.equal(rows[0].movie_title_en, 'CHOPIN, CHOPIN!');
assert.equal(rows[0].duration_minutes, 114);
assert.equal(rows[0].rating, '輔12');
assert.deepEqual(rows[0].subtitles, ['zh', 'en']);
assert.deepEqual(rows.map(row => [row.date, row.time]), [
  ['2026-10-29', '17:00'],
  ['2026-10-29', '21:10'],
  ['2026-10-30', '15:00']
]);

console.log('SPOT Taipei parser regression: listing discovery + rowspan schedule passed');
