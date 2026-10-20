import { forwardRef, type InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@ds/foundations/cn';

export interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Atalho exibido à direita (ex.: "⌘K"). Apenas visual; o atalho é registrado por quem usa. */
  shortcut?: string;
  /** Classe do input interno (className vai no wrapper). */
  inputClassName?: string;
}

/**
 * Campo de busca com ícone de lupa e atalho opcional.
 * `className` estiliza o wrapper (largura); o rótulo acessível vem de aria-label (padrão "Buscar").
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { shortcut, className, inputClassName, placeholder = 'Buscar…', 'aria-label': ariaLabel, disabled, ...rest },
  ref,
) {
  return (
    <label
      className={cn(
        'flex h-10 min-w-0 items-center gap-2.5 rounded-sm border border-graphite-200 bg-ivory px-3 text-graphite-500 transition-[border-color,box-shadow] duration-150',
        'hover:border-graphite-300 focus-within:border-gold-500 focus-within:bg-white focus-within:shadow-focus',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <Search size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
      <input
        ref={ref}
        type="search"
        placeholder={placeholder}
        aria-label={ariaLabel ?? 'Buscar'}
        disabled={disabled}
        className={cn(
          'h-full min-w-0 flex-1 border-0 bg-transparent font-sans text-body font-medium text-graphite-900 placeholder:font-normal placeholder:text-graphite-500 focus:outline-none disabled:cursor-not-allowed',
          inputClassName,
        )}
        {...rest}
      />
      {shortcut && (
        <kbd
          aria-hidden="true"
          className="hidden shrink-0 rounded-xs border border-graphite-200 bg-white px-1.5 py-0.5 font-sans text-[11px] font-bold text-graphite-500 sm:inline-block"
        >
          {shortcut}
        </kbd>
      )}
    </label>
  );
});
