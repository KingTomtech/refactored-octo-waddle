// ────────────────────────────────────────────────────────────
//  Misc UI helpers
// ────────────────────────────────────────────────────────────

/**
 * Tiny className joiner. Falsy values are dropped, no clsx dependency.
 * `cn('a', cond && 'b', undefined)` → `"a b"` or `"a"`.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function yearOf(release?: string | null): string {
  if (!release) return '';
  return release.slice(0, 4);
}

export function ratingColor(rating?: number): 'good' | 'mid' | 'bad' | 'muted' {
  if (rating === undefined || rating === null) return 'muted';
  if (rating >= 7) return 'good';
  if (rating >= 5) return 'mid';
  return 'bad';
}

export function formatRuntime(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let h: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (h) clearTimeout(h);
    h = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function isHlsUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.m3u8(\?|$)/i.test(url);
}

export function isMp4Url(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.mp4(\?|$)/i.test(url);
}

export function formatNumber(n?: number | null): string {
  if (n === undefined || n === null) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatTime(seconds?: number | null): string {
  if (seconds === undefined || seconds === null || !Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Creates a downloadable .txt file containing stream info
 * (URL, raw MPD URL, cookies, referer, mpv/vlc command lines)
 * for use in external players.
 */
export function downloadStreamPackage(info: {
  title: string;
  primaryUrl: string | null;
  rawUrl?: string | null;
  cookies?: string[];
  referer?: string | null;
}): void {
  const lines: string[] = [
    `DPTV Stream Package: ${info.title}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    '=== Stream URL ===',
    info.primaryUrl ?? '(not available)',
    '',
  ];

  if (info.rawUrl) {
    lines.push('=== Raw MPD URL ===', info.rawUrl, '');
  }

  if (info.referer) {
    lines.push('=== Referer ===', info.referer, '');
  }

  if (info.cookies && info.cookies.length > 0) {
    lines.push('=== Cookies ===');
    info.cookies.forEach((c) => lines.push(c));
    lines.push('');
  }

  if (info.primaryUrl) {
    lines.push(
      '=== Player Commands ===',
      `mpv "${info.primaryUrl}"`,
      `vlc "${info.primaryUrl}"`,
    );
    if (info.rawUrl && info.cookies && info.cookies.length > 0) {
      const cookieHeader = info.cookies.join('; ');
      lines.push(
        '',
        '=== mpv with cookies ===',
        `mpv --http-header="Cookie: ${cookieHeader}" --http-header="Referer: ${info.referer ?? ''}" "${info.rawUrl}"`,
      );
    }
  }

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dptv-${info.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
