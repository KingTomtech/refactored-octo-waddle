'use client';

import { useState } from 'react';
import { Play, Download, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkerEpisode } from '@/hooks/useSearch';
import { cn, formatRuntime } from '@/lib/utils';
import type { WorkerSeason } from '@/lib/types';

interface Props {
  workerId: string | null;
  workerSeasons?: WorkerSeason[];
  onPlay?: (season: number, episode: number, title: string) => void;
}

type EpisodeStub = {
  episode_number: number;
  name: string;
  overview: string;
  air_date: string;
  runtime: number;
  still: string | null;
};

export function EpisodePicker({ workerId, workerSeasons, onPlay }: Props) {
  const [season, setSeason] = useState(1);
  const [seasonMenuOpen, setSeasonMenuOpen] = useState(false);

  const seasons = workerSeasons?.length
    ? workerSeasons.map((s) => s.season_number).filter((s) => s > 0)
    : [1];

  const workerSeason = workerSeasons?.find((s) => s.season_number === season);
  const availableEpisodes = workerSeason?.allEp
    ? new Set(workerSeason.allEp.split(',').map((e) => Number(e.trim())).filter(Boolean))
    : null;

  const episodes: EpisodeStub[] = workerSeason
    ? Array.from({ length: workerSeason.maxEp }, (_, i) => ({
        episode_number: i + 1,
        name: `Episode ${i + 1}`,
        overview: '',
        air_date: '',
        runtime: 0,
        still: null,
      }))
    : [];

  const totalEpisodes = workerSeasons?.reduce((acc, s) => acc + s.maxEp, 0) ?? 0;

  return (
    <div className="space-y-4">
      {/* Season selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-text-muted">Season</span>
        <div className="relative">
          <button
            onClick={() => setSeasonMenuOpen((v) => !v)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-sm font-medium"
          >
            {season} <ChevronDown size={14} className={cn('transition-transform', seasonMenuOpen && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {seasonMenuOpen && (
              <motion.ul
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute z-10 mt-1 w-32 max-h-64 overflow-auto bg-bg-tertiary border border-border-subtle rounded-md shadow-2xl"
              >
                {seasons.map((s) => (
                  <li key={s}>
                    <button
                      onClick={() => { setSeason(s); setSeasonMenuOpen(false); }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-white/10',
                        s === season && 'text-accent',
                      )}
                    >
                      Season {s}
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
        {totalEpisodes > 0 && (
          <span className="text-xs text-text-muted">
            {episodes.length} in season · {totalEpisodes} total
          </span>
        )}
      </div>

      {/* Stream availability notice */}
      {!workerId && (
        <div className="flex items-start gap-2 p-3 rounded bg-yellow-500/10 text-yellow-200 text-sm">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Stream unavailable</p>
            <p className="text-xs text-yellow-200/80">
              We could not find this series in the DPTV catalogue. Try searching the title directly.
            </p>
          </div>
        </div>
      )}

      {/* Episode list */}
      {!episodes.length ? (
        <p className="text-text-muted text-sm">No episode information available.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {episodes.map((ep) => {
            const isAvailable = availableEpisodes === null
              ? ep.episode_number <= (workerSeason?.maxEp ?? Infinity)
              : availableEpisodes.has(ep.episode_number);
            return (
              <EpisodeCard
                key={ep.episode_number}
                episode={ep}
                season={season}
                workerId={workerId}
                isAvailable={isAvailable}
                hasWorkerData={!!workerSeasons?.length}
                onPlay={onPlay}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function EpisodeCard({
  episode, season, workerId, isAvailable, hasWorkerData, onPlay,
}: {
  episode: EpisodeStub;
  season: number;
  workerId: string | null;
  isAvailable: boolean;
  hasWorkerData: boolean;
  onPlay?: (s: number, e: number, t: string) => void;
}) {
  const streamProbe = useWorkerEpisode(workerId, workerId ? season : null, workerId ? episode.episode_number : null);
  const canStream = !!workerId && isAvailable;

  return (
    <div className={cn(
      "flex gap-3 p-2 rounded-md transition-colors",
      canStream ? "bg-bg-tertiary/50 hover:bg-bg-tertiary" : "bg-bg-tertiary/20 opacity-60"
    )}>
      <div className="relative w-[140px] sm:w-[180px] aspect-video rounded overflow-hidden bg-bg-secondary shrink-0">
        {episode.still ? (
          <img src={episode.still} alt={episode.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-text-muted text-xs">No image</div>
        )}
        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-semibold">
          EP {episode.episode_number}
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <h4 className="font-medium text-sm line-clamp-1">{episode.name}</h4>
        <p className="text-xs text-text-muted mt-0.5 line-clamp-2 flex-1">{episode.overview || 'No description available.'}</p>
        <div className="flex items-center justify-between mt-1.5 text-[11px] text-text-muted">
          <span>{episode.air_date || 'TBA'}</span>
          {episode.runtime ? <span>{formatRuntime(episode.runtime)}</span> : null}
        </div>
        {workerId && (
          <div className="flex items-center gap-1.5 mt-2">
            {canStream ? (
              <>
                <button
                  onClick={() => onPlay?.(season, episode.episode_number, episode.name)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-accent hover:bg-accent-hover text-white font-medium"
                >
                  <Play size={11} fill="currentColor" /> Stream
                </button>
                {streamProbe.data?.data?.url && (
                  <a
                    href={streamProbe.data.data.url}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-white/10 hover:bg-white/20"
                    title="Download episode"
                  >
                    <Download size={11} /> Download
                  </a>
                )}
                {streamProbe.isLoading && <Loader2 size={11} className="animate-spin text-text-muted" />}
              </>
            ) : hasWorkerData ? (
              <span className="text-[11px] text-text-muted">Not available on backend</span>
            ) : (
              <span className="text-[11px] text-text-muted">Resolving…</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
