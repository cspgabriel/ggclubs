import { canDeclareMatch } from '@/lib/match-declaration';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  nextMatchStateOf,
  type MatchCard,
  type NextMatchState,
  type TournamentStatus,
} from '@ggclubs/schemas';
import { MessageSquare } from 'lucide-react';
import { ClubCrest } from '@/components/club/club-crest';
import { Button } from '@/components/ui/button';
import { Chamfer } from '@/components/ui/chamfer';
import { MatchSpotlight } from '@/components/tournament/match-spotlight';
import { roundNamer } from '@/lib/round-name';
import { pickMyMatch } from '@/lib/match-moment';
import { cn } from '@/lib/utils';
import type { ClubDirectory, MatchChatting, MatchReporting } from './tournament-shared.js';

/**
 * O seu confronto. · **O SEU confronto · a faixa que aparece pra quem joga.**
 *
 * **É a peça que mais mudou de desenho** · ver o histórico do `ChatButton`, que virou ícone em 30/08 porque o rótulo não cabia na coluna.
 *
 * > **Era um arquivo de 4.118 linhas até 01/09/2026** · o corte é a fase 2 do
 * > [arquitetura.md](../../../../docs/arquitetura.md), e o motivo dele está escrito
 * > lá: arquivo que ninguém lê inteiro é arquivo onde a exceção se esconde.
 */

/**
 * A sua partida, **dentro da edição.**
 *
 * O desenho é do `MatchSpotlight`, que é o mesmo da tela inicial e da aba de
 * campeonatos. **O que este embrulho faz é escolher qual partida** e montar a
 * ação · aqui a moldura não repete o nome da edição (a capa logo acima já o traz
 * em display) e o botão de lançar abre a janela que só esta tela tem.
 */
export function MyMatch({
  matches,
  clubs,
  mine,
  report,
  chat,
  clubHref,
  status,
  thirdPlaceMatch,
  edition,
  priorityTags = report?.tags ?? [],
  className = 'mb-4',
}: {
  matches: MatchCard[];
  clubs: ClubDirectory;
  mine: Set<string>;
  report?: MatchReporting;
  chat?: MatchChatting;
  clubHref: (tag: string) => string;
  status: TournamentStatus;
  thirdPlaceMatch: boolean;
  edition?: { name: string; href: string };
  priorityTags?: string[];
  className?: string;
}) {
  const { t } = useTranslation();
  if (mine.size === 0) return null;

  const priority = new Set(priorityTags);
  const next = pickMyMatch({ matches, mine, priority });
  /**
   * **Não ter jogo marcado é um estado, e não a ausência de um** · até
   * 27/08/2026 isto devolvia `null`, e a tela ficava muda exatamente na hora em
   * que a pessoa mais pergunta o que está acontecendo: entre a partida que
   * fechou e a próxima que ainda não existe.
   */
  if (!next) {
    return (
      <MyMatchWaiting
        matches={matches}
        mine={mine}
        status={status}
        clubs={clubs}
        clubHref={clubHref}
        thirdPlaceMatch={thirdPlaceMatch}
        edition={edition}
        className={className}
      />
    );
  }

  // O lado que é meu · o club que eu respondo ganha quando os dois são meus.
  const myTag = priority.has(next.awayTag)
    ? next.awayTag
    : mine.has(next.homeTag)
      ? next.homeTag
      : next.awayTag;

  /**
   * **Por qual lado eu declaro** · e a pergunta não é a mesma do destaque. Um
   * de cada vez: declarado o do mandante, o botão reaparece pro visitante.
   */
  const reportFor =
    next.status === 'scheduled'
      ? ([next.homeTag, next.awayTag] as const).find(
          (tag) => priority.has(tag) && canDeclareMatch(next, tag),
        )
      : undefined;

  return (
    <MatchSpotlight
      className={className}
      edition={edition}
      roundLabel={roundNamer(matches, t)(next)}
      match={next}
      myTag={myTag}
      clubs={clubs}
      canReport={priority.has(myTag)}
      clubHref={clubHref}
      action={
        (report && reportFor) || chat?.tags.includes(myTag) ? (
          <>
            {report && reportFor && (
              <Button size="sm" variant="ctaOutline" onClick={() => report?.open(next, reportFor)}>
                {t('tournament.reportAction')}
              </Button>
            )}
            {chat?.tags.includes(myTag ?? '') && <ChatButton match={next} chat={chat} />}
          </>
        ) : undefined
      }
    />
  );
}

/**
 * **O botão que abre a sala** · e ele carrega o número quando há movimento.
 *
 * Pedido do Eduardo em 27/08/2026: *"tem que tomar cuidado pro chat não ficar
 * muito escondido, ainda mais quando tiver tendo movimentação nele"*. Por isso
 * o contador **não** espera alguém abrir a sala pra existir · ele vem da tela
 * da edição, que o repete a cada 10s.
 *
 * **Com mensagem nova ele acende; sem, ele é discreto** · a mesma regra do
 * resto da casa, e o oposto de um botão verde permanente, que vira moldura e
 * para de ser visto.
 */
