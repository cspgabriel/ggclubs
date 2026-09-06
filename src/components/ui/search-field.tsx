import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * O campo de busca das vitrines · lupa dentro, e um botão de limpar quando há
 * texto.
 *
 * **O botão de limpar é o motivo de isto ser componente e não markup repetido:**
 * ele faltou na vitrine de players porque a tela foi escrita sem abrir a irmã ao
 * lado, e entrou depois, à mão. Terceira vitrine não deve precisar lembrar.
 *
 * A altura vem de fora (`inputClassName`) porque ela é do contexto, não do
 * campo: na vitrine de clubs ele fica ao lado do título da seção, e na de
 * players dentro da fileira de filtros, com rótulo em cima.
 */
export function SearchField({
  id,
  value,
  onChange,
  placeholder,
  label,
  className,
  inputClassName,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Rótulo acessível · quando a tela já tem `<Label>` visível, passe o mesmo texto. */
  label: string;
  className?: string;
  inputClassName?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        className={cn('pl-9 pr-9', inputClassName)}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t('common.searchClear')}
          className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
