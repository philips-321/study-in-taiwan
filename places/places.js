const copy = {
  id: {
    eyebrow: 'PANDUAN TEMPAT DI TAIWAN',
    title: 'Temukan Taiwan dari sekitar hotel.',
    lede: 'Cari tempat makan, wisata, spot foto, dan kebutuhan praktis dekat hotel.',
    hotelLabel: 'Pilih area hotel', allHotels: 'Semua area', radiusLabel: 'Jarak garis lurus', anyDistance: 'Semua jarak',
    categoryLabel: 'Kategori', allCategories: 'Semua kategori', food: 'Makan & minum', sightseeing: 'Wisata',
    photoSpot: 'Spot foto', shopping: 'Belanja', culture: 'Budaya', practical: 'Kebutuhan',
    status: 'Satu rekomendasi makanan tersedia di Kaohsiung.', hotelsEyebrow: 'AREA', hotelsTitle: 'Pilih area hotel',
    distNote: 'Jarak adalah garis lurus, bukan jarak jalan kaki.', nearbyEyebrow: 'PILIHAN', nearbyTitle: 'Tempat sekitar hotel',
    emptyTitle: 'Belum ada pilihan untuk filter ini', emptyText: 'Coba area, jarak, atau kategori lain.',
    map: 'Google Maps', hotelPage: 'Lihat area', sources: 'Sumber', active: 'Aktif menurut kunjungan terbaru', review: 'Perlu dicek',
    radius: 'm garis lurus', date: 'Sumber terbaru'
  },
  en: {
    eyebrow: 'TAIWAN PLACES GUIDE',
    title: 'Explore Taiwan around your hotel.',
    lede: 'Find food, sights, photo spots, and practical places nearby.',
    hotelLabel: 'Choose a hotel area', allHotels: 'All areas', radiusLabel: 'Straight-line distance', anyDistance: 'Any distance',
    categoryLabel: 'Category', allCategories: 'All categories', food: 'Food & drink', sightseeing: 'Sightseeing',
    photoSpot: 'Photo spots', shopping: 'Shopping', culture: 'Culture', practical: 'Essentials',
    status: 'One food recommendation is listed in Kaohsiung.', hotelsEyebrow: 'AREAS', hotelsTitle: 'Choose a hotel area',
    distNote: 'Distances are straight-line, not walking routes.', nearbyEyebrow: 'PLACES', nearbyTitle: 'Places near hotels',
    emptyTitle: 'No places match these filters', emptyText: 'Try another area, distance, or category.',
    map: 'Google Maps', hotelPage: 'View area', sources: 'Sources', active: 'Recent visit reported', review: 'Needs checking',
    radius: 'm straight-line', date: 'Recent source'
  },
  'zh-Hant': {
    eyebrow: '台灣周邊地點指南',
    title: '從飯店附近開始探索台灣。',
    lede: '尋找附近的美食、景點、拍照地點與生活所需。',
    hotelLabel: '選擇飯店區域', allHotels: '所有區域', radiusLabel: '直線距離', anyDistance: '不限距離',
    categoryLabel: '分類', allCategories: '所有分類', food: '美食與飲品', sightseeing: '景點',
    photoSpot: '拍照地點', shopping: '購物', culture: '文化', practical: '生活所需',
    status: '高雄目前有一項美食推薦。', hotelsEyebrow: '區域', hotelsTitle: '選擇飯店區域',
    distNote: '距離為直線距離，並非步行距離。', nearbyEyebrow: '地點', nearbyTitle: '飯店附近地點',
    emptyTitle: '沒有符合條件的地點', emptyText: '請嘗試其他區域、距離或分類。',
    map: 'Google 地圖', hotelPage: '查看區域', sources: '來源', active: '近期實訪報導', review: '待確認',
    radius: '公尺直線距離', date: '近期來源'
  }
};

let lang = 'id';
let hotels = [];
let places = [];
try { lang = localStorage.getItem('places-language') || 'id'; } catch {}
if (!copy[lang]) lang = 'id';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const tr = key => copy[lang][key] || copy.id[key] || key;

function hotelCard(hotel) {
  const name = hotel.name[lang] || hotel.name.en || hotel.name.local;
  const address = hotel.address[lang] || hotel.address.en || hotel.address.local;
  return `<article class="hotel-card" data-hotel="${escapeHtml(hotel.id)}">
    <h3>${escapeHtml(name)}</h3>
    <div class="local-name">${escapeHtml(hotel.name.local)} · ${escapeHtml(hotel.city)}${hotel.district ? `, ${escapeHtml(hotel.district)}` : ''}</div>
    <address>${escapeHtml(address)}</address>
    <div class="card-actions">
      <a class="button primary" href="${escapeHtml(hotel.google_maps_url)}" target="_blank" rel="noopener">${tr('map')} ↗</a>
      <a class="button" href="hotels/${escapeHtml(hotel.id)}.html">${tr('hotelPage')}</a>
    </div>
  </article>`;
}

