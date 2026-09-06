import { useTranslation } from 'react-i18next';
import { SkeletonBar, SkeletonGroup } from '@/components/ui/skeleton';
import { PAGE_STACK_GAP } from '@/components/ui/page-stack';
import { cn } from '@/lib/utils';

/**
 * Silhueta do `ClubView`, nas duas molduras.
 *
 * **Existe uma só porque a página é uma só** · a de dentro do app e a pública
 * renderizam o mesmo `ClubView`, e um esqueleto por tela seria a terceira
 * divergência a aparecer entre elas sem ninguém decidir nada. Recebe o mesmo
 * `variant`, pelo mesmo motivo: `page` sangra de borda a borda porque é dona da
 * janela, `embedded` se acomoda no espaço que recebeu.
 *
 * A geometria é a de verdade, não retângulo genérico: capa com escudo quadrado
 * e duas linhas ao lado, faixa de três estatísticas, e o elenco em grade de
 * três. É o que impede o salto de layout quando o dado chega.
 */
export function ClubViewSkeleton({ variant = 'page' }: { variant?: 'page' | 'embedded' }) {
  const { t } = useTranslation();
  const embedded = variant === 'embedded';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t('common.loading')}
      className={embedded ? PAGE_STACK_GAP : undefined}
    >
      <section
        className={cn(
          'relative overflow-hidden py-8 sm:py-12',
          embedded ? 'rounded-2xl border' : 'border-b',
        )}
      >
        <div className={cn('relative', embedded ? 'px-5 sm:px-8' : 'container')}>
          <SkeletonGroup className="flex items-center gap-4">
            <SkeletonBar className="h-16 w-16 shrink-0 rounded-xl sm:h-20 sm:w-20" />
            <span className="min-w-0 flex-1 space-y-3">
              <SkeletonBar className="h-7 w-2/3 max-w-[18rem]" />
              <SkeletonBar className="h-4 w-40 max-w-full bg-secondary/70" />
            </span>
          </SkeletonGroup>
        </div>
      </section>

      <div className={cn(PAGE_STACK_GAP, embedded ? '' : 'container pt-6 pb-8 sm:pb-10')}>
        <SkeletonGroup className="grid grid-cols-3 gap-4 rounded-2xl border bg-card p-4 sm:p-5">
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} className="space-y-2">
              <SkeletonBar className="h-3 w-16 bg-secondary/70" />
              <SkeletonBar className="h-5 w-20" />
            </span>
          ))}
        </SkeletonGroup>

        <div className="space-y-3">
          <SkeletonGroup>
            <SkeletonBar className="h-4 w-24" />
          </SkeletonGroup>
          <SkeletonGroup className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <SkeletonBar className="h-9 w-9 shrink-0 rounded-full" />
                <span className="min-w-0 flex-1 space-y-1.5">
                  <SkeletonBar className="h-3.5 w-2/3" />
                  <SkeletonBar className="h-3 w-1/2 bg-secondary/70" />
                </span>
              </span>
            ))}
          </SkeletonGroup>
        </div>
      </div>
    </div>
  );
}
