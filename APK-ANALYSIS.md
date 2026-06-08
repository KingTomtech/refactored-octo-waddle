# MovieBox APK Reverse Engineering Analysis

**Package**: `com.community.mbox.in`
**App name**: MovieBox
**Version**: 3.0.08.0911.03 (code 50020064)
**Min SDK**: 21 (Android 5.0) | **Target SDK**: 34 (Android 14)
**Main activity**: `com.transsion.subroom.activity.SplashActivity`

---

## 1. App Architecture

The app is built by **Transsion** (parent of Tecno, Infinix, Itel) — it's a rebranded "OneRoom" app for the Indian market. The core packages:

| Package | Purpose |
|---------|---------|
| `com.transsion.api.gateway` | HMAC request signing SDK |
| `com.transsion.http` | OkHttp network layer |
| `com.transsion.crypto` | TCrypterSdk (AES-256 device key storage) |
| `com.transsion.search` | Search UI + Retrofit API |
| `com.transsion.moviedetail` / `moviedetailapi` | Movie/TV detail pages |
| `com.transsion.videodetail` | Stream detail + quality selection |
| `com.transsion.player` | ExoPlayer + dash.js + HEVC decoder |
| `com.transsion.subtitle` / `subtitle_download` | OpenSubtitle + internal subs |
| `com.transsion.room` | Social rooms (watch parties) |
| `com.community.mbox` | App shell (old package name) |
| `com.cloud.hisavana` | Ad SDK |
| `com.cloud.tmc` | Mini-app platform (H5 games) |

---

## 2. API Endpoints (Retrofit Interfaces)

### Search API (`/wefeed-mobile-bff/subject-api/`)

| Method | Path | Params |
|--------|------|--------|
| POST | `/wefeed-mobile-bff/subject-api/search` | `{keyword, page, perPage, subjectType, resultMode}` |
| POST | `/wefeed-mobile-bff/subject-api/search/v2` | same body |
| GET | `/wefeed-mobile-bff/subject-api/search-suggest` | `?keyword=&perPage=&resultMode=` |
| GET | `/wefeed-mobile-bff/subject-api/search-rank/v2` | `?everyoneSearch=&room=` |
| GET | `/wefeed-mobile-bff/group/list/search` | `?host=&page=&keyword=` |
| POST | `/wefeed-mobile-bff/group/join` | `{groupId}` |

### Content API (from worker reverse-engineering)

| Method | Path | Params |
|--------|------|--------|
| GET | `/wefeed-mobile-bff/subject-api/get` | `?subjectId=` |
| GET | `/wefeed-mobile-bff/subject-api/play-info` | `?subjectId=&se=&ep=` |
| GET | `/wefeed-mobile-bff/subject-api/season-info` | `?subjectId=` |
| GET | `/wefeed-mobile-bff/subject-api/get-ext-captions` | `?subjectId=&resourceId=` |
| GET | `/wefeed-mobile-bff/tab-operating` | `?page=&tabId=&version=` |
| POST | `/wefeed-mobile-bff/search-anaylze/seek` | analytics |

### Subject Types (enum)

| Value | Type |
|-------|------|
| 0 | All |
| 1 | Movie |
| 2 | TV Series |
| 5 | Education |
| 6 | Music |
| 7 | Anime |
| 8 | Other |

---

## 3. Authentication & Signing (GatewaySignManager)

### HMAC Signature Algorithm

**Algorithm**: HmacSHA256 (primary) — the app uses enum `d` with 3 values corresponding to `HmacMD5`, `HmacSHA1`, `HmacSHA256`, with the 3rd (SHA256) as default.

**Secret Keys** (Base64-encoded, stored in AndroidManifest meta-data):
- **Online**: `gateway_secret_online` → value stored in manifest, decoded at runtime
- **Test**: `gateway_secret_test` → same format

**Confirmed keys found in DEX** (`classes4.dex`):
- Default: `76iRl07s0xSN9jqmEWAt79EBJZulIQIsV64FZr2O`
- Alternate: `Xqn2nnO41/L92o1iuXhSLHTbXvY4Z5ZZ62m8mSLA`

### Canonical String Format

```
HTTP_METHOD\n
ACCEPT_HEADER\n
CONTENT_TYPE\n
CONTENT_LENGTH\n
TIMESTAMP\n
MD5_OF_BODY\n
URL_PATH?SORTED_QUERY
```

Where:
- `\n` is the separator (decoded from NPStringFog `"64"`)
- `HTTP_METHOD` = uppercase (GET, POST)
- `TIMESTAMP` = `System.currentTimeMillis() + time_offset`
- `MD5_OF_BODY` = MD5 hex of body (truncated to 102400 bytes max)
- `SORTED_QUERY` = query params sorted alphabetically by key
- If no body: content-length = 0, MD5 field = empty string

### Signature Output Format

```
x-tr-signature: TIMESTAMP|2|Base64(HMAC-SHA256(canonical_string, Base64-decode(SECRET)))
```

### Additional Headers

| Header | Value |
|--------|-------|
| `x-tr-signature` | `{timestamp}\|2\|{base64_hmac}` |
| `X-Client-Token` | `{timestamp},{MD5(reverse(timestamp_string))}` |
| `X-Client-Info` | JSON blob (device info, package name, version) |
| `X-Client-Status` | `0` |

### Time Sync