/**
 * **Na linha da chave ele é só o ícone; na faixa do jogo ele tem a palavra.**
 *
 * A diferença não é gosto, é largura medida: com a palavra o botão dá **115px**
 * (e **137** com o contador aberto) numa coluna de **128** · era isso que
 * empurrava a conversa pra uma segunda linha, e o Eduardo apontou em
 * 29/08/2026 · *"mas ainda sim fica numa linha abaixo"*. **Só o ícone dá 46px**
 * e cabe em qualquer combinação, inclusive ao lado do "lançar placar".
 *
 * **Ele precisa se comunicar sozinho**, que foi a condição dele pra aceitar ·
 * e o que sustenta isso é ser **o mesmo desenho da bandeja do header**: mesmo
 * balão, mesmo badge sobreposto, mesma regra do `9+`. Quem já usou a bandeja
 * não aprende nada novo aqui. Junto vão o `title` (o hover do desktop) e o
 * `aria-label` com a contagem, que é o que o leitor de tela lê.
 *
 * **O contador NÃO empurra largura** · ele é `absolute` sobre o canto, como na
 * bandeja. Era ele quem estourava a coluna, e no desenho antigo ele entrava no
 * fluxo do botão.
 *
 * **E o destaque continua sendo a cor** · com não lido o botão vira `cta`, que
 * é o que faz a linha saltar numa chave de vinte e quatro confrontos.
 */
export function ChatButton({
  match,
  chat,
  iconOnly = false,
}: {
  match: MatchCard;
  chat?: MatchChatting;
  iconOnly?: boolean;
}) {
  const { t } = useTranslation();
  if (!chat) return null;

  const unread = chat.unread[match._id] ?? 0;
  const hasUnread = unread > 0;
  const label =
    unread > 0 ? t('chat.openActionWithCount', { count: unread }) : t('chat.openAction');

  if (iconOnly) {
    return (
      <button
        type="button"
        data-chat-open={match._id}
        title={label}
        aria-label={label}
        onClick={() => chat.open(match)}
        className={cn(
          // **Do tamanho do botão de prova, e não do `size="icon"`** · aquele
          // mede 40px de altura e **esticava a linha de 40 pra 60px**, que é o
          // oposto do que este conserto existe pra fazer. Aqui a caixa fica em
          // 20px, igual à do print ao lado.
          'flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5',
          'text-[10px] font-semibold transition-colors',
          unread > 0
            ? 'border-primary/50 bg-primary/10 text-primary hover:border-primary'
            : 'border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary',
        )}
      >
        <MessageSquare className="h-3.5 w-3.5" aria-hidden />
        {/**
         * **No celular a palavra fica, e isso não é inconsistência** · é a
         * geometria. O aperto é da coluna fixa de 128px, que só existe de `sm`
         * pra cima · abaixo dela os dois lados do confronto empilham e sobra
         * largura à direita.
         *
         * E é o que responde a pergunta dele em 29/08/2026 · *"mas `title` não
         * funciona no celular né?"*. Não funciona: **não há hover em toque**.
         * Então onde o tooltip não existe, existe a palavra; e onde a palavra
         * não cabe, existe o tooltip. Nenhuma das duas telas fica só com o
         * desenho.
         */}
        <span className="sm:hidden">{t('chat.openAction')}</span>
        {hasUnread && <span aria-hidden>{unread > 9 ? '9+' : unread}</span>}
      </button>
    );
  }

  return (
    <Button
      size="sm"
      variant={unread > 0 ? 'cta' : 'ghost'}
      data-chat-open={match._id}
      onClick={() => chat.open(match)}
    >
      <MessageSquare className="mr-1.5 h-4 w-4" aria-hidden />
      {t('chat.openAction')}
      {unread > 0 && (
        <span className="ml-1.5 rounded-full bg-background/25 px-1.5 text-[11px] font-semibold">
          {unread}
        </span>
      )}
    </Button>
  );
}

/**
 * **O que você está esperando, quando não há jogo marcado.**
 *
 * Nasceu em 27/08/2026 de uma pergunta do Eduardo · *"precisa pensar no caso da
 * partida de um ter fechado e a do próximo adversário ainda não, aí precisa ter
 * o aviso dizendo que ainda está aguardando"*. Ele está certo, e a versão curta
 * do porquê é esta: **no mata-mata o seu próximo confronto não existe** até a
 * rodada inteira fechar, então "sala fechada" seria mentira e o silêncio era
 * pior.
 *
 * **As causas não valem a mesma coisa e por isso têm frases diferentes.**
 * Esperar o vizinho terminar dura minutos; esperar a chave sair **não tem
 * relógio**, porque quem a gera é uma pessoa. Quem decide qual é o caso é o
 * `nextMatchStateOf`, nos schemas, e não esta tela.
 */
