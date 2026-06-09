/**
 * ============================================================
 *  MOVIEBOX CLOUDFLARE WORKER  — v5.1.0 (signed HMAC-MD5 + KV cache +
 *  English-only content filter + time-sync + host pool)
 *  Reverse-engineered from:
 *    - moviebox-api Python lib v0.5.4 (github.com/Simatwa/moviebox-api)
 *    - Android APK com.community.mbox.in v3.0.08.0911.03
 *
 *  Live backend (signed, working as of 2026-06-08):
 *    https://api6.aoneroom.com
 *    https://api5.aoneroom.com
 *    https://api4.aoneroom.com
 *    https://api4sg.aoneroom.com
 *    https://api3.aoneroom.com
 *    https://api6sg.aoneroom.com
 *    https://api.inmoviebox.com
 *
 *  Routes exposed (all prefixed with /api):
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │ Core (27)                                                    │
 *  │ GET /api/search       ?q=&type=movies|tv_series&page=&perPage=
 *  │ POST /api/search/v2   {keyword, page, perPage, subjectType}
 *  │ GET /api/search-rank  ?keyword=&perPage=
 *  │ GET /api/details      ?id=<subjectId>
 *  │ GET /api/trending     ?tabId=All|Movie|TV&page=
 *  │ GET /api/homepage     ?tabId=0&page=1
 *  │ GET /api/play-info    ?id=&season=&episode=
 *  │ GET /api/season-info  ?id=
 *  │ GET /api/stream       ?id=&season=&episode=&quality=best|1080p|...
 *  │ GET /api/subtitle     ?id=&resourceId=
 *  │ GET /api/health                                             │
 *  │ GET /api/probe                                              │
 *  │ GET /api/mirrors                                            │
 *  │                                                               │
 *  │ APK-mapped (12) — added in v5                                │
 *  │ GET /api/search-suggest    ?keyword=&perPage=&resultMode=   │
 *  │ POST /api/shorts/most-trending  {page, perPage}              │
 *  │ GET  /api/shorts/favorite-list  ?page=&perPage=              │
 *  │ GET  /api/shorts/get-info   ?id=                              │
 *  │ GET  /api/shorts/mini-list  ?id=&startPosition=&endPosition= │
 *  │ GET  /api/resource         ?id=&page=&perPage=&resolution=…  │
 *  │ GET  /api/staff-info       ?id=                              │
 *  │ GET  /api/staff-related    ?id=                              │
 *  │ POST /api/daily-movie-rec  (server picks today's pick)       │
 *  │ POST /api/widget           (home-screen widget payload)      │
 *  │ GET  /api/playlist/content ?id=                              │
 *  │ POST /api/trending/v2      {tabId, page}                     │
 *  └──────────────────────────────────────────────────────────────┘
 *
 *  Authentication:
 *    - Per-request HMAC-MD5 signature using a base64-encoded shared secret
 *    - X-Client-Token: "<ts>,<md5(reverse(ts))>"
 *    - x-tr-signature: "<ts>|2|<base64(hmac-md5(canonical, key))>"
 *    - Bearer token from /search-suggest's x-user header (cached in KV)
 *    - Time-sync: auto-corrects clock drift on GW.4410 errors
 * ============================================================
 */

// ────────────────────────────────────────────────────────────
//  CRYPTO CONSTANTS (from moviebox_api/v3/constants.py)
// ────────────────────────────────────────────────────────────

// Secrets can be overridden via Worker env bindings (recommended for production).
// Fall back to the reversed keys so the script works locally without extra config.
const _SECRET_DEFAULT = "76iRl07s0xSN9jqmEWAt79EBJZulIQIsV64FZr2O";
const _SECRET_ALT     = "Xqn2nnO41/L92o1iuXhSLHTbXvY4Z5ZZ62m8mSLA";
const SIGNATURE_BODY_MAX_BYTES = 102400;

function secretKey(useAlt, env) {
  if (env) {
    if (useAlt && env.SECRET_KEY_ALT) return env.SECRET_KEY_ALT;
    if (!useAlt && env.SECRET_KEY_DEFAULT) return env.SECRET_KEY_DEFAULT;
  }
  return useAlt ? _SECRET_ALT : _SECRET_DEFAULT;
}

// CLIENT_INFO blob (matches the v3 lib's _generate_client_info output).
// The lib randomises device/version per call, but a stable string is enough
// for the server to accept requests — the server only checks the structure.
const CLIENT_INFO = JSON.stringify({
  package_name: "com.community.oneroom",
  version_name: "3.0.03.0529.03",
  version_code: 50020046,
  os: "android",
  os_version: "13",
  install_ch: "ps",
  device_id: "86db00000000000086db000000000000",
  install_store: "ps",
  gaid: "86db0000000000-0000-0000-0000-000000000000",
  brand: "Redmi",
  model: "M2012K11AG",
  system_language: "en",
  net: "NETWORK_WIFI",
  region: "US",
  timezone: "Africa/Nairobi",
  sp_code: "40401",
  "X-Play-Mode": "2"
});

const USER_AGENT =
  "com.community.oneroom/50020046 " +
  "(Linux; U; Android 13; en_US; M2012K11AG; Build/TQ2A.230405.003; Cronet/135.0.7012.3)";

const RETRY_STATUS_CODES = new Set([403, 407, 429, 500, 502, 503, 504]);

const HOST_POOL = [
  "https://api6.aoneroom.com",
  "https://api5.aoneroom.com",
  "https://api4.aoneroom.com",
  "https://api4sg.aoneroom.com",
  "https://api3.aoneroom.com",
  "https://api6sg.aoneroom.com",
  "https://api.inmoviebox.com",
];

// ────────────────────────────────────────────────────────────
//  CRYPTO  (mirrors moviebox_api/v3/crypto.py)
// ────────────────────────────────────────────────────────────

