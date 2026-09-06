import { useTranslation } from 'react-i18next';
import { SkeletonBar, SkeletonGroup } from '@/components/ui/skeleton';
import { PAGE_STACK_GAP } from '@/components/ui/page-stack';
import { cn } from '@/lib/utils';

/**
 * Silhueta do `PlayerView`, nas duas molduras.
 *
 * **Uma só, porque a página é uma só** · mesma razão do `ClubViewSkeleton`, e
 * recebe o mesmo `variant`. A geometria é a de verdade e não retângulo genérico:
 * avatar redondo à esquerda com duas linhas ao lado, e os clubs na mesma grade
 * de três. É o que impede o salto de layout quando o dado chega.
 *
 * **Três cartões, e não seis como o elenco** · o teto é 3 clubs por player, e
 * silhueta que promete mais do que pode existir é a mesma mentira que ela existe
 * pra evitar.
 */
export function PlayerViewSkeleton({ variant = 'page' }: { variant?: 'page' | 'embedded' }) {
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
            <SkeletonBar className="h-16 w-16 shrink-0 rounded-full sm:h-20 sm:w-20" />
            <span className="min-w-0 flex-1 space-y-3">
              <SkeletonBar className="h-7 w-2/3 max-w-[18rem]" />
              <SkeletonBar className="h-4 w-40 max-w-full bg-secondary/70" />
            </span>
          </SkeletonGroup>
        </div>
      </section>

      <div className={cn(PAGE_STACK_GAP, embedded ? '' : 'container pt-6 pb-8 sm:pb-10')}>
        <div className="space-y-3">
          <SkeletonGroup>
            <SkeletonBar className="h-4 w-24" />
          </SkeletonGroup>
          <SkeletonGroup className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <SkeletonBar className="h-10 w-10 shrink-0 rounded-xl" />
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
