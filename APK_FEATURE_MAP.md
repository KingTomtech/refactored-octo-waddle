# MovieBox APK Complete Feature Map

> Extracted from decompiled APK at `apk-decoded/jadx-out/sources/com/transsion/` and `com/transsnet/`
> Date: 2026-06-09

---

## SubjectType Enum (Content Types)

| Value | Name | Description |
|-------|------|-------------|
| 1 | MOVIE | Movies |
| 2 | TV | TV Series |
| 3 | VSHOW | Variety Shows |
| 4 | AUDIO | Audio/Music |
| 5 | EDUCATION | Educational content |
| 6 | MUSIC | Music content |
| 7 | SHORT_TV | Short TV / Mini-series / Anime |
| 9 | SPORT | Sports content |

---

## Bottom Navigation Tabs (BottomTabType)

| Name | Tab Code | Description |
|------|----------|-------------|
| HOME | "HOME" | Home/Discover |
| SHORT_TV | "SHORTTV" | Short TV / Mini-series |
| H5TAB | — | Web/Mini App tab |
| OPERATION | — | Operations/Promotions |
| DOWNLOAD | "DOWNLOADS" | Download manager |
| PREMIUM | "PREMIUM" | VIP/Premium membership |
| ROOM | — | Community Rooms |
| SPORTS_LIVE | — | Live Sports |
| NOVEL | "LIVE" | Live/Novel tab |
| ME | "ME" | Profile/Settings |

---

## Home Page Tabs (HomeTabId)

| ID | Name | Description |
|----|------|-------------|
| 1 | Trending | Home/Discover feed |
| 2 | Movie | Movies |
| 3 | Education | Educational content |
| 4 | Music | Music/Audio |
| 5 | TVShow | TV Shows |
| 6 | Apps | Mini Apps |
| 7 | ShortTV | Short TV |
| 8 | Animation | Anime/Animation |
| 9 | Midnight | Late night/adult content |
| 10 | AD | Sponsored content |
| 11 | Game | Games section |
| 12 | MusicOperate | Music operations/promotions |
| 13 | ShortTVDiscover | Short TV Discovery |

---

## Home Page Section Types (PostItemType)

| Type | Provider | Description |
|------|----------|-------------|
| SUBJECT | SubjectItemProvider | Standard subject row (movie/TV card) |
| OP_RANKING | SubRankingProvider | Ranking section |
| FILTER | SubFilterProvider | Filter bar at top of sub-tabs |
| BANNER | SubBannerProvider | Banner carousel |
| CUSTOM_DATA | SubCustomProvider | Custom data sections |
| APPOINTMENT_LIST | SubAppointmentProvider | Upcoming/appointment list |
| OP_SUBJECTS_MOVIE | OpMovieRankProvider | Movie ranking horizontal list |
| RANKING_MOVIE_HORIZONTAL | OpMovieRankProvider | Movie ranking horizontal |
| RANKING_LIST | — | Ranking list |
| RANKING_LIST_MUSIC | — | Music ranking list |
| SPORT_LIVE | SportLiveProvider | Live sports section |
| SINGLE_IMAGE | SingleImageProvider | Single image promo card |
| PLAY_LIST | PlayListProvider | Playlist section |
| RANKING_LIST_NUMBER | OpNumberRankProvider | Numbered ranking list |
| HORIZONTAL_BANNER | SubHorizontalBannerProvider | Horizontal banner |
| SINGLE_SUBJECT | SubjectSingleImgItemProvider | Single subject card |
| EDUCATION_SUBJECT | — | Education content section |
| GRID_SUBJECT | GridSubjectProvider | Grid layout subjects |
| GAME_LIST | GameListProvider | Games list |
| NO_NETWORK | NoNetWorkItemProvider | Offline state |
| TRENDING_NATIVE_AD | AdProvider | Native advertisement |
| HONOR | OpHonorProvider | Honor/achievement section |
| FEEDS_TITLE | FeedsTitleProvider | Section title divider |
| MY_COURSE | SubMyCourseProvider | My Courses (Education) |
| ROOM | RoomProvider | Community room entry |

---

## 1. Home Module (`com/transsion/home/`)

**Activities:** FilterActivity, MovieFilterActivity, OperateActivity, RankAllActivity  
**Fragments:** HomeFragment, RankAllFragment, RankListFragment  
**ViewModels:** RankAllViewModel, MovieViewModel, PreloadTrendingData  
**Data:** AppTab, BottomTabItem, HomeTabItem, FilterItems, FilterVal, MovieItem, MovieBean