function b64Decode(value) {
  let v = value;
  while (v.length % 4 !== 0) v += "=";
  // atob handles standard base64
  const bin = atob(v);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64Encode(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function md5HexBytes(bytes) {
  const buf = await crypto.subtle.digest("MD5", bytes);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function md5HexString(str) {
  return md5HexBytes(new TextEncoder().encode(str));
}

function reverseString(s) { return s.split("").reverse().join(""); }

async function xClientToken(tsMs) {
  const s = String(tsMs);
  const h = await md5HexString(reverseString(s));
  return `${s},${h}`;
}

function sortedQueryString(url) {
  const u = new URL(url);
  const params = [...u.searchParams.entries()].sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  if (params.length === 0) return "";
  return params.map(([k, v]) => `${k}=${v}`).join("&");
}

async function xTrSignature(method, accept, ctype, url, body, tsMs, useAlt = false, env = null) {
  const u = new URL(url);
  const path = u.pathname || "";
  const sorted = sortedQueryString(url);
  const canonicalUrl = sorted ? `${path}?${sorted}` : path;

  let bodyHash = "", bodyLen = "";
  if (body != null) {
    const enc = new TextEncoder().encode(body);
    const truncated = enc.slice(0, SIGNATURE_BODY_MAX_BYTES);
    bodyHash = await md5HexBytes(truncated);
    bodyLen = String(truncated.length);
  }
  const canonical = [
    method.toUpperCase(),
    accept || "",
    ctype || "",
    bodyLen,
    String(tsMs),
    bodyHash,
    canonicalUrl,
  ].join("\n");

  const secret = b64Decode(secretKey(useAlt, env));
  // Protocol version |2| is always present regardless of algorithm.
  // The APK supports MD5/SHA1/SHA256, but the live API accepts MD5.
  const key = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "MD5" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonical));
  return `${tsMs}|2|${b64Encode(new Uint8Array(sig))}`;
}

async function buildSignedHeaders(method, url, opts = {}) {
  const { body = null, accept = "application/json", contentType = "application/json", authToken = null, env = null } = opts;
  const ts = Date.now() + state.timeOffset;
  const xct = await xClientToken(ts);
  const sig = await xTrSignature(method, accept, contentType, url, body, ts, false, env);
  const headers = {
    "User-Agent":      USER_AGENT,
    "Accept":          accept,
    "Content-Type":    contentType,
    "Connection":      "keep-alive",
    "X-Client-Token":  xct,
    "x-tr-signature":  sig,
    "X-Client-Info":   CLIENT_INFO,
    "X-Client-Status": "0",
  };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  return headers;
}

// ────────────────────────────────────────────────────────────
//  STATE
// ────────────────────────────────────────────────────────────

const state = {
  startedAt: Date.now(),
  cacheHits: 0,
  cacheMisses: 0,
  inflight: new Map(),
  activeBase: HOST_POOL[0],
  runtimeToken: null,
  runtimeTokenTs: 0,
  // Time-sync offset (ms) — when the server returns GW.4410, it includes
  // its timestamp. We store serverTs - localTs and add it to all future
  // request timestamps so signatures remain valid despite clock drift.
  timeOffset: 0,
};

const TTL = {
  search:      300,
  details:     1800,
  trending:    300,
  homepage:    300,
  playInfo:    1800,
  seasonInfo:  1800,
  shorts:      600,
  widget:      600,
  staff:       86400,
  playlist:    3600,
  daily:       1800,
};

// ────────────────────────────────────────────────────────────
//  CONTENT-LANGUAGE FILTERS
// ────────────────────────────────────────────────────────────

// Blocklist of upstream `corner` values that indicate non-English regional
// content. The MovieBox backend tags each subject with a language corner
// (e.g. "Hindi", "Tamil", "Telugu", "Spanish", "Portuguese", "Korean Dubbed",
// "Japanese", "Chinese"). We keep only items that are either untagged
// (corner === '' — the default for global English content) or explicitly
// marked "English". Adding a new language here is a one-line change.
const NON_ENGLISH_CORNERS = new Set([
  "Hindi", "Tamil", "Telugu", "Malayalam", "Kannada", "Bengali",
  "Marathi", "Punjabi", "Gujarati", "Urdu",
  "Spanish", "Portuguese", "French", "German", "Italian",
  "Korean Dubbed", "Korean Dub",
  "Japanese", "Chinese", "Thai", "Vietnamese", "Indonesian",
  "Russian", "Turkish", "Arabic",
]);

function isEnglishItem(item) {
  if (!item) return false;
  const corner = (item.corner || "").toString().trim();
  if (!corner) return true;                 // untagged = global English
  if (corner === "English") return true;    // explicit English
  return !NON_ENGLISH_CORNERS.has(corner);
}

function filterEnglish(items) {
  if (!Array.isArray(items)) return [];
  return items.filter(isEnglishItem);
}

// ────────────────────────────────────────────────────────────
//  QUALITY NORMALISER
// ────────────────────────────────────────────────────────────

function normaliseQuality(input) {
  if (!input) return 1080; // default to 1080p
  const q = String(input).toLowerCase().trim();
  if (/^(4k|uhd|2160|2160p)$/.test(q))                 return 2160;
  if (/^(fhd|1080|1080p|full[\s-]?hd|best|highest)$/.test(q)) return 1080;
  if (/^(hd|720|720p)$/.test(q))                       return 720;
  if (/^(sd|480|480p)$/.test(q))                       return 480;
  if (/^(360|360p|low|worst|lowest)$/.test(q))         return 360;
  return 1080;
}

// ────────────────────────────────────────────────────────────
//  CACHE LAYER
// ────────────────────────────────────────────────────────────

function memCache() {
  if (!memCache._store) memCache._store = new Map();
  return memCache._store;
}

async function cacheGet(env, key) {
  if (env && env.CACHE) {
    try {
      const v = await env.CACHE.get(key, { type: "json" });
      if (v) { state.cacheHits++; return { value: v, source: "cache-kv" }; }
    } catch (_) {}
  }
  const store = memCache();
  const mem = store.get(key);
  if (mem) {
    if (mem.expires > Date.now()) {
      state.cacheHits++;
      return { value: mem.value, source: "cache-mem" };
    }
    store.delete(key);
  }
  state.cacheMisses++;
  return null;
}

async function cachePut(env, key, value, ttlSeconds) {
  if (env && env.CACHE) {
    try {
      await env.CACHE.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
      return;
    } catch (_) {}
  }
  memCache().set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
}

// ────────────────────────────────────────────────────────────
//  TOKEN  (from /search-suggest's x-user header)
// ────────────────────────────────────────────────────────────

async function getAuthToken(env) {
  // Use runtime token if fresh (< 1h)
  if (state.runtimeToken && Date.now() - state.runtimeTokenTs < 60 * 60 * 1000) {
    return state.runtimeToken;
  }
  // Otherwise try to read from KV
  if (env && env.WORKER_STATE) {
    try {
      const stored = await env.WORKER_STATE.get("auth_token", { type: "json" });
      if (stored && stored.token && Date.now() - stored.ts < 60 * 60 * 1000) {
        state.runtimeToken = stored.token;
        state.runtimeTokenTs = stored.ts;
        return stored.token;
      }
    } catch (_) {}
  }
  // No valid cached token — fetch a fresh one from search-suggest
  return await refreshAuthToken(env);
}

async function refreshAuthToken(env) {
  // Hit search-suggest to get x-user
  const base = state.activeBase;
  const path = "/wefeed-mobile-bff/subject-api/search-suggest?keyword=a";
  const url = `${base}${path}`;
  const headers = await buildSignedHeaders("GET", url);
  try {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(8000), redirect: "follow" });
    if (r.ok) {
      const xUser = r.headers.get("x-user");
      if (xUser) {
        try {
          const payload = JSON.parse(xUser);
          if (payload.token) {
            state.runtimeToken = payload.token;
            state.runtimeTokenTs = Date.now();
            if (env && env.WORKER_STATE) {
              try {
                await env.WORKER_STATE.put("auth_token", JSON.stringify({
                  token: payload.token, ts: state.runtimeTokenTs,
                }), { expirationTtl: 3600 });
              } catch (_) {}
            }
            return payload.token;
          }
        } catch (_) {}
      }
    }
  } catch (_) {}
  return null;
}

// ────────────────────────────────────────────────────────────
//  HTTP / CORS
// ────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":   "*",
  "Access-Control-Allow-Methods":  "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":  "Content-Type, Authorization",
  "Access-Control-Expose-Headers": "X-Response-Source, Retry-After",
};

function json(data, init = {}) {
  const status  = init.status ?? 200;
  const source  = init.source ?? "origin";
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type":      "application/json; charset=utf-8",
      "Cache-Control":     init.cacheControl ?? "no-store",
      "X-Response-Source": source,
      ...CORS_HEADERS,
      ...(init.headers || {}),
    },
  });
}

function err(status, code, message, extra = {}, extraHeaders = {}) {
  return json({ ok: false, error: { code, message, ...extra } }, { status, headers: extraHeaders });
}

async function withDedup(key, fn) {
  if (state.inflight.has(key)) return state.inflight.get(key);
  const p = (async () => {
    try { return await fn(); } finally { state.inflight.delete(key); }
  })();
  state.inflight.set(key, p);
  return p;
}

// ────────────────────────────────────────────────────────────
//  SIGNED REQUEST (host rotation + 407 retry)
// ────────────────────────────────────────────────────────────

