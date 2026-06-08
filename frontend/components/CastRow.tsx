'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { WorkerStaff } from '@/lib/types';

interface Props {
  cast: WorkerStaff[];
  onSelect?: (member: WorkerStaff) => void;
}

export function CastRow({ cast, onSelect }: Props) {
  const router = useRouter();
  if (!cast?.length) return null;

  return (
    <div className="scroll-row flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
      {cast.slice(0, 20).map((member) => {
        const avatar = member.avatarUrl ?? null;
        const name = member.name ?? 'Unknown';
        return (
          <button
            key={member.staffId}
            onClick={() => {
              if (onSelect) onSelect(member);
              else router.push(`/search?q=${encodeURIComponent(name)}`);
            }}
            className="shrink-0 w-[120px] text-left group"
            aria-label={`${name} as ${member.character ?? 'unknown'}`}
          >
            <div className="relative w-[120px] h-[120px] rounded-full overflow-hidden bg-bg-tertiary mb-2 ring-1 ring-white/10 group-hover:ring-accent transition-colors">
              {avatar ? (
                <Image
                  src={avatar}
                  alt={name}
                  fill
                  sizes="120px"
                  className="object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-text-muted text-2xl font-display">
                  {name?.[0] ?? '?'}
                </div>
              )}
            </div>
            <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">{name}</p>
            {member.character && <p className="text-xs text-text-muted truncate">{member.character}</p>}
          </button>
        );
      })}
    </div>
  );
}