---

## 2. Movie Detail (`com/transsion/moviedetail/`)

**Activities:** MovieDetailActivity, MoviePosterActivity, SubjectListActivity, MovieStaffActivity  
**Fragments:** MovieDetailFragment, ForYouFragment, HotFragment, StarringFragment, StillsFragment, TrailerFragment, ResourceDetectorFragment (multi-source detection), VideoDetailSeasonsSelectFragment, RestrictTipsDialog  
**ViewModels:** MovieDetailViewModel (wantToSee, fetchRec, getDownloadList), HotViewModel, MovieStaffViewModel  
**Data:** Subject, PostSubjectBean, Video, Audio, PlayUrl, PlayListBean, BannerBean, RankingData, Staff, RoomBean, ShortTVItem, DubsInfoData, ResolutionItem, DownloadResolutionItem, SeenStatus

---

## 3. Search (`com/transsion/search/`)

**Activities:** SearchManagerActivity  
**Fragments:** SearchHotFragment, SearchRankPagerFragment, SearchSuggestFragment, SearchResultFragment, SearchSubjectFragment, SearchValuesFragment  
**ViewModels:** SearchResultViewModel, SearchViewModel, SearchWorkViewModel  
**Data:** HotSearchKeyWord, HotRankItem, HotCover, HotSubject, SearchSubject, AccurateSubject, GroupInfo  
**Features:** Hot keywords, trending rankings, voice search (SpeechRecognizerDialog), auto-suggest, grouped results

---

## 4. Download System (`com/transsnet/downloader/`)

**Activities:** DownloadPanelActivity, DownloadSeriesListActivity, TransferActivity, AllHistoricalPlayRecordActivity  
**Fragments:** DownloadMainFragment, DownloadPanelFragment, DownloadedListFragment, DownloadingListFragment, DownloadReDetectorMainDialog (resource detection), DownloadReDetectorSingleResFragment, DownloadReDetectorGroupFragment, DownloadReDetectorShortTVFragment, FileManagerFragment, TransferInnerMainFragment, HistoricalPlayRecordFragment  
**ViewModels:** DownloadListManager (singleton), DownloadViewModel, DownloadedViewModel, DownloadingViewModel  
**API:** `l10.a` — start-download-resource, finish-download-resource, resource, resource-position, sniff/config, dub-info, season-info, subject get  
**Data:** DownloadBean, DownloadUrlBean, StartResponseBean, MovieRecBean, SeasonListBean, SubtitleListBean  
**Features:** Full download queue, series batch download, WiFi transfer, play history, resource detection dialog, foreground service, download guard

---

## 5. Short TV (`com/transsion/shorttv/`)

**Activities:** ShortTVFavoriteActivity  
**Features:** TikTok-style vertical video player, like/comment/share, discover/trending feeds, favorites, upload short videos, music overlay

---

## 6. Community Rooms (`com/transsion/room/`)

**Activities:** RoomHomeActivity, RoomListActivity, RoomDetailActivity, HotRoomsActivity, CreateRoomActivity, MyRoomActivity, OthersRoomListActivity  
**Fragments:** RoomHomeFragment, RoomFragment, RoomDetailFragment, RoomListFragment, RoomFilterListFragment  
**ViewModels:** RoomViewModel, RoomDetailViewModel, RoomHotViewModel, RoomCreateModel  
**Data:** RoomBean, RoomItem, RoomFilter, RoomTabBean, RoomTabItem, RoomRequestEntity  
**Features:** Create/join rooms, hot rooms, community rooms, room detail with chat, location-based discovery, room filtering

---

## 7. Education (`com/transsion/edcation/`)

**Activities:** Course history, Course list  
**Classes:** CourseManager (subscribe, update, refresh, notify)  
**Data:** CourseBean, EducationInterestResp, InterestBean, CourseListResp  
**Features:** Course subscription, progress tracking, interest-based recommendations, course history

---

## 8. Music/Audio (`com/transsion/audio/`)

**API:** AudioApiImpl, FloatingApiImpl  
**Fragments:** AudioBottomSheetFragment, RecentListFragment, SubjectListFragment  
**ViewModels:** SubjectListViewModel, HistoryListManager  
**Features:** Floating mini-player, bottom sheet player, subject/album browsing, recent list, download management, audio history