async function signedRequest(path, init = {}) {
  const errors = [];
  const method = (init.method || "GET").toUpperCase();
  const accept = init.accept || "application/json";
  const ctype  = init.contentType || (init.body ? "application/json; charset=utf-8" : "application/json");
  const body   = init.body || null;
  const timeoutMs = init.timeoutMs ?? 8000;

  for (const base of HOST_POOL) {
    const url = `${base}${path}`;
    try {
      // Re-sign per host because signature includes the full URL
      const token = init.authToken !== undefined ? init.authToken : await getAuthToken(init.env);
      const headers = await buildSignedHeaders(method, url, {
        body, accept, contentType: ctype, authToken: token, env: init.env,
      });

      const fetchInit = {
        method,
        headers,
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "follow",
      };
      if (body != null) fetchInit.body = body;

      const r = await fetch(url, fetchInit);

      // Stash a fresh x-user token if present
      const xUser = r.headers.get("x-user");
      if (xUser) {
        try {
          const payload = JSON.parse(xUser);
          if (payload.token) {
            state.runtimeToken = payload.token;
            state.runtimeTokenTs = Date.now();
            if (init.env && init.env.WORKER_STATE) {
              try {
                await init.env.WORKER_STATE.put("auth_token", JSON.stringify({
                  token: payload.token, ts: state.runtimeTokenTs,
                }), { expirationTtl: 3600 });
              } catch (_) {}
            }
          }
        } catch (_) {}
      }

      if (r.status === 407) {
        // Signature invalid — try with the alt key, using a *single* fresh timestamp
        const altTs = Date.now() + state.timeOffset;
        const altXct = await xClientToken(altTs);
        const altSig = await xTrSignature(method, accept, ctype, url, body, altTs, true, init.env);
        const altHeaders = {
          "User-Agent":      USER_AGENT,
          "Accept":          accept,
          "Content-Type":    ctype,
          "Connection":      "keep-alive",
          "X-Client-Token":  altXct,
          "x-tr-signature":  altSig,
          "X-Client-Info":   CLIENT_INFO,
          "X-Client-Status": "0",
        };
        if (token) altHeaders["Authorization"] = `Bearer ${token}`;
        const r2 = await fetch(url, { ...fetchInit, headers: altHeaders });
        if (r2.status !== 407) {
          state.activeBase = base;
          return { ok: r2.ok, status: r2.status, body: await r2.text(), backend: base };
        }
        errors.push({ backend: base, status: 407 });
        continue;
      }

      // Time-sync: if server returns GW.4410 (clock drift), store the
      // offset and retry with corrected timestamps.
      if (r.ok) {
        const text = await r.text();
        let data;
        try { data = JSON.parse(text); } catch { data = null; }
        if (data && (data.code === 4410 || data.code === "GW.4410")) {
          const serverTs = parseInt(data?.data?.timestamp || data?.data?.serverTimestamp || "0", 10);
          if (serverTs > 0) {
            state.timeOffset = serverTs - Date.now();
            console.log(`[worker] time-sync: offset=${state.timeOffset}ms (server=${serverTs})`);
          }
          // Retry with corrected timestamp
          const retryTs = Date.now() + state.timeOffset;
          const retryXct = await xClientToken(retryTs);
          const retrySig = await xTrSignature(method, accept, ctype, url, body, retryTs, false, init.env);
          const retryHeaders = {
            "User-Agent":      USER_AGENT,
            "Accept":          accept,
            "Content-Type":    ctype,
            "Connection":      "keep-alive",
            "X-Client-Token":  retryXct,
            "x-tr-signature":  retrySig,
            "X-Client-Info":   CLIENT_INFO,
            "X-Client-Status": "0",
          };
          if (token) retryHeaders["Authorization"] = `Bearer ${token}`;
          const r3 = await fetch(url, { ...fetchInit, headers: retryHeaders });
          if (!RETRY_STATUS_CODES.has(r3.status)) {
            state.activeBase = base;
            return { ok: r3.ok, status: r3.status, body: await r3.text(), backend: base };
          }
          // Retry also failed — fall through to next host
          errors.push({ backend: base, status: r3.status });
          continue;
        }
        // Normal 200 response
        state.activeBase = base;
        return { ok: true, status: 200, body: text, backend: base };
      }
      if (RETRY_STATUS_CODES.has(r.status)) {
        errors.push({ backend: base, status: r.status });
        continue;
      }
      state.activeBase = base;
      return { ok: r.ok, status: r.status, body: await r.text(), backend: base };
    } catch (e) {
      errors.push({ backend: base, error: String(e.message || e) });
    }
  }
  return { ok: false, status: 502, errors };
}

// ────────────────────────────────────────────────────────────
//  ROUTE HANDLERS
// ────────────────────────────────────────────────────────────

async function handleSearch(url, env) {
  const q        = url.searchParams.get("q") || "";
  const typeRaw  = url.searchParams.get("type") || "all";
  const page     = parseInt(url.searchParams.get("page") || "1", 10);
  const perPage  = Math.min(20, parseInt(url.searchParams.get("perPage") || "20", 10));

  if (!q.trim()) return err(400, "missing_query", "q parameter required");

  // Map friendly type to subjectType int
  const TYPE_MAP = { all: 0, movies: 1, tv_series: 2, education: 5, music: 6, anime: 7, other: 8 };
  const subjectType = TYPE_MAP[String(typeRaw).toLowerCase()] ?? 0;

  const cacheKey = `search:${q}:${typeRaw}:${page}:${perPage}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  // POST to /wefeed-mobile-bff/subject-api/search per v3 spec
  const path = "/wefeed-mobile-bff/subject-api/search";
  const base = state.activeBase;
  const body = JSON.stringify({
    keyword: q, page, perPage, subjectType,
  });

  const r = await withDedup(`search:${q}:${typeRaw}:${page}:${perPage}`, async () => {
    // The signedRequest signs each host URL, but our body is the same,
    // so we can let it loop internally.
    return signedRequest(path, { method: "POST", body, env, timeoutMs: 10000 });
  });

  if (!r.ok && r.status === 502) {
    return err(502, "all_backends_failed", "No backend responded", { attempts: r.errors });
  }
  if (r.status === 429) {
    return err(429, "upstream_rate_limited", "Origin returned 429", {
      backend: r.backend,
    });
  }
  if (r.status === 407) {
    return err(407, "signature_invalid", "Upstream rejected signature", {
      backend: r.backend,
    });
  }

  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  // Normalise: unwrap "data" and return items array
  const items = data?.data?.items || data?.items || [];
  const pager = data?.data?.pager || data?.pager || null;

  const payload = {
    ok: true,
    data: items,
    pager,
    backend: r.backend,
  };
  await cachePut(env, cacheKey, payload, TTL.search);
  return json(payload, { source: "origin", cacheControl: "public, max-age=60" });
}

async function handleSearchV2(url, env) {
  const q        = url.searchParams.get("q") || "";
  const typeRaw  = url.searchParams.get("type") || "all";
  const page     = parseInt(url.searchParams.get("page") || "1", 10);
  const perPage  = Math.min(20, parseInt(url.searchParams.get("perPage") || "20", 10));

  if (!q.trim()) return err(400, "missing_query", "q parameter required");

  const TYPE_MAP = { all: 0, movies: 1, tv_series: 2, education: 5, music: 6, anime: 7, other: 8 };
  const subjectType = TYPE_MAP[String(typeRaw).toLowerCase()] ?? 0;

  const cacheKey = `searchV2:${q}:${typeRaw}:${page}:${perPage}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = "/wefeed-mobile-bff/subject-api/search/v2";
  const body = JSON.stringify({ keyword: q, page, perPage, subjectType });

  const r = await withDedup(`searchV2:${q}:${typeRaw}:${page}:${perPage}`, () =>
    signedRequest(path, { method: "POST", body, env, timeoutMs: 10000 })
  );

  if (!r.ok && r.status === 502) return err(502, "all_backends_failed", "No backend responded", { attempts: r.errors });
  if (r.status === 429) return err(429, "upstream_rate_limited", "Origin returned 429", { backend: r.backend });

  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const items = data?.data?.items || data?.items || [];
  const pager = data?.data?.pager || data?.pager || null;

  const payload = { ok: true, data: items, pager, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.search);
  return json(payload, { source: "origin", cacheControl: "public, max-age=60" });
}

async function handleSearchRank(url, env) {
  const keyword = url.searchParams.get("keyword") || "";
  const perPage = parseInt(url.searchParams.get("perPage") || "10", 10);

  const cacheKey = `searchRank:${keyword}:${perPage}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = `/wefeed-mobile-bff/subject-api/search-rank/v2?keyword=${encodeURIComponent(keyword)}&perPage=${perPage}`;
  const r = await withDedup(`searchRank:${keyword}:${perPage}`, () => signedRequest(path, { method: "GET", env }));

  if (!r.ok && r.status === 502) return err(502, "all_backends_failed", "No backend responded", { attempts: r.errors });

  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.search);
  return json(payload, { source: "origin", cacheControl: "public, max-age=300" });
}

async function handleDetails(url, env) {
  const id = url.searchParams.get("id");
  if (!id) return err(400, "missing_id", "id parameter required");

  const cacheKey = `details:${id}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = `/wefeed-mobile-bff/subject-api/get?subjectId=${encodeURIComponent(id)}`;
  const r = await withDedup(`details:${id}`, () => signedRequest(path, { method: "GET", env }));

  if (!r.ok && r.status === 502) {
    return err(502, "all_backends_failed", "No backend responded", { attempts: r.errors });
  }

  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  // If the upstream returned an error body (TARGET_NOT_FOUND), pass it on
  if (data && data.code && data.code !== 0) {
    return err(404, "not_found", data.message || "Not found", { code: data.code, id });
  }

  const subject = data?.data || data;
  const payload = { ok: true, data: subject, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.details);
  return json(payload, { source: "origin", cacheControl: "public, max-age=300" });
}

