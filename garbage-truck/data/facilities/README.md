# Fixed drop-off facilities

`manifest.json` indexes the static facility tiles by city and geographic bounds.
The map fetches only tiles intersecting the current viewport and reuses them from
the browser cache while the visitor pans around. Tile cells are 0.1 degrees.

## Current sources

- **Taipei:** 30 official receiving locations from the Taipei City Open Data CSV
  listed in `garbage-truck/v2/data/source-catalog.json`.
- **New Taipei:** 331 active Golden Recycling Station records from the city's
  official CSV joined to coordinates from its official map API. The CSV has 346
  rows (345 active, 1 paused). Six active rows have no matching geocoded API
  record; eight more have an address conflict between the CSV and map API. Those
  records are excluded from map tiles rather than assigned guessed coordinates.

New Taipei stations are marked as accepting recycling only. They are not marked
as accepting general trash or food waste. The official site asks visitors to
call the village office to confirm current hours, exact address, and accepted
items before visiting.

These are manual static files; the site does not query a database at runtime.
When refreshing data, keep source URLs, update dates, coverage counts, and
acceptance limits in the manifest. Do not infer facility coordinates from a
district center or mark waste categories as accepted without source evidence.