---

## 9. VIP/Membership (`com/transsion/member/`)

**Activities:** MemberActivity, Points history  
**ViewModels:** MemberViewModel (redeem), MemberCheckInViewModel (check-in), MemberPromoCodeViewModel (promo codes)  
**Data:** MemberBriefInfo, PointsHistoryData, RedeemResult, MemberPromoCodeReq/Res  
**Features:** VIP subscription, points system, daily check-in tasks, invite tasks, promo codes, reward redemption, purchase flow

---

## 10. User Center (`com/transsion/usercenter/`)

**Activities:** UserCenterActivity, ProfileActivity, ProfileSeeActivity, ProfileQRCodeActivity, FollowActivity, ProfileEditActivity, SettingActivity, UserMessageActivity, WebViewActivity, LaboratoryActivity, FeedbackActivity  
**ViewModels:** MeViewmodel, ProfileViewModel, ProfileSubjectListViewModel, NoticeMessageViewModel, ProfileSeeViewModel, ReportViewModel  
**Features:** Profile editing, avatar/nickname, QR sharing, follow lists, watch history, messages, settings, notifications, watch later, feedback (labeled), developer lab (channel switching, FPS, HTTP host, location, streaming, MCC), block/report

---

## 11. Content Publishing (`com/transsion/publish/`)

**Activities:** FilmReviewActivity, GalleryActivity, SelectVideoActivity, SelectMusicActivity, Location list  
**ViewModels:** PostViewModel, LocationPlaceViewModel  
**Data:** PostEntity, PublishModel, PublishResult, MediaVideoEntity, MediaImageEntity, MediaAudioEntity, MediaLinkEntity, LocationPlaceBean  
**Features:** Film reviews, video upload, image gallery, audio/music attachment, link parsing, location tagging, video preview, image cropping

---

## 12. Subtitle System (`com/transsion/subtitle/` + `com/transsion/subtitle_download/`)

**Fragments:** SubtitleMainDialog2, AudioSelectListFragment, SubtitleSelectListFragment, SubtitleSearchDownloadFragment, SubtitleSyncAdjustFragment  
**ViewModels:** SubtitleDownloadViewModel  
**Data:** OpenSubtitleData, SubtitleSearchListBean, VlSubtitleBean, SubtitleAppType, SubtitleItem  
**Features:** In-app subtitle tracks, OpenSubtitle API search/download, language filtering, sync/timing adjustment, audio track selection, local subtitle files

---

## 13. Referral (`com/transsion/fission/`)

**Activities:** FissionInvitationCodeActivity  
**Features:** Invitation codes, palm pay tasks, referral tracking

---

## 14. Push Notifications (`com/transsion/push/`)

**Features:** Firebase/FCM integration, client ID management, trigger sources (APP_INNER, SCREEN_ON, UNLOCK, NETWORK_CONNECTED)

---

## 15. Ads/Monetization (`com/transsion/commercialization/`)

**Providers:** AhaGameProvider, CommonDialogProvider, GameResTabProvider, InterceptReportProvider, PsLinkProvider, TaskCenterProvider, WrapperAdProvider  
**Data:** AhaGameAllGames, GameInfoType, HomePopupEntity  
**Features:** Interstitial ads, rewarded video, native ads, scene ads, game center (Aha Games), popup dialogs, task center, ad intercept reporting

---

## 16. Payment (`com/transsion/payment/`)

**Features:** VIP subscription purchases, payment gateway integration, SKU management

---

## 17. Video Player (`com/transsion/player/`)

**Key:** ORExoPlayer (ExoPlayer), TnAliPlayer (Alibaba Player), LongVodPlayerView, DashDemoActivity  
**Features:** DASH streaming, PiP, background audio, volume/brightness gestures, subtitle overlay, ad integration, preloading, Android Auto media session

---

## 18. Floating Player (`com/transsion/videofloat/`)

**Features:** Floating window player, PiP mode, subtitle overlay in float mode, overlay permission handling

---

## 19. Video Detail / Stream Detail (`com/transsion/videodetail/`)

**Activities:** StreamDetailActivity, MusicDetailActivity  
**Features:** Episode selection, season navigation, audio track selection, stream/source detection, music detail, liked music, float player integration

---

## 20. Login (`com/transsnet/login/`)

