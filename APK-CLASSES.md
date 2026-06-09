# MovieBox APK — Complete Decompiled Class Reference

**Package**: `com.community.mbox.in`  
**App name**: MovieBox  
**Version**: 3.0.08.0911.03 (code 50020064)  
**Min SDK**: 21 (Android 5.0) | **Target SDK**: 34 (Android 14)  
**Main activity**: `com.transsion.subroom.activity.SplashActivity`  
**Builder**: Transsion (parent of Tecno, Infinix, Itel)

---

## 1. Complete API Endpoint Map

All 130+ endpoints discovered from Retrofit annotations and source string extraction. Organized by domain.

### Subject API (`/wefeed-mobile-bff/subject-api/`)

| Method | Path | Params | Returns | Source Class |
|--------|------|--------|---------|-------------|
| GET | `/subject-api/get` | `subjectId, host` | `BaseDto<Subject>` | `l10/a`, `nu/a` |
| GET | `/subject-api/play-info` | `subjectId, se, ep, host` | `BaseDto<VideoDetailStreamList>` | `com/transsion/videodetail/b` |
| GET | `/subject-api/season-info` | `subjectId, host` | `BaseDto<ResourcesSeasonList>` | `l10/a`, `com/transsion/videodetail/b` |
| GET | `/subject-api/dub-info` | `host, subjectId` | `BaseDto<DubsInfoData>` | `l10/a` |
| GET | `/subject-api/get-ext-captions` | `host, subjectId, resourceId, episode` | `BaseDto<SubtitleListBean>` | `ty/a` |
| GET | `/subject-api/get-stream-captions` | `host, subjectId, streamId` | `BaseDto<SubtitleListBean>` | `ty/a` |
| GET | `/subject-api/resource` | `host, subjectId, page, perPage, all, startPosition, endPosition, pagerMode, resolution, se, epFrom, epTo` | `BaseDto<DownloadListBean>` | `yx/a`, `l10/a` |
| GET | `/subject-api/resource-position` | `host, subjectId, resourceId, failUrl, failCode, resourceNum` | `BaseDto<DownloadListBean>` | `l10/a` |
| POST | `/subject-api/start-download-resource` | `host, RequestBody` | `BaseDto<StartResponseBean>` | `l10/a` |
| POST | `/subject-api/finish-download-resource` | `host, RequestBody` | `BaseDto<StartResponseBean>` | `l10/a` |
| POST | `/subject-api/search` | `host, RequestBody` | `BaseDto<SearchWorkEntity>` | `com/transsion/search/net/a` |
| POST | `/subject-api/search/v2` | `host, RequestBody` | `BaseDto<SearchResultEntity>` | `com/transsion/search/net/a` |
| GET | `/subject-api/search-suggest` | `keyword, perPage, resultMode` | `BaseDto<SearchSuggestEntity>` | `com/transsion/search/net/a` |
| GET | `/subject-api/search-rank` | `host, everyoneSearch` | `BaseDto<HotSubjectEntity>` | `kt/d` |
| GET | `/subject-api/search-rank/v2` | `everyoneSearch, room` | `BaseDto<HotSubjectEntity>` | `com/transsion/search/net/a` |
| POST | `/subject-api/trending/v2` | `host, RequestBody` | `BaseDto<TrendingRespData>` | `kt/d` |
| POST | `/subject-api/top-rec` | `host, RequestBody` | `BaseDto<HotItemsBean>` | `kt/d` |
| POST | `/subject-api/detail-rec` | `host, RequestBody` | `BaseDto<ForYouBean>` | `nu/a` |
| POST | `/subject-api/play-related-rec` | `host, RequestBody` | `BaseDto<ForYouBean>` | `nu/a` |
| POST | `/subject-api/want-to-see` | `host, RequestBody` | `BaseDto<Object>` | `nu/a` |
| POST | `/subject-api/daily-movie-rec` | `RequestBody` | `BaseDto<MovieRecBean>` | `l10/a` |
| GET | `/subject-api/bottom-tab` | `host` | `BaseDto<AppTab>` | `kt/d` |
| GET | `/subject-api/filter-items` | *(unknown)* | *(unknown)* | string grep |
| GET | `/subject-api/have-seen` | *(unknown)* | *(unknown)* | string grep |
| GET | `/subject-api/list` | *(unknown)* | *(unknown)* | string grep |
| GET | `/subject-api/staff-info` | *(unknown)* | *(unknown)* | string grep |
| GET | `/subject-api/staff-related` | *(unknown)* | *(unknown)* | string grep |
| GET | `/subject-api/staff-subject-list` | *(unknown)* | *(unknown)* | string grep |
| GET | `/subject-api/see-list-v2` | *(unknown)* | *(unknown)* | string grep |
| GET | `/subject-api/subtitle-search` | *(unknown)* | *(unknown)* | string grep |
| POST | `/subject-api/widget` | `RequestBody, host` | `BaseDto<DeskWidgetResp>` | `com/transsion/mbwidget/data/a` |

