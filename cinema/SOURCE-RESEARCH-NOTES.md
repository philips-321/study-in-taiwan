# Cinema source research notes

Manual browser review started 2026-10-25. These notes record what was actually visible on the opened pages. A company page that renders placeholders is not treated as a verified machine-readable schedule. Aggregators are noted as fallbacks, not mislabeled as official sources.

## Reviewed cinema pages

| Cinema | Opened source | What the page exposed | Collection status |
|---|---|---|---|
| 員林大戲院 / 員林影城 | [@movies schedule](https://www.atmovies.com.tw/showtime/t04703/a47/) | Address, phone, a Facebook website link, date selector, Chinese movie names, runtime, format (including Atmos), and showtimes. The page showed a 2026-10-23 schedule refreshed at 18:00. | Aggregator schedule works in browser; no direct official showtime page confirmed. Do not call this official. |
| 嘉年華戲院 | [嘉年華影城 official schedule](https://www.3d-movies.tw/time.aspx) | Official page has a date/theater selector and says schedules may be announced as late as the day before screening. Browser text extraction did not reveal the selected schedule rows, so likely client-rendered. | Official source found; needs browser interaction or inspection of the page's own network/API to extract rows. |
| 嘉義秀泰影城 | [ShowTimes cinema page](https://www.showtimes.com.tw/cinemas/9/) | Previously opened page exposes film names, dates, times, hall/format, and audio labels. | Official chain site found. Verify whether subtitle fields are explicitly present per screening before importing. |
| 嘉義影食匯 in89豪華影城 | [in89 official film page](https://www.in89cinemax.com/film.aspx?TheaterId=17) | Movie-time section appears, but the browser-rendered text contains `{{ hall }}` and no screening rows. It does show the venue address and cinema-specific ID 17 in the URL. | Official source found; schedule is client-rendered and needs browser interaction or inspection of the page's own network/API. |
| 新竹巨城威秀影城 | [VieShow official branch page](https://www.vscinemas.com.tw/theater/detail.aspx?id=9) | Browser page exposes dates, Chinese and international titles, showtimes, hall/format, and audio language codes such as 英/國/日/韓/粵. Includes address, phone, screen count, and room details. Page states Friday releases' schedule is published on Wednesday for Friday–Thursday. | Strong official schedule source, directly readable in browser. Current page included some presales well beyond its normal weekly schedule, so keep actual selected dates rather than assuming two months of full programs. |
| 新竹大遠百威秀影城 | [VieShow official branch page](https://www.vscinemas.com.tw/theater/detail.aspx?id=7) | Same fields as the Big City branch. Page exposed date tabs, Chinese and English titles, format/audio labels and times, address, phone, screen count. | Strong official schedule source, directly readable in browser. |
| 板橋大遠百威秀影城 | [VieShow official branch page](https://www.vscinemas.com.tw/theater/detail.aspx?id=4) | Page exposes date tabs, Chinese and international titles, screening times, room formats and audio language, along with branch address, phone, and screen count. It also states the normal weekly publication window. | Strong official schedule source, directly readable in browser. |
| 竹北百老匯影城 | [Broadway official site](https://www.broadway-cineplex.com.tw/) | Page contains booking selectors and a current-movies section, but extracted browser text shows template placeholders (`{{item.cname}}`, `{{item.ename}}`) rather than populated schedules. | Official source found; likely client-rendered. Use a branch-specific schedule link if discovered; AtMovies currently provides a fallback listing. |
| 花蓮新天堂樂園威秀影城 | [VieShow official branch page](https://www.vscinemas.com.tw/theater/detail.aspx?id=21) | Browser page exposes Chinese/international title, date tabs, showtimes, hall formats (including IMAX/A+), and audio language. Also lists address, phone, screen count and room details. | Strong official schedule source, directly readable in browser. |
| 高雄SKM PARK國賓影城 | [SKM Park cinema page](https://www.skmpark.com/ArticleContent/BPages?ClassUUID=800eb5ae-47a4-4086-bd29-83295d323184&FW=bdi&LangCode=zhtw&MenuUUID=cfc6f37e-057f-4d44-9cdc-f64ce4e29ed4&RelUUID=65f2f9df-bba1-4318-b587-ab8c3d907108) → [Ambassador site](https://www.ambassador.com.tw/) | Mall page confirms the cinema, screen count, venue level and links to the Ambassador film schedule. Ambassador home page exposes a nationwide movie list with international titles and schedule search controls, but the opened page does not yet show branch/date/time rows. | Official chain source found. Need select this branch/date in the schedule page and record per-screening details. |
| 新月豪華影城 | [Luna official site](https://www.lunacinemax.com.tw/) | Search result confirms an official “電影時刻” section. Direct browser open returned HTTP 403. The AtMovies result currently shows a schedule and venue website URL but remains a third-party fallback. | Official source identified, blocked in this browser fetch; no schedule data imported from the aggregator as official. |

## Extraction rules

- Store a direct branch/date schedule URL when possible; a chain homepage or search result is only a discovery source.
- Preserve source-declared title, international title, date, time, format, audio, subtitle, and screening room. Leave missing subtitle/audio values unknown; do not infer them from one another.
- Record schedule publication windows as source metadata. A future presale date does not imply the whole cinema's schedule is available for every intervening day.
- Do not label a page complete if the browser shows only a JS shell, placeholders, or a selector without the selected result rows.
- Continue by opening one cinema source at a time and updating the CSV's source column only after checking it.

| 喜樂時代影城今日店 | [Official schedule](https://ximen.centuryasia.com.tw/ticket_online.aspx) and [official contact page](https://ximen.centuryasia.com.tw/Contact_Us.aspx) | Schedule pages 1–3 expose 2026-10-25 titles, international titles, dates, halls, times, source audio labels, runtime, and Taiwan rating labels. Contact page lists 峨嵋街52號1樓, matching OSM feature 7282835. | Official schedule manually reviewed in browser on 2026-10-25; 45 sessions saved for that date. No subtitle values are displayed, so subtitle fields remain null. Map point linked to master cinema ID 7b209adf3838f023. |

| 新竹大遠百威秀影城 | [Official VieShow branch page](https://www.vscinemas.com.tw/theater/detail.aspx?id=7) | The official page exposes the 2026-10-25 date, Chinese and international titles, formats (including Gold Class), audio labels, and 35 showtime rows. It does not expose room numbers or subtitle languages in the page text. Official branch address is 新竹市西大路323號8樓, matching OSM feature 7196946. | 35 sessions manually saved for 2026-10-25; subtitle values remain null. OSM point 7196946 linked to cinema ID fb50a15c37b733c3. |

## Map point cross-checks added 2026-10-25

- OSM feature 7197776 (新竹 city, `威秀影城`) linked to 新竹巨城威秀影城; official VieShow page lists 民權路176號4樓之3. This branch's 15 manually verified sessions were already saved.
- OSM feature 21478643 (`秀泰影城`) linked to 高雄岡山秀泰影城; official ShowTimes branch page confirms its 岡山 address and 2026-10-25 screenings already present in saved JSON.
- OSM feature 28916732 (`光點華山電影館`) linked to the BAMID master record 華山電影藝術館; the cinema's official page confirms the same name and 八德路一段1號 address.
- OSM feature 7195628 (`新月影城`) linked to 新月豪華影城 by branch and city. The official site returned HTTP 403 in this browser; no schedule was imported. Aggregator schedule listings remain labeled as aggregators.
- OSM feature 5857660 (`南投大戲院`) linked to 南投戲院 using the theater's official address; its city tag was corrected from Changhua to Nantou.

| 台南FOCUS威秀影城 | [VieShow official branch page](https://www.vscinemas.com.tw/theater/detail.aspx?id=22) | Official branch address, phone and screen count; 10/25 titles, international titles, audio labels and times. | 52 sessions transcribed; no subtitle languages or halls shown. Map feature 5796689 linked. |

| 高雄大遠百威秀影城 | [VieShow official branch page](https://www.vscinemas.com.tw/theater/detail.aspx?id=18) | Official branch details and a visible 10/25 schedule section beginning at 17:45; title, format, audio, time. | 45 visible sessions transcribed; page has IMAX/4DX/GC; subtitles not shown, after-midnight sessions not included here. |

| 總督大戲院 | [official venue page](https://www.governor.com.tw/aboutus.php) | Official page confirms venue/address/phone and two auditoriums; Today’s Movies is image-based in this browser, so no schedule rows were readable. | Map feature 7292818 linked; master screen count corrected from 1 to 2 based on official page. No showtimes imported. |

## Cinema map coverage snapshot

As of 2026-10-25, the map has 92 pins: 63 are linked to a master cinema, 34 linked pins resolve to at least one saved schedule across the indexed dates, 29 linked pins have no schedule indexed, and 29 pins remain unmatched. A no-schedule count means only that no screening is stored in the repo; it does not establish that the venue is closed.

| 台北獅子林新光影城 | [@movies schedule](https://www.atmovies.com.tw/showtime/t02b05/a02/20261025/) | The 10/25 indexed listing shows nine explicit title/time entries and two explicit language-version labels. The official SK Cinemas page timed out in this browser. | 9 rows saved with aggregator provenance; unknown audio and subtitles remain null. |

| 景美佳佳戲院 | [@movies branch schedule](https://origin.atmovies.com.tw/showtime/t02f05/a02/20261027/) | Directly opened 10/27 schedule gives six Chinese/international title pairs, runtimes, room names and times. | 12 screenings saved with aggregator provenance; rating/subtitle data not displayed. |

| 親親大戲院 | [official showtimes](https://www.ccmovie.com.tw/product.php?_path=product_showtimes) | Official date tabs and 10/25 list show 13 film titles, runtime, genres, halls, audio versions and exact times. | 46 screenings saved for 2026-10-25; subtitles not listed. |

| 板橋大遠百威秀影城 | [VieShow official schedule and branch page](https://www.vscinemas.com.tw/theater/detail.aspx?id=4) | The official page lists 2026-10-25, movie titles and international titles, times, version/audio labels, address, phone, screen count, and branch-level ticket prices. It showed 17 remaining same-day sessions starting at 18:35 at the browser review time; hall numbers and subtitles were not exposed. | 17 sessions saved with official provenance. Map feature 7260847 matched by name/address. English branch name updated to the official name “Vie Show Cinemas Banciao Mega City”. The page lists 9 screens. |
| 台中新光影城 | [@movies dated schedule page](https://www.atmovies.com.tw/showtime/t04401/a04/20261025/) and [official cinema site](https://www.skcinemas.com/) | @movies page identifies the Taichung branch and displays 2026-10-25, but the schedule itself is an unreadable image in this browser. The official site timed out. | No showtimes imported from snippets or image guesses. Map feature 6383536 matched by branch name/city and venue address; operation status remains unverified. |

| 台鋁影城 | [Official MLD booking page](https://booking.mldcinema.com/Browsing/QuickTickets/Compare) | The official booking page displays the 2026-10-25 date and 16 remaining sessions starting at 19:00. Formats, room numbers, audio, and subtitles were not shown in extracted text. | 16 sessions saved with official provenance; unknown details stay null. Map feature 5650375 linked to master cinema ID 785b0aaafc496ce0. |

| 龍祥百老匯影城 | [Official Broadway booking page](https://www.broadway-cineplex.com.tw/book.html) | The official page renders JavaScript template placeholders without branch/date screening rows. The latest browser-accessible @movies date found was 2026-10-24, before the current date. | No current-date rows imported. Continue with browser sources when the page returns a real date and sessions. |

| 微風影城 | [@movies dated schedule](https://www.atmovies.com.tw/showtime/t02a03/a02/20261025/) | @movies visibly lists 2026-10-25 titles, times, branch address/phone, and update time 2026-10-24 18:25. No formats, halls, audio, or subtitles. | 12 sessions saved with aggregator provenance. Map feature 7287389 matched to master ID d9a17e260f26a5ec. |

| 星橋國際影城 | [Official SBC booking page](https://www.sbcmovies.com.tw/browsing/Cinemas/Details/1001) | The official page shows date-specific 2026-10-25 sessions, title variants, and Taiwan age labels. 72 rows matched existing catalog films. Hall and subtitle fields are not shown. | 72 sessions saved. Map feature 7217949 linked to the master. The ambiguous “SAYANG” title was left out because it could not be matched confidently. |

| 喜樂時代影城南港店 | [Official Century Asia booking page](https://www.centuryasia.com.tw/book.html?sid=Nangang) | The page rendered JavaScript placeholders for titles, dates, halls, and showtimes. The opened Magic Hour page contained rows only through 2026-10-24; @movies timed out. Search snippets mentioning 10/25 were not used. | No current-date sessions imported. Map feature 21543176 linked to the master branch; the schedule remains unverified from browser-readable source content. |

| 中和環球威秀影城 | [Vie Show official branch page](https://www.vscinemas.com.tw/theater/detail.aspx?id=25) | The selected 2026-10-25 tab displays 20 remaining sessions at review time, Chinese and international titles, digital versions/audio labels, branch address/phone, 10 screens, and regular/3D ticket prices. No halls or subtitles are shown in the extracted schedule. | 20 remaining same-day sessions saved with official provenance. OSM feature 27168640 linked to master ID 719e1a68f2f3f9f5; official English branch name recorded as “Vie Show Cinemas Global Mall”.

| 哈拉影城 | [Official branch schedule](https://www.halarcity.com.tw/Browsing/Cinemas/Details/0000000001) and [@movies dated page](https://origin.atmovies.com.tw/showtime/t02a06/a02/20261025/) | Official page timed out in the browser. The opened @movies page shows the 2026-10-25 date, address, phone, and an 18:44 refresh time, but the schedule is an image that did not expose readable film/time rows. | No showtimes imported. Search snippets and unrendered text were not used. Retry a readable source later.

| 美麗新宏匯影城 | [Miranew official booking timetable](https://www.miranewcinemas.com.tw/Booking/Timetable) and [opened report quoting operator closure announcement](https://travel.udn.com/travel/story/7205/9219674) | Report states the operator announced this branch stopped operation on 2025-12-22. The official booking page's visible branch list no longer includes Honghui. | No showtimes imported. Master status set to closed; the map pin remains connected so the closed venue can be identified.

| 南投戲院 | [Official dated showtimes](https://nantoutheater.com/showings) | The opened official page selected 2026-10-25 and exposed four films, six remaining session times, halls, release dates/runtime, address, and contact. It did not label audio, format, or subtitles for these rows. | 6 sessions saved. Map feature 5857660 is linked to master cinema ID 40b1b5887858aded. English name follows the cinema's official site.

| 山明電影院 | [Official showtimes page](https://www.shanmingcinema.com.tw/showtimes.php) | The opened page lists current films, but clicking a title exposed showtimes only for 2026-10-17 through 10-21. That is stale for the current date 10/25. | No current-date rows imported. Kept operational status unknown because no fresh dated session list was readable.

| 美麗新大直皇家影城 | [Official source](https://www.miranewcinemas.com.tw/Booking/Timetable) and [@movies dated page](https://origin.atmovies.com.tw/showtime/t02d06/a02/20261025/) | Official booking page exposes only the selector in browser text. The directly opened @movies 2026-10-25 page showed address/phone/date/update time but the schedule as an unreadable image. Magic Hour page had readable entries only through 10/21 and did not expose its later date blocks. | No schedule imported; page did not provide readable current-date session rows.

| 日日新大戲院 | [Official source](https://www.srm.com.tw) and [@movies dated page](https://www.atmovies.com.tw/showtime/t04404/a04/20261024/) | Official srm.com.tw returned HTTP 403. The directly opened @movies dated page only exposed 2026-10-24 and its schedule as an image; no current-date readable schedule was available. | No schedule imported; page did not provide readable current-date session rows.

| 豐原in89豪華影城 | [Official source](https://www.in89cinemax.com/film_list.aspx?TheaterId=15) and [@movies dated page](https://showtimes.magichour.tw/cinema/c244ae65409) | Official film list page exposes branch information but only {{ hall }} / empty JS schedule placeholder. Magic Hour had actual entries dated 10/23–10/24 and only said later dates had sessions without listing them in the opened page. No current-date rows imported. | No schedule imported; page did not provide readable current-date session rows.

| 喜樂時代影城永和店 | [Official source](https://beyond.centuryasia.com.tw/Movie_Info.aspx) and [@movies dated page](https://origin.atmovies.com.tw/showtime/t02e17/a02/20261025/) | Official Movie_Info page timed out. Directly opened @movies page showed the 2026-10-25 date, branch address/phone and update time 09:34, but the schedule was an unreadable image. Magic Hour search result was dated last week and its current page returned 404. No rows imported. | No schedule imported; page did not provide readable current-date session rows.

| 威尼斯影城 | [Official source](https://www.venice-cinemas.com.tw/showtime.php) and [@movies dated page](https://origin.atmovies.com.tw/showtime/t03303/a03/20261025/) | Official showtime page returned HTTP 403. The direct @movies page showed 2026-10-25 and 18:46 refresh time but the actual schedule as an unreadable image. Official ticket engine exceeded browser extraction size (7MB); no schedule rows could be inspected. | No schedule imported; page did not provide readable current-date session rows.

| 鴻金寶麻吉影城 | [Official TIXI showtimes page](https://fmmfilmmate.tixi.com.tw/) and [Magic Hour listing](https://showtimes.magichour.tw/cinema/c4a8c51b45e) | The official TIXI page exposes current-looking titles, halls and times but omits the selected date in browser text. Magic Hour's opened page contains dated rows only through 10/21; later days are referenced but not rendered. | No rows imported until the date can be verified.

| 三重天台戲院 | [@movies dated branch schedule](https://origin.atmovies.com.tw/showtime/t02e04/a02/) | The page directly shows the 2026-10-25 schedule for eight films and its 18:00 update time. | 25 sessions saved with aggregator provenance; only one listing explicitly says 中文版, and no halls or subtitle languages are shown. |

| 山明電影院 | [official showtime page](https://www.shanmingcinema.com.tw/showtimes.php) | Five movie detail pages each list a 10/23–10/28 schedule range, current titles, hall labels, and times. | 15 sessions for 10/25 saved from the directly opened official pages; no audio/subtitle labels shown. |

| 金獅影城 | [Magic Hour dated schedule](https://showtimes.magichour.tw/cinema/c07dc93d40f) | The earlier snapshot listed 10/25; a fresh browser open on 2026-10-27 now shows 12 titles and 25 times specifically for 10/27. | Added those date-bound rows with aggregator provenance; language, hall, and format are not shown. Operator announced last operating date 2026-10-31. |

| 金門昇恆昌國賓影城 | [CNA report citing Ambassador announcement](https://www.cna.com.tw/news/aloc/202604080368.aspx) | The operator announced the branch would close after 2026-05-04 due to lease expiry. | Master marked closed; map pin retained and no obsolete sessions imported. |

| 哈拉影城 | [official cinema schedule](https://halarcity.com.tw/Browsing/Cinemas/Details/0000000001) and [official QuickTickets](https://halarcity.com.tw/Browsing/QuickTickets/Compare) | Official pages directly show the 10/25 schedule for ten titles plus two parent-child Chinese screenings. | 16 screenings saved with official provenance; only explicit Chinese-language and parent-child labels were recorded, with no halls/subtitles shown. |

| 嘉年華戲院 | [Magic Hour dated branch schedule](https://showtimes.magichour.tw/cinema/cf79b446e05) | Directly opened schedule explicitly labels 10/25 (Sun) and lists 17 films with 73 session times. The official site date selector did not render its schedule in browser extraction. | 73 screenings saved with aggregator provenance. Hall, format, audio, and subtitle details are not shown and remain unknown. |




| 豐原in89豪華影城 | [Magic Hour dated branch schedule](https://showtimes.magichour.tw/cinema/c244ae65409) | Directly opened page explicitly labels 10/25 and lists 29 film titles with 82 times, including audio labels and BOOM room/format labels where available. | 74 sessions matched to existing movie records and saved with aggregator provenance; unlisted audio/hall/subtitle facts remain unknown. |


| Map-scope review | [Map location points](./data/locations.json) | Current 92-point map has no cinema match for Hualien Paradiso, Penghu in89, Chiayi Ying Shi Hui in89, or Kaohsiung Dalih in89. Their directly opened 10/25 schedule pages were checked but excluded from the map-scoped schedule chunks until a point is matched. | Their schedule evidence remains in `observed-sources.json`; no screening rows from these off-map branches remain in the date data. |

| 林口MITSUI OUTLET PARK威秀影城 | [Vie Show official branch schedule](https://www.vscinemas.com.tw/theater/detail.aspx?id=5) | Official branch page has a 10/25 tab and 27 listed sessions with international titles, formats, and audio labels. It also lists ticket prices; halls and subtitle languages are not shown. | 25 sessions saved from the official page; unknown details remain unfilled. |


## Additional map-pin schedule research — 2026-10-25

- **台中新光影城 (Taichung, mapped pin `9598ae26696bb28a`)**: The opened [dated branch listing](https://twshowtimes.com/cinemas/skcinemas-taichung/2026-10-25/) explicitly shows 2026-10-25, 26 films, age ratings, selected formats/audio versions, and times. Transcribed 64 schedule rows; it is an independent aggregator, not the cinema operator. Halls and subtitle languages are not shown.
- **員林大戲院 (Changhua, mapped pin `5130fcc97b11b16d`)**: The opened [Magic Hour branch page](https://showtimes.magichour.tw/cinema/c60a4447b7b) explicitly labels 10/25 and lists six films and 24 times. Transcribed 24 rows; no format/audio/hall/subtitle labels.
- **喜樂時代影城桃園 A19 (mapped pin `12d76a4689377275`)**: The opened [@movies branch page](https://www.atmovies.com.tw/showtime/t03316/a03/) says operations ended after the last screening on 2026-01-04. Retained its map pin but marked the master closed; no showtimes imported.

- **美麗新大直皇家影城 (Taipei, mapped pin `58aceabee919fb31`)**: The opened [Magic Hour branch page](https://showtimes.magichour.tw/cinema/c1664dd57a1) explicitly labels 10/25 and lists 11 films / 46 times, all in 皇家廳; the Japanese audio label is retained where shown. No format or subtitle data.

- **鴻金寶麻吉影城 / 喜樂時代影城永和店 (New Taipei, mapped pins `a15851ac9eeccb48`, `cf2a2d27ba5ba2a8`)**: The directly opened [@movies Whalefall page](https://origin.atmovies.com.tw/showtime/fwen28535715/a02/) was updated 2026-10-25 15:20 and lists the dated branch times. Saved the 6 Hongjinbao entries (including 00:00 next day) and 4 Yonghe entries for this film only; full branch schedules remain unverified.

- **竹北百老匯影城 (Hsinchu County, mapped pin `df48f3de96b1afc2`)**: The opened [@movies branch schedule](https://www.atmovies.com.tw/showtime/t03510/a35/) explicitly lists 2026-10-25 and was refreshed at 18:00. Transcribed 67 title/time entries. Its official booking page is template-only in browser text; halls and subtitles are not available in the readable source.

- **新月豪華影城 (Yilan, mapped pin `8f25580bc6455651`)**: The directly opened [@movies branch page](https://www.atmovies.com.tw/showtime/t03905/a39/) explicitly shows 2026-10-25 and refresh time 00:34. Transcribed 16 films / 73 times. The page lists runtime and Chinese version labels; no halls or subtitle languages.

## Map-pin schedule coverage update — 2026-10-25, 20:30 Taiwan time

A fresh scan of the saved date chunks now finds **11,021 total showtime rows**. The map has 92 location points: 63 point records have `cinema_id` links to 62 distinct cinema records, and 29 points are still unmatched. Of those 62 mapped cinemas, 52 have at least one schedule row in the indexed dates. Two of those 52 (鴻金寶麻吉影城 and 喜樂時代影城永和店) currently have only a verified 10/25 *Whalefall* sample, not a full branch schedule.

Ten mapped cinema records have no saved screening row across any date: three have closure evidence (喜樂時代桃園A19影城, 美麗新宏匯影城, 金門昇恆昌國賓影城); seven have no current schedule available in readable browser sources: 日日新大戲院, 龍祥百老匯影城, 威尼斯影城, 今日戲院, 總督大戲院, 環球中華影城, 喜樂時代影城南港店. Source checks and blocked/stale pages are described in the entries above; no rows were inferred from search snippets or image-only schedules.


## Follow-up dated schedule findings — 2026-10-25, 21:15 Taiwan time

These fresh reads supersede earlier notes above that described the source pages as stale, cached, or unreadable for 10/25. All five are linked to actual cinema map pins; Magic Hour is used as a clearly labeled aggregator because the operator pages did not expose readable current schedules.

- **喜樂時代影城南港店**: [Magic Hour dated schedule](https://showtimes.magichour.tw/cinema/cbe29efc0b6) now opens the complete 10/25 block (51 titles, 142 sessions). Audio labels are included when shown; hall and subtitle details are not.
- **日日新大戲院**: [Magic Hour dated schedule](https://showtimes.magichour.tw/cinema/cc8653b4e21) explicitly lists 10/25, 12 films, and 55 sessions. Sessions labeled after midnight are filed under 10/26.
- **威尼斯影城**: [Magic Hour dated schedule](https://showtimes.magichour.tw/cinema/cecda84e2cb) explicitly lists 10/25, 18 films, and 106 sessions. Sessions labeled after midnight are filed under 10/26.
- **總督大戲院**: [Magic Hour dated schedule](https://showtimes.magichour.tw/cinema/cf91204ef87) explicitly lists 10/25, four films, and ten sessions.
- **環球中華影城**: [Magic Hour dated schedule](https://showtimes.magichour.tw/cinema/c24719a2201) explicitly lists 10/25, 13 films, and 56 sessions.

The full repository schedule set now has **11,390 rows** across all saved dates. Of the 92 location points, 63 link to 62 unique cinema records; 57 of those 62 have at least one saved schedule. Two of the 57 (Hongjinbao and Yonghe) still have only a partial, single-film sample. Five mapped cinema records have no schedule rows: three have verified closure evidence (Taoyuan A19, Miramar Honghui, and Everrich Kinmen Ambassador); two remain operational-status unknown with no readable date-specific schedule found (龍祥百老匯影城 and 今日戲院).


## Follow-up dated schedule findings — 2026-10-25, 21:30 Taiwan time

- **龍祥百老匯影城公館店**: [Magic Hour dated schedule](https://showtimes.magichour.tw/cinema/c1099617e7e) explicitly labels 10/25 (Sunday), with 19 movie titles and 63 start times. All 63 are added to the Taipei 10/25 chunk and linked to existing movie catalog IDs. The page has no hall, format, audio, or subtitle details, so those fields remain unknown. The cinema is now marked active based on this dated schedule.
- A fresh search still found no date-specific schedule for **今日戲院**. The [operator's history page](https://www.cm-movie.com.tw/%E9%97%9C%E6%96%BC%E6%88%91%E5%80%91/) confirms that in March 2025 it shifted to a multipurpose cultural venue that retains selected film-festival screenings. That confirms the venue is in use, but provides no 10/25 film program; its regular cinema schedule status stays unknown and no daily screening rows were created. Magic Hour does not list it among current Tainan cinemas.

The full repository schedule set now has **11,453 rows**. Of 62 distinct map-linked cinema records, **58** have at least one saved schedule; two still have only a partial single-film sample (Hongjinbao and Yonghe). Four have no schedule rows: three have closure evidence (Taoyuan A19, Miramar Honghui, and Everrich Kinmen Ambassador), while **今日戲院** remains unverified.


## Map-linked branch schedule follow-up — 2026-10-25, 22:10 Taiwan time

- **喜樂時代影城永和店**: The directly opened [Moovie Time branch page](https://www.moovietime.com/cinemas/centuryasia-Beyond) explicitly labels 10/25 and lists 28 film titles / 72 start times. It was refreshed at 06:09. The aggregator says its schedule data comes from cinema websites, but the displayed page is still an aggregator. All 79 10/25 rows are saved. No hall, format, audio, or subtitle details are exposed.
- **新莊鴻金寶麻吉影城**: The directly opened [Moovie Time branch page](https://www.moovietime.com/cinemas/independent-machi) explicitly labels 10/25 and lists 9 film titles / 37 times. It was refreshed at 06:15. The 00:00 screenings are filed to 10/26; the existing Whalefall 00:00 row was retained, and the additional Other Mommy 00:00 row was added. No hall, format, audio, or subtitle details are exposed.
- These replace the earlier partial-only single-film samples in this document. The selected 10/26 query URLs continued to display the 10/25 schedule block in the readable browser output, so no future-day sessions were inferred from those pages. Existing saved dates for other cinemas remain in their date/city JSON chunks.
- The repository now contains **11,552 screening rows**. For the map's 62 distinct cinema records, **58** have at least one saved schedule. The four with no schedule rows are three with closure evidence (Taoyuan A19, Miramar Honghui, and Everrich Kinmen Ambassador) and **今日戲院**, a multipurpose cultural venue whose operator has not published a daily schedule for 10/25. There are no remaining mapped cinemas with only a single-film schedule sample.
- **Official Hongjinbao booking page check**: The opened [cinema booking page](https://fmmfilmmate.tixi.com.tw/) renders some specific halls and times (including late-night and 00:00 sessions), but its selected date was not visible in readable browser output. I did not use it to assign those sessions to 10/26 or another date. Moovie Time remains the date-explicit source for this import.

| 樂聲影城 | [Official schedule](https://www.luxcinema.com.tw/web/2020.php?type=ShowTimes) | Opened official page exposes the 2026-10-25 schedule block, Chinese/international titles, and times. Some sessions show XL/L category labels; per-session hall/audio/subtitle details are not consistently available in text. | 22 title/time sessions saved for 2026-10-25. The 00:xx times shown in the block were excluded; schedule date assignment was not inferred. |

| 新光天母影城 | [Moovie Time dated schedule](https://www.moovietime.com/cinemas/skcinemas-1005?date=2026-10-25) | The aggregator exposes a 2026-10-25 branch/date schedule and says its data comes from cinema websites; page refreshed 10/25 06:04. Direct @movies dated page was blank. Four sessions are explicitly labeled B.O.X. | 42 title/time entries saved; no audio, subtitles, or room numbers exposed.
| 新民生戲院 | [UDN report quoting the cinema announcement](https://travel.udn.com/travel/story/7160/9245406) | Report states the cinema announced it would end operations on 2026-01-31. Its @movies schedule page is stale (2025-05-20). | Marked closed; no schedule imported.

| 台南新光影城 | [@movies dated schedule](https://cdn.atmovies.com.tw/showtime/t06607/a06/20261025/) | Directly opened 2026-10-25 branch/date schedule; page shows runtime and explicit Japanese/Chinese versions for selected titles. Last update 2026/10/24 23:11. | 47 sessions saved. Audio language recorded only for explicitly labeled versions; no halls/subtitles shown. |

| 台中iFG遠雄廣場威秀影城 (原資料名：台中大魯閣新時代威秀影城) | [@movies dated branch schedule](https://origin.atmovies.com.tw/showtime/t04409/a04/20261025/) plus [official Vieshow branch details](https://www.vscinemas.com.tw/theater/detail.aspx?id=26) | @movies explicitly labels 2026-10-25 and refreshed at 21:19. Official Vieshow page confirms the current branch name, address, phone, company, and official schedule dates. | 67 sessions saved, reusing the existing cinema ID for the same address. Explicit Japanese/Chinese version labels retained; other audio/subtitle/hall details remain unknown. |

| 喜樂時代影城高雄總圖店 | [Magic Hour dated branch schedule](https://showtimes.magichour.tw/cinema/c38cef5102f) | Direct page labels 10/25 and 10/26 and shows title, time, and language labels. | 84 sessions saved for 10/25. Audio languages retained as explicitly listed; halls/subtitles unavailable. |

| 環球影城 (Kaohsiung) | [Magic Hour branch schedule](https://showtimes.magichour.tw/cinema/cebd06ef8c5) | Opened page shows a 2026-10-24 dated schedule with 18 titles and session times. No 10/25 block is published on the readable page. | Historical 10/24 rows not copied into the current-date chunk; awaiting a 10/25 dated source. |

| in89駁二電影院 | [Magic Hour dated branch schedule](https://showtimes.magichour.tw/cinema/c5a3e565853) | Direct page labels 10/25 and 10/26; lists titles, times, audio languages, and BOOM room where stated. | 43 sessions saved for 10/25. Halls/formats/subtitles remain unknown when absent. |

| 桃園統領威秀影城 | [@movies dated schedule](https://origin.atmovies.com.tw/showtime/t03308/a03/20261025/) | Exact 2026-10-25 page shows movie titles, times, and selected language-version labels; source update timestamp is 2026/10/22 15:43. | 109 sessions saved after matching catalog IDs; no audio/hall/subtitle facts were inferred. |


## Follow-up — 中影屏東影城 — 2026-10-25

- Opened [Magic Hour branch schedule](https://showtimes.magichour.tw/cinema/c31ca053fa7) directly. It explicitly labels 10/25 (Sunday), listing 19 film titles and 47 times.
- Saved 47 sessions under the Pingtung 2026-10-25 chunk, linked to existing catalog records. This is an aggregator source; no hall, format, audio, or subtitle details were exposed.


## Follow-up — 南台影城 — 2026-10-25

- Opened [Moovie Time branch schedule](https://www.moovietime.com/cinemas/independent-nantai) directly; it labels 10/25, refreshed at 06:15, with 11 film titles and 47 times. The source attributes its schedule data to cinema websites.
- The operator’s own [schedule page](https://www.nt-movie.com.tw/showtime.php) was opened too. It displays film and time blocks but its displayed dates are release dates, so only the date-explicit aggregator was used to assign 10/25. No halls, formats, audio, or subtitles were exposed in that dated page.
- Saved 47 10/25 sessions linked to existing catalog IDs.


## Follow-up — 桃園新光影城 — 2026-10-25

- Opened the [@movies exact branch/date schedule](https://www.atmovies.com.tw/showtime/t03315/a03/20261025/) directly. It explicitly labels 2026-10-25, shows an update timestamp of 2026/10/24 20:32, and lists 23 titles / 60 times.
- Compared each listed film with the existing catalog and saved 67 sessions using existing movie IDs. The page explicitly labels Japanese and Chinese versions of Poupelle 2; those audio labels were retained. Hall/subtitle details were not exposed.


## Follow-up — 桃園桃知道威秀影城 — 2026-10-25

- Opened the [Moovie Time branch schedule](https://www.moovietime.com/cinemas/vieshow-taoyuan-taiwanzhidao) directly. It explicitly labels 10/25, says refreshed at 06:23, and lists 10 films / 23 times; some times link to Vieshow.
- The exact-date @movies URL was also opened but its readable browser page exposed the date and refresh time without the screening list, so those unrendered rows were not used. No halls, formats, audio, or subtitles were exposed on the opened schedule.
- Saved 23 sessions linked to existing catalog movie IDs.


## Follow-up — 全美戲院 — 2026-10-25

- Opened the [Moovie Time branch schedule](https://www.moovietime.com/cinemas/independent-chuanmei) directly; it labels 10/25, refreshed at 06:15, and lists three titles/four times. The page states that schedules are collected from cinema websites.
- Saved 4 sessions with matched catalog IDs. The page does not expose hall, format, audio, or subtitle details.


## Follow-up — 高雄環球影城 — 2026-10-25

- Opened [Moovie Time branch schedule](https://www.moovietime.com/cinemas/independent-umovie) directly; it labels 10/25, refreshed 06:15, with 16 titles and 69 times. Some times link to the operator booking system.
- Saved 69 sessions linked to existing film catalog IDs. No halls, formats, audio, subtitles shown; only sessions exposed on the page were saved.


## Follow-up — 王牌映畫影城 — 2026-10-25

- Opened [Magic Hour branch schedule](https://showtimes.magichour.tw/cinema/cd3ef1e7e43) directly; it explicitly labels 10/25 with 27 film titles and 55 times.
- Saved 55 sessions; exact-title comparison reused existing catalog IDs, with 4 minimal title-only records added for titles absent from the catalog. No poster, genre, age rating, hall, format, audio, or subtitle facts were invented.


## Follow-up — 全球影城 — 2026-10-25

- Opened the [operator’s official current schedule](https://www.ucc-cinema.com.tw/product.html). It explicitly covers 10/23–10/29, including 10/25, and lists seven films with 47 showtimes; the same page gives the official English titles.
- Saved 47 10/25 sessions. Reused existing Toy Story 5 and Sew Torn catalog records; added 5 title records with only source-provided Chinese/English titles. No genres, age ratings, halls, audio, or subtitle facts were inferred.


## Follow-up — 時代戲院二館 — 2026-10-25

- Opened the operator’s [schedule page](https://www.timescinema.com.tw/times.php?pageNum_showtimes=0&showtimes=2178) directly. Its selected tab covers 10/24–10/26, and it lists five 2館 titles with 19 times and explicit hall labels.
- The official [location page](https://www.timescinema.com.tw/location.php) confirms 2館 is at 中山路339號3F–5F, matching the mapped cinema.
- Saved 19 10/25 sessions using existing movie IDs; the schedule page does not expose audio or subtitle details.


## Follow-up — 美麗新台茂影城 — 2026-10-25

- Opened [Magic Hour’s dated branch schedule](https://showtimes.magichour.tw/cinema/c51ff88ec90) directly; it labels 10/25 and lists 16 titles / 51 times.
- Saved explicit IMAX/Royal Hall labels and the listed Chinese/Japanese Poupelle versions; audio labels are only retained for explicit versions. No subtitles were listed. The page shows only a starting ticket price, not per-format prices, so it was not stored as a branch/format fare.
- Saved 51 sessions linked to existing movie catalog records.


## Follow-up — 日新大戲院 — 2026-10-25

- Opened [Moovie Time’s dated branch schedule](https://www.moovietime.com/cinemas/independent-ilan-rixin) directly. It gives the matching 17-1號 address, labels 10/25, refreshed at 06:15, and lists five films / 18 times.
- Saved 18 sessions linked to existing catalog IDs. No hall, format, audio, or subtitle details were exposed.


## Follow-up — 台北西門 in89 venue closure — 2026-10-25

- Opened the [CNA report quoting the official in89 notice](https://www.cna.com.tw/news/amov/202605200262.aspx); it states the Ximen venue closed 2026-05-31. The directly opened [@movies branch page](https://www.atmovies.com.tw/showtime/t02b12/a02/) also carries the closure announcement and says “No Showtime Data”.
- Two cinema-master records share this venue’s exact address (武昌街二段89號) and phone ((02)2331-5077), with distinct business registrations. Both records are marked closed because they identify the same physical location; the two rows are retained pending master-list cleanup.
- This closure is separate from the operating in89 branches elsewhere in Taiwan.


## Recount of the original 39 missing records — 2026-10-25

The “39” figure in the generated research list was from an earlier snapshot: 68 of 107 cinema-master records had any saved screening rows at that time. Recounting the current JSON by exact `cinema_id` gives **97/107 records with screenings on at least one indexed date** and **10/107 with no screening rows**. The repository currently has **12,715 screening rows total**, but only **11,909 rows reference one of the 107 exact master IDs**; another 806 rows use 19 IDs absent from the master and are excluded from cinema-record coverage pending matching. For 2026-10-25 specifically, 88 master records have matching screening rows; this is a date-specific count, while 97/107 is across all saved dates.

The 107 master rows are not 107 verified unique physical theaters. The source is a national cinema/company master, and some rows are legal-entity or legacy names for an already represented venue. The map has 92 OSM location points, another separate count. Do not compare either number to the 107 master rows without resolving point-to-venue matches. The research-list CSV and markdown have been refreshed with current per-record saved-row counts and source URLs; they still do not establish a complete physical-venue census.

The ten records without any schedule rows currently are:

| Record | Status | Finding |
|---|---|---|
| 金門昇恆昌國賓影城 | closed | Closure already documented in prior research. |
| 美麗新宏匯影城 | closed | Closure already documented in prior research. |
| 映捌玖數位影城有限公司 | closed | Closure already documented in prior research. |
| 新民生戲院 | closed | Closure already documented in prior research. |
| in89豪華數位影城 (Ximen) | closed | Official closure dated 2026-05-31; two same-address registrations remain separate pending master cleanup. |
| 喜樂時代桃園A19影城 | closed | Closure already documented in prior research. |
| 今日戲院 | unknown / cultural venue | Operator says it shifted in March 2025 to a mixed cultural venue that retains selected festival screenings; no daily/date-specific 2026-10-25 schedule found. [Operator history](https://www.cm-movie.com.tw/%E9%97%9C%E6%96%BC%E6%88%91%E5%80%91/) |
| 麻豆戲院 | unknown / date missing | @movies exposes a 2026-10-24 schedule refreshed 2026-10-24 16:00, but no 2026-10-25 schedule was found. Do not copy Saturday times to Sunday. [Dated source](https://www.atmovies.com.tw/showtime/t06625/a06/20261024/) |
| 國元影業股份有限公司 | unknown / duplicate registration | Its registered address is 長春路176號, the same physical site as 台北長春國賓影城; screenings are already recorded under the venue name. Do not duplicate the same program under this company-only row. [Registry record](https://serv.gcis.nat.gov.tw/pub/cmpy/reportAction.do?fileName=379100000Gchange11409.pdf&method=report&reportClass=cmpyCity&subPath=11409) · [@movies venue directory](https://www.atmovies.com.tw/showtime/a02/) |
| 龍子電影事業股份有限公司（首都戲院） | unknown / possible same-building legacy entry | MOC records 首都戲院 at 長安東路二段219號2樓; current sources publish schedules for 總督影城 at the same building, on different floors. No independently attributable 2026-10-25 schedule for this legal-entity row found. Keep separate until a source confirms it is the same operating venue. [MOC venue record](https://file.moc.gov.tw/Download.ashx?n=5ZyL54mH6Zmi57ea5pig5ryU5aC05omA5Y%2BK5q%2BP5pel5pig5ryU542O5Yu15LiK6ZmQ6YeR6aGN6KGoKDExMC4xMS4zMOeJiCkucGRm&u=LzAwMS9VcGxvYWRfT2xkRmlsZXMvQWRtaW5VcGxvYWRzL2ZpbGVzLzIwMjIwMi82ZDhhOTNmZS1mMWZlLTQ1MjItYTJjMi1lMDUxZjIzMTU5MzgucGRm) · [Governor Cinema schedule source](https://www.atmovies.com.tw/showtime/t02a05/a02/20261024/) |

No extra schedule rows were added from these checks: the only dated schedule found for 麻豆戲院 is for 10/24, and the other results were either a duplicate venue program, an occasional-event cultural venue, closures, or schedules for a different hall/site entry. This section supersedes older 68/39 counts above.

## Live nationwide coverage audit and browser collection — 2026-10-27

There is no single public schedule API or database covering every Taiwan cinema brand. The official ShowTimes bootstrap endpoint is active from the manual research environment but represents 秀泰 only. It returned 2,152 active events, across 15 branches in 10 cities, dated 2026-10-27 through 2026-12-22. The GitHub Actions runner still receives HTTP 403 for this endpoint, so this is a manual snapshot and not a per-visitor API request.

I opened all 15 ShowTimes branch schedule pages sequentially in the browser. Thirteen rendered schedules on the first wait; 台北欣欣秀泰影城 and 大巨蛋秀泰影城 required a longer wait. The official bootstrap data was matched to each BAMID cinema by branch name and address; all 15 matches were unique. The feed supplies film title, international title, format, audio, room, runtime, age rating, genre, and poster where available. It does not publish subtitle languages; those remain unknown.

| ShowTimes branch | City | Sessions | Official branch page |
|---|---|---:|---|
| 大巨蛋秀泰影城 | Taipei | 176 | [page](https://www.showtimes.com.tw/cinemas/91/) |
| 台北欣欣秀泰影城 | Taipei | 194 | [page](https://www.showtimes.com.tw/cinemas/2/) |
| 土城秀泰影城 | New Taipei | 136 | [page](https://www.showtimes.com.tw/cinemas/55/) |
| 樹林秀泰影城 | New Taipei | 160 | [page](https://www.showtimes.com.tw/cinemas/54/) |
| 台中站前秀泰影城 | Taichung | 245 | [page](https://www.showtimes.com.tw/cinemas/53/) |
| 台中文心秀泰影城 | Taichung | 229 | [page](https://www.showtimes.com.tw/cinemas/56/) |
| 台中麗寶秀泰影城 | Taichung | 112 | [page](https://www.showtimes.com.tw/cinemas/59/) |
| 嘉義秀泰影城 | Chiayi City | 143 | [page](https://www.showtimes.com.tw/cinemas/9/) |
| 基隆秀泰影城 | Keelung | 97 | [page](https://www.showtimes.com.tw/cinemas/5/) |
| 花蓮秀泰影城 | Hualien | 151 | [page](https://www.showtimes.com.tw/cinemas/3/) |
| 台東秀泰影城 | Taitung | 82 | [page](https://www.showtimes.com.tw/cinemas/7/) |
| 北港秀泰影城 | Yunlin | 46 | [page](https://www.showtimes.com.tw/cinemas/58/) |
| 台南仁德秀泰影城 | Tainan | 50 | [page](https://www.showtimes.com.tw/cinemas/60/) |
| 高雄岡山秀泰影城 | Kaohsiung | 162 | [page](https://www.showtimes.com.tw/cinemas/84/) |
| 高雄夢時代秀泰影城 | Kaohsiung | 169 | [page](https://www.showtimes.com.tw/cinemas/87/) |

VieShow's official theater directory listed 20 branch pages with schedules. I opened each branch page one at a time in the browser and read its date tabs and schedule blocks. The pages supplied 2,774 sessions dated 2026-10-27 through 2026-12-16. They expose Chinese and international titles, time, format, explicit audio label, and a booking-session ID on most rows; hall numbers and subtitle languages are not shown. 67 otherwise complete schedule rows did not include a booking-session ID, so they received a stable local row ID based on cinema, date, title, time, and format. The importer preserves distinct VieShow session IDs when a cinema publishes the same title/time/format more than once; that can happen when the public page omits hall numbers.

| VieShow branch | City | Sessions | Official branch page |
|---|---|---:|---|
| 台北信義威秀影城 | Taipei | 223 | [page](https://www.vscinemas.com.tw/theater/detail.aspx?id=1) |
| 台北南港LaLaport威秀影城 | Taipei | 233 | [page](https://www.vscinemas.com.tw/theater/detail.aspx?id=34) |
| 台北京站威秀影城 | Taipei | 135 | [page](https://www.vscinemas.com.tw/theater/detail.aspx?id=2) |
| 台北西門威秀影城 | Taipei | 144 | [page](https://www.vscinemas.com.tw/theater/detail.aspx?id=31) |
| 新店裕隆城威秀影城 | New Taipei | 182 | [page](https://www.vscinemas.com.tw/theater/detail.aspx?id=28) |
| 板橋大遠百威秀影城 | New Taipei | 123 | [page](https://www.vscinemas.com.tw/theater/detail.aspx?id=4) |
| 中和環球威秀影城 | New Taipei | 129 | [page](https://www.vscinemas.com.tw/theater/detail.aspx?id=25) |
| 林口MITSUI OUTLET PARK威秀影城 | New Taipei | 133 | [page](https://www.vscinemas.com.tw/theater/detail.aspx?id=5) |
| 桃園統領威秀影城 | Taoyuan | 254 | [page](https://www.vscinemas.com.tw/theater/detail.aspx?id=20) |
| 桃園桃知道威秀影城 | Taoyuan | 45 | [page](https://www.vscinemas.com.tw/theater/detail.aspx?id=29) |
| 新竹大遠百威秀影城 | Hsinchu City | 145 | [page](https://www.vscinemas.com.tw/theater/detail.aspx?id=7) |
| 新竹巨城威秀影城 | Hsinchu City | 38 | [page](https://www.vscinemas.com.tw/theater/detail.aspx?id=9) |
| 頭份尚順威秀影城 | Miaoli | 99 | [page](https://www.vscinemas.com.tw/theater/detail.aspx?id=10) |
| 台中大遠百威秀影城 | Taichung | 40 | [page](https://www.vscinemas.com.tw/theater/detail.aspx?id=11) |
| 台中iFG 遠雄廣場威秀影城 | Taichung | 121 | [page](https://www.vscinemas.com.tw/theater/detail.aspx?id=26) |
| 台南大遠百威秀影城 | Tainan | 132 | [page](https://www.vscinemas.com.tw/theater/detail.aspx?id=15) |
| 台南FOCUS 威秀影城 | Tainan | 106 | [page](https://www.vscinemas.com.tw/theater/detail.aspx?id=22) |
| 台南南紡威秀影城 | Tainan | 190 | [page](https://www.vscinemas.com.tw/theater/detail.aspx?id=16) |
| 高雄大遠百威秀影城 | Kaohsiung | 242 | [page](https://www.vscinemas.com.tw/theater/detail.aspx?id=18) |
| 花蓮新天堂樂園威秀影城 | Hualien | 60 | [page](https://www.vscinemas.com.tw/theater/detail.aspx?id=21) |

The two manual imports are normalized into small date/city JSON chunks and one deduplicated movie catalog. The site visitor does not fetch either upstream source. Current future schedules are present in 15 of Taiwan's 22 city/county areas; Hsinchu County, Nantou, Chiayi County, Yilan, Penghu, Kinmen, and Lienchiang currently have no future indexed rows. That gap means no verified data is saved from the connected feeds; it does not mean those cities or cinemas are closed. Fifty of the 107 BAMID records currently have future schedule rows; unmatched external venue IDs remain separately identified rather than guessed into the master.


## Movie poster coverage — 2026-10-27

I checked the newly added movie catalog records against the previous catalog revision. Twenty-one new records had no poster URL. I opened the matching official VieShow film or event page for each record and took the poster image URL linked on that page. The URLs point to VieShow's Unicorn Popcorn image host; no image bytes were copied into the repository. Each `movie_id`, poster URL, source page, and review date is recorded in `data/research/movie-posters.json`, and the URL is stored once on its movie record in `data/movies/index.json`.

All 21 missing poster links are now filled. The catalog has 88 records with posters and 80 distinct poster URLs; repeated poster links remain shared.

## Empty map venues: current dated browser research — 2026-10-27

- **台鋁影城 (Kaohsiung, `785b0aaafc496ce0`)**: [Official ticketing schedule](https://booking.mldcinema.com/Browsing/QuickTickets/Compare) now exposes dated Oct 27 and Oct 28 blocks. Saved 19 visible sessions for Oct 27 and 48 for Oct 28. Page extraction exposes title/date/time and, for titles prefixed 中/日/英 on Oct 28, explicit audio versions; it does not expose halls, format, or subtitles. Only the rows visible in the official page's date blocks were imported.
- **南投戲院 (Nantou, `40b1b5887858aded`)**: [Official Oct 27 schedule](https://nantoutheater.com/showings?date=2026-10-27&range=all) and [Oct 28 schedule](https://nantoutheater.com/showings?date=2026-10-28&range=all) explicitly show dates, titles, times, and halls. Saved 7 sessions on Oct 27 and 18 on Oct 28. Movie detail panels show runtimes and release dates; no audio, projection format, or subtitles were listed.
- **山明電影院 (Nantou, `5a8e854557da8367`)**: [Official schedule index](https://www.shanmingcinema.com.tw/showtimes.php) links to 13 film pages. The detail pages explicitly state Oct 23–28 validity and list times and halls. Saved 29 screenings each for Oct 27 and Oct 28; source labels Digital, includes runtime and Taiwan rating, but does not state audio or subtitles.

All entries above use existing movie catalog IDs; unknown source details remain absent. The collection below adds further map venues, but does not establish coverage for all pins.
- **美麗新大直皇家影城 (Taipei, `58aceabee919fb31`)**: [Magic Hour dated listing](https://showtimes.magichour.tw/cinema/c1664dd57a1) is an aggregator, not an official source. It explicitly lists 11 titles, exact times, and the Royal Hall for both Oct 27 and Oct 28; the Chimney Town entry explicitly says Japanese audio. Saved 45 sessions per date. Subtitle details are not listed.
- **日日新大戲院 (Taichung, `84c8a585cab096b5`)**: [Magic Hour dated listing](https://showtimes.magichour.tw/cinema/cc8653b4e21) is an aggregator. The Oct 27 page explicitly lists 12 titles and 55 start times; seven marked “隔日” were stored on Oct 28 Taiwan time. One title explicitly labels its Chinese audio version. Hall and subtitle details are absent.
- **豐原in89豪華影城 (Taichung, `7f9f49b0f891b19e`)**: [Magic Hour dated listing](https://showtimes.magichour.tw/cinema/c244ae65409) is an aggregator and explicitly lists identical Oct 27 and Oct 28 schedules. Imported its time and explicit audio labels, plus BOOM Hall where stated. The Chiikawa entry's title says 國語版 while its audio label says 日語, so that session's audio remains unknown. Subtitle details are not listed.
- **哈拉影城 (Taipei, `14904f55b4c30ea4`)**: [Official Hala schedule](https://halarcity.com.tw/Browsing/Cinemas/Details/0000000001) groups movie titles and exact times under explicit dates. Imported only visible Oct 27 and Oct 28 sessions. Audio is recorded only for versions explicitly tagged Chinese or Japanese in the title; the page extraction does not provide hall or subtitle details.
- **喜樂時代影城今日店 (Taipei, `7b209adf3838f023`)**: [Official Century Asia ticket page](https://ximen.centuryasia.com.tw/ticket_online.aspx) pages 1–3 expose dated titles and showtimes, halls/floors, digital/audio labels, runtime and ratings. Imported only entries explicitly scheduled on Oct 27 or Oct 28; source lists no subtitles.
- **星橋國際影城 (Taoyuan, `8a2c78238c246672`)**: [Official SBC Cinema branch schedule](https://www.sbcmovies.com.tw/browsing/Cinemas/Details/1001) explicitly groups movies and times by Oct 27 and Oct 28. Imported those date-specific rows; only Chi-/Fr-/Jap- title labels are treated as audio versions. The page did not expose halls, formats, or subtitles.
- **親親大戲院 (Taichung, `18ed2c265bbcc977`)**: [Official showtime page](https://www.ccmovie.com.tw/product.php?_path=product_showtimes) explicitly lists Oct 27 and Oct 28 movie/time/version rows. Hall icons map to the hall labels printed in the page legend. Imported the date-listed rows with 2D and audio labels; source does not list subtitles. Midnight times remain on the official date block.
- **台中新光影城 (Taichung, `9598ae26696bb28a`)**: [Oct 27](https://twshowtimes.com/cinemas/skcinemas-taichung/2026-10-27/) and [Oct 28](https://twshowtimes.com/cinemas/skcinemas-taichung/2026-10-28/) pages from 場次通 are an aggregator, not the cinema operator. They show dated title lists, times, formats, selected audio versions, runtime and ratings. Imported all visible Oct 27/28 screenings; halls and subtitle languages are not shown.
- **台北獅子林新光影城 (Taipei, `4fa2390a26e73a65`)**: [Daily Showtimes aggregator](https://xn--i0yt6h0rn.tw/movie/2026/10/27) is not the operator. The live Oct 27 movie-by-cinema listing groups six titles under this venue with nine exact times. Saved only those date/title/time rows; no hall, audio, version, or subtitle information was exposed.

- **天台戲院 (New Taipei, `47df5fba03472430`)**: [Daily Showtimes theater page](https://xn--i0yt6h0rn.tw/movie/theater/%E5%A4%A9%E5%8F%B0%E6%88%B2%E9%99%A2) is a third-party aggregator. Its 10/27 block lists eight titles and 25 times, with a language label for each title version. Added those exact date-bound rows; the page does not expose hall, projection format, or subtitle details.


### Mapped-cinema gap count after the Oct 27 import

The map dataset has 62 unique cinema IDs. After adding the date-verified 10/27 screenings above, 55 mapped cinemas have at least one saved screening dated 10/27 or later; 7 mapped cinema IDs still have no saved row for that range. Three of those have closure evidence in the earlier audit (桃園A19, 美麗新宏匯, and 金門昇恆昌國賓). The other 4 active venues need a readable, date-specific source or a verified venue match. A listing in an aggregator is only a lead until its venue identity and title/time block are checked; for example, the aggregator's 微風影城 name is not automatically interchangeable with the map's 國賓影城@微風廣場.

- **景美佳佳戲院 (Taipei, `ca71a7fc4415892a`)**: [AtMovies page for Oct 27](https://origin.atmovies.com.tw/showtime/t02f05/a02/20261027/) confirms the date, address, and phone, but the schedule body links only to a generic `quickSelect02.png` placeholder rather than a readable schedule. No screening rows were imported; this page is recorded as image-only/unavailable for transcription.

- **金獅影城 (Kinmen, `1564a49f71c52c4a`)**: [Magic Hour branch page](https://showtimes.magichour.tw/cinema/c07dc93d40f), freshly opened on 2026-10-27, has an explicit 10/27 heading with 12 titles and 25 times. Added those rows using existing movie IDs. The aggregator shows no hall, format, audio, or subtitle fields. The operator has announced closure after 10/31; this snapshot is kept date-bound.

- **總督影城 (Taipei, `b11ec81197b97388`)**: [Magic Hour branch page](https://showtimes.magichour.tw/cinema/cf91204ef87), directly opened on 2026-10-27, gives the matching address and a 10/27 schedule with three titles and six times. Added those rows using existing movie IDs. Hall, format, audio, and subtitle fields are not listed.

- **百老匯公館店 (taipei, `8e09faf24bf0485d`)**: [Daily Showtimes theater page](https://xn--i0yt6h0rn.tw/movie/theater/%E7%99%BE%E8%80%81%E5%8C%AF%E5%85%AC%E9%A4%A8%E5%BA%97) is a third-party aggregator, directly reviewed on 2026-10-27.  The Oct 27 movie list gives 19 titles and 63 exact start times with digital/audio labels where shown. Imported date-bound rows using existing movie records. No halls or subtitles are listed. Added only that date’s explicit title/time rows with existing movie IDs; unknown hall and subtitle details remain absent.

- **百老匯竹北店 (hsinchu-county, `df48f3de96b1afc2`)**: [Daily Showtimes theater page](https://xn--i0yt6h0rn.tw/movie/theater/%E7%99%BE%E8%80%81%E5%8C%AF%E7%AB%B9%E5%8C%97%E5%BA%97) is a third-party aggregator, directly reviewed on 2026-10-27.  The Oct 27 listing shows 19 titles and 61 exact starts, with digital and audio labels where shown. Address matches the mapped Zhubei Broadway branch. No halls or subtitles are listed. Added only that date’s explicit title/time rows with existing movie IDs; unknown hall and subtitle details remain absent.

- **鴻金寶麻吉影城 (new-taipei, `a15851ac9eeccb48`)**: [Daily Showtimes theater page](https://xn--i0yt6h0rn.tw/movie/theater/%E9%B4%BB%E9%87%91%E5%AF%B6%E9%BA%BB%E5%90%89%E5%BD%B1%E5%9F%8E) is a third-party aggregator, directly reviewed on 2026-10-27.  It shows the matching Xinzhuang address and 9 film titles with 35 Oct 27 starts; the page explicitly labels 2D and the Sumikko Chinese audio version. Hall and subtitles are not listed. Added only that date’s explicit title/time rows with existing movie IDs; unknown hall and subtitle details remain absent.

- **新月豪華影城 (yilan, `8f25580bc6455651`)**: [Daily Showtimes theater page](https://xn--i0yt6h0rn.tw/movie/theater/%E6%96%B0%E6%9C%88%E8%B1%AA%E8%8F%AF%E5%BD%B1%E5%9F%8E) is a third-party aggregator, directly reviewed on 2026-10-27.  Its 10/27 date blocks list 16 titles and their visible times; language is recorded only for the Chinese-dubbed films explicitly labeled on the page. No hall, projection format, or subtitle fields are listed. Added only that date’s explicit title/time rows with existing movie IDs; unknown hall and subtitle details remain absent.

- **威尼斯影城 (taoyuan, `a07e94ac5664ad37`)**: [Magic Hour schedule](https://showtimes.magichour.tw/cinema/cecda84e2cb) is a third-party aggregator, directly opened and reviewed on 2026-10-27. Magic Hour third-party schedule, opened 2026-10-27; exact 10/27 date block; 18 titles and 106 starts. 00:xx entries explicitly marked 隔日 were assigned to Taiwan date 10/28. No hall, format, audio, or subtitle details were listed. Imported only exact visible 10/27 rows; no unlisted room, audio, format, or subtitle details were inferred.

- **環球中華影城 (yunlin, `c697fdf332cf0850`)**: [Magic Hour schedule](https://showtimes.magichour.tw/cinema/c24719a2201) is a third-party aggregator, directly opened and reviewed on 2026-10-27. Magic Hour third-party schedule, opened 2026-10-27; exact 10/27 date block lists 13 titles and 56 starts. No hall, format, audio, or subtitle labels. Imported only exact visible 10/27 rows; no unlisted room, audio, format, or subtitle details were inferred.

- **員林電影城 (changhua, `5130fcc97b11b16d`)**: [Magic Hour schedule](https://showtimes.magichour.tw/cinema/c60a4447b7b) is a third-party aggregator, directly opened and reviewed on 2026-10-27. Magic Hour third-party schedule, opened 2026-10-27; exact 10/27 date block lists six titles and 24 starts. County and theater name match the mapped Yuanlin venue; no hall, format, audio, or subtitle details. Imported only exact visible 10/27 rows; no unlisted room, audio, format, or subtitle details were inferred.

- **嘉年華影城 (chiayi-city, `e20ff150d90cfea0`)**: [Magic Hour schedule](https://showtimes.magichour.tw/cinema/cf79b446e05) is a third-party aggregator, directly opened and reviewed on 2026-10-27. Magic Hour third-party schedule, opened 2026-10-27; exact 10/27 date block lists 17 titles and 73 starts. City/name match the mapped Chiayi venue; no hall, format, audio, or subtitle details. Imported only exact visible 10/27 rows; no unlisted room, audio, format, or subtitle details were inferred.

- **喜樂時代影城南港店 (Taipei, `ffc2e1b99a630f3d`)**: [Magic Hour branch page](https://showtimes.magichour.tw/cinema/cbe29efc0b6) is a third-party aggregator directly reviewed on 2026-10-27. It labels the 10/27 schedule and lists 51 titles. I linked 39 titles to unique existing catalog records and saved 130 sessions, retaining explicitly shown audio-language labels. Twelve titles have no unique existing catalog match and were not given guessed movie IDs; hall and subtitles are not listed.


### Follow-up checks on remaining empty map pins (2026-10-27)

- **今日戲院**: reopened the [operator's venue history page](https://www.cm-movie.com.tw/%E9%97%9C%E6%96%BC%E6%88%91%E5%80%91/). It describes a 2025 transition to a multipurpose cultural space and provides the address, but no dated current film program. No rows imported.
- **景美佳佳戲院**: reopened the dated [AtMovies listing](https://origin.atmovies.com.tw/showtime/t02f05/a02/20261027/). Its schedule body is a generic image placeholder, so there are no readable title/time pairs to transcribe.
- **喜樂時代影城永和店**: opened the [10/27 Moovie Time selector](https://www.moovietime.com/cinemas/centuryasia-Beyond?date=2026-10-27). It still reports a 10/25 06:09 refresh and shows the same list as 10/25; I treated it as stale and imported no 10/27 rows. The time links go to the operator, but its page did not render a readable schedule in this browser.
- **國賓影城@微風廣場 map pin**: the [dated AtMovies page](https://origin.atmovies.com.tw/showtime/t02a03/a02/20261027/) confirms the exact mapped address and phone, but its schedule is an image placeholder. The linked [official TIXI booking page](https://breezecinemas.tixi.com.tw/Home/) shows titles, halls, audio labels and times without a readable selected date. No dated rows imported. The current source identifies the venue as 微風影城, while the map pin still has the old 國賓 name.

After this batch, **55 of 62 mapped cinema IDs have at least one saved row on or after 2026-10-27**. The 7 remaining pins include 3 closed locations and the 4 active pins listed above. This is pin coverage for saved dates, not a claim that all Taiwan schedules are available.
