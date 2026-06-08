/**
 * ============================================================
 *  MOVIEBOX CLOUDFLARE WORKER  — v3 (signed HMAC-MD5 + KV cache)
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
 *  │ GET /api/search       ?q=&type=movies|tv_series&page=&perPage=
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
 *  └──────────────────────────────────────────────────────────────┘
 *
 *  Authentication:
 *    - Per-request HMAC-MD5 signature using a base64-encoded shared secret
 *    - X-Client-Token: "<ts>,<md5(reverse(ts))>"
 *    - x-tr-signature: "<ts>|2|<base64(hmac-md5(canonical, key))>"
 *    - Bearer token from /search-suggest's x-user header (cached in KV)
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

function xClientToken(tsMs) {
  const s = String(tsMs);
  // md5 is async, so we return a function that builds the token
  return md5HexString(reverseString(s)).then(h => `${s},${h}`);
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
  const ts = Date.now();
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
};

const TTL = {
  search:      300,
  details:     1800,
  trending:    300,
  homepage:    300,
  playInfo:    1800,
  seasonInfo:  1800,
};

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
  "Access-Control-Allow-Methods":  "GET, OPTIONS",
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
        const altTs = Date.now();
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
    const streamProxyId = await stashProxy(env, { url: chosenUrl, cookies, referer });
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
  const token = url.searchParams.get("token");
  const overridePath = url.searchParams.get("p");
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

  const { url: baseUrl, cookies, referer } = stash;
  let upstreamUrl;
  try {
    upstreamUrl = overridePath || baseUrl;
    // SSRF guard: if overridePath is provided, it must be a relative path or share the same host
    if (overridePath) {
      const parsed = new URL(upstreamUrl, baseUrl);
      const baseHost = new URL(baseUrl).host;
      if (parsed.host !== baseHost) {
        return err(400, "invalid_path", "Proxy path must be on the same origin as the stashed base URL");
      }
      upstreamUrl = parsed.toString();
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

  // For .mpd manifests, rewrite the segment URLs to also go through the proxy
  const ct = upstream.headers.get("content-type") || "";
  const isMpd = upstreamUrl.includes(".mpd") || ct.includes("dash+xml") || ct.includes("application/xml");
  if (isMpd) {
    let body = await upstream.text();
    const base = new URL(upstreamUrl);
    // Replace absolute and relative URLs in the MPD with proxied versions
    body = body.replace(
      /<BaseURL>([^<]+)<\/BaseURL>/g,
      (_, p) => {
        const abs = new URL(p.trim(), base).toString();
        return `<BaseURL>/api/proxy?token=${token}&amp;p=${encodeURIComponent(abs)}</BaseURL>`;
      }
    );
    // Also catch SegmentTemplate initialization / media attributes
    body = body.replace(
      /(\s(?:initialization|media|sourceURL)=")([^"]+)(")/g,
      (m, pre, val, post) => {
        const abs = new URL(val, base).toString();
        return `${pre}/api/proxy?token=${token}&amp;p=${encodeURIComponent(abs)}${post}`;
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

  const cacheKey = `trending:${tabId}:${page}`;
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
  const payload = { ok: true, data: subjects, raw: items, backend: r.backend };
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
  const cacheKey = "homepage:v2";
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
        // Prefer English/global content (corner === '' or 'English')
        const corner = (it.corner || "").toString();
        if (corner && corner !== "English") continue;
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
    if (request.method !== "GET" && request.method !== "HEAD") {
      return err(405, "method_not_allowed", "Only GET / HEAD supported");
    }

    if (path === "/" || path === "/api") {
      return json({
        ok: true,
        name: "moviebox-worker",
        version: "3.0.0",
        routes: [
          "/api/search", "/api/details", "/api/play-info", "/api/season-info",
          "/api/stream", "/api/episode", "/api/proxy", "/api/subtitle", "/api/trending",
          "/api/homepage", "/api/popular", "/api/mirrors", "/api/health", "/api/probe",
        ],
      }, { source: "origin" });
    }

    try {
      switch (path) {
        case "/api/search":      return await handleSearch(url, env);
        case "/api/details":     return await handleDetails(url, env);
        case "/api/play-info":   return await handlePlayInfo(url, env);
        case "/api/season-info": return await handleSeasonInfo(url, env);
        case "/api/stream":      return await handleStream(url, env);
        case "/api/episode":     return await handleStream(url, env);
        case "/api/proxy":       return await handleProxy(url, env, request);
        case "/api/subtitle":    return await handleSubtitle(url, env);
        case "/api/trending":    return await handleTrending(url, env);
        case "/api/homepage":    return await handleHomepage(url, env);
        case "/api/mirrors":     return await handleMirrors();
        case "/api/health":      return await handleHealth(env);
        case "/api/probe":       return await handleProbe(env);
        case "/api/popular":     return await handleTrending(url, env);
        default:                 return err(404, "not_found", `No route for ${path}`);
      }
    } catch (e) {
      return err(500, "internal_error", String(e.message || e));
    }
  },
};
