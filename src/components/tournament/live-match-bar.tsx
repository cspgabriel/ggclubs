import { ArrowRight, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ClubCrest } from '@/components/club/club-crest';
import { Button } from '@/components/ui/button';
import { CHAT_PARAM } from '@/lib/chat-link';
import { appTournamentPath } from '@/lib/paths';
import { formatMatchClock } from '@/lib/tournament-format';
import { useLiveMatchBar } from '@/lib/use-live-match-bar';
import { useMyChats } from '@/lib/use-my-chats';
import { cn } from '@/lib/utils';

/**
 * **A única peça permanente do app** · a faixa do seu jogo, grudada abaixo do
 * header em toda tela do `/app`. Quem decide se ela cabe é o `barCovers` do
 * `running-match-context.ts` (uma hora antes, rolando, ou a sua vez de lançar
 * placar); esta peça é moldura e lê o mesmo snapshot da casca.
 *
 * **A forma é decisão do Eduardo em 06/09/2026, em três rodadas:** os dados não
 * são link (o hover que pegava a linha inteira foi recusado), campeonato e chat
 * são botões `ghost` separados, o fundo é o de card com o detalhe vertical verde
 * ao lado do confronto · e o contorno no botão de placar foi recusado, então a
 * ação da vez é textual e verde. O que distingue o momento é o **rótulo de
 * estado** e a **ação**, não a faixa inteira.
 */
export function LiveMatchBar() {
  const { t } = useTranslation();
  const bar = useLiveMatchBar();
  // O não lido desta partida sai da mesma busca da bandeja do header, e não de
  // uma terceira · ela já roda na casca.
  const { chats } = useMyChats();
  if (!bar) return null;
  const { tournament, match, myTag, moment, clubs } = bar;
  const room = chats.rooms.find((one) => one.matchId === match._id) ?? null;
  const rivalTag = myTag === match.homeTag ? match.awayTag : match.homeTag;
  const rival = clubs.get(rivalTag);
  const calling = moment === 'toReport';

  return (
    /**
     * **Grudada abaixo do header, e não fixa por cima do conteúdo.**
     *
     * O `top` é a altura do header mais a borda dele, e o número mora em
     * `--app-header-h`, nunca numa classe escrita aqui: cravado, ele era uma
     * terceira cópia da altura do header, e as cópias divergiam em silêncio (a
     * faixa terminava 9px depois de onde a coluna de prévia do `/app/conta`
     * começava, e cobria o rótulo dela). A altura da linha sai de
     * `--app-live-bar-row-h` pela mesma razão · é o que a casca desconta de
     * quem gruda abaixo.
     *
     * `z-30` fica **abaixo** do `z-40` do header de propósito: ela desliza pra
     * baixo dele quando a página rola, em vez de desenhar por cima da marca.
     */
    <div
      data-live-match
      className="sticky top-[var(--app-header-h)] z-30 border-b border-border bg-card"
    >
      {/* O container é o pai das duas saídas (a edição e a sala), e não um link
          · link dentro de link não é HTML válido. Os dados não são link: só as
          ações à direita recebem hover e foco. */}
      <div className="container flex h-[var(--app-live-bar-row-h)] items-center gap-2 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 border-l-2 border-primary pl-2 sm:pl-3">
          <ClubCrest
            tag={rivalTag}
            crestUrl={rival?.crestUrl ?? null}
            className="hidden h-6 w-6 shrink-0 text-[9px] sm:flex"
          />
          <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
            <span
              className={cn(
                'flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide sm:text-xs',
                calling || moment === 'live' ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {calling ? t('tournament.liveBarYourTurn') : t(`tournament.moment.${moment}`)}
              {moment === 'soon' && (
                <span className="tabular-nums text-foreground">
                  {formatMatchClock(match.scheduledAt)}
                </span>
              )}
            </span>
            <span className="hidden h-3 w-px shrink-0 bg-border sm:block" aria-hidden />
            <span
              title={rival?.name ?? rivalTag.toUpperCase()}
              className="truncate text-xs font-medium sm:text-sm"
            >
              <span className="mr-1 font-normal text-muted-foreground">
                {t('tournament.liveBarAgainst')}{' '}
              </span>
              {rival?.name ?? rivalTag.toUpperCase()}
            </span>
          </div>
        </div>
        <span className="hidden max-w-48 truncate text-xs text-muted-foreground xl:block">
          {tournament.name}
        </span>
        {/**
         * **O hover é o halo verde, e não o cinza do `ghost`** · o fundo
         * `hover:bg-accent` do variante pinta o rótulo de branco, e na vez de
         * lançar placar isso apaga justamente a cor da marca no momento em que
         * a pessoa mais clica aqui. Fundo cinza nesta faixa foi recusado pelo
         * Eduardo em 28/08/2026 (*"fugiu muito do brand"*), e a regra está no
         * `docs/design.md`: o que é apagado acende em verde, o que já é verde
         * ganha halo. Nenhum check pega isto · o `scan:tailwind` só confere se
         * a classe existe.
         */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={cn(
              'h-10 gap-1.5 px-2 text-xs hover:bg-primary/10 hover:text-primary',
              calling && 'text-primary',
            )}
          >
            <Link to={appTournamentPath(tournament.slug)}>
              {calling ? t('tournament.reportAction') : t('tournament.liveBarOpen')}
              <ArrowRight className="hidden h-3.5 w-3.5 sm:block" aria-hidden />
            </Link>
          </Button>
          {room && (
            <>
              <span className="mx-1 h-4 w-px bg-border" aria-hidden />
              {/* Com mensagem nova o link inteiro acende, e a contagem é a mesma
                  pílula da bandeja do header · abaixo de `sm` o rótulo some, e
                  o ícone mais a pílula são o único sinal que sobra na peça. */}
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  'h-10 min-w-10 gap-1.5 px-2 hover:bg-primary/10 hover:text-primary',
                  room.unread > 0 && 'text-primary',
                )}
              >
                <Link
                  to={`${appTournamentPath(tournament.slug)}?${CHAT_PARAM}=${match._id}`}
                  data-live-chat={match._id}
                  aria-label={t('chat.openAction')}
                >
                  <MessageSquare className="h-4 w-4" aria-hidden />
                  <span className="hidden text-xs sm:inline">{t('chat.liveAction')}</span>
                  {room.unread > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none tabular-nums text-primary-foreground">
                      {room.unread > 9 ? '9+' : room.unread}
                    </span>
                  )}
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