**Activities:** LoginActivity, LoginLikeActivity, LoginSelectCountryActivity, LoginEmailPwdActivity, LoginPwdActivity, LoginSetPwdActivity, LoginInterestActivity  
**Features:** Phone login, email login, SMS verification, password set, country selection, interest selection, social/third-party login, visitor mode

---

## 21. Transfer (`com/transsion/transfer/`)

**ARouter:** /transfer/status, /transfer/transfer_provider, /transfer/wifi_connect, /transfer/wifi_create  
**Features:** WiFi Direct file sharing, transfer status tracking

---

## 22. Additional Modules

| Module | Path | Key Feature |
|--------|------|-------------|
| Base Library | com/transsion/baselib | Room DB, base VM/Activity/Fragment, crash handler, Firebase Config |
| API Gateway | com/transsion/api/gateway | CDN, DNS, security, metrics, remote config |
| Banner | com/transsion/banner | Banner carousel |
| Base UI | com/transsion/baseui | Shared UI components |
| Bean | com/transsion/bean | Shared data models |
| Compressor | com/transsion/compressor | Image/video compression |
| Core | com/transsion/core | App initialization |
| Crypto | com/transsion/crypto | DRM/encryption |
| Event Flow | com/transsnet/flow | Kotlin Flow event bus |
| GA/Analytics | com/transsion/ga + com/transsion/athena | Athena event tracking |
| Image | com/transsion/image | Image loading |
| Launcher | com/transsnet/launcherlib | App launcher data |
| Preloader | com/transsion/libpreloader | Content preloading |
| NineGrid | com/transsion/ninegridview | WeChat-style image grid |
| PhotoView | com/transsion/photoview | Zoomable photo viewer |
| Share | com/transsion/share | Social sharing |
| Startup | com/transsion/startup | App startup sequence |
| SubRoom | com/transsion/subroom | Sub-rooms |
| Upload | com/transsion/upload | File uploads |
| User | com/transsion/user | User state |
| Version | com/transsion/version | Version management |
| Web | com/transsion/web | WebView pages |
| Widget | com/transsion/widget | Home screen widgets |

---

## Complete API Endpoint Map