async function handlePlayInfo(url, env) {
  const id      = url.searchParams.get("id");
  const season  = parseInt(url.searchParams.get("season") || "0", 10);
  const episode = parseInt(url.searchParams.get("episode") || "0", 10);
  if (!id) return err(400, "missing_id", "id parameter required");

  const cacheKey = `playInfo:${id}:${season}:${episode}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = `/wefeed-mobile-bff/subject-api/play-info?subjectId=${encodeURIComponent(id)}&se=${season}&ep=${episode}`;
  const r = await withDedup(`playInfo:${id}:${season}:${episode}`, () => signedRequest(path, { method: "GET", env }));

  if (!r.ok && r.status === 502) {
    return err(502, "all_backends_failed", "No backend responded", { attempts: r.errors });
  }

  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.playInfo);
  return json(payload, { source: "origin", cacheControl: "public, max-age=600" });
}

async function handleSeasonInfo(url, env) {
  const id = url.searchParams.get("id");
  if (!id) return err(400, "missing_id", "id parameter required");

  const cacheKey = `seasonInfo:${id}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = `/wefeed-mobile-bff/subject-api/season-info?subjectId=${encodeURIComponent(id)}`;
  const r = await withDedup(`seasonInfo:${id}`, () => signedRequest(path, { method: "GET", env }));

  if (!r.ok && r.status === 502) {
    return err(502, "all_backends_failed", "No backend responded", { attempts: r.errors });
  }

  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.seasonInfo);
  return json(payload, { source: "origin", cacheControl: "public, max-age=600" });
}

async function handleStream(url, env) {
  // Streams come from the play-info endpoint. We prefer:
  //   1. resourceDetectors[*].downloadUrl — direct mp4 already signed, plays anywhere
  //   2. resourceDetectors[*].resolutionList[*].resourceLink — alternate per-resolution links
  //   3. streams[*].url — DASH mpd; CloudFront needs the signCookie
  const id      = url.searchParams.get("id");
  const season  = parseInt(url.searchParams.get("season") || "0", 10);
  const episode = parseInt(url.searchParams.get("episode") || "0", 10);
  const quality = normaliseQuality(url.searchParams.get("quality") || "1080p");
  if (!id) return err(400, "missing_id", "id parameter required");

  const cacheKey = `stream:v2:${id}:${season}:${episode}:${quality}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  // 1) play-info
  const piPath = `/wefeed-mobile-bff/subject-api/play-info?subjectId=${encodeURIComponent(id)}&se=${season}&ep=${episode}`;
  const piR = await withDedup(`pi:${id}:${season}:${episode}`, () => signedRequest(piPath, { method: "GET", env }));
  if (!piR.ok && piR.status === 502) {
    return err(502, "all_backends_failed", "No backend responded", { attempts: piR.errors });
  }

  let playInfo;
  try { playInfo = JSON.parse(piR.body); } catch { playInfo = {}; }
  const piData = playInfo?.data || {};
  const streams   = piData.streams || [];
  const detectors = piData.resourceDetectors || [];

  // 2) prefer resourceDetectors (direct mp4)
  let bestStream = null;
  for (const d of detectors) {
    // resourceLink is the resolution-specific mp4 url
    const links = d.resolutionList || [];
    const match = links.find(l => l.resolution === quality) || links[0];
    if (!match) continue;
    bestStream = {
      url: match.resourceLink || d.downloadUrl,
      resolution: match.resolution ?? d.resolution,
      format: (match.resourceLink || d.downloadUrl || "").includes(".m3u8") ? "hls" : "mp4",
      size: match.size || d.totalSize,
      source: d.source,
      resourceId: d.resourceId,
    };
    break;
  }

  // Helper: extract resolution from stream URL when upstream omits it
  function guessResolution(url) {
    if (!url) return 0;
    const m = url.match(/_(\d{3,4})_[a-z0-9]+_\d+/);
    return m ? parseInt(m[1], 10) : 0;
  }

  // 3) fall back to streams (DASH/MPD — needs signCookie)
  if (!bestStream) {
    // Augment streams with guessed resolution from URL
    const augmented = streams.map(s => ({ ...s, _res: s.resolution || guessResolution(s.url) }));
    for (const s of augmented) {
      if (s._res === quality) { bestStream = s; break; }
    }
    if (!bestStream && augmented.length > 0) {
      augmented.sort((a, b) => b._res - a._res);
      bestStream = augmented[0];
    }
  }

  if (!bestStream) {
    return err(404, "no_stream", "No stream found for this title/season/episode", { id, season, episode, quality });
  }

  const chosenUrl = bestStream.url || bestStream.mpd || bestStream.hls;
  const isDash    = (chosenUrl || "").includes(".mpd");
  const isHls     = (chosenUrl || "").includes(".m3u8");
  const actualRes = bestStream.resolution || bestStream._res || guessResolution(chosenUrl) || quality;
  const fmt       = isHls ? "hls" : isDash ? "dash" : (bestStream.format || "mp4");
  const mimeType  = isHls ? "application/x-mpegURL" : isDash ? "application/dash+xml" : "video/mp4";

  // For DASH streams, the upstream provides a CloudFront-Policy/Signature cookie pair.
  // Browsers won't let JS set third-party cookies for the CDN, so we route the
  // manifest + segments through our own /api/proxy which attaches the cookies.
  let cookies = [];
  if (bestStream.signCookie) {
    for (const part of String(bestStream.signCookie).split(";")) {
      const [k, ...v] = part.trim().split("=");
      if (k && v.length) cookies.push(`${k}=${v.join("=")}`);
    }
  }

  // We re-introduce a tiny proxy because the upstream CDN requires CloudFront
  // signed cookies on every request, and browsers / VLC / IINA can't attach
  // a `Cookie` header to deep-link opens. The proxy accepts the same URL
  // the user already has, attaches the cookies, and forwards — so
  // `vlc://…/api/proxy?token=…` and `iina://…/api/proxy?token=…` Just Work
  // with zero client-side cookie handling.
  const finalUrl = chosenUrl;
  const referer = `https://${new URL(chosenUrl).host}/`;

  // For DASH we expose two URLs:
  //   - `url`        → the raw upstream MPD (debugging / mpv with manual cookies)
  //   - `proxyUrl`   → the worker-side proxy that re-attaches cookies on
  //                    every segment request (browsers, VLC, IINA)
  let proxyUrl = null;
  if (isDash && cookies.length > 0) {
    // Derive the CDN base directory URL (strip the MPD filename)
    const mpdUrl = new URL(chosenUrl);
    const cdnBase = mpdUrl.href.substring(0, mpdUrl.href.lastIndexOf("/") + 1);
    const streamProxyId = await stashProxy(env, { url: chosenUrl, cdnBase, cookies, referer });
    proxyUrl = `/api/proxy?token=${streamProxyId}`;
  }

  const payload = {
    ok: true,
    data: {
      url: proxyUrl ?? finalUrl,         // primary URL the player/VLC opens
      rawUrl: finalUrl,                   // raw upstream URL (for debug)
      resolution: actualRes,
      quality: actualRes >= 2160 ? "4k" : actualRes >= 1080 ? "1080p" : actualRes >= 720 ? "720p" : actualRes >= 480 ? "480p" : "360p",
      format: fmt,
      mimeType: mimeType,
      size: bestStream.size,
      source: bestStream.source,
      cookies,                            // exposed for clients that can set them
      referer,
      proxyUrl,                           // explicit proxy URL for external players
      resourceId: bestStream.resourceId,
      proxied: !!proxyUrl,
    },
    backend: piR.backend,
  };
  await cachePut(env, cacheKey, payload, TTL.playInfo);

  // Don't set cross-origin Set-Cookie (browsers will ignore it). The proxy route
  // takes care of forwarding the cookies to the CDN.
  return json(payload, { source: "origin" });
}

// ── DASH proxy: stash cookies + manifest URL, then forward ──

async function stashProxy(env, payload) {
  const token = crypto.randomUUID();
  const now = Date.now();
  if (env && env.CACHE) {
    try {
      await env.CACHE.put(`proxy:${token}`, JSON.stringify(payload), { expirationTtl: 3600 });
    } catch (_) {}
  }
  // Also stash in in-memory map as a fallback (KV writes are best-effort)
  if (!state.proxies) state.proxies = new Map();
  // Simple eviction: remove entries older than 70 min every ~50 inserts
  if (state.proxies.size > 0 && state.proxies.size % 50 === 0) {
    const cutoff = now - 70 * 60 * 1000;
    for (const [k, v] of state.proxies) {
      if (v.stashedAt < cutoff) state.proxies.delete(k);
    }
  }
  state.proxies.set(token, { ...payload, stashedAt: now });
  return token;
}

