# Decompiled APK Analysis: Movies, TV/Series, Shorts, Live TV, Downloads & Related Flows

**Source**: Full jadx decompile at `/Users/thomaschansa/Downloads/movieboc/apk-decoded/jadx-out/sources/com/transsion/` (and com/transsnet for downloader parts).  
Extracted from original APK `com.community.mbox.in` v3.0.08.0911.03 (Transsion/OneRoom rebrand).  
Cross-referenced with existing summaries: `APK-CLASSES.md` (130+ endpoints + beans), `APK_FEATURE_MAP.md` (enums, tabs, providers), `APK-ANALYSIS.md` (architecture, signing, streams).  
Date of analysis: 2026-06-12 (current session).

This document drills into the decompiled classes for content discovery, playback, and download flows. It maps directly to the Cloudflare Worker (`moviebox-worker.js`) routes, signing, proxy logic, and frontend (Next.js + StreamPlayer, use* hooks, normalizers in `lib/api.ts` + types).

The app uses a **unified `Subject` model** (subjectType-driven) for movies (1), TV/series (2), shorts/anime (7), etc. Most flows go through subject-api + videodetail for play/streams. Home/tabs use operate data. Downloads center on resourceDetectors + resource API. Signing (HMAC via GatewaySignManager/Interceptor) and `host` param (for backend selection among api*.aoneroom.com) apply universally.

## 1. Core Content Model (Subject + Related Beans)
From `moviedetailapi/bean/Subject.java` and shared in shorttv/bean, etc. (55+ fields, @SerializedName for JSON).

**Key Fields** (common across movies/TV/shorts):
- `subjectId`, `subjectType` (1=Movie, 2=TV, 3=VSHOW, 4=AUDIO, 5=EDUCATION, 6=MUSIC, 7=SHORT_TV/Anime, 9=SPORT, 0=All).
- `title`, `aka`, `description`, `genre` (comma string), `tags` (List), `countryName`, `language`, `contentRating`, `corner` (lang badge e.g. "English" for filtering), `releaseDate`, `duration` + `durationSeconds`.
- Media: `cover` (Cover), `stills` (Cover), `preVideoAddress` (PreVideoAddress list for previews/trailers), `trailer` (Trailer with VideoAddress).
- People: `staffList` (List<Staff> with staffType 1=actor/2=director, name, avatar, character).
- Engagement: `wantToSeeCount`, `likeStatus`, `seenStatus`, `mySeeTime`.
- Flags: `hasResource` (boolean), `builtIn`, `deleted`, `restrictLevel`, `coinPerEp`, `unlockedEps`.
- Series/Shorts: `series` (transient), `seNum`, `season`, `totalEpisode`.
- Play/Download: `playUrl` (PlayUrl), `download` (SubjectDl), `resourceDetectors` (List<ResourceDetectors> — **critical for downloads/stream sources**), `dubs` (List<DubsInfo>), `subtitles` (raw or list).
- Other: `gameInfo` (SubjectGameInfo), `explains` (List), `ops` (String for operations), `postTitle`, `favInfo` (for shorts), `firstEp` (ShortTVItem).

**Supporting Enums/Types** (`moviedetailapi/`):
- `SubjectType.java`: As above.
- `SeenStatus.java`, `StaffType.java`, `PlayUrlType.java`, `MediaType.java`, etc.

**ResourceDetectors** (core for quality/source selection + downloads; from `moviedetailapi/bean/ResourceDetectors.java` and shorttv equivalents):
- `type` (0=single?, 1=collection?), `source`, `resourceId`, `resourceLink`, `downloadUrl`, `totalSize`/`firstSize`, `uploadBy`/`uploadTime`, `postId`.
- `resolutionList`: List<DownloadItem> or ResolutionItem (resolution, resourceLink, epNum?).
- `extSubtitle`: List<SubtitleItem> (id, lan, lanName, url, size, delay, season, episode, type, fileId, isOpenSubNewApi).
- `totalEpisode`.
- Helpers in decompile: `isSingleResource()`, `isMultiResolution()`, `isCollection()`.

