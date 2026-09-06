import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/**
 * Os três passos · inscreve, a chave sai com horário, cada club lança o placar.
 *
 * Extraído da seção de campeonatos da landing em 03/09/2026, no dia em que a
 * lista pública de campeonatos passou a explicar o produto pra quem chega nela
 * **direto** pelo link do Discord, sem ter passado pela landing. Duas cópias da
 * mesma lista é o que o `CLAUDE.md` manda extrair na hora.
 *
 * **O título fica com quem chama** · a landing usa um `h3` dentro da seção, a
 * lista pública usa o `SectionTitle`, e a lista é a mesma.
 */
export function TournamentHow({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <ol className={cn('space-y-4 text-sm text-muted-foreground', className)}>
      {/* A chave inteira, e não montada · catálogo tipado não aceita chave
          feita em runtime, e é essa conferência que impede frase faltando. */}
      {(compact
        ? (['landing.howBrief1', 'landing.howBrief2', 'landing.howBrief3'] as const)
        : (['landing.how1', 'landing.how2', 'landing.how3'] as const)
      ).map((key, index) => (
        <li key={key} className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/5 font-display text-xs text-primary"
          >
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">
              {t(
                (['landing.howTitle1', 'landing.howTitle2', 'landing.howTitle3'] as const)[index]!,
              )}
            </p>
            <p className="mt-1 leading-relaxed">{t(key)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
