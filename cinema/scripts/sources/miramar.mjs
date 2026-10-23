const BASE = 'https://www.miramarcinemas.tw';
const ENDPOINT = `${BASE}/api/Booking/GetMovie/`;

function text(value) {
  return typeof value === 'string' ? value.trim() : value ?? null;
}

export async function fetchMiramarShowtimes() {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'referer': `${BASE}/booking/timetable`,
      'user-agent': 'study-in-taiwan-cinema-data/1.0'
    },
    body: '{}'
  });

  if (!response.ok) throw new Error(`Miramar API ${response.status} ${response.statusText}`);
  const payload = await response.json();
  const movies = payload?.results?.mMovies;
  if (payload?.RC !== 1 || !Array.isArray(movies)) {
    throw new Error('Miramar API response format changed');
  }

  const rows = [];
  for (const movie of movies) {
    const movieTitle = text(movie.TitleAlt) || text(movie.Title);
    if (!movieTitle) continue;

    for (const day of Array.isArray(movie.mShowTimes) ? movie.mShowTimes : []) {
      const date = String(day.date || '').slice(0, 10);
      if (!date) continue;

      for (const cinema of Array.isArray(day.mCinemas) ? day.mCinemas : []) {
        for (const session of Array.isArray(cinema.mSessions) ? cinema.mSessions : []) {
          const raw = String(session.Showtime || '');
          const time = raw.includes('T') ? raw.split('T')[1]?.slice(0, 5) : raw.slice(0, 5);
          if (!/^\d{2}:\d{2}$/.test(time || '')) continue;

          rows.push({
            cinema_name: '美麗華大直影城',
            city: 'taipei',
            movie_title: movieTitle,
            movie_title_en: text(movie.Title),
            rating: text(movie.Rating),
            date,
            time,
            hall: text(cinema.CinemaTitle),
            format: text(session.SessionType) || null,
            source_url: `${BASE}/booking/timetable`,
            source: 'miramar-official-api'
          });
        }
      }
    }
  }

  return rows;
}