### Search & Groups (`/wefeed-mobile-bff/`)

| Method | Path | Params | Returns | Source |
|--------|------|--------|---------|--------|
| GET | `/group/list/search` | `host, page, keyword` | `BaseDto<SearchGroupEntity>` | `com/transsion/search/net/a` |
| POST | `/group/join` | `host, RequestBody` | `BaseDto<JoinGroupEntity>` | `com/transsion/search/net/a` |
| POST | `/search-anaylze/seek` | `host, RequestBody` | `BaseDto<PostEntity>` | `com/transsion/search/net/a`, `nu/a` |
| POST | `/group/create` | *(unknown)* | *(unknown)* | string grep |
| POST | `/group/leave` | *(unknown)* | *(unknown)* | string grep |
| GET | `/group/get` | *(unknown)* | *(unknown)* | string grep |
| GET | `/group/exist` | *(unknown)* | *(unknown)* | string grep |
| POST | `/group/update` | *(unknown)* | *(unknown)* | string grep |
| POST | `/group/visit` | *(unknown)* | *(unknown)* | string grep |
| GET | `/group/rank` | *(unknown)* | *(unknown)* | string grep |
| GET | `/group/list/class` | *(unknown)* | *(unknown)* | string grep |
| GET | `/group/list/community-entrance` | *(unknown)* | *(unknown)* | string grep |
| GET | `/group/list/my/v2` | *(unknown)* | *(unknown)* | string grep |
| GET | `/group/list/nearby` | *(unknown)* | *(unknown)* | string grep |
| POST | `/group/list/subject` | `host, RequestBody` | `BaseDto<RoomBean>` | `nu/a` |
| GET | `/group/list/user` | *(unknown)* | *(unknown)* | string grep |

### Home & Discovery (`/wefeed-mobile-bff/`)

| Method | Path | Params | Returns | Source |
|--------|------|--------|---------|--------|
| GET | `/tab-operating` | `host, tabId, version` | `BaseDto<SubOperateData>` | `kt/d` |
| GET | `/tab-operating` | `host, page, tabId, version` | `BaseDto<MainOperateData>` | `kt/d` |
| GET | `/community/trending-entrance` | `host, postNum` | `BaseDto<RoomEntranceResponse>` | `kt/d` |
| GET | `/community/tab` | *(unknown)* | *(unknown)* | string grep |
| GET | `/tab/ranking-list` | *(unknown)* | *(unknown)* | string grep |

### Shorts / Mini-content (`/wefeed-mobile-bff/shorts/` and `/wefeed-short-bff/`)

| Method | Path | Params | Returns | Source |
|--------|------|--------|---------|--------|
| GET | `/shorts/get-info` | `subjectId, host` | `BaseDto<Subject>` | `yx/a` |
| POST | `/shorts/favorite` | `RequestBody, host` | `BaseDto<String>` | `yx/a`, `l10/a` |
| GET | `/shorts/favorite-list` | `host, page, perPage` | `BaseDto<ShortTVRespData>` | `yx/a` |
| POST | `/shorts/most-trending` | `host, RequestBody` | `BaseDto<ShortTVRespData>` | `yx/a` |
| GET | `/shorts/dub-info` | `host, subjectId` | `BaseDto<DubsInfoData>` | `yx/a` |
| GET | `/shorts/mini-list` | `subjectId, startPosition, endPosition, pagerMode, host` | `BaseDto<ShortTvInfoEpisodeList>` | `yx/a` |
| GET | `/shorts/get-mini-captions` | `host, miniId` | `BaseDto<SubtitleListBean>` | `ty/a` |
| GET | `/shorts/operating` | *(unknown)* | *(unknown)* | string grep |
| GET | `/shorts/reel` | *(unknown)* | *(unknown)* | string grep |
| GET | `/wefeed-short-bff/shorts/get-mini-captions` | `host, miniId` | `BaseDto<SubtitleListBean>` | `ty/a` |

