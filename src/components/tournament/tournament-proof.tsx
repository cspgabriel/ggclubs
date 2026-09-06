import type { TournamentProofTotals } from '@ggclubs/schemas';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Money } from '@/components/ui/money';
import { SkeletonBar } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { TournamentRecord } from '@/lib/api';

/**
 * Quantas colunas, escrito por extenso.
 *
 * O Tailwind varre o código-fonte procurando a classe inteira · nome montado em
 * runtime não gera CSS nenhum e **não pinta nada**, que é a armadilha do
 * `pnpm scan:tailwind`. O índice 0 nunca é lido: sem número nenhum a peça some.
 */
const COLUMNS = ['', 'sm:grid-cols-1', 'sm:grid-cols-2', 'sm:grid-cols-3'] as const;

/**
 * A prova social · **os números do banco, e nenhum redondo de marketing.**
 *
 * Ela responde a objeção que um campeonato pago sempre encontra (*isso funciona
 * mesmo?*), e é a razão de a lista pública mostrar o histórico · **número que
 * seria zero não entra**, e sem nenhum a peça some. Zero numa prova social é o
 * contrário de prova.
 *
 * **Só conta o que já aconteceu** · somar a premiação de uma edição que ainda
 * não rolou seria contar como entregue o que ainda é promessa.
 *
 * **Vive fora da seção da landing porque as duas telas usam** · o `design.md`
 * manda extrair na hora em que a segunda cópia aparece, e não depois da
 * terceira.
 *
 * > **Esta frase foi mentira por nove dias.** Ela dizia que a tela pública de
 * > campeonatos usava a peça desde 10/08/2026, e a peça só rodava na landing ·
 * > extrair aconteceu, ligar do outro lado não. Corrigido em 19/08/2026 pelo
 * > caminho certo: a tela passou a usar, porque é lá que a objeção nasce.
 */
export function TournamentProof({
  className,
  tournaments,
  failed = false,
  compact = false,
  totals,
}: {
  /** O vão de cima é de quem compõe a tela · ver `PageStack` no design.md. */
  className?: string;
  tournaments: TournamentRecord[] | null;
  /**
   * **A busca falhou** · e falha não é espera.
   *
   * Sem isto a peça fica na silhueta **pra sempre** quando a API não responde,
   * porque a lista nunca deixa de ser `null` · três barras cinza pulsando ao
   * lado de uma tela que já disse "não deu pra carregar". Visto na tela em
   * 02/09/2026, com a API recusando por CORS.
   */
  failed?: boolean;
  compact?: boolean;
  totals?: TournamentProofTotals | undefined;
}) {
  const { t } = useTranslation();

  // **Falha só apaga quando não há o que mostrar** · o `useTournamentList`
  // guarda a lista anterior no `catch`, então `failed` convive com dado bom.
  if (failed && tournaments === null) return null;

  // A silhueta tem a forma da peça cheia · três cartões, que é o estado de
  // regime assim que existe edição com time e premiação contados. Com um
  // indicador solto, a capa pularia de altura quando os números chegassem.
  if (tournaments === null) {
    return (
      <div className={cn('grid gap-3 sm:grid-cols-3', className)}>
        {Array.from({ length: 3 }, (_, i) => (
          <SkeletonBar key={i} className={compact ? 'h-5 rounded' : 'h-20 rounded-xl'} />
        ))}
      </div>
    );
  }

  // Os totais vêm da API; o cálculo local preserva respostas anteriores à paginação.
  let { editions, teams, prize } = totals ?? { editions: 0, teams: 0, prize: 0 };
  if (!totals) {
    for (const edition of tournaments) {
      const size = edition.drawnSize;
      if (edition.status !== 'finished' || !size) continue;
      editions += 1;
      teams += size.slots;
      prize += size.prize.first + size.prize.second + size.prize.third;
    }
  }

  const items = [
    {
      key: 'editions',
      value: editions,
      node: String(editions),
      label: t('landing.proofEditions', { count: editions }),
    },
    {
      key: 'teams',
      value: teams,
      node: String(teams),
      label: t('landing.proofTeams', { count: teams }),
    },
    { key: 'prize', value: prize, node: <Money cents={prize} />, label: t('landing.proofPrize') },
  ].filter((item) => item.value > 0);

  if (items.length === 0) return null;

  return (
    <dl
      className={cn(
        compact ? 'flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4' : 'grid gap-3',
        !compact && COLUMNS[items.length],
        className,
      )}
    >
      {items.map((item) => (
        <Item key={item.key} value={item.node} label={item.label} compact={compact} />
      ))}
    </dl>
  );
}

function Item({ value, label, compact }: { value: ReactNode; label: ReactNode; compact: boolean }) {
  return (
    <div
      className={
        compact
          ? 'flex flex-row-reverse items-baseline gap-2'
          : 'rounded-xl border border-border bg-card p-4'
      }
    >
      <dt
        className={
          compact
            ? 'text-xs text-muted-foreground'
            : 'text-xs uppercase tracking-widest text-muted-foreground'
        }
      >
        {label}
      </dt>
      <dd
        className={
          compact
            ? 'font-semibold text-foreground'
            : 'mt-1 font-display text-3xl text-brand-gradient'
        }
      >
        {value}
      </dd>
    </div>
  );
}