**Season/Episode**:
- `ResourcesSeasonList` (subjectType, seasons: List<ResourcesSeason>).
- `ResourcesSeason`: `se`, `maxEp`, `allEp` (comma list?), `resolutions` (List<ResolutionItem> with resolution, epNum), `isSelected`.
- For shorts: `ShortTvInfoEpisodeList` (pager, items: List<ShortTVItem>, info: Subject, start/endPosition transient).

**Play/Stream** (videodetail/bean/):
- `VideoDetailStreamList`: `streams` (List<VideoDetailStream>), `se`, `ep`, `title`.
- `VideoDetailStream`: `format` (DASH/HLS/MP4), `id`, `url`, `resolutions`, `size`, `duration`, `signCookie` (CloudFront: Policy, Signature, Key-Pair-Id), `extCaptions` (List<ExtCaption> with lan/lanName/url/size/delay/season/episode).

**Search/Home Shared**:
- `SearchWorkEntity`, `SearchResultEntity`, `SearchSuggestEntity`, `HotSubjectEntity`.
- `MainOperateData`, `OperateItem` (title, type, subjects, customData, playListData, feedsSubject, rankings, liveList, gameList, groups, md5 — used for home sections, recs).
- `AppTab` (bottomTabs, homeTabs, version).
- `LiveListItem`, `RoomBean`/`RoomItem` (for live/rooms integration).

**Other**:
- `DubsInfoData`/`DubsInfo`, `SubtitleItem`/`SubtitleListBean`, `Trailer`, `PlayUrl`, `Cover`/`Image`, `Staff`, `DownloadListBean` (for /resource responses: resourceList with resourceId/resolution/format/size/episode/season/shareUrl), `StartDownloadBean`/`StartDownloadResponseBean` (for start/finish), `ShortTVItem`/`ShortTVRespData`/`ShortTVFavInfo`.

## 2. Discovery & Home Flows (Movies/TV/Series/Shorts/Live)
- **Tabs/Navigation** (from FEATURE_MAP + decompile):
  - BottomTabType: HOME, SHORT_TV ("SHORTTV"), DOWNLOADS, PREMIUM, ME, SPORTS_LIVE, LIVE (NOVEL?), etc.
  - HomeTabId: 1=Trending, 2=Movie, 3=Education, 4=Music, 5=TVShow, 6=Apps, 7=ShortTV, 8=Animation, 9=Midnight, 10=AD, 11=Game, 12=MusicOperate, 13=ShortTVDiscover, + live/sports.
  - Home sections via PostItemType (SUBJECT rows, OP_RANKING, BANNER, PLAY_LIST, GRID_SUBJECT, SPORT_LIVE, SINGLE_IMAGE, etc.) + providers (SubjectItemProvider, OpMovieRankProvider, SportLiveProvider, PlayListProvider).

- **Search** (search/net/a.java + subject-api):
  - POST /wefeed-mobile-bff/subject-api/search (keyword, page, perPage, subjectType, resultMode; host).
  - POST /search/v2.
  - GET /search-suggest (keyword, perPage, resultMode).
  - GET /search-rank/v2 (everyoneSearch, room).
  - Returns SearchWorkEntity / SearchResultEntity / HotSubjectEntity (items as Subject list + pager).
  - Also group search/join.

- **Home/Feeds** (tab-operating, home, recs):
  - GET /tab-operating (host, tabId, version, page) → MainOperateData / SubOperateData (items as OperateItem with subjects/playListData etc.).
  - GET /subject-api/homepage?tabId=... (fanout via seeds in worker for English).
  - POST /detail-rec, /top-rec, /play-related-rec, /daily-movie-rec, /widget, /trending/v2, /want-to-see, /have-seen (host + body).
  - POST /bottom-tab (for nav config).