### Posts & Social (`/wefeed-mobile-bff/post/`, `/wefeed-mobile-bff/interactive/`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/post/create` | Create a post |
| POST | `/post/delete` | Delete a post |
| GET | `/post/get` | Get single post |
| GET | `/post/list/subject` | Posts for a subject |
| GET | `/post/list/likes` | Liked posts |
| GET | `/post/list/user` | Posts by user |
| GET | `/post/list/user/my` | My posts |
| GET | `/post/list/correlation` | Related posts |
| GET | `/post/list/group` | Group posts |
| GET | `/post/list/immersive` | Immersive feed |
| GET | `/post/list/immersive/v2` | Immersive feed v2 |
| GET | `/post/list-by-tab` | Tab-based post list |
| GET | `/post/list-trending/group` | Trending group posts |
| GET | `/post/explore` | Explore posts |
| GET | `/post/nearby` | Nearby posts |
| GET | `/post/count/subject` | Post count for subject |
| POST | `/interactive/post/like` | Like a post |

### User API (`/wefeed-mobile-bff/user-api/`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/user-api/login` | Login |
| POST | `/user-api/register` | Register |
| POST | `/user-api/logout` | Logout |
| GET | `/user-api/profile` | Get profile |
| POST | `/user-api/modify` | Modify profile |
| POST | `/user-api/third-login` | Third-party login |
| POST | `/user-api/get-sms-code` | Get SMS verification |
| POST | `/user-api/check-sms-code` | Verify SMS code |
| POST | `/user-api/check-phone-account` | Check phone account |
| POST | `/user-api/check-mail-account` | Check email account |
| POST | `/user-api/reset-password` | Reset password |
| POST | `/user-api/block` | Block user |
| POST | `/user-api/unblock` | Unblock user |
| POST | `/user-api/submit-prefer` | Submit preferences |

### Comments (`/wefeed-mobile-bff/comment`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/comment` | Post a comment |
| POST | `/comment/like` | Like a comment |
| GET | `/comment/list` | Comment list |
| GET | `/comment/user/list` | User's comments |

### Music (`/wefeed-mobile-bff/music/`)

| Method | Path | Params | Returns | Source |
|--------|------|--------|---------|--------|
| POST | `/music/like` | `RequestBody, host` | `BaseDto<MusicLikedRemoteActionBean>` | `com/transsion/videodetail/music/data/a` |
| GET | `/music/like-list` | `page, perPage, host` | `BaseDto<MusicLikedRemoteBean>` | `com/transsion/videodetail/music/data/a` |

### VIP / Money / Activity (`/wefeed-mobile-bff/`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/vip/member/detail` | VIP member details |
| POST | `/vip/member/rewards-receive` | Claim VIP rewards |
| GET | `/vip/member/rights-check` | Check VIP rights |
| GET | `/money/coin-log` | Coin transaction log |
| POST | `/money/exchange/order` | Exchange order |
| POST | `/money/gp-trading-order/create` | Google Play purchase order |
| GET | `/money/gp-purchase-result/polling` | Poll GP purchase result |
| POST | `/money/paynicorn-trading-order/create` | Paynicorn order |
| GET | `/money/paynicorn-purchase-result/polling` | Poll Paynicorn result |
| GET | `/money/sku-list/get` | Get SKU list |
| POST | `/activity/check-in` | Daily check-in |
| GET | `/activity/check-in-info` | Check-in info |
| POST | `/activity/download-task-receive` | Download task reward |
| GET | `/activity/entrance` | Activity entrance |
| GET | `/activity/embedded-h5-list` | H5 activity list |
| POST | `/activity/fission/bind` | Fission bind |
| GET | `/activity/fission/reward-list` | Fission rewards |
| GET | `/activity/global-task` | Global task list |
| GET | `/activity/task-list` | Task list |
| POST | `/activity/promo-code-bind` | Bind promo code |