| APK Endpoint | Method | Worker Route | Frontend Hook |
|-------------|--------|-------------|---------------|
| `/wefeed-mobile-bff/subject-api/search` | POST | `/api/search` | useWorkerSearch |
| `/wefeed-mobile-bff/subject-api/search/v2` | POST | `/api/search/v2` | — |
| `/wefeed-mobile-bff/subject-api/search-rank/v2` | GET | `/api/search-rank` | useWorkerSearchRank |
| `/wefeed-mobile-bff/subject-api/get` | GET | `/api/details` | useWorkerDetails |
| `/wefeed-mobile-bff/subject-api/play-info` | GET | `/api/play-info` | — (internal) |
| `/wefeed-mobile-bff/subject-api/season-info` | GET | `/api/season-info` | useWorkerSeasonInfo |
| `/wefeed-mobile-bff/subject-api/play-info` (stream) | GET | `/api/stream` | useWorkerStream |
| `/wefeed-mobile-bff/subject-api/get-ext-captions` | GET | `/api/subtitle` | api.subtitle |
| `/wefeed-mobile-bff/tab-operating` | GET | `/api/trending` | TrendingSection |
| `/wefeed-mobile-bff/subject-api/detail-rec` | POST | `/api/detail-rec` | useWorkerDetailRec |
| `/wefeed-mobile-bff/subject-api/top-rec` | POST | `/api/top-rec` | useWorkerTopRec |
| `/wefeed-mobile-bff/subject-api/bottom-tab` | GET | `/api/bottom-tab` | useWorkerBottomTab |
| `/wefeed-mobile-bff/subject-api/play-related-rec` | POST | `/api/play-related-rec` | useWorkerPlayRelatedRec |
| `/wefeed-mobile-bff/subject-api/want-to-see` | POST | `/api/want-to-see` | useWantToSee (mutation) |
| `/wefeed-mobile-bff/subject-api/have-seen` | POST | `/api/have-seen` | useHaveSeen (mutation) |
| `/wefeed-mobile-bff/subject-api/dub-info` | GET | `/api/dub-info` | useWorkerDubInfo |
| `/wefeed-mobile-bff/subject-api/filter-items` | GET | `/api/filter-items` | useWorkerFilterItems |
| `/wefeed-mobile-bff/subject-api/list` | POST | `/api/list` | useWorkerList |
| `/wefeed-mobile-bff/subject-api/get-stream-captions` | GET | `/api/stream-captions` | useWorkerStreamCaptions |
| `/wefeed-mobile-bff/subject-api/resource` | GET | — | — |
| `/wefeed-mobile-bff/subject-api/start-download-resource` | POST | — | — |
| `/wefeed-mobile-bff/subject-api/finish-download-resource` | POST | — | — |
| `/wefeed-mobile-bff/subject-api/resource-position` | GET | — | — |
| `/wefeed-mobile-bff/subject-api/daily-movie-rec` | POST | — | — |
| `/wefeed-mobile-bff/sniff/config` | GET | — | — |
| `/wefeed-mobile-bff/shorts/favorite` | POST | — | — |
| `/wefeed-mobile-bff/shorts/favorite-list` | GET | — | — |
| `/wefeed-mobile-bff/shorts/most-trending` | POST | — | — |
| `/wefeed-mobile-bff/shorts/get-info` | GET | — | — |
| `/wefeed-mobile-bff/shorts/dub-info` | GET | — | — |
| `/wefeed-mobile-bff/shorts/mini-list` | GET | — | — |
| `/wefeed-mobile-bff/subject-api/want-to-see-staff` | POST | — | — |
| `/wefeed-mobile-bff/subject-api/staff-info` | GET | — | — |
| `/wefeed-mobile-bff/subject-api/staff-related` | GET | — | — |
| `/wefeed-mobile-bff/subject-api/staff-subject-list` | GET | — | — |
| `/wefeed-mobile-bff/subject-api/trending/v2` | POST | — | — |
| `/wefeed-mobile-bff/post/create` | POST | — | — |
| `/wefeed-mobile-bff/location/near-address` | GET | — | — |
| `/wefeed-mobile-bff/community/trending-entrance` | GET | — | — |
| `/wefeed-mobile-bff/post/list/subject` | GET | — | — |
| `/wefeed-mobile-bff/search-anaylze/seek` | POST | — | — |
| `/wefeed-mobile-bff/group/list/subject` | POST | — | — |
| `/wefeed-short-bff/shorts/get-mini-captions` | GET | — | — |

---

## Frontend Gaps Summary

### Fully Implemented
- Home page (trending, homepage fanout)
- Search (basic)
- Browse (basic movie/TV grid)
- Movie detail
- Series detail with season/episode picker
- Streaming (DASH proxy, HEVC, HLS, MP4)
- Subtitle selection
- Stream info modal
- Download info export (.txt)
- DPTV branding (Deadpool theme)

### Hooks Added (API wired, no UI yet)
- `useWorkerDetailRec` — "You May Also Like" on detail pages ✅ (UI added)
- `useWorkerTopRec` — Top picks on homepage ✅ (UI added)
- `useWorkerBottomTab` — Tab config from backend
- `useWorkerPlayRelatedRec` — Related content during playback
- `useWantToSee` — Watchlist POST mutation
- `useHaveSeen` — Watched POST mutation
- `useWorkerDubInfo` — Audio track info
- `useWorkerFilterItems` — Genre/year/country filters
- `useWorkerList` — Paginated content list
- `useWorkerStreamCaptions` — Richer subtitle source
- `useWorkerSearchRank` — Hot search keywords

### Not Implemented (no worker endpoint)
- **Downloads** — APK has full download manager; worker has no download endpoints (start-download-resource, finish-download-resource, resource, sniff/config, resource-position). Would need new worker routes.
- **Short TV** — Separate APK module; worker has no shorts endpoints.
- **Community Rooms** — Watch rooms with live viewing; worker has no room endpoints.
- **Education/Courses** — Worker has no education endpoints.
- **Music/Audio** — Worker has no audio endpoints.
- **VIP/Membership** — Worker has no payment/membership endpoints.
- **User Center** — Worker has no auth/profile endpoints.
- **Content Publishing** — Worker has no post/create endpoints.
- **Sports Live** — Worker has no live sports endpoints.
- **Games** — Worker has no game endpoints.
- **Rankings** — Worker has no ranking pages (only trending).
- **Playlists** — Worker has no playlist endpoints.
- **Staff/Crew** — Worker has no staff-info/staff-related endpoints.
- **Login/Auth** — Worker has no auth endpoints.