- **Movies**:
  - SubjectType=1. Detail via MovieDetailViewModel/MovieDetailFragment (header with info/trailer/stills/staff, ForYou recs, Hot, ResourceDetector for downloads).
  - Preload: MovieDetailResourcesSeasonLoader (but movies often direct), MovieDetailDownloadListLoader.
  - Recs, wantToSee, staff (MovieStaffActivity/ViewModel).

- **TV / Series**:
  - SubjectType=2. Same Subject model + seNum, series flag.
  - Season select: VideoDetailSeasonsSelectFragment, ResourcesSeasonList loader.
  - Episode list/selection: VideoDetailAllEpisodesFragment, episode adapters.
  - Play with se/ep params.
  - Detail similar to movies but with season/ep tabs.

- **Shorts (ShortTV / Mini-series / Anime, Type=7)**:
  - Dedicated `shorttv/` package (very complete TikTok-style).
  - Trending: ShortTvViewModel.getShortTVTrending() → POST /shorts/most-trending (host + body with page/perPage) → ShortTVRespData (list ShortTVItem).
  - Favorites: getShortTVFavoriteList, DB (ShortTvFavoriteDao), ShortTVFavoriteActivity/Fragment.
  - Detail: ShortTvDetailListFragment, ShortTvViewModel.getShortTvEpisodes / getShortTvEpisodesInfo → ShortTvInfoEpisodeList (mini episodes rail).
  - Dub: getShortTVDubInfo → /shorts/dub-info.
  - Captions: subtitle/ manager, get-mini-captions.
  - Discover, op (appointment/ranking/custom via OperateItem), banner, header views.
  - History/save, trailer.
  - UI heavy: adapters (trending, op ranking/appointment/custom, header, favorite provider), dialogs (episode list, language, download res), widgets (video item, progress gesture, banner, category, op views).
  - DB + MMKV for state.

- **Live TV / Sports**:
  - Tabs: SPORTS_LIVE, LIVE (in BottomTabType/HomeTabId).
  - Home trending: SportLiveProvider + SportLiveAdapter (in home/adapter/trending).
  - Beans: LiveListItem, RoomBean/RoomItem/RoomFilter (live rooms integration? RoomTabType).
  - In shorttv/home beans too.
  - Likely streams via same play-info (with live-specific subjectType or flags). Rooms for social live viewing (RoomViewModel, create/join, subjectId tied).
  - No heavy dedicated "live" package surfaced in quick drill; integrated into home/tabs + room features. Sports may use same as liveList in OperateItem.

## 3. Play / Stream / Media Flows (Common + Specific)
- **Core**: subject-api/play-info (subjectId, se, ep, host) → BaseDto<VideoDetailStreamList>.
  - Returns streams (DASH primary with HEVC, HLS fallback, MP4 direct) + resourceDetectors.
  - VideoDetailStream: format, url (MPD/M3U3), signCookie (for CloudFront), extCaptions, size/duration/resolutions.
- **Episode/Season**: season-info (subjectId, host) → ResourcesSeasonList (for TV/series/shorts episodes).
  - Then play-info per se/ep.
- **Player** (com/transsion/player + videodetail + float):
  - ExoPlayer (ORExoPlayer), AliPlayer (TnAliPlayer), dash.js + HEVC (libmedia3ext.so + FFmpeg libs + WASM hevc-decode for web fallback).
  - Float player (videofloat), PiP, background, gestures, ad integration, media session.
  - StreamDetailActivity/Fragment, episode/audio selectors, float manager (save history, getPlayInfo).
  - Music sub-flows (separate likes/downloads for audio).
- **Subtitles/Captions**:
  - get-ext-captions (subjectId, resourceId, episode, host) / get-stream-captions (streamId).
  - For shorts: /shorts/get-mini-captions (miniId, host) + short-bff variant.
  - SubtitleItem / ExtCaption / SubtitleListBean (lan, lanName, url, size, delay for sync, season/ep, downloads, type, fileId, isOpenSubNewApi).
  - subtitle/ + subtitle_download/ managers (OpenSubtitles integration? + internal), download/sync/adjust.