### Messages / Notifications / Upload / Misc (`/wefeed-mobile-bff/`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/message/internal/has-new` | Has new messages |
| GET | `/message/internal/list` | Message list |
| GET | `/message/notify-bar/v2` | Notification bar |
| GET | `/message/push/local/list` | Local push list |
| POST | `/message/report` | Report message |
| POST | `/retrieve_client_logs/report` | Upload client logs |
| GET | `/client_logs_retrieve/config` | Log config |
| POST | `/upload/sts-token/v2` | Get STS upload token |
| POST | `/share/longurl` | Get share long URL |
| POST | `/share/shorturl` | Get share short URL |
| POST | `/feedback/commit` | Submit feedback |
| GET | `/feedback/label/list` | Feedback labels |
| POST | `/feedback/report` | Report feedback |
| GET | `/location/near-address` | Nearby address |
| POST | `/statistics/user-operation` | User operation stats |
| GET | `/app/check-update` | Check app update |
| GET | `/app/js-config` | JS config |
| GET | `/sniff/config` | Sniff config |
| GET | `/playlist/content` | Playlist content |
| GET | `/learning/add-course` | Add course |
| GET | `/learning/my-course` | My courses |
| GET | `/learning/prefer-options` | Course preference options |
| POST | `/learning/submit-prefer` | Submit course preference |

---

## 2. Authentication & Request Signing

### GatewaySignManager (`com.transsion.api.gateway`)

The central signing engine. Every API request passes through `GatewayInterceptor` (OkHttp interceptor) which calls `GatewaySignManager.doSign()`.

#### HMAC Signing Algorithm

**Enum `d` (sercurity/d.java)** has 3 values: `f50972a`, `f50973b`, `f50974c` — these correspond to three HMAC algorithms. The default used is `f50974c`.

From `sercurity/a.java`:
```java
Mac mac = Mac.getInstance(dVar.name());  // Uses the enum name as algorithm
mac.init(new SecretKeySpec(Base64.decode(secret, 2), dVar.name()));
return Base64.encodeToString(mac.doFinal(canonicalString.getBytes(Charset.forName("UTF-8")))), 2);
```

**Worker implementation note**: We use HMAC-MD5 because `crypto.subtle.digest("MD5")` is available on Cloudflare Workers and matches the `f50973b` (HmacMD5) variant. The `|2|` separator in `x-tr-signature` is a protocol version identifier, not an algorithm index.

#### Secret Keys

From `GateWaySdk.getSecret()`:
- **Online key**: `gateway_secret_online` from AndroidManifest meta-data
- **Test key**: `gateway_secret_test` from AndroidManifest meta-data
- **Hardcoded defaults in DEX**:
  - Default: `76iRl07s0xSN9jqmEWAt79EBJZulIQIsV64FZr2O`
  - Alternate: `Xqn2nnO41/L92o1iuXhSLHTbXvY4Z5ZZ62m8mSLA`

#### Canonical String Format

Built in `GatewayInterceptor.doGzipOrSign()` and `GatewaySignManager.doSign()`:

```
HTTP_METHOD\n
ACCEPT_HEADER\n
CONTENT_TYPE\n
CONTENT_LENGTH\n
TIMESTAMP\n
MD5_OF_BODY\n
URL_PATH?SORTED_QUERY
```

- `\n` = NPStringFog `"64"` (newline)
- `HTTP_METHOD` = uppercase (GET, POST)
- `TIMESTAMP` = `System.currentTimeMillis() + time_offset`
- `MD5_OF_BODY` = MD5 hex of body (truncated to 102400 bytes max); empty string if no body
- `SORTED_QUERY` = query params sorted alphabetically by key (via `sercurity/c.java` parser); `?` prefix if present

#### Signature Output

```
x-tr-signature: TIMESTAMP|2|Base64(HMAC(canonical_string, Base64-decode(SECRET)))
```

Where `|2|` = NPStringFog `"124211"`.

#### Additional Headers

| Header | Value | Source |
|--------|-------|--------|
| `x-tr-signature` | `{timestamp}\|2\|{base64_hmac}` | `NPStringFog "165D191343120E021C0F0418130B"` → `x-tr-signature: ` |
| `X-Client-Token` | `{timestamp},{MD5(reverse(timestamp_string))}` | Worker implementation |
| `X-Client-Info` | JSON blob (device, package, version) | Worker implementation |
| `X-Client-Status` | `0` | Worker implementation |
| `Content-Encoding` | `gzip` | Added for bodies > 102400 bytes |

#### Time Sync (GW.4410)

When the server returns HTTP 500 with body containing `errorCode: "GW.4410"`:
- Error code: NPStringFog `"292743555A5057"` → `"GW.4410"`
- The `errorMsg` is AES-decrypted by `com.transsion.api.gateway.dns.a.a()`
- Parsed as `TimeBean { time: long }`
- Offset stored: `time_offset = serverTime - System.currentTimeMillis()`
- Key: NPStringFog `"1A190004310E0103010B04"` → `"time_offset"`

### Gateway Host Selection

`GatewayInterceptor.doGatewayJob()` iterates through `GatewayStrategy` list from config. On failure, tries next strategy. On `GW.4410` error, stores time offset and retries.

**Production hosts** (from DEX):
- `api3.aoneroom.com`
- `api4.aoneroom.com`
- `api4sg.aoneroom.com`
- `api5.aoneroom.com`
- `api6.aoneroom.com` (default)
- `api6sg.aoneroom.com`
- `api.inmoviebox.com`

**Gateway proxy**: `apigateway.tmctool.com` (NPStringFog `"0F0004060F15021213175E190C0D15080A1E4013020C"`)

**CDN hosts**:
- `pbcdn.aoneroom.com` — images/posters
- `macdn.aoneroom.com` — media (trailers, previews)
- `sacdn.hakunaymatata.com` — DASH streams (CloudFront-signed)

### NPStringFog Obfuscation

**Key**: `npmanager`  
**Algorithm**: XOR each byte of hex-decoded string with key cycling over `"npmanager"`.

Key decoded values:

| Hex | Decoded | Context |
|-----|---------|---------|
| `64` | `\n` | Canonical string separator |
| `124211` | `\|2\|` | Signature version separator |
| `1A190004310E0103010B04` | `time_offset` | SharedPreferences key |
| `165D191343120E021C0F0418130B` | `x-tr-signature: ` | Header prefix |
| `0F0004060F15021213175E190C0D15080A1E4013020C` | `apigateway.tmctool.com` | Gateway proxy host |
| `0911190419001E3A010B131F041A3E080B1E071E08` | `gateway_secret_online` | Manifest key name |
| `0911190419001E3A010B131F041A3E1300011A` | `gateway_secret_test` | Manifest key name |
| `0F001D080A` | `appid` | Header key |
| `0F1E09130108034B1C0B044302010F094B31213E23242D352E333B3A2932222620292237` | `android.net.conn.CONNECTIVITY_CHANGE` | Broadcast action |
| `292743555A5057` | `GW.4410` | Time sync error code |
| `41170C150B16061C5D0315191307024804160A` | `/wefeed-mobile-bff/subject-api/search` | Sign-excluded path |
| `41170C150B16061C5D1D14064E185048061D00160406` | `/wefeed-mobile-bff/subject-api/search-rank` | Sign-excluded path |

### Sign-Excluded Paths

`GatewayUtils.isExcludeRequest()` skips signing for:
- Empty paths
- Paths containing `/wefeed-mobile-bff/subject-api/search` 
- Paths containing `/wefeed-mobile-bff/subject-api/search-rank`

### Gzip Compression

`GatewayInterceptor.doGzipOrSign()` adds gzip compression for request bodies > 102400 bytes when the path does NOT contain `/wefeed-mobile-bff/subject-api/search`.

---

## 3. Data Models

### Subject (`com.transsion.moviedetailapi.bean.Subject`)

Core content entity with 55+ fields:

| Field | Type | Description |
|-------|------|-------------|
| `subjectId` | String | Unique ID |
| `subjectType` | int | 0=All, 1=Movie, 2=TV, 5=Education, 6=Music, 7=Anime |
| `title` | String | Title |
| `countryName` | String | Country |
| `cover` | Cover | Cover image |
| `releaseDate` | String | Release date |
| `description` | String | Synopsis |
| `duration` | String | Duration text |
| `durationSeconds` | int | Duration in seconds |
| `genre` | String | Genre |
| `tags` | List | Tags |
| `imdbRate` | String | IMDB rating |
| `language` | String | Language |
| `staffList` | List | Cast/crew |
| `wantToSeeCount` | int | Want-to-see count |
| `hasResource` | boolean | Has downloadable resource |
| `resourceDetectors` | List | Download resources |
| `stills` | List | Screenshot URLs |
| `trailer` | Trailer | Trailer video |
| `series` | List | Episode list |
| `totalEpisode` | int | Total episodes |
| `seNum` | int | Season number |
| `contentRating` | String | Content rating |
| `category` | String | Category |
| `builtIn` | boolean | Built-in content |
| `deleted` | boolean | Is deleted |
| `dubs` | List | Dubbing info |
| `subtitles` | List | Subtitle info |
| `playUrl` | PlayUrl | Play URL |
| `download` | SubjectDl | Download info |
| `ops` | OperateItem | Operation actions |
| `mySeeTime` | int | User's watched time |
| `seenStatus` | int | Watch status |
| `likeStatus` | int | Like status |
| `corner` | String | Badge text |
| `restrictLevel` | int | Age restriction |
| `coinPerEp` | int | Coins per episode |
| `unlockedEps` | int | Unlocked episode count |
| `aka` | String | Also known as |

### VideoDetailStreamList (`com.transsion.videodetail.bean`)

| Field | Type | Description |
|-------|------|-------------|
| `streams` | List\<VideoDetailStream\> | Available streams |
| `se` | int | Season number |
| `ep` | int | Episode number |
| `title` | String | Episode title |

### VideoDetailStream

| Field | Type | Description |
|-------|------|-------------|
| `format` | String | Stream format (DASH, HLS, etc.) |
| `id` | String | Stream ID |
| `url` | String | Stream URL |
| `resolutions` | String | Resolution info |
| `size` | String | File size |
| `duration` | String | Duration |
| `signCookie` | String | CloudFront signed cookie |
| `extCaptions` | List\<ExtCaption\> | External captions |

### ResourcesSeasonList

| Field | Type | Description |
|-------|------|-------------|
| `subjectType` | Integer | Content type |
| `seasons` | List\<ResourcesSeason\> | Season list |

### ResourcesSeason

| Field | Type | Description |
|-------|------|-------------|
| `se` | int | Season number |
| `maxEp` | int | Max episode |
| `allEp` | int | Total episodes |
| `resolutions` | List\<ResolutionItem\> | Available resolutions |
| `isSelected` | boolean | Currently selected |

### Search Entities

**RequestSearchEntity**: `keyword`, `page`, `perPage`, `subjectType`  
**RequestSearchResultEntity**: `keyword`, `page`, `perPage`, `tabId`  
**SearchResultEntity**: `pager`, `results`, `tabId`, `tabs`, `convertData`  
**SearchSuggestEntity**: `items`, `keyword`, `ops`  
**HotSubjectEntity**: `everyoneSearch` (List\<HotSearchKeyWord\>)

### Home Entities

**AppTab**: `bottomTabs` (List\<BottomTabItem\>), `version`, `badgeVer`, `homeTabs` (List\<HomeTabItem\>)  
**TrendingRespData**: `items` (List\<TrendingRespItem\>), `pager`, `perRow`, `transferData` (List\<OperateItem\>)  
**HotItemsBean**: `pager`, `items` (List\<Subject\>)  
**OperateItem**: `title`, `type`, `position`, `deepLink`, `banner`, `filters`, `subjects`, `customData`, `playListData`, `feedsSubject`, `opId`, `page`, `rankings`, `rankingData`, `rankingListData`, `liveList`, `gameList`, `groups`, `md5`

### Player/Subtitle

**MediaSource**: `a` (key), `b` (URL), `c` (resolution), `d` (PlayMimeType), `e` (MediaItem), `f` (lazy key from URL), `g` (redirect URL), `h` (isLocal), `i` (isStreaming - DASH/HLS/m3u8), `j` (headers Map)  
**PlayerType enum**: `ALIYUN`, `EXO`  
**SubtitleItem**: `id`, `lan`, `lanName`, `name`, `url`, `size`, `delay`, `season`, `episode`, `downloads`, `type`, `fileId`, `isOpenSubNewApi`  
**ExtCaption**: `id`, `lan`, `lanName`, `url`, `size`, `delay` (int)

