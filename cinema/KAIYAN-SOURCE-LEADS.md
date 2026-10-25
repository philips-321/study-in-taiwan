# Kaiyan cinema source leads

This is a **research lead list**, copied as names and source references from the public [Kaiyan showtime aggregator](https://github.com/YHHuan/kaiyan-showtimes) README. It has not been verified against the current cinema websites or against our records. Do not treat it as an official directory, proof of current schedules, or proof of full Taiwan coverage.

**Scope:** source and cinema names, plus API details explicitly stated in its README. No scraper code, Python code, or schedule data was copied from that repository.

## Source groups named by Kaiyan

| Source / cinema group | Coverage stated in Kaiyan README | Source reference |
|---|---:|---|
| 秀泰 Showtime Cinemas | 15 branches | [Official cinema pages](https://www.showtimes.com.tw/cinemas/) |
| 國賓 Ambassador Theatres | 9 branches | [Official theater list](https://www.ambassador.com.tw/home/TheaterList) |
| 新光影城 Shin Kong Cinemas | 5 branches | [Official website](https://www.skcinemas.com/) |
| 喜樂時代 Century Asia Cinemas | 4 branches | [Official website](https://www.centuryasia.com.tw/) |
| 美麗新 Miranew Cinemas | Branch count not stated | [Official timetable](https://www.miranewcinemas.com.tw/Booking/Timetable) |
| 美麗華 Miramar Cinemas (Dazhi) | Branch count not stated | [Official timetable](https://www.miramarcinemas.tw/booking/timetable) |
| 威秀 Vieshow Cinemas, including MUVIE CINEMAS | Branch count not stated | [Official website](https://www.vscinemas.com.tw/) |
| in89 豪華影城 | Branch count not stated | [Official cinema page](https://www.in89cinemax.com/film_list.aspx?TheaterId=15) |
| 樂聲 Lux Cinema | Branch count not stated | [Official showtimes](https://www.luxcinema.com.tw/web/2020.php?type=ShowTimes) |

Kaiyan's README says it uses AtMovies as a fallback for some sources, including Vieshow; it also describes official-first / fallback coverage for some other sources. Verify the exact role and current source URL per cinema before using any schedule.

## API leads explicitly mentioned in Kaiyan's README

The README does **not** publish a complete list of API URLs. These are the only API details it names directly; they are leads, not browser-verified endpoints.

| Cinema/source | API detail stated in README | Verification note |
|---|---|---|
| 新光影城 Shin Kong Cinemas | Official route pattern: `/Sessions/Sessions?cinemaId=…` | README says its local supplemental collector now uses this route. It does not list the branch IDs or a complete request specification. [Official site](https://www.skcinemas.com/) |
| 美麗華 Miramar Cinemas 大直 | Official multi-day showtime endpoint | README does not give the endpoint path or request details. Start from the [official timetable](https://www.miramarcinemas.tw/booking/timetable) and confirm through the cinema site. |
| 國家電影及視聽文化中心 (TFAI) | OPENTIX program API | Supplemental cultural screenings, not a commercial-cinema-wide feed. README does not give the exact API URL. [OPENTIX](https://www.opentix.life/) |

For the other listed cinemas, Kaiyan's README names official pages and/or AtMovies fallback coverage but does not document a public API endpoint. Those remain browser research leads. We have not inspected or copied endpoint code from Kaiyan.

## Comparison with API/source references in our cinema project

This comparison uses our existing `cinema/README.md` and adapter/source records, and Kaiyan's README only. “Not confirmed” means Kaiyan's documentation does not expose enough detail to claim an identical endpoint.

| Our project reference | What Kaiyan documents | Match status |
|---|---|---|
| ShowTimes bootstrap: `https://capi.showtimes.com.tw/4/app/bootstrap` | Kaiyan lists 秀泰 as 15 branches and says its official site is preferred, with AtMovies filling branch/date gaps. It does not name the bootstrap URL. | Same cinema chain; **identical API endpoint not confirmed**. |
| Miramar: `POST https://www.miramarcinemas.tw/api/Booking/GetMovie/` | Kaiyan says 美麗華大直 uses an official multi-day showtime endpoint, without its path or method. | Same cinema/source family; **identical API endpoint not confirmed**. |
| AtMovies schedule pages: `https://www.atmovies.com.tw/showtime/...` | Kaiyan says it uses 開眼 (AtMovies) as a fallback for Vieshow and some other branch/date gaps. | Same aggregator; **exact page/branch URL overlap not confirmed**. |
| MOC cultural screening API: `https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=8` | Kaiyan says TFAI cultural programs use an OPENTIX program API. | Both supplement cultural screenings, but **different documented providers/endpoints**. |
| Shinkong endpoint used by Kaiyan: `/Sessions/Sessions?cinemaId=…` | Our current cinema README/adapters do not list this endpoint as an active Shinkong adapter. | **Not currently shared**. |

**Answer for the ShowTimes API we imported:** the brand is shared, but Kaiyan's README does not say it uses `capi.showtimes.com.tw/4/app/bootstrap`, so we cannot claim the same API. The clearest confirmed overlap is AtMovies as an aggregator source; Miramar may use the same official endpoint, but Kaiyan does not publish enough detail to verify that.

## Independent, art-house, and local cinema leads

These names are listed in Kaiyan's README as additional coverage. The README's source attribution and current operating status should be checked one cinema at a time.

- 光點華山 Spot Huashan
- 府中15 Fuzhong 15
- 誠品電影院 Eslite Cinema
- 光點台北 Spot Taipei
- 真善美 Wonderful / Sunshine (the README wording needs verification)
- 景美佳佳 Jingmei Jiajia
- 哈拉影城 Hala Cinema
- 總督大戲院 Governor Cinema
- 微風影城 Breeze Cinema
- 龍祥百老匯 Broadway Gongguan
- 鴻金寶影城 Hongjinbao Cinema
- 三重天台影城 Sanchong Tian Tai Cinema
- ACE Cinema
- 日新大戲院 Rixin Theater
- Chin Chin (README label; exact Chinese name and venue identity need verification)

## Third-party cross-checks

- [Kaiyan public site](https://yhhuan.github.io/kaiyan-showtimes/) — use to discover names and compare listed coverage; not an authoritative source for an individual screening.
- [Kaiyan site status JSON](https://yhhuan.github.io/kaiyan-showtimes/site-status.json) — coverage/source-health metadata, not a complete schedule feed.
- [Kaiyan repository README](https://github.com/YHHuan/kaiyan-showtimes#readme) — original source for this lead list.
- [AtMovies showtimes](https://www.atmovies.com.tw/showtime/) — aggregator reference; label it as an aggregator if used, never as a cinema's official source.

## Review checklist before adding anything to cinema data

1. Match the lead to one of our cinema records and confirm the physical branch.
2. Open that branch's source in a browser and note the exact URL, review date, and any access/rendering issue.
3. Confirm the date, movie title, session time, and any explicitly stated hall, format, audio, or subtitle details.
4. Record the verified source in `SOURCE-RESEARCH-NOTES.md`, `SOURCE-RESEARCH-LIST.csv`, and `data/research/observed-sources.json` before updating showtime JSON.
5. If the only usable page is an aggregator, record it as an aggregator. Leave unavailable details unknown.

No data was imported from Kaiyan. This document is only a checklist of places to investigate manually.
