// ────────────────────────────────────────────────────────────
//  SRT → WebVTT converter (in-browser)
// ────────────────────────────────────────────────────────────

/**
 * Convert a SubRip (.srt) subtitle file to a WebVTT (.vtt) string.
 * Adds the required "WEBVTT" header and replaces comma decimals with dots
 * in timestamps.
 */
export function srtToVtt(srt: string): string {
  if (!srt) return '';
  const normalised = srt
    .trim()
    .replace(/﻿/g, '')
    .replace(/\r\n|\r/g, '\n');

  const blocks = normalised.split(/\n\n+/);
  const out: string[] = ['WEBVTT', ''];

  for (const block of blocks) {
    const lines = block.split('\n');
    if (!lines.length) continue;
    // drop leading sequence number if present
    if (/^\d+$/.test(lines[0].trim())) lines.shift();
    if (!lines.length) continue;
    // convert timestamp commas
    lines[0] = lines[0].replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
    out.push(lines.join('\n'));
    out.push('');
  }
  return out.join('\n');
}

export function createVttObjectUrl(srtContent: string): string {
  const vtt = srtToVtt(srtContent);
  const blob = new Blob([vtt], { type: 'text/vtt;charset=utf-8' });
  return URL.createObjectURL(blob);
}

/**
 * Best-effort download of a remote .srt and conversion to a vtt blob URL.
 * Returns the blob URL on success or null on failure.
 */
export async function fetchAndConvertSrt(srtUrl: string): Promise<string | null> {
  try {
    const r = await fetch(srtUrl);
    if (!r.ok) return null;
    const text = await r.text();
    return createVttObjectUrl(text);
  } catch {
    return null;
  }
}