---

## 4. Network Layer Architecture

### Request Flow

```
App Code
  → Retrofit API Interface (e.g., l10/a, kt/d)
  → NetServiceGenerator (creates Retrofit instance)
  → OkHttp Client (with GatewayInterceptor)
  → GatewayInterceptor.intercept()
    → doGzipOrSign()
      → Build canonical string
      → HMAC sign with secret
      → Add x-tr-signature header
      → Optionally gzip body
    → Send request
    → On GW.4410 response:
      → Parse server time
      → Store offset
      → Retry with corrected timestamp
  → Response
```

### LoginInterceptor (`com.transsion.baselib.net`)

Adds authentication headers:
- If logged in: adds `token` header via `to.a()`
- If not logged in: adds timestamp-based signature header

### AppLifeStatusInterceptor (`com.transsion.baselib.net`)

- Tracks foreground/background state
- On 403 response: triggers login via ARouter
- Has whitelist of paths exempt from foreground checks

### Host Resolution

`vo.a` provides the base URL (host) for API calls, defaulting to one of the production hosts. The `@t("host")` parameter in Retrofit interfaces is populated by this, allowing dynamic host selection.

---

## 5. Stream Architecture

### Supported Formats

| Type | Format | Notes |
|------|--------|-------|
| DASH | `.mpd` | Primary, HEVC (H.265), CloudFront signed cookies |
| HLS | `.m3u8` | Fallback |
| MP4 | Direct download | Some content has direct URLs |

### Quality Tiers

480p (SD), 720p (HD), 1080p (FHD), 2160p (4K/UHD)

### Stream Response Fields

From `play-info` response (`VideoDetailStreamList`):
- `streams[].signCookie` — CloudFront signed cookie (`CloudFront-Policy`, `CloudFront-Signature`, `CloudFront-Key-Pair-Id`)
- `streams[].url` — MPD/M3U8 URL
- `streams[].format` — Format identifier
- `streams[].extCaptions` — External captions per stream

From `season-info` response (`ResourcesSeasonList`):
- `seasons[].resolutions` — Per-season resolution options
- Each resolution has `downloadUrl`, `resourceLink`, `resolution`

### HEVC Decoding

- Native: `libmedia3ext.so` (Media3/ExoPlayer extension)
- FFmpeg: `libavcodec.so`, `libavformat.so`, `libavutil.so`
- WASM fallback: `hevc-decode.js` / `hevc-decode.wasm` (Chromium)
- dash.js plugin: `hevcjs-plugin.umd.js`

---

## 6. TCrypterSdk (Device Encryption)

| Field | Value |
|-------|-------|
| Algorithm | AES-256-CBC |
| Key | 32 bytes derived from device credentials via `rs.d()` |
| IV | 16 bytes (second half of derived key) |
| Storage | SharedPreferences named `tcrypto` |
| Format | `ciphertext_splitKey` (split by `_`) |
| Purpose | Local data encryption only, NOT used for API auth |

---

## 7. Room / Social Features

### Room API (`com.transsion.room`)

| Class | Purpose |
|-------|---------|
| `RoomViewModel` | Manages room list, tabs, cache |
| `RoomHotViewModel` | Hot rooms, nearby rooms |
| `RoomDetailViewModel` | Room detail, visit tracking |
| `RoomCreateModel` | Room creation |
| `RoomsViewType` | `TYPE_ROOM_HOME`, `TYPE_TRENDING`, `TYPE_SUBJECT_DETAIL` |
| `RoomRequestEntity` | `page`, `perPage`, `userAvatarNum`, `cid`, `geo` (RoomGeo), `subjectId` |

### Post Detail (`com.transsion.postdetail`)

| Feature | API |
|---------|-----|
| Post list by subject | `/post/list/subject` |
| Post comments | `/comment`, `/comment/list` |
| Like/unlike | `/interactive/post/like`, `/comment/like` |
| Nearby posts | `/post/nearby` |
| Explore feed | `/post/explore` |
| Trending | `/post/list-trending/group` |

---

## 8. Widget / Startup / Upload

### Widget (`com.transsion.mbwidget`)

| API | Method | Params |
|-----|--------|--------|
| `/subject-api/widget` | POST | `WidgetRequestBody, host` |