async function handleProxy(url, env, request) {
  // ── Two proxy URL schemes ──
  //
  // 1. Query-based (legacy): /api/proxy?token=TOKEN[&p=ENCODED_URL]
  //    - `p` is the full upstream URL (for direct MP4/HLS URLs)
  //    - Without `p`, serves the stashed manifest URL (for initial MPD fetch)
  //
  // 2. Path-based (DASH segments): /api/proxy/TOKEN/segment/path.m4s
  //    - TOKEN is the proxy token
  //    - The path after TOKEN/ is appended to the stashed CDN base directory
  //    - Preserves DASH template tokens ($RepresentationID$, $Number%05d$)
  //      because they are never URL-encoded in the path segment

  const pathname = new URL(request.url).pathname;
  let token, segPath;

  // Check for path-based scheme: /api/proxy/TOKEN/path...
  const pathMatch = pathname.match(/^\/api\/proxy\/([0-9a-f-]+)\/(.+)$/i);
  if (pathMatch) {
    token = pathMatch[1];
    segPath = decodeURIComponent(pathMatch[2]);
  } else {
    token = url.searchParams.get("token");
  }

  if (!token) return err(400, "missing_token", "token parameter required");

  // Recover the stashed proxy payload
  let stash = null;
  if (env && env.CACHE) {
    try {
      stash = await env.CACHE.get(`proxy:${token}`, { type: "json" });
    } catch (_) {}
  }
  if (!stash && state.proxies) {
    stash = state.proxies.get(token);
  }
  if (!stash) return err(404, "proxy_not_found", "Proxy token expired or unknown", { token });

  const { url: baseUrl, cdnBase, cookies, referer } = stash;
  const overridePath = url.searchParams.get("p");
  let upstreamUrl;

  try {
    if (segPath) {
      // Path-based: append segment path to CDN base directory
      const base = cdnBase || (baseUrl.substring(0, baseUrl.lastIndexOf("/") + 1));
      upstreamUrl = base + segPath;
    } else if (overridePath) {
      // Query-based override: full URL provided
      const parsed = new URL(overridePath, baseUrl);
      const baseHost = new URL(baseUrl).host;
      if (parsed.host !== baseHost) {
        return err(400, "invalid_path", "Proxy path must be on the same origin as the stashed base URL");
      }
      upstreamUrl = parsed.toString();
    } else {
      // No override — serve the stashed manifest URL
      upstreamUrl = baseUrl;
    }
  } catch (e) {
    return err(400, "invalid_url", String(e.message || e));
  }

  const host = new URL(baseUrl).host;
  const headers = {
    "User-Agent":      USER_AGENT,
    "Accept":          request.headers.get("accept") || "*/*",
    "Accept-Encoding": "identity",
    "Cookie":          cookies.join("; "),
    "Referer":         referer || `https://${host}/`,
    "Origin":          `https://${host}`,
  };
  // Forward Range header for DASH segment byte-range requests
  const range = request.headers.get("range");
  if (range) headers["Range"] = range;

  let upstream;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    return err(502, "upstream_fetch_failed", String(e.message || e));
  }

  // For .mpd manifests, rewrite URLs to route through our proxy.
  // Key design: instead of encoding DASH template tokens ($RepresentationID$,
  // $Number%05d$) in query parameters (which breaks dash.js template substitution),
  // we inject a <BaseURL> pointing to /api/proxy/TOKEN/ and keep SegmentTemplate
  // paths relative. dash.js resolves relative paths against BaseURL, so templates
  // remain intact and are substituted *before* the request URL is constructed.
  const ct = upstream.headers.get("content-type") || "";
  const isMpd = upstreamUrl.includes(".mpd") || ct.includes("dash+xml") || ct.includes("application/xml");
  if (isMpd) {
    let body = await upstream.text();
    const cdnDir = cdnBase || (baseUrl.substring(0, baseUrl.lastIndexOf("/") + 1));

    // 1) Remove any existing <BaseURL> elements (they point to the CDN directly)
    body = body.replace(/<BaseURL>[^<]*<\/BaseURL>\s*\n?/g, "");

    // 2) Inject our proxy BaseURL right after the opening <MPD> tag and its attributes
    //    dash.js will resolve all relative SegmentTemplate paths against this.
    //    Use an absolute URL so cross-origin DASH players (dash.js on a different origin)
    //    can resolve segment paths correctly.
    const proxyOrigin = new URL(request.url).origin;
    const proxyBase = `${proxyOrigin}/api/proxy/${token}/`;
    body = body.replace(
      /(<MPD[\s\S]*?>)/,
      `$1\n\t\t<BaseURL>${proxyBase}</BaseURL>`
    );

    // 3) For any absolute URLs still present in SegmentTemplate attributes,
    //    convert them to relative paths. The BaseURL handles routing.
    body = body.replace(
      /(\s(?:initialization|media|sourceURL)=")([^"]+)(")/g,
      (m, pre, val, post) => {
        // If the value is an absolute CDN URL, strip it to a relative path
        if (val.startsWith("http://") || val.startsWith("https://")) {
          try {
            const absUrl = new URL(val, baseUrl);
            // Only rewrite URLs that point to the same CDN
            if (absUrl.host === new URL(baseUrl).host) {
              // Extract the path relative to the CDN base directory
              const rel = absUrl.href.substring(cdnDir.length);
              return `${pre}${rel}${post}`;
            }
          } catch (_) {}
        }
        // If already relative, leave it as-is — BaseURL handles it
        return m;
      }
    );

    // 4) Also rewrite any <BaseURL> that reappears (e.g., inside Period/AdaptationSet)
    //    to point through our proxy
    body = body.replace(
      /<BaseURL>([^<]+)<\/BaseURL>/g,
      (_, p) => {
        const rawVal = p.trim();
        if (rawVal.startsWith("/api/proxy/")) return `<BaseURL>${rawVal}</BaseURL>`;
        // Absolute CDN URL → relative path + BaseURL
        try {
          const absUrl = new URL(rawVal, baseUrl);
          if (absUrl.host === new URL(baseUrl).host) {
            const rel = absUrl.href.substring(cdnDir.length);
            return `<BaseURL>${proxyBase}${rel}</BaseURL>`;
          }
        } catch (_) {}
        return `<BaseURL>${rawVal}</BaseURL>`;
      }
    );

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/dash+xml",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60",
      },
    });
  }

  // For other (segment) requests, pipe the bytes through — preserving range metadata
  const responseHeaders = {
    "Content-Type":      ct,
    "Content-Length":    upstream.headers.get("content-length") || "",
    "Accept-Ranges":     upstream.headers.get("accept-ranges") || "",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control":     "public, max-age=3600",
  };
  const contentRange = upstream.headers.get("content-range");
  if (contentRange) responseHeaders["Content-Range"] = contentRange;

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

async function handleSubtitle(url, env) {
  const id         = url.searchParams.get("id");
  const resourceId = url.searchParams.get("resourceId");
  if (!id || !resourceId) return err(400, "missing_params", "id and resourceId required");

  const cacheKey = `subtitle:${id}:${resourceId}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = `/wefeed-mobile-bff/subject-api/get-ext-captions?subjectId=${encodeURIComponent(id)}&resourceId=${encodeURIComponent(resourceId)}`;
  const r = await withDedup(`subtitle:${id}:${resourceId}`, () => signedRequest(path, { method: "GET", env }));

  if (!r.ok && r.status === 502) {
    return err(502, "all_backends_failed", "No backend responded", { attempts: r.errors });
  }
  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.details);
  return json(payload, { source: "origin" });
}

async function handleTrending(url, env) {
  const tabId = url.searchParams.get("tabId") || "0";
  const page  = parseInt(url.searchParams.get("page") || "1", 10);

  const cacheKey = `trending:v3:en:${tabId}:${page}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = `/wefeed-mobile-bff/tab-operating?page=${page}&tabId=${encodeURIComponent(tabId)}&version=`;
  const r = await withDedup(`trending:${tabId}:${page}`, () => signedRequest(path, { method: "GET", env }));

  if (!r.ok && r.status === 502) {
    return json({ ok: true, data: [], degraded: true, reason: "upstream_unreachable" }, { source: "fallback" });
  }

  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const items = data?.data?.items || [];
  // Flatten: extract subjects from each item group
  const subjects = [];
  for (const item of items) {
    if (item.subjects && item.subjects.length) {
      subjects.push(...item.subjects);
    } else if (item.banner && item.banner.banners) {
      // BANNER type — pull subjects from linked pages
    }
  }
  // English-only filter. The upstream is geo-locked to Indian regional
  // content for this worker's egress IP; we explicitly drop anything with a
  // non-English corner (Hindi, Tamil, Telugu, etc.) so the homepage surfaces
  // global English catalog content only.
  const enSubjects = filterEnglish(subjects);
  const payload = { ok: true, data: enSubjects, raw: items, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.trending);
  return json(payload, { source: "origin", cacheControl: "public, max-age=120" });
}

