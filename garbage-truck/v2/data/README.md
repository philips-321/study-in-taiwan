# V2 data

`cities.json` is the 22-city registry.

Published runtime data is static JSON. There is no D1 dependency.

Refresh behavior:
- manual only;
- one city per run;
- default 30-day minimum interval;
- conditional/cache-friendly HTTP where possible;
- previous JSON is retained when a source errors or returns unusable/empty data.

`routes/*.json` stores normalized schedules, even if coordinates are unresolved.
`tiles/*.json` contains only mapped stops and is what the map should load by viewport.
