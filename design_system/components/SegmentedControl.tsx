import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@ds/foundations/cn';

export interface SegmentedControlProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
  className?: string;
}

/** Alternador compacto (ex.: Dia/Semana/Mês, 3M/6M/12M). role="radiogroup", setas navegam. */
export function SegmentedControl({ options, value, onChange, ariaLabel, size = 'md', className }: SegmentedControlProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const idx = options.findIndex((o) => o.value === value);
    let n = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (idx + 1) % options.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (idx - 1 + options.length) % options.length;
    if (n >= 0) {
      e.preventDefault();
      onChange(options[n].value);
      refs.current[n]?.focus();
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn('inline-flex shrink-0 gap-0.5 rounded-sm bg-graphite-50 p-[3px] ring-1 ring-inset ring-graphite-100', className)}
    >
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              'whitespace-nowrap rounded-[6px] font-bold transition-colors',
              size === 'md' ? 'h-8 px-3 text-[13px]' : 'h-7 px-2.5 text-[12px]',
              'focus-visible:outline-none focus-visible:shadow-focus',
              active
                ? 'bg-white text-graphite-900 shadow-[0_1px_2px_rgba(30,29,27,.08)]'
                : 'text-graphite-600 hover:bg-white/60 hover:text-graphite-900',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