function placeCard(place) {
  const name = place.name[lang] || place.name.en || place.name.local;
  const summary = place.summary?.[lang] || place.summary?.en || '';
  const distance = place.hotel_distances?.[0]?.distance_m;
  const sources = (place.sources || []).map(source => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.title || source.url)}</a>${source.published_at ? ` · ${escapeHtml(source.published_at)}` : ''}</li>`).join('');
  const status = place.status === 'verified_active' ? tr('active') : tr('review');
  const area = place.city || 'Kaohsiung';
  return `<article class="place-card" data-hotel="${escapeHtml(place.hotel_distances?.[0]?.hotel_id || '')}" data-category="${escapeHtml(place.category)}" data-distance="${Number(distance) || 0}">
    <span class="hotel-order">${escapeHtml(status)}</span>
    <h3>${escapeHtml(name)}</h3>
    <div class="local-name">${escapeHtml(place.name.local)} · ${escapeHtml(place.address?.local || '')}</div>
    <p>${escapeHtml(summary)}</p>
    <p class="progress">${escapeHtml(area)} · ${distance} ${tr('radius')}</p>
    ${place.group_notes ? `<p class="note">${escapeHtml(place.group_notes)}</p>` : ''}
    <div class="card-actions">
      <a class="button primary" href="${escapeHtml(place.google_maps?.url || '#')}" target="_blank" rel="noopener">${tr('map')} ↗</a>
      <a class="button" href="hotels/${escapeHtml(place.hotel_distances?.[0]?.hotel_id || '')}.html">${tr('hotelPage')}</a>
    </div>
    <details><summary>${tr('sources')}</summary><ul>${sources}</ul></details>
  </article>`;
}

function setLanguage(next) {
  lang = copy[next] ? next : 'id';
  try { localStorage.setItem('places-language', lang); } catch {}
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = tr(element.dataset.i18n); });
  document.querySelectorAll('[data-lang-content]').forEach(element => {
    element.hidden = element.dataset.langContent !== lang;
  });
  document.querySelectorAll('.lang').forEach(button => {
    const active = button.dataset.lang === lang;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const hotelGrid = document.querySelector('#hotel-grid');
  if (hotelGrid && hotels.length) hotelGrid.innerHTML = hotels.map(hotelCard).join('');
  const placeGrid = document.querySelector('#place-grid');
  if (placeGrid && places.length) placeGrid.innerHTML = places.map(placeCard).join('');
  const hotelFilter = document.querySelector('#hotel-filter');
  if (hotelFilter && hotels.length) {
    [...hotelFilter.options].slice(1).forEach((option, index) => {
      const hotel = hotels[index];
      option.textContent = `${hotel.city} · ${hotel.name[lang] || hotel.name.en}`;
    });
  }
}

async function initIndex() {
  const hotelGrid = document.querySelector('#hotel-grid');
  if (!hotelGrid) return;
  try {
    const [hotelData, manifest] = await Promise.all([
      fetch('./data/hotels/index.json').then(response => response.json()),
      fetch('./data/manifest.json').then(response => response.json())
    ]);
    hotels = hotelData.hotels || [];
    hotelGrid.innerHTML = hotels.map(hotelCard).join('');
    const hotelFilter = document.querySelector('#hotel-filter');
    for (const hotel of hotels) {
      const option = document.createElement('option');
      option.value = hotel.id;
      option.textContent = `${hotel.city} · ${hotel.name[lang] || hotel.name.en}`;
      hotelFilter.append(option);
    }
    const chunks = await Promise.all((manifest.files || []).map(file => fetch(`./data/${file}`).then(response => response.json())));
    places = chunks.flatMap(chunk => chunk.places || []);
    document.querySelector('#place-grid').innerHTML = places.map(placeCard).join('');
    document.querySelector('#status-text').textContent = manifest.notice?.[lang] || tr('status');
    document.querySelector('#result-count').textContent = String(places.length);
    document.querySelector('#empty-state').hidden = places.length > 0;
    setLanguage(lang);
  } catch {
    const status = document.querySelector('#status-text');
    if (status) status.textContent = tr('status');
  }
}

document.querySelectorAll('.lang').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.lang)));
document.querySelectorAll('#hotel-filter, #radius-filter, #category-filter').forEach(control => control.addEventListener('change', () => {
  const hotel = document.querySelector('#hotel-filter').value;
  const radius = document.querySelector('#radius-filter').value;
  const category = document.querySelector('#category-filter').value;
  document.querySelectorAll('#place-grid .place-card').forEach(card => {
    const distance = Number(card.dataset.distance || 0);
    card.hidden = (hotel !== 'all' && card.dataset.hotel !== hotel) ||
      (radius !== 'all' && distance > Number(radius)) ||
      (category !== 'all' && card.dataset.category !== category);
  });
}));

setLanguage(lang);
initIndex();
