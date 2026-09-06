import { displayStatusOf, featuredEdition } from '@ggclubs/schemas';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Chamfer } from '@/components/ui/chamfer';
import type { TournamentRecord } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Quanto custa, e o que acontece se não encher · **as duas perguntas de quem
 * está decidindo pagar, respondidas antes de qualquer botão.**
 *
 * **Pendência 172:** o preço aparecia só como selo dentro do card, e nenhuma
 * palavra da landing dizia o que acontece com o dinheiro se a edição não
 * encher · a política de reembolso existia e estava linkada **só no rodapé**.
 * A maior objeção de quem paga cedo é a edição não acontecer, e a página que
 * vende deixava a pergunta pra página que cobra.
 *
 * **Três cartões, e o dado é de verdade onde ele existe** · o preço e a escada
 * de tamanhos saem da edição em destaque (a mesma que o card da seção mostra),
 * então a landing nunca afirma um valor que a página da edição desmente. Sem
 * edição nenhuma, o cartão do preço diz que cada edição escreve o dela · que é
 * a regra, e não um número inventado.
 *
 * **As frases da escada e do reembolso são as que o produto já usa** na
 * página da edição e no painel de pagar · a landing não pode contar uma versão
 * própria da política, senão são duas promessas pra uma regra só.
 */
export function TournamentTerms({
  tournaments,
  className,
  general = false,
}: {
  tournaments: TournamentRecord[] | null;
  className?: string;
  general?: boolean;
}) {
  const { t } = useTranslation();
  const { edition: featured, stage } = featuredEdition(tournaments);
  const edition =
    !general && featured && (stage === 'signup' || displayStatusOf(featured) === 'notYetOpen')
      ? featured
      : null;

  /**
   * A escada, do menor tamanho pro maior · a pergunta é *"e se vier pouca
   * gente?"*, então o que interessa está embaixo. Três degraus bastam pra
   * mostrar que a premiação acompanha o tamanho, e uma edição sem prêmio não
   * desenha escada nenhuma (é a regra do pódio zerado do `docs/design.md`).
   */
  const minimum = edition ? Math.min(...edition.format.sizes.map((size) => size.slots)) : null;
  const singleSize = edition?.format.sizes.length === 1;
  const ladder = edition
    ? [...edition.format.sizes]
        .filter((size) => size.prize.first > 0)
        .sort((a, b) => a.slots - b.slots)
        .slice(0, 3)
    : [];

  return (
    <div className={cn('grid gap-4 lg:grid-cols-3', className)}>
      <TermCard title={t('landing.termsPriceTitle')}>
        {/* **Exato, e não arredondado** · inscrição é o que a pessoa paga, e o
            `lib/format.ts` separa os dois de propósito: o `Money` é pra
            premiação e prova social, o `formatPrice` é pro que se cobra. */}
        <p className="font-display text-4xl text-brand-gradient">
          {edition ? (
            edition.priceCents === 0 ? (
              t('tournament.free')
            ) : (
              formatPrice(edition.priceCents)
            )
          ) : (
            <span className="text-2xl">{t('landing.termsPriceEach')}</span>
          )}
        </p>
        {edition && (
          <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
            {t('landing.termsPriceNow')}
          </p>
        )}
        {edition && <p className="mt-2 text-xs font-semibold text-foreground">{edition.name}</p>}
        {/* **Edição grátis não fala de meio de pagamento** · o card mostrava o
            preço zerado no corpo grande e, na linha de baixo, a frase que lista
            os meios de pagamento · a tela se contradizendo em duas linhas.
            Achado pelo Eduardo olhando a tela em 03/09/2026. */}
        <p className="mt-3 text-sm text-muted-foreground">
          {edition?.priceCents === 0
            ? t('landing.termsPriceFreeBody')
            : t('landing.termsPriceBody')}
        </p>
      </TermCard>

      <TermCard title={t('tournament.ladderTitle')}>
        <p className="text-sm text-muted-foreground">
          {singleSize && minimum
            ? t('landing.termsSingle', { count: minimum })
            : t('tournament.ladderBody')}
        </p>
        {!singleSize && minimum !== null && (
          <p className="mt-3 text-xs text-foreground">
            {t('landing.termsMinimum', { count: minimum })}
          </p>
        )}
        {ladder.length ? (
          <div className="mt-3">
            <p className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">
              {t('tournament.prizeFirst')}
            </p>
            <ul className="mt-1 divide-y divide-border/60 border-y border-border/60 text-sm">
              {ladder.map((size) => (
                <li key={size.slots} className="flex items-center justify-between py-1.5">
                  <span className="text-foreground">
                    {t('tournament.ladderRow', { count: size.slots })}
                  </span>
                  <span className="font-display text-primary">{formatPrice(size.prize.first)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </TermCard>

      <TermCard
        title={t(
          edition?.priceCents === 0 || !edition
            ? 'landing.termsPaidOnly'
            : 'landing.termsRefundTitle',
        )}
      >
        <p className="text-sm text-muted-foreground">
          <Trans i18nKey="landing.termsRefundBody">
            <Link to="/reembolso" className="text-primary underline-offset-4 hover:underline" />
          </Trans>
        </p>
      </TermCard>
    </div>
  );
}

function TermCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Chamfer border="bg-border" innerClassName="flex h-full flex-col bg-card p-5">
      <h3 className="font-display text-lg uppercase leading-tight text-foreground">{title}</h3>
      <div className="mt-3">{children}</div>
    </Chamfer>
  );
}