async function handleHomepage(url, env) {
  // /wefeed-mobile-bff/tab-operating (trending) is geo-locked to Indian regional
  // content for this worker's egress IP. The full global catalog is reachable
  // only via search, so we fan out a handful of English-friendly seed terms,
  // dedupe by subjectId, and return a flat list — the same shape handleTrending
  // used to return, so the existing frontend keeps working.
  const forceRefresh = url.searchParams.get("refresh") === "1";
  const cacheKey = "homepage:v3:en";
  if (!forceRefresh) {
    const cached = await cacheGet(env, cacheKey);
    if (cached) return json(cached.value, { source: cached.source });
  }

  const SEEDS = ["movie", "love", "the", "2024", "2025", "man", "night", "life", "world", "story"];
  const SEEN  = new Set();
  const out   = [];

  // 1 query = 1 upstream call, 10 queries in parallel = 10 calls
  await Promise.all(SEEDS.map(async (q) => {
    try {
      const body = JSON.stringify({ keyword: q, page: 1, perPage: 20, subjectType: 0 });
      const r = await withDedup(`homepageSeed:${q}`, () =>
        signedRequest("/wefeed-mobile-bff/subject-api/search", { method: "POST", body, env, timeoutMs: 8000 })
      );
      if (!r.ok) return;
      let data;
      try { data = JSON.parse(r.body); } catch { return; }
      const items = data?.data?.items || data?.items || [];
      for (const it of items) {
        if (!it || !it.subjectId) continue;
        if (SEEN.has(it.subjectId)) continue;
        // English-only filter (untagged OR explicitly "English", drop
        // every Hindi/regional/dubbed corner).
        if (!isEnglishItem(it)) continue;
        SEEN.add(it.subjectId);
        out.push(it);
      }
    } catch (_) { /* swallow seed failure */ }
  }));

  // Sort: rating desc, then viewers desc
  out.sort((a, b) => {
    const ra = parseFloat(a.imdbRatingValue || a.imdbRate || "0") || 0;
    const rb = parseFloat(b.imdbRatingValue || b.imdbRate || "0") || 0;
    if (rb !== ra) return rb - ra;
    return (b.viewers || 0) - (a.viewers || 0);
  });

  // Cap at 80
  const trimmed = out.slice(0, 80);

  const payload = {
    ok: true,
    data: trimmed,
    source: "search-fanout",
    seeds: SEEDS,
    fetched: trimmed.length,
  };
  await cachePut(env, cacheKey, payload, TTL.homepage);
  return json(payload, { source: "origin", cacheControl: "public, max-age=120" });
}

async function handleMirrors() {
  return json({
    ok: true,
    backends: HOST_POOL.map(u => ({ name: new URL(u).hostname, url: u })),
    active: state.activeBase,
    rotation: "failover-on-407-or-5xx",
  }, { source: "origin" });
}

async function handleHealth(env) {
  const total = state.cacheHits + state.cacheMisses;
  const cacheHitRate = total > 0 ? state.cacheHits / total : 0;
  return json({
    ok: true,
    uptime: Math.floor((Date.now() - state.startedAt) / 1000),
    cacheHitRate,
    cacheHits: state.cacheHits,
    cacheMisses: state.cacheMisses,
    activeBackend: state.activeBase,
    tokenAge: state.runtimeToken ? Math.floor((Date.now() - state.runtimeTokenTs) / 1000) : null,
    timestamp: new Date().toISOString(),
  }, { source: "origin" });
}

async function handleProbe(env) {
  const results = [];
  for (const base of HOST_POOL) {
    const url = `${base}/wefeed-mobile-bff/tab-operating?page=1&tabId=0&version=`;
    const t0 = Date.now();
    try {
      const headers = await buildSignedHeaders("GET", url);
      const r = await fetch(url, { headers, signal: AbortSignal.timeout(5000), redirect: "follow" });
      results.push({
        backend: new URL(base).hostname,
        url: base,
        status: r.status,
        ok: r.ok,
        latencyMs: Date.now() - t0,
        hasUser: !!r.headers.get("x-user"),
      });
    } catch (e) {
      results.push({
        backend: new URL(base).hostname,
        url: base,
        status: 0,
        ok: false,
        latencyMs: Date.now() - t0,
        error: String(e.message || e),
      });
    }
  }
  return json({ ok: true, results, testedAt: new Date().toISOString() }, { source: "origin" });
}

// ── New endpoints from APK reverse engineering ──

async function handleDetailRec(url, env) {
  const subjectId = url.searchParams.get("id");
  if (!subjectId) return err(400, "missing_id", "id parameter required");
  const cacheKey = `detail-rec:${subjectId}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = `/wefeed-mobile-bff/subject-api/detail-rec?host=${encodeURIComponent(subjectId)}`;
  const r = await withDedup(`detail-rec:${subjectId}`, () => signedRequest(path, { method: "GET", env }));
  if (!r.ok && r.status === 502) return err(502, "all_backends_failed", "No backend responded");
  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.details);
  return json(payload, { source: "origin" });
}

async function handleTopRec(url, env) {
  const cacheKey = "top-rec:v1";
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = "/wefeed-mobile-bff/subject-api/top-rec";
  const r = await withDedup("top-rec", () => signedRequest(path, { method: "GET", env }));
  if (!r.ok && r.status === 502) return json({ ok: true, data: [], degraded: true }, { source: "fallback" });
  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.trending);
  return json(payload, { source: "origin", cacheControl: "public, max-age=120" });
}

async function handleBottomTab(url, env) {
  const host = url.searchParams.get("host") || "0";
  const cacheKey = `bottom-tab:${host}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = `/wefeed-mobile-bff/subject-api/bottom-tab?host=${encodeURIComponent(host)}`;
  const r = await withDedup(`bottom-tab:${host}`, () => signedRequest(path, { method: "GET", env }));
  if (!r.ok && r.status === 502) return json({ ok: true, data: [], degraded: true }, { source: "fallback" });
  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.details);
  return json(payload, { source: "origin" });
}

async function handlePlayRelatedRec(url, env) {
  const subjectId = url.searchParams.get("id");
  if (!subjectId) return err(400, "missing_id", "id parameter required");
  const cacheKey = `play-related-rec:${subjectId}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = `/wefeed-mobile-bff/subject-api/play-related-rec?host=${encodeURIComponent(subjectId)}`;
  const r = await withDedup(`play-related-rec:${subjectId}`, () => signedRequest(path, { method: "GET", env }));
  if (!r.ok && r.status === 502) return json({ ok: true, data: [], degraded: true }, { source: "fallback" });
  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.details);
  return json(payload, { source: "origin" });
}

async function handleWantToSee(url, env) {
  const subjectId = url.searchParams.get("id");
  if (!subjectId) return err(400, "missing_id", "id parameter required");

  const body = JSON.stringify({ subjectId });
  const path = "/wefeed-mobile-bff/subject-api/want-to-see";
  const r = await withDedup(`want-to-see:${subjectId}`, () => signedRequest(path, { method: "POST", env, body }));
  if (!r.ok && r.status === 502) return err(502, "all_backends_failed", "No backend responded");
  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  return json({ ok: true, data: data?.data || data, backend: r.backend }, { source: "origin" });
}

async function handleHaveSeen(url, env) {
  const subjectId = url.searchParams.get("id");
  if (!subjectId) return err(400, "missing_id", "id parameter required");

  const body = JSON.stringify({ subjectId });
  const path = "/wefeed-mobile-bff/subject-api/have-seen";
  const r = await withDedup(`have-seen:${subjectId}`, () => signedRequest(path, { method: "POST", env, body }));
  if (!r.ok && r.status === 502) return err(502, "all_backends_failed", "No backend responded");
  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  return json({ ok: true, data: data?.data || data, backend: r.backend }, { source: "origin" });
}

async function handleDubInfo(url, env) {
  const subjectId = url.searchParams.get("id");
  if (!subjectId) return err(400, "missing_id", "id parameter required");
  const cacheKey = `dub-info:${subjectId}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = `/wefeed-mobile-bff/subject-api/dub-info?subjectId=${encodeURIComponent(subjectId)}`;
  const r = await withDedup(`dub-info:${subjectId}`, () => signedRequest(path, { method: "GET", env }));
  if (!r.ok && r.status === 502) return err(502, "all_backends_failed", "No backend responded");
  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.details);
  return json(payload, { source: "origin" });
}

