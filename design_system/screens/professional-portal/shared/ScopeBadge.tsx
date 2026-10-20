import { ShieldCheck } from 'lucide-react';
import { Badge } from '@ds/components';

export interface ScopeBadgeProps {
  /** Texto do selo (padrão "Somente seus registros"). */
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Selo discreto de escopo para cabeçalhos de lista do Portal do Profissional.
 * Apenas informa — o filtro real acontece no servidor (RLS por professional_id).
 */
export function ScopeBadge({ label = 'Somente seus registros', size = 'md', className }: ScopeBadgeProps) {
  return (
    <Badge tone="ai" icon={ShieldCheck} size={size} className={className}>
      {label}
    </Badge>
  );
}
