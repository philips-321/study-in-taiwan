# Garbage Truck facility data: Monday backlog

Prepared 2026-10-25 (Asia/Taipei) for follow-up on Monday, 2026-10-26.

## Current published state

The main Garbage Truck page and V2 preview use the same static facility manifest and viewport tiles. V2 remains at `/garbage-truck/v2/`; the main route remains `/garbage-truck/`. Facility JSON is fetched by visible map bounds in 0.1-degree tiles and cached by the browser. There is no D1/runtime database lookup.

The current live manifest has 889 mapped records across five cities:

| City | Mapped | Source and known limits |
| --- | ---: | --- |
| Taipei | 37 | 30 regular receiving points plus 7 Wednesday/Sunday food-waste-only points. One duplicate address was merged. Food-only sites are not marked as accepting recycling or general trash. |
| New Taipei | 331 | Active Golden Recycling Stations with exact matches to the official map API. The CSV has 345 active rows; 6 had no coordinate match and 8 had conflicting addresses, so they are excluded. Recycling only is marked accepted. |
| Hsinchu City | 36 | Active records from the city DEP API with coordinates and time ranges. Opening days are announced separately. The latest record update in the current API response is 2024-02-29; check freshness. |
| Taichung | 272 | 149 of 151 Hope Recycling Station rows plus 123 smart recycling machines. Two Hope Station rows with different addresses share one coordinate and were excluded. Hope Station accepted items are not specified per site; machine accepted-item lists are retained. Machine opening hours are not listed. CSVs have no update timestamp. |
| Kaohsiung | 213 | ARM points marked operating; one of 214 API rows marked awaiting repair was excluded. Per-point source notes and accepted-item details are retained. API has no last-updated timestamp; some entries defer to the operator for details. |

Last published commit for this data batch: `84611fb` (`garbage-truck: add Taichung recycling sites`). The V2 route and the current manifest were verified live with HTTP 200 after deployment.

## Partial official data: research and resolve

These cities have some official facility information, but not enough verified spatial/schedule data for complete mapping yet:

| City | What is available | What is missing / next step | Official source |
| --- | --- | --- | --- |
| Taoyuan | The 桃樂資收站 list has site names and addresses; opening schedules are published separately. | Find official coordinates or a city map/API and join rows by exact address. Reconcile the current-month schedule with the site list; do not geocode approximately. | [City DEP station list](https://recycle.tyoem.gov.tw/B_Dorothy_Terminal_Introduction.aspx), [monthly schedule](https://recycle.tyoem.gov.tw/B_taoleRecycle_CurrentMonth.aspx), [national catalog record](https://data.gov.tw/dataset/149639) |
| Yilan | Community recycling station records have locality/address/phone fields. | No coordinates or hours in the located dataset. Search the county DEP map or obtain an official coordinate source; keep unmapped until joined confidently. | [National catalog record](https://data.gov.tw/dataset/128796) |
| Yunlin | Official DOCX-derived list has 21 locality/address rows and a coordinate column. | Coordinate column is blank. Search a county map/GIS or another official source; do not infer coordinates from locality/address. | [National catalog record](https://data.gov.tw/dataset/35418) |

New Taipei is also partial: finish reconciling the 14 active CSV rows that were not included (6 without a coordinate match; 8 with address conflicts). Verify whether a newer official CSV/map API is available before refreshing.

## Cities without a usable official fixed-drop-off point list found so far

The following means no sufficiently complete, mappable official point list was found in the research so far. It does **not** mean the city has no waste-service information or no facilities. Search the local environmental department site, GIS/map pages, downloadable attachments, and embedded public APIs before concluding there is no usable source.

- Keelung
- Hsinchu County
- Miaoli
- Changhua
- Nantou
- Chiayi City
- Chiayi County
- Tainan
- Pingtung
- Hualien
- Taitung
- Penghu
- Kinmen
- Lienchiang (Matsu)

Some policy pages/forms were found for Keelung, Miaoli, and Nantou, but not a coordinate-backed fixed-facility list. For example, Keelung's official page is an application form for fixed food-waste/oil collection, not a public list of locations: [Keelung DEP form](https://www.klepb.klcg.gov.tw/tw/klepb1/3879-256063.html). Miaoli's located page is general household food-waste guidance: [Miaoli City Office](https://www.mlcg.gov.tw/cl.aspx?n=5445&Create=1). Nantou's located page is general food-waste information: [Nantou DEP](https://www.ntepb.gov.tw/sub/content/index.aspx?Parser=1,19,440,324,366).

## National source to assess separately

The Ministry of Environment's [national recycling map](https://recycle.moenv.gov.tw/utmap/) exposes a public [store index API](https://recycle.moenv.gov.tw/utmap/api/Store/IndexList). It includes circular concept stores, second-hand markets, and old-clothing collection boxes, with fields for coordinates, city, category, service type, accepted object type, and status. It is **not included** in the current facility tiles: store/box types differ from the city fixed-drop-off datasets, the response includes missing/invalid coordinates and websites, and adding thousands of pins needs category and zoom/performance decisions. On Monday:

1. Recheck the API response and separate public physical recycling drop-offs from shops, markets, websites, and old-clothing boxes.
2. Validate status and non-zero coordinates, inspect duplicate/conflicting locations, and count coverage by jurisdiction.
3. Decide whether old-clothing boxes belong in this map and whether they need a separate toggle/layer or zoom threshold before importing.

## Monday work order

1. Continue source discovery for the 14 jurisdictions above using each local government's official environmental-protection site, open-data portal, map page, CSV/DOCX attachments, and public client-side API endpoints.
2. Search every source for fixed recycling and food-waste drop-offs separately. Record accepted categories only when the source states them; do not infer that a general recycling station accepts food waste.
3. Resolve Taoyuan, Yilan, and Yunlin coordinates and schedules only through official matching sources. Keep records out of the map if the match is ambiguous.
4. Reconcile New Taipei's 14 omitted active rows and recheck the freshness/status of Hsinchu City, Taichung, and Kaohsiung data.
5. Search for food-waste-only fixed points beyond Taipei; do not substitute truck routes or generic food-waste instructions for fixed locations.
6. Preserve the current static approach: source-backed city JSON plus viewport-loaded 0.1-degree JSON tiles. Update the manifest, source notes, counts, and cache-busting version whenever data changes.
7. Run the repository's V2 validation workflow and confirm the deployed V2 URL and manifest after pushing.

## Source URLs for currently mapped cities

- **Taipei:** [regular dataset](https://data.gov.tw/dataset/132357), [Wednesday/Sunday food-only dataset](https://data.gov.tw/dataset/137767).
- **New Taipei:** [Golden Recycling Station dataset](https://data.gov.tw/dataset/123351), [official map](https://recyclebank.epd.ntpc.gov.tw/Map/Index).
- **Hsinchu City:** [official recycling station map](https://hccepb.ihc-recycle.com.tw/recycling_stations/), [public API](https://hccepb-api.ihc-recycle.com.tw/v1/recycling_stations).
- **Taichung:** [Hope Recycling Station map](https://recycle.epb.taichung.gov.tw/maps/maps_04.asp), [Hope Station CSV](https://recycle.epb.taichung.gov.tw//maps/data04.csv), [smart-machine map](https://recycle.epb.taichung.gov.tw/maps/maps_06.asp), [smart-machine CSV](https://recycle.epb.taichung.gov.tw/maps/data06.csv).
- **Kaohsiung:** [ARM map](https://recycle.ksepb.kcg.gov.tw/RecycleMachine/arm/map), [map API](https://recycle.ksepb.kcg.gov.tw/api/recyclemachine/0f938867-0993-4d94-97e5-04586c4f42b7).