async function handleFilterItems(url, env) {
  const tabId    = url.searchParams.get("tabId") || "0";
  const page     = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20", 10);
  const cacheKey = `filter-items:${tabId}:${page}:${pageSize}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = `/wefeed-mobile-bff/subject-api/filter-items?tabId=${encodeURIComponent(tabId)}&page=${page}&pageSize=${pageSize}`;
  const r = await withDedup(`filter-items:${tabId}:${page}`, () => signedRequest(path, { method: "GET", env }));
  if (!r.ok && r.status === 502) return json({ ok: true, data: [], degraded: true }, { source: "fallback" });
  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.trending);
  return json(payload, { source: "origin", cacheControl: "public, max-age=120" });
}

async function handleList(url, env) {
  const listId   = url.searchParams.get("id") || url.searchParams.get("listId") || "0";
  const page     = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20", 10);
  const cacheKey = `list:${listId}:${page}:${pageSize}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = `/wefeed-mobile-bff/subject-api/list?id=${encodeURIComponent(listId)}&page=${page}&pageSize=${pageSize}`;
  const r = await withDedup(`list:${listId}:${page}`, () => signedRequest(path, { method: "GET", env }));
  if (!r.ok && r.status === 502) return json({ ok: true, data: [], degraded: true }, { source: "fallback" });
  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.trending);
  return json(payload, { source: "origin", cacheControl: "public, max-age=120" });
}

async function handleStreamCaptions(url, env) {
  const subjectId = url.searchParams.get("id");
  const streamId  = url.searchParams.get("streamId");
  if (!subjectId) return err(400, "missing_id", "id parameter required");

  const cacheKey = `stream-captions:${subjectId}:${streamId || ""}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  let path = `/wefeed-mobile-bff/subject-api/get-stream-captions?subjectId=${encodeURIComponent(subjectId)}`;
  if (streamId) path += `&streamId=${encodeURIComponent(streamId)}`;
  const r = await withDedup(`stream-captions:${subjectId}:${streamId || ""}`, () => signedRequest(path, { method: "GET", env }));
  if (!r.ok && r.status === 502) return err(502, "all_backends_failed", "No backend responded");
  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.details);
  return json(payload, { source: "origin" });
}

// ────────────────────────────────────────────────────────────
//  APK-mapped handlers — added in v5
//  All follow the same shape: cache → signedRequest → unwrap → cache+return
// ────────────────────────────────────────────────────────────

async function handleSearchSuggest(url, env) {
  const keyword    = url.searchParams.get("keyword") || "";
  const perPage    = parseInt(url.searchParams.get("perPage") || "10", 10);
  const resultMode = url.searchParams.get("resultMode") || "";
  if (!keyword.trim()) return err(400, "missing_keyword", "keyword parameter required");

  const cacheKey = `suggest:${keyword}:${perPage}:${resultMode}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  let path = `/wefeed-mobile-bff/subject-api/search-suggest?keyword=${encodeURIComponent(keyword)}&perPage=${perPage}`;
  if (resultMode) path += `&resultMode=${encodeURIComponent(resultMode)}`;
  const r = await withDedup(`suggest:${keyword}:${perPage}`, () => signedRequest(path, { method: "GET", env }));
  if (!r.ok && r.status === 502) return json({ ok: true, data: [], degraded: true }, { source: "fallback" });

  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.search);
  return json(payload, { source: "origin", cacheControl: "public, max-age=60" });
}

async function handleShortsMostTrending(url, env) {
  const page     = parseInt(url.searchParams.get("page") || "1", 10);
  const perPage  = parseInt(url.searchParams.get("perPage") || "20", 10);
  const cacheKey = `shorts-trending:${page}:${perPage}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = "/wefeed-mobile-bff/shorts/most-trending";
  const body = JSON.stringify({ page, perPage });
  const r = await withDedup(`shorts-trending:${page}`, () => signedRequest(path, { method: "POST", body, env }));
  if (!r.ok && r.status === 502) return json({ ok: true, data: [], degraded: true }, { source: "fallback" });

  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.shorts);
  return json(payload, { source: "origin", cacheControl: "public, max-age=120" });
}

async function handleShortsFavoriteList(url, env) {
  const page    = parseInt(url.searchParams.get("page") || "1", 10);
  const perPage = parseInt(url.searchParams.get("perPage") || "20", 10);
  const cacheKey = `shorts-favorites:${page}:${perPage}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = `/wefeed-mobile-bff/shorts/favorite-list?page=${page}&perPage=${perPage}`;
  const r = await withDedup(`shorts-favorites:${page}`, () => signedRequest(path, { method: "GET", env }));
  if (!r.ok && r.status === 502) return json({ ok: true, data: [], degraded: true }, { source: "fallback" });

  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.shorts);
  return json(payload, { source: "origin", cacheControl: "public, max-age=120" });
}

async function handleShortsGetInfo(url, env) {
  const subjectId = url.searchParams.get("id") || url.searchParams.get("subjectId");
  if (!subjectId) return err(400, "missing_id", "id parameter required");
  const cacheKey = `shorts-info:${subjectId}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = `/wefeed-mobile-bff/shorts/get-info?subjectId=${encodeURIComponent(subjectId)}`;
  const r = await withDedup(`shorts-info:${subjectId}`, () => signedRequest(path, { method: "GET", env }));
  if (!r.ok && r.status === 502) return err(502, "all_backends_failed", "No backend responded");

  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.details);
  return json(payload, { source: "origin", cacheControl: "public, max-age=300" });
}

async function handleShortsMiniList(url, env) {
  const subjectId     = url.searchParams.get("id") || url.searchParams.get("subjectId");
  if (!subjectId) return err(400, "missing_id", "id parameter required");
  const startPosition = parseInt(url.searchParams.get("startPosition") || "0", 10);
  const endPosition   = parseInt(url.searchParams.get("endPosition") || "20", 10);
  const pagerMode     = url.searchParams.get("pagerMode") || "";
  const cacheKey = `shorts-mini:${subjectId}:${startPosition}:${endPosition}:${pagerMode}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  let path = `/wefeed-mobile-bff/shorts/mini-list?subjectId=${encodeURIComponent(subjectId)}&startPosition=${startPosition}&endPosition=${endPosition}`;
  if (pagerMode) path += `&pagerMode=${encodeURIComponent(pagerMode)}`;
  const r = await withDedup(`shorts-mini:${subjectId}:${startPosition}`, () => signedRequest(path, { method: "GET", env }));
  if (!r.ok && r.status === 502) return err(502, "all_backends_failed", "No backend responded");

  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.details);
  return json(payload, { source: "origin", cacheControl: "public, max-age=300" });
}

async function handleResource(url, env) {
  const subjectId = url.searchParams.get("id") || url.searchParams.get("subjectId");
  if (!subjectId) return err(400, "missing_id", "id parameter required");
  const page        = parseInt(url.searchParams.get("page") || "1", 10);
  const perPage     = parseInt(url.searchParams.get("perPage") || "20", 10);
  const all         = url.searchParams.get("all") || "";
  const startPos    = parseInt(url.searchParams.get("startPosition") || "0", 10);
  const endPos      = parseInt(url.searchParams.get("endPosition") || "20", 10);
  const pagerMode   = url.searchParams.get("pagerMode") || "";
  const resolution  = url.searchParams.get("resolution") || "";
  const se          = parseInt(url.searchParams.get("se") || "0", 10);
  const epFrom      = parseInt(url.searchParams.get("epFrom") || "0", 10);
  const epTo        = parseInt(url.searchParams.get("epTo") || "0", 10);
  const cacheKey = `resource:${subjectId}:${page}:${perPage}:${all}:${startPos}:${endPos}:${pagerMode}:${resolution}:${se}:${epFrom}:${epTo}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  let path = `/wefeed-mobile-bff/subject-api/resource?subjectId=${encodeURIComponent(subjectId)}&page=${page}&perPage=${perPage}`;
  if (all) path += `&all=${encodeURIComponent(all)}`;
  if (startPos) path += `&startPosition=${startPos}`;
  if (endPos) path += `&endPosition=${endPos}`;
  if (pagerMode) path += `&pagerMode=${encodeURIComponent(pagerMode)}`;
  if (resolution) path += `&resolution=${encodeURIComponent(resolution)}`;
  if (se) path += `&se=${se}`;
  if (epFrom) path += `&epFrom=${epFrom}`;
  if (epTo) path += `&epTo=${epTo}`;
  const r = await withDedup(`resource:${subjectId}:${page}`, () => signedRequest(path, { method: "GET", env }));
  if (!r.ok && r.status === 502) return err(502, "all_backends_failed", "No backend responded");

  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.details);
  return json(payload, { source: "origin", cacheControl: "public, max-age=300" });
}

async function handleStaffInfo(url, env) {
  const staffId = url.searchParams.get("id") || url.searchParams.get("staffId");
  if (!staffId) return err(400, "missing_id", "id parameter required");
  const cacheKey = `staff-info:${staffId}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = `/wefeed-mobile-bff/subject-api/staff-info?staffId=${encodeURIComponent(staffId)}`;
  const r = await withDedup(`staff-info:${staffId}`, () => signedRequest(path, { method: "GET", env }));
  if (!r.ok && r.status === 502) return err(502, "all_backends_failed", "No backend responded");

  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.staff);
  return json(payload, { source: "origin", cacheControl: "public, max-age=3600" });
}

