import { Check, X, type LucideIcon } from 'lucide-react';
import { USER_EVENT, userTopic } from '@ggclubs/schemas';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ClubCrest } from '@/components/club/club-crest';
import { PlatformMark } from '@/components/club/platform-mark';
import { Button } from '@/components/ui/button';
import { SectionTitle } from '@/components/ui/section-title';
import type { OwnershipOfferRecord } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import { useResource } from '@/lib/use-resource';
import { useRealtimeRefresh } from '@/lib/realtime/use-realtime-refresh';
import { useAuth } from '@/lib/use-auth';
import { cn } from '@/lib/utils';

/**
 * **Um club está esperando você** · a lista de ofertas na tela de Clubs.
 *
 * **São duas desde 03/09/2026** · a posse (assumir o club) e a gerência
 * (pendência 185). Elas nasceram com o mesmo desenho até a última classe de
 * CSS, e esta casca é a extração feita **na hora em que a segunda apareceu**,
 * que é o que a regra da casa manda · a alternativa era duas cópias divergindo
 * em silêncio, e quem visse a diferença um dia não saberia se foi de propósito.
 *
 * **Elas se parecem de propósito, e isso é decisão de produto** · pra quem
 * recebe, as duas respondem a mesma pergunta, e a diferença está **no que se
 * aceita**, não em como se vê. Forma diferente ensinaria que são coisas
 * distintas. O que muda é o **peso**, e quem carrega o peso é o ícone e a frase
 * de consequência que o chamador passa.
 *
 * **Some quando não há nenhuma** · seção vazia numa tela aberta toda hora é
 * ruído permanente, e esta vai ficar vazia quase sempre.
 */
export function ClubOfferList({
  icon: Icon,
  title,
  hint,
  acceptLabel,
  declineLabel,
  load,
  respond,
  blockedReason = null,
  onAccepted,
}: {
  icon: LucideIcon;
  /** Recebe a contagem porque o plural muda o verbo · ver `docs/i18n.md`. */
  title: (count: number) => ReactNode;
  hint: string;
  acceptLabel: string;
  declineLabel: string;
  load: (signal: AbortSignal) => Promise<OwnershipOfferRecord[]>;
  respond: (clubId: string, decision: 'accept' | 'decline') => Promise<unknown>;
  /**
   * **Por que aceitar não vai dar certo agora**, ou `null` quando vai.
   *
   * A oferta nasce possível · a origem barra quem já lidera. Mas ela **espera
   * dias por desenho**, e o papel pode mudar nesse meio-tempo: basta a pessoa
   * criar um club ou aceitar outra liderança. Sem isto o botão fica **ligado e
   * sem explicação**, e o clique devolve 409 · botão desligado diz por que está
   * desligado, e é regra do `CLAUDE.md`.
   *
   * O aviso de posse na página do club já fazia isto; a casca não levou o
   * parâmetro junto na extração, e o `revisor` pegou.
   */
  blockedReason?: string | null;
  /**
   * Só o aceite muda o que a tela já tem em mãos · o papel no card do club
   * passa a ser outro. Recusar não mexe em nada.
   */
  onAccepted: () => void;
}) {
  const { t } = useTranslation();
  const accountId = useAuth().account?._id ?? null;
  const { data, reload, setData: setOffers } = useResource(load, [load]);
  /**
   * **`null` é "ainda não voltou" e `[]` é "voltou vazio"** · o `useResource`
   * mantém os dois separados de propósito, e juntá-los aqui é o que a tela
   * quer: enquanto não voltou, ela não desenha nada mesmo.
   */
  const offers = data ?? [];
  const [responding, setResponding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Ninguém pediu pra receber isto · o canal é o que faz a oferta aparecer sozinha. */
  useRealtimeRefresh(accountId ? userTopic(accountId) : null, [USER_EVENT.membership], () =>
    reload(),
  );

  async function answer(clubId: string, decision: 'accept' | 'decline') {
    setResponding(clubId);
    setError(null);
    try {
      await respond(clubId, decision);
      setOffers((current) => (current ?? []).filter((offer) => offer.clubId !== clubId));
      if (decision === 'accept') onAccepted();
    } catch (err) {
      setError(apiErrorMessage(err, t));
    } finally {
      setResponding(null);
    }
  }

  if (offers.length === 0) return null;

  return (
    <section>
      <SectionTitle hint={hint}>{title(offers.length)}</SectionTitle>
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {offers.map((offer) => (
          <li
            key={offer.clubId}
            className="flex h-full flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4"
          >
            <span className="flex items-center gap-3">
              <ClubCrest tag={offer.tag} crestUrl={offer.crestUrl} className="h-12 w-12 text-lg" />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="truncate font-display uppercase tracking-tight">
                    {offer.name}
                  </span>
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <PlatformMark platform={offer.platform} withLabel />
                  <span>{t('club.squadMany', { count: offer.memberCount })}</span>
                </span>
              </span>
            </span>
            {/* `flex-wrap` porque `Button` é `whitespace-nowrap` · a 320px os
                dois botões não cabem lado a lado e o segundo saía **pra fora da
                tela**, sem scroll pra alcançá-lo. É a mesma armadilha do
                `auth.resetCta`, registrada no `docs/i18n.md`. */}
            {/* **O motivo fica acima dos botões, não num `title`** · `title`
                não existe no toque, e o celular é onde isto é lido. */}
            {blockedReason && (
              <span className="mt-auto block text-xs text-muted-foreground">{blockedReason}</span>
            )}
            <span className={cn('flex flex-wrap items-center gap-2', !blockedReason && 'mt-auto')}>
              <Button
                variant="ctaOutline"
                size="sm"
                disabled={responding === offer.clubId || blockedReason !== null}
                onClick={() => void answer(offer.clubId, 'accept')}
              >
                <Check className="mr-1.5 h-4 w-4" aria-hidden />
                {acceptLabel}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={responding === offer.clubId}
                onClick={() => void answer(offer.clubId, 'decline')}
              >
                <X className="mr-1.5 h-4 w-4" aria-hidden />
                {declineLabel}
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
