import { cn } from '@ds/foundations/cn';

export interface SkeletonProps {
  /** Defina largura/altura/raio via classes (ex.: "h-4 w-32 rounded-xs"). */
  className?: string;
}

/** Bloco de carregamento graphite-100 com brilho (shimmer). Decorativo. */
export function Skeleton({ className }: SkeletonProps) {
  return <span aria-hidden="true" className={cn('hm-shimmer block h-4 w-full rounded-xs', className)} />;
}
