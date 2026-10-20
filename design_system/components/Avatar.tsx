import { useState } from 'react';
import { cn } from '@ds/foundations/cn';
import { initialsOf } from './internal';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
  /** Anel dourado fino (perfil em destaque / usuário logado). */
  ring?: boolean;
  status?: 'online' | 'offline';
  /** Paleta: gold (padrão), neutral (listas) ou dark (sidebar). */
  tone?: 'gold' | 'neutral' | 'dark';
  className?: string;
}

const SIZE: Record<AvatarSize, { box: string; text: string; dot: string }> = {
  xs: { box: 'h-6 w-6', text: 'text-[10px]', dot: 'h-2 w-2' },
  sm: { box: 'h-8 w-8', text: 'text-[11px]', dot: 'h-2.5 w-2.5' },
  md: { box: 'h-9 w-9', text: 'text-[13px]', dot: 'h-2.5 w-2.5' },
  lg: { box: 'h-12 w-12', text: 'text-[16px]', dot: 'h-3 w-3' },
  xl: { box: 'h-16 w-16', text: 'text-[22px]', dot: 'h-3.5 w-3.5' },
};

const TONE = {
  gold: 'bg-gold-100 text-gold-700',
  neutral: 'bg-graphite-50 text-graphite-700',
  dark: 'bg-graphite-700 text-gold-100',
} as const;

/** Avatar com foto ou iniciais. Se a imagem falhar, cai para as iniciais. */
export function Avatar({ name, src, size = 'md', ring = false, status, tone = 'gold', className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const s = SIZE[size];
  const showImg = Boolean(src) && !failed;
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        role="img"
        aria-label={name}
        className={cn(
          'inline-flex select-none items-center justify-center overflow-hidden rounded-full font-extrabold',
          s.box,
          s.text,
          TONE[tone],
          ring && 'shadow-[0_0_0_2px_#FFFFFF,0_0_0_3px_#DDB872]',
        )}
      >
        {showImg ? (
          <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
        ) : (
          <span aria-hidden="true">{initialsOf(name)}</span>
        )}
      </span>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-white',
            s.dot,
            status === 'online' ? 'bg-success' : 'bg-graphite-400',
          )}
        >
          <span className="sr-only">{status === 'online' ? 'Online' : 'Offline'}</span>
        </span>
      )}
    </span>
  );
}