- **Worker Mapping (current)**: /api/play-info, /api/season-info, /api/stream (wraps play-info + prefers resourceDetectors for direct links or proxies DASH with signCookie stash via /proxy?token + MPD rewrite), /api/subtitle, /api/stream-captions, shorts equivalents. English filter on corner. Proxy injects CloudFront cookies + referer.

**HEVC/DASH specifics**: Primary for streams; WASM transcoder in worker/frontend for non-native browsers; signCookie critical for segments.

## 4. Download Methods & Flows
- **Resource Listing** (core for all content types):
  - GET /wefeed-mobile-bff/subject-api/resource (host, subjectId, page/perPage, all, startPosition/endPosition, pagerMode, resolution, se, epFrom/epTo).
  - Returns BaseDto<DownloadListBean> (resourceList: list with resourceId, resolution, format, size, episode, season, shareUrl, etc.).
- **Per-Content**:
  - Movies/Series: MovieDetailViewModel.getDownloadList + postRequestResource. ResourceDetector* (alone/collection/multi-res adapters/dialogs/fragments) for source/quality choice using ResourceDetectors.
  - Shorts: ShortTvDownloadViewModel (startDownloadResource, getMbShortTVList), ShortTvDownloadResDialog, re-detector fragments (ShortTVDownloadRe* with AD unlock flows for some content), ShortTvDownloadEp* adapters.
- **Start/Finish**:
  - POST /subject-api/start-download-resource (host + RequestBody) → StartResponseBean.
  - POST /finish-download-resource.
  - resource-position (for resume/progress? host, subjectId, resourceId, failUrl, failCode, resourceNum).
- **Manager/DB**:
  - transsnet/downloader/ + baselib/db/download/ (DownloadBean, DownloadTaskInfo, DownloadEsBean, DownloadRange, Subtitle* for subs, exceptions).
  - DownloadManagerApi (play, fetch, remove, open).
  - Per-type: movie vs short download re-detection + AD walls.
- **Worker Current**: /api/resource (supports full params, returns mapped list). No full start/finish (stateful app-side; worker focuses on listing + stream proxy). Frontend downloads page uses it for direct links + info export (with cookies for mpv/etc.).
- **Recommendations**: Worker could proxy start/finish if needed for server-side tracking, but current resource listing + stream proxy covers browser/external player use. Expose more ResourceDetectors fields in responses for richer UI.

## 5. Other Related (Search, Recs, Social, Player Extras)
- **Recs/Home Personalization**: detail-rec, top-rec, play-related-rec, daily-movie-rec (curated), widget (hot + history), want/have-seen (watchlist/history).
- **Social/Rooms**: Room features tied to subjects (live viewing parties?), posts/comments on subjects, groups. (Lower priority for public proxy.)
- **Player Extras**: Float, PiP, history save, ad integration, music likes/downloads (separate flows).
- **Unified Search + Filters**: subjectType, resultMode, genre/year/quality via filter-items/list.
- **Captions/Downloads Per Type**: As above; OpenSub + internal.

## 6. Mapping to Current Worker + Frontend + Gaps
**Covered Well (v5+ worker routes + frontend hooks/normalizers)**:
- Search/suggest/rank, details (Subject), season-info, play-info/stream (with detectors/cookies/proxy), resource (full params), shorts (trending/fav/info/mini/dub/mini-captions), staff, recs (detail/top/play-related), bottom-tab, dub, filter/list, want/have, daily/widget/playlist/trendingV2.
- Frontend: useWorker* hooks, normalizers (map cover/staffList/genre/rating, absolutize URLs, StreamResult with isDash/Hls/Mp4 + cookies/referer), StreamModal/Player (4-layer: dash+hevc WASM, native HEVC, HLS, external deep links + package export), MediaCard/rows for discovery, episode picker, resource list in downloads, subtitle selector (SRT→VTT in-browser).
- Signing/host/English filter/time-sync in worker matches decompile (GatewayInterceptor flow, vo.a host, corner filter, GW.4410 offset, sercurity sorter).