async function handleStaffRelated(url, env) {
  const staffId = url.searchParams.get("id") || url.searchParams.get("staffId");
  if (!staffId) return err(400, "missing_id", "id parameter required");
  const cacheKey = `staff-related:${staffId}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = `/wefeed-mobile-bff/subject-api/staff-related?staffId=${encodeURIComponent(staffId)}`;
  const r = await withDedup(`staff-related:${staffId}`, () => signedRequest(path, { method: "GET", env }));
  if (!r.ok && r.status === 502) return err(502, "all_backends_failed", "No backend responded");

  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.staff);
  return json(payload, { source: "origin", cacheControl: "public, max-age=3600" });
}

async function handleDailyMovieRec(env) {
  // No params — server picks "today's" pick based on the user's geo/profile.
  const cacheKey = "daily-movie-rec:v1";
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = "/wefeed-mobile-bff/subject-api/daily-movie-rec";
  const r = await withDedup("daily-movie-rec", () => signedRequest(path, { method: "POST", env }));
  if (!r.ok && r.status === 502) return json({ ok: true, data: [], degraded: true }, { source: "fallback" });

  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.daily);
  return json(payload, { source: "origin", cacheControl: "public, max-age=1800" });
}

async function handleWidget(env) {
  // POST body is the widget request — currently no params, server returns
  // hot subjects / play history to drive the home-screen widget.
  const cacheKey = "widget:v1";
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = "/wefeed-mobile-bff/subject-api/widget";
  const r = await withDedup("widget", () => signedRequest(path, { method: "POST", env }));
  if (!r.ok && r.status === 502) return json({ ok: true, data: [], degraded: true }, { source: "fallback" });

  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.widget);
  return json(payload, { source: "origin", cacheControl: "public, max-age=600" });
}

async function handlePlaylistContent(url, env) {
  const playlistId = url.searchParams.get("id") || url.searchParams.get("playlistId");
  if (!playlistId) return err(400, "missing_id", "id parameter required");
  const cacheKey = `playlist:${playlistId}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = `/wefeed-mobile-bff/playlist/content?playlistId=${encodeURIComponent(playlistId)}`;
  const r = await withDedup(`playlist:${playlistId}`, () => signedRequest(path, { method: "GET", env }));
  if (!r.ok && r.status === 502) return err(502, "all_backends_failed", "No backend responded");

  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  const payload = { ok: true, data: data?.data || data, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.playlist);
  return json(payload, { source: "origin", cacheControl: "public, max-age=3600" });
}

async function handleTrendingV2(url, env) {
  const tabId  = url.searchParams.get("tabId") || "0";
  const page   = parseInt(url.searchParams.get("page") || "1", 10);
  const cacheKey = `trendingV2:v2:en:${tabId}:${page}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached.value, { source: cached.source });

  const path = "/wefeed-mobile-bff/subject-api/trending/v2";
  const body = JSON.stringify({ tabId, page });
  const r = await withDedup(`trendingV2:${tabId}:${page}`, () => signedRequest(path, { method: "POST", body, env }));
  if (!r.ok && r.status === 502) return json({ ok: true, data: [], degraded: true }, { source: "fallback" });

  let data;
  try { data = JSON.parse(r.body); } catch { data = { raw: r.body }; }
  // Trending v2 returns a nested items array — normalise shape, then
  // drop non-English content the same way handleTrending does.
  const raw = data?.data || data;
  const items = raw?.items || (Array.isArray(raw) ? raw : []);
  const filtered = filterEnglish(items);
  const payload = { ok: true, data: filtered, backend: r.backend };
  await cachePut(env, cacheKey, payload, TTL.trending);
  return json(payload, { source: "origin", cacheControl: "public, max-age=120" });
}

// ────────────────────────────────────────────────────────────
//  ROUTER
// ────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url  = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "POST") {
      return err(405, "method_not_allowed", "Only GET / HEAD / POST supported");
    }

    if (path === "/" || path === "/api") {
      return json({
        ok: true,
        name: "moviebox-worker",
        version: "5.1.0",
        routes: [
          "/api/search", "/api/search/v2", "/api/search-rank",
          "/api/details", "/api/play-info", "/api/season-info",
          "/api/stream", "/api/episode", "/api/proxy", "/api/subtitle", "/api/trending",
          "/api/homepage", "/api/popular", "/api/mirrors", "/api/health", "/api/probe",
          "/api/detail-rec", "/api/top-rec", "/api/bottom-tab", "/api/play-related-rec",
          "/api/want-to-see", "/api/have-seen", "/api/dub-info",
          "/api/filter-items", "/api/list", "/api/stream-captions",
          "/api/search-suggest",
          "/api/shorts/most-trending", "/api/shorts/favorite-list",
          "/api/shorts/get-info", "/api/shorts/mini-list",
          "/api/resource",
          "/api/staff-info", "/api/staff-related",
          "/api/daily-movie-rec", "/api/widget",
          "/api/playlist/content", "/api/trending/v2",
        ],
      }, { source: "origin" });
    }

    try {
      // Route path-based proxy URLs: /api/proxy/TOKEN/segment/path.m4s
      if (path.startsWith("/api/proxy/") && path.length > "/api/proxy/".length + 36) {
        return await handleProxy(url, env, request);
      }
      switch (path) {
        case "/api/search":            return await handleSearch(url, env);
        case "/api/search/v2":         return await handleSearchV2(url, env);
        case "/api/search-rank":       return await handleSearchRank(url, env);
        case "/api/details":           return await handleDetails(url, env);
        case "/api/play-info":         return await handlePlayInfo(url, env);
        case "/api/season-info":        return await handleSeasonInfo(url, env);
        case "/api/stream":            return await handleStream(url, env);
        case "/api/episode":           return await handleStream(url, env);
        case "/api/proxy":             return await handleProxy(url, env, request);
        case "/api/subtitle":          return await handleSubtitle(url, env);
        case "/api/trending":          return await handleTrending(url, env);
        case "/api/homepage":          return await handleHomepage(url, env);
        case "/api/mirrors":           return await handleMirrors();
        case "/api/health":            return await handleHealth(env);
        case "/api/probe":             return await handleProbe(env);
        case "/api/popular":           return await handleTrending(url, env);
        case "/api/detail-rec":        return await handleDetailRec(url, env);
        case "/api/top-rec":           return await handleTopRec(url, env);
        case "/api/bottom-tab":        return await handleBottomTab(url, env);
        case "/api/play-related-rec":  return await handlePlayRelatedRec(url, env);
        case "/api/want-to-see":       return await handleWantToSee(url, env);
        case "/api/have-seen":         return await handleHaveSeen(url, env);
        case "/api/dub-info":          return await handleDubInfo(url, env);
        case "/api/filter-items":      return await handleFilterItems(url, env);
        case "/api/list":              return await handleList(url, env);
        case "/api/stream-captions":   return await handleStreamCaptions(url, env);
        case "/api/search-suggest":    return await handleSearchSuggest(url, env);
        case "/api/shorts/most-trending":   return await handleShortsMostTrending(url, env);
        case "/api/shorts/favorite-list":   return await handleShortsFavoriteList(url, env);
        case "/api/shorts/get-info":        return await handleShortsGetInfo(url, env);
        case "/api/shorts/mini-list":       return await handleShortsMiniList(url, env);
        case "/api/resource":               return await handleResource(url, env);
        case "/api/staff-info":             return await handleStaffInfo(url, env);
        case "/api/staff-related":          return await handleStaffRelated(url, env);
        case "/api/daily-movie-rec":        return await handleDailyMovieRec(env);
        case "/api/widget":                 return await handleWidget(env);
        case "/api/playlist/content":       return await handlePlaylistContent(url, env);
        case "/api/trending/v2":            return await handleTrendingV2(url, env);
        default:                       return err(404, "not_found", `No route for ${path}`);
      }
    } catch (e) {
      return err(500, "internal_error", String(e.message || e));
    }
  },
};