Provides data for Android home screen widgets (hot subjects, play history).

### Startup (`com.transsion.startup`)

| API | Method | Params |
|-----|--------|--------|
| `/user-api/submit-prefer` | POST | `host, RequestBody` |

`StartupManager` handles cold boot stages, prefetches config, initializes SDKs.

### Upload / Logging (`com.transsion.upload`)

| API | Method | Params |
|-----|--------|--------|
| `/retrieve_client_logs/report` | POST | `host, RequestBody` |
| `/client_logs_retrieve/config` | GET | `host` |
| `/upload/sts-token/v2` | POST | *(unknown)* |

### Music (`com.transsion.videodetail.music`)

| API | Method | Params |
|-----|--------|--------|
| `/music/like` | POST | `RequestBody, host` |
| `/music/like-list` | GET | `page, perPage, host` |

---

## 9. Worker Implementation Notes

### Key Differences: APK vs Worker

| Aspect | APK | Worker |
|--------|-----|--------|
| HMAC algo | Enum: MD5/SHA1/SHA256, default SHA256 | MD5 (verified working on all backends) |
| Secret source | Manifest meta-data, runtime lookup | Hardcoded constants |
| Alt key retry | Yes (via enum `d`) | Yes (useAlt flag) |
| Gateway proxy | `apigateway.tmctool.com` | Direct to API hosts |
| Time sync | GW.4410 → store offset, auto-retry | Implemented in v4 (detects 4410, stores offset, retries) |
| Auth token | `x-user` header from `/search-suggest` | Same approach |
| QUIC | Cronet with QUIC hints | Standard `fetch()` |
| Body gzip | Bodies > 102400 bytes gzip-compressed | Not implemented |
| Client info | Full device blob | Simplified |
| Sign-excluded paths | `/search` and `/search-rank` | All paths signed |

### Endpoints Already in Worker (v4)

- `GET /api/search` → `/subject-api/search`
- `GET /api/search/v2` → `/subject-api/search/v2`
- `GET /api/search-suggest` → `/subject-api/search-suggest`
- `GET /api/search-rank` → `/subject-api/search-rank`
- `GET /api/trending` → `/subject-api/trending/v2`
- `GET /api/details` → `/subject-api/get`
- `GET /api/play-info` → `/subject-api/play-info`
- `GET /api/season-info` → `/subject-api/season-info`
- `GET /api/captions` → `/subject-api/get-ext-captions`
- `GET /api/home` → `/tab-operating`
- `GET /api/probe` → health check
- `GET /api/health` → health check

### Potential New Endpoints for Worker

High-value endpoints not yet proxied:

| Priority | Endpoint | Reason |
|----------|----------|--------|
| **High** | `/subject-api/bottom-tab` | Home tab navigation |
| **High** | `/subject-api/top-rec` | Top recommendations |
| **High** | `/subject-api/detail-rec` | "For You" recommendations |
| **High** | `/subject-api/play-related-rec` | Related content |
| **High** | `/subject-api/dub-info` | Dubbing/language info |
| **High** | `/subject-api/get-stream-captions` | Stream-specific subtitles |
| **Medium** | `/subject-api/want-to-see` | Watchlist |
| **Medium** | `/subject-api/have-seen` | Watch history |
| **Medium** | `/subject-api/list` | Content listing |
| **Medium** | `/subject-api/filter-items` | Filter options |
| **Medium** | `/group/list/search` | Group search |
| **Medium** | `/group/list/subject` | Subject groups |
| **Medium** | `/community/trending-entrance` | Trending entrance |
| **Medium** | `/subject-api/daily-movie-rec` | Daily recommendations |
| **Low** | `/subject-api/widget` | Widget data |
| **Low** | `/subject-api/staff-info` | Cast/crew info |
| **Low** | `/subject-api/staff-related` | Related staff |
| **Low** | `/subject-api/staff-subject-list` | Staff subject list |
| **Low** | `/shorts/*` | Short-form content |
| **Low** | `/post/*` | Social features |
| **Low** | `/comment/*` | Comments |
| **Low** | `/user-api/*` | Auth/user management |
| **Low** | `/vip/*`, `/money/*` | Monetization |
| **Low** | `/activity/*` | Promotions |