**Gaps / Opportunities from Decompile**:
- Full download state (start/finish, position, DB tasks) is app-heavy (transsnet/downloader + AD unlock for some shorts). Worker lists resources/streams; could add if public API needed.
- Live/Sports: Integrated (SportLiveProvider, LiveListItem, rooms for social). Streams likely same play-info; tabs in home/bottom. Worker may need specific live proxy or room endpoints if adding social features.
- Richer responses: Expose full resourceDetectors (with extSubtitle, resolutionList, signCookie per source), staffList/dubs/subtitles arrays, delay in captions, OperateItem custom/playListData in home/recs. Current normalizers map basics; enhance types (e.g. WorkerResourceDetector, more in WorkerDetails/Stream).
- Shorts extras: Full discover/op/ranking/custom, AD unlock flows, dedicated subtitle/download managers, DB favorites — worker covers API surface; frontend has trending/fav/detail but could expand UI.
- TV/Movies: Unified but TV has explicit season/ep flows (ResourcesSeason, episode dialogs). Worker handles via params; frontend EpisodePicker good.
- Signing nuances: Real uses Mac with d enum (default SHA256 variant), specific NPStringFog headers, query decode+sort before canonical, gzip for large non-search bodies, GatewayStrategy for hosts. Worker MD5 variant works (per prior); query sort now improved; no need for full gzip as proxy.
- Other: Music/audio likes (separate), education, rooms/groups/posts (social), VIP/payments, user center. Out-of-scope for core streaming proxy.
- Edge: host param for pinning (worker now forwards in many places), resultMode in search, pager in responses, transient fields (series, load state).

**Worker/Frontend Alignment Status**: Strong for discovery/play/stream/downloads listing (English-filtered, signed, proxied DASH with cookies, rich enough for VLC/IINA/mpv + in-browser). Gaps mostly in app-stateful download tracking, full social/live rooms, or richer metadata exposure (easy to add via raw passthrough + type extensions). Decompile confirms current /api/* surface + English filter + proxy rewrite are the right public abstraction.

## 7. Recommendations for Further Perfection
- **Worker**: Forward host on *all* subject-api/shorts/home paths (use helper). Expose full detectors/streams/extCaptions (with delay) in /stream and /resource responses. Add /resource-position or download start/finish if downloads page needs server tracking. Version cache keys for new fields. Improve error shapes to match BaseDto.
- **Frontend**: Extend types/normalizers (WorkerDetails with full staffList/dubs/resourceDetectors/corner/hasResource; Stream with streams list; captions with delay/season/ep). Use in downloads (show source/resolutionList), detail (staff/dubs), stream info, shorts (dub select + mini captions with delay). Add UI for live tabs/providers if adding live support. Enhance EpisodePicker for shorts mini-episodes.
- **General**: Keep unified Subject handling. For live: monitor SportLive + rooms. Test with real host pinning + multi-source detectors. Signing remains solid (MD5 acceptable).
- **Docs**: This MD + existing APK-*.md + README cover the surface. Update worker header/routes list with decompile class refs (e.g. "VideoDetailStreamList from videodetail/bean").

This analysis (via direct source reads of beans, services like search/net/a + videodetail/b, ViewModels, adapters, preloaders, shorttv-specific) confirms the worker/frontend implement the core public discovery/play/download surface faithfully. Full decompile reveals the app's internal richness (detectors for sources, per-type UIs, AD flows for premium shorts, social integration) but much is client-side or authenticated.

**Next Steps if Desired**: Specific package deep-dive (e.g. full player or room live), code patches for gaps above, or frontend UI expansions.

(Findings synthesized from tool-driven exploration of 39k+ decompiled .java files + prior MDs. Raw folder structure confirms obfuscated but readable beans/interfaces for all mentioned flows.)