function MyMatchWaiting({
  matches,
  mine,
  status,
  clubs,
  clubHref,
  thirdPlaceMatch,
  edition,
  className,
}: {
  matches: MatchCard[];
  mine: Set<string>;
  status: TournamentStatus;
  clubs: ClubDirectory;
  clubHref: (tag: string) => string;
  /** Sem isto, quem perde a semi lê "eliminado" e tem jogo. */
  thirdPlaceMatch: boolean;
  edition?: { name: string; href: string };
  className?: string;
}) {
  const { t } = useTranslation();

  /**
   * **O club mais adiantado manda na frase** · quem tem dois clubs na edição
   * (raro, e possível) não deve ler "eliminado" por causa do que caiu primeiro.
   */
  const ORDER: NextMatchState['kind'][] = [
    'waitingRound',
    'waitingThirdPlace',
    'waitingBracket',
    'waitingGroups',
    'eliminated',
    'done',
  ];
  const states = [...mine]
    .map((tag) => nextMatchStateOf(matches, tag, status, { thirdPlaceMatch }))
    .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  const state = states[0];
  if (!state || state.kind === 'done' || state.kind === 'next' || state.kind === 'disputed') {
    return null;
  }

  /**
   * **Passar de fase é o momento mais alto da noite, e ele não pode ler como
   * aviso de sistema** · por isso só ele acende a borda e ganha o display.
   *
   * A espera pela chave acende o rótulo mas não a borda: ela é ansiosa, não é
   * comemoração · e é onde o botão de falar com a organização vai morar.
   */
  const celebrating = state.kind === 'waitingRound';
  const calling = celebrating || state.kind === 'waitingBracket';

  return (
    <Chamfer
      data-waiting-state={state.kind}
      border={celebrating ? 'bg-primary/50' : 'bg-border'}
      innerClassName="flex flex-wrap items-center gap-x-4 gap-y-3 bg-card p-4"
      className={cn('block', className)}
    >
      <div className="min-w-0 flex-1">
        {edition && (
          <Link
            to={edition.href}
            className="mb-2 block text-xs font-semibold text-primary hover:underline"
          >
            {edition.name} <span aria-hidden>→</span>
          </Link>
        )}
        <span
          className={cn(
            'text-[11px] uppercase tracking-widest',
            calling ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {t(`tournament.waiting.${state.kind}Kicker`)}
        </span>

        {/* **Display só na vitória** · em qualquer outro estado ele seria
            volume sem notícia, e a casa reserva a Archivo pra impacto. */}
        {celebrating ? (
          <p className="mt-1 font-display text-xl uppercase leading-none tracking-tight">
            {t('tournament.waiting.waitingRoundTitle')}
          </p>
        ) : (
          <p className="mt-1 text-sm font-semibold">{t(`tournament.waiting.${state.kind}Title`)}</p>
        )}

        <p className="mt-1.5 text-sm text-muted-foreground">
          {state.kind === 'waitingRound'
            ? state.rivalTag
              ? t('tournament.waiting.waitingRoundKnown', { rival: state.rivalTag.toUpperCase() })
              : t('tournament.waiting.waitingRoundUnknown')
            : t(`tournament.waiting.${state.kind}`)}
        </p>

        {/**
         * **O confronto que decide, e só ele** · a chave pareia os vencedores
         * na ordem da rodada anterior, então numa chave de 32 há sete jogos
         * abertos e **seis não são sobre mim**. A primeira versão listava os
         * sete, e foi o cenário de 48 clubs que mostrou o quanto isso é inútil.
         */}
        {state.kind === 'waitingRound' && state.decider && (
          <div className="mt-3 flex min-w-0 items-center gap-2">
            <WaitingSide tag={state.decider.homeTag} clubs={clubs} clubHref={clubHref} />
            <span className="shrink-0 text-[11px] uppercase tracking-widest text-muted-foreground">
              ×
            </span>
            <WaitingSide tag={state.decider.awayTag} clubs={clubs} clubHref={clubHref} />
          </div>
        )}

        {/**
         * **A rodada inteira ainda segura a partida, e isso é OUTRA coisa** ·
         * saber o nome do adversário não faz o jogo existir: a chave só anda
         * quando todos os confrontos da rodada têm vencedor.
         */}
        {state.kind === 'waitingRound' && state.roundOpen > (state.decider ? 1 : 0) && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t('tournament.waiting.waitingRoundRest', { count: state.roundOpen })}
          </p>
        )}
      </div>
    </Chamfer>
  );
}

/** Um lado do confronto que ainda decide o meu adversário. */
function WaitingSide({
  tag,
  clubs,
  clubHref,
}: {
  tag: string;
  clubs: ClubDirectory;
  clubHref: (tag: string) => string;
}) {
  const club = clubs.get(tag);
  return (
    <Link to={clubHref(tag)} className="flex min-w-0 items-center gap-1.5">
      <ClubCrest
        tag={tag}
        crestUrl={club?.crestUrl ?? null}
        className="h-6 w-6 shrink-0 text-[8px]"
      />
      <span className="truncate text-xs font-semibold uppercase tracking-wide">{tag}</span>
    </Link>
  );
}
