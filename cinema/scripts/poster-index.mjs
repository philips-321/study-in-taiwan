import fs from 'node:fs/promises';
import path from 'node:path';
import { movieIdForRow } from './movie-schema.mjs';

const read = async file => fs.readFile(file, 'utf8').then(JSON.parse).catch(error => error?.code === 'ENOENT' ? null : Promise.reject(error));

export async function loadPosterDonors(dataRoot, additional = []) {
  const [catalog, metadata, index] = await Promise.all([
    read(path.join(dataRoot, 'movies/index.json')),
    read(path.join(dataRoot, 'movie-metadata/showtimes.json')),
    read(path.join(dataRoot, 'movie-metadata/poster-index.json'))
  ]);
  return [
    ...(catalog?.movies || []),
    ...(metadata?.movies || []),
    ...(index?.movies || []),
    ...additional
  ];
}

export async function writePosterIndex(dataRoot, records) {
  const file = path.join(dataRoot, 'movie-metadata/poster-index.json');
  const existing = await read(file);
  const byIdentity = new Map();
  for (const movie of [...(existing?.movies || []), ...records]) {
    if (!movie.poster_url) continue;
    const movieId = movie.movie_id || movieIdForRow(movie);
    const title = movie.movie_title || movie.title || null;
    const key = `${movieId || title}|${movie.poster_url}`;
    const prior = byIdentity.get(key) || { movie_id: movieId || null, movie_title: title, poster_url: movie.poster_url, aliases: [], sources: [] };
    prior.aliases = [...new Set([
      ...prior.aliases, title, movie.movie_title_en,
      ...(movie.international_titles || []), ...(movie.aliases || [])
    ].filter(Boolean))].sort();
    prior.sources = [...new Set([
      ...prior.sources, ...(movie.metadata_sources || []), ...(movie.sources || []),
      movie.source || movie.metadata_source
    ].filter(Boolean))].sort();
    if (movie.preferred === true || prior.preferred === true) prior.preferred = true;
    if (movie.historical_only === true || prior.historical_only === true) prior.historical_only = true;
    byIdentity.set(key, prior);
  }
  const output = {
    version: 1,
    generated_at: new Date().toISOString(),
    policy: 'Append-only known poster records. Never delete a poster only because its film is temporarily absent; consider deletion only after confirmed no Taiwan cinema screenings for 180 days. Exact normalized title aliases are reused; preferred records are honored; ambiguous poster candidates remain unmatched.',
    movies: [...byIdentity.values()].sort((a, b) => String(a.movie_title).localeCompare(String(b.movie_title), 'zh-Hant'))
  };
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(output, null, 2)}\n`);
  return output;
}