If the server returns error code `GW.4410`, the client stores a `time_offset` in SharedPreferences and adds it to all future timestamps.

---

## 4. NPStringFog Obfuscation

**Key**: `npmanager`

**Algorithm**: XOR each byte of the hex-decoded string with the key cycling over `npmanager`.

Example decodings:
| Hex | Decoded |
|-----|---------|
| `1A190004310E0103010B04` | `time_offset` |
| `64` | `\n` (newline) |
| `124211` | `\|2\|` |
| `165D191343120E021C0F0418130B5B47` | `x-tr-signature: ` |
| `0F0004060F15021213175E190C0D15080A1E4013020C` | `apigateway.tmctool.com` |
| `0911190419001E3A010B131F041A3E080B1E071E08` | `gateway_secret_online` |
| `0911190419001E3A010B131F041A3E1300011A` | `gateway_secret_test` |
| `0F001D080A` | `appid` |

---

## 5. API Host Pool & Gateway

**Production hosts** (QUIC-enabled, port 443):
- `api3.aoneroom.com`
- `api4.aoneroom.com`
- `api4sg.aoneroom.com`
- `api5.aoneroom.com`
- `api6.aoneroom.com` (default)
- `api6sg.aoneroom.com`
- `api.inmoviebox.com`

**Test host**: `test-mse-api.aoneroom.com` (IP: `8.219.92.106`)

**Gateway proxy**: `apigateway.tmctool.com` (used when gateway DNS is enabled)

**CDN hosts**:
- `pbcdn.aoneroom.com` — images/posters
- `macdn.aoneroom.com` — media (trailers, previews)
- `sacdn.hakunaymatata.com` — DASH streams (CloudFront-signed)

---

## 6. Stream Architecture

### Stream Types

| Type | Format | Notes |
|------|--------|-------|
| DASH | `.mpd` | Primary format, HEVC (H.265) encoded, CloudFront-signed cookies |
| HLS | `.m3u8` | Fallback |
| MP4 | direct download | Some content has direct MP4 URLs |

### Quality/Resolution System

Resolutions offered per stream (from `season-info` response):
- 480p (SD)
- 720p (HD)
- 1080p (FHD)
- 2160p (4K/UHD)

The `resourceDetectors` array in `play-info` response contains:
- `downloadUrl` — direct MP4 URL (pre-signed)
- `resolutionList[]` — per-resolution links with `resourceLink` and `resolution`
- `signCookie` — CloudFront signed cookie for DASH CDN (`CloudFront-Policy`, `CloudFront-Signature`, `CloudFront-Key-Pair-Id`)
- `source` — backend identifier
- `resourceId` — used for subtitle lookup

### HEVC Playback

The app bundles:
- `libmedia3ext.so` — Media3 (ExoPlayer) extension
- `libavcodec.so`, `libavformat.so`, `libavutil.so` — FFmpeg
- `hevc-decode.js` / `hevc-decode.wasm` — WASM HEVC decoder (for web/Chromium fallback)
- `hevcjs-plugin.umd.js` — dash.js HEVC plugin

On browsers without native HEVC support, the app falls back to an external player prompt.

---

## 7. TCrypterSdk (Device Encryption)

- **Algorithm**: AES-256-CBC
- **Key**: 32 bytes, derived from device credentials via `rs.d()`
- **IV**: 16 bytes (second half of derived key)
- **Storage**: SharedPreferences named `tcrypto`
- **Format**: `ciphertext_splitKey` (split by `_`)
- **Purpose**: Encrypting local data (not used for API auth)

---

## 8. Permissions (60 total — notable ones)

| Permission | Purpose |
|-----------|---------|
| `INTERNET` | API access |
| `ACCESS_NETWORK_STATE` / `ACCESS_WIFI_STATE` | Network detection |
| `CAMERA` / `RECORD_AUDIO` | Social features |
| `READ_MEDIA_VIDEO` / `READ_MEDIA_IMAGES` | Media access |
| `MANAGE_EXTERNAL_STORAGE` | Downloads |
| `REQUEST_INSTALL_PACKAGES` | Self-update |
| `SYSTEM_ALERT_WINDOW` | Floating player |
| `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | Background playback |
| `POST_NOTIFICATIONS` | Push notifications |
| `com.android.vending.BILLING` | In-app purchases |

---

## 9. Key Differences: APK vs Worker Implementation

| Aspect | APK (Original) | Worker (Our Implementation) |
|--------|---------------|---------------------------|
| HMAC algo | HmacSHA256 (primary) | HmacMD5 |
| Secret source | Manifest meta-data, runtime | Hardcoded constants |
| Alt key retry | Yes (via `d` enum) | Yes (useAlt flag) |
| Gateway proxy | `apigateway.tmctool.com` | Direct to API hosts |
| Time sync | `GW.4410` error → store offset | Not implemented |
| Auth token | `x-user` header from `/search-suggest` | Same approach |
| QUIC | Cronet with QUIC hints | Standard fetch() |
| Gzip body | Bodies > 100KB gzip-compressed | Not implemented |
| Client info | Full device blob | Simplified |

The worker uses HmacMD5 because Cloudflare Workers' `crypto.subtle` doesn't support MD5 natively (we use the MD5 digest), and we match the APK's alternate key path. The signing format (`timestamp|2|base64_hmac`) is identical to the APK's.