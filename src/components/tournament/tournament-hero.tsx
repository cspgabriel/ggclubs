import { tournamentIsDrawn } from '@ggclubs/schemas';
import { useTranslation } from 'react-i18next';
import {
  capacityOf,
  groupCount,
  qualifiedCount,
  sizeFor,
  displayStatusOf,
  type BracketSize,
  type Podium,
  registrationIsOpen,
  teamsInEdition,
  type MatchCard,
} from '@ggclubs/schemas';
import { Medal, Trophy } from 'lucide-react';
import { Trans } from 'react-i18next';
import { BrandWatermark } from '@/components/brand';
import { ClubCrest } from '@/components/club/club-crest';
import { Badge } from '@/components/ui/badge';
import { Chamfer } from '@/components/ui/chamfer';
import { SectionTitle } from '@/components/ui/section-title';
import type { TournamentRecord } from '@/lib/api';
import { POOL_KEY } from '@/lib/clubs';
import { Money } from '@/components/ui/money';
import { formatCents, formatPrice } from '@/lib/format';
import { formatMatchTime } from '@/lib/tournament-format';
import { relativeTime } from '@/lib/relative-time';
import { knockoutTree } from '@/lib/knockout-tree';
import { competitionProgress } from '@/lib/competition-progress';
import { cn } from '@/lib/utils';
import { FormatDiagram } from './format-diagram.js';
import { ClubLink } from './club-link.js';
import type { ClubDirectory } from './tournament-shared.js';

/**
 * O topo da página do campeonato. · **O topo da página · a faixa, as datas, o pódio, o prêmio e o formato.**
 *
 *
 *
 * > **Era um arquivo de 4.118 linhas até 01/09/2026** · o corte é a fase 2 do
 * > [arquitetura.md](../../../../docs/arquitetura.md), e o motivo dele está escrito
 * > lá: arquivo que ninguém lê inteiro é arquivo onde a exceção se esconde.
 */

/**
 * A capa · **e ela é onde a identidade do produto entra na área de campeonato.**
 *
 * O desenho é o do hero da landing, um degrau abaixo: sobrelinha em caixa
 * espaçada, nome em `font-display` no maior corpo da tela, e **o número de vagas
 * no gradiente da marca** · que é exatamente o que o `.text-brand-gradient`
 * existe pra vestir (placar e número grande, nunca título).
 *
 * **A barra de vagas não é enfeite: é a escassez desenhada.** O teto é
 * verdadeiro, e o produto tem um teto por edição · ver a barra encher é a
 * informação que faz a pessoa decidir agora em vez de voltar depois.
 */
export function TournamentHero({
  tournament,
  matches = [],
  resultsComplete = false,
}: {
  tournament: TournamentRecord;
  matches?: MatchCard[];
  resultsComplete?: boolean;
}) {
  const { t } = useTranslation();
  const capacity = capacityOf(tournament);
  /**
   * **Depois do sorteio quem conta é a chave** · ver o `teamsInEdition`.
   * Pendência 177: um reembolso decrementava o contador com a chave já
   * desenhada, e a capa afirmava menos times do que jogaram.
   */
  const taken = teamsInEdition(tournament);
  const left = Math.max(capacity - taken, 0);
  const pct = capacity > 0 ? Math.min(Math.round((taken / capacity) * 100), 100) : 0;
  /** A porta de verdade · ver o `registrationIsOpen`. Pendência 174. */
  const open = registrationIsOpen(tournament);
  /**
   * **O selo pergunta ao relógio** · `open` no banco vira três coisas na tela
   * conforme a data (ver `displayStatusOf`). O `open` acima continua sendo
   * o status, que é o que decide moldura e contagem de vaga.
   */
  const mostra =
    resultsComplete && tournament.status !== 'cancelled' ? 'finished' : displayStatusOf(tournament);
  const drawn = matches.length > 0 || tournamentIsDrawn(tournament);
  const phase = matches.some((match) => match.phase === 'knockout') ? 'knockout' : 'group';
  const phaseMatches = matches.filter((match) => match.phase === phase);
  const tree = knockoutTree(phaseMatches);
  const expectedThird = tournament.format.thirdPlaceMatch && (tree[0]?.slots.length ?? 0) > 1;
  const total =
    phase === 'knockout'
      ? Math.max(
          phaseMatches.length,
          tree.reduce((sum, round) => sum + round.slots.length, 0) + Number(expectedThird),
        )
      : phaseMatches.length;
  const settled = phaseMatches.filter(
    (match) => match.status === 'played' || match.status === 'walkover',
  ).length;
  const progress = competitionProgress(matches);

  return (
    <header
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6',
        // O verde só encosta na borda quando a edição está aberta · edição
        // fechada com a moldura acesa seria a tela contradizendo o estado.
        open && 'border-primary/30',
      )}
    >
      {tournament.bannerUrl && (
        <img
          src={tournament.bannerUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
      )}

      {/**
       * **A marca d'água ladrilhada, como na landing e na página do club.**
       *
       * Ela é o que faz a capa ler como **peça** e não como cartão de painel · e
       * ela já existia construída, usada em três telas, enquanto a área de
       * campeonato (que é o core do produto) não usava nenhuma das peças de
       * identidade da casa. Isso foi achado olhando as capturas em 18/08/2026:
       * *a landing tem a linguagem, e o campeonato não fala ela.*
       *
       * **Só quando não há banner** · as duas disputam o mesmo fundo, e o banner
       * é escolha de quem organiza a edição.
       */}
      {!tournament.bannerUrl && <BrandWatermark />}

      <div className="relative">
        {/* **A sobrelinha em verde é o acento, e o nome sustenta em branco** ·
            é a regra de cor da casa aplicada onde ela cabe. O nome da edição não
            se parte em duas cores como o hero da landing porque ele é livre:
            quebrar um nome arbitrário no meio é escolher uma sílaba por quem
            escreveu. */}
        {/**
         * **Os selos sobem pra linha da sobrelinha** · 19/08/2026, e o motivo é
         * altura: eles ocupavam uma faixa própria de 40px logo abaixo do nome,
         * enquanto a sobrelinha deixava a linha dela quase vazia. São dois
         * rótulos curtos e três selos curtos · cabem juntos até a 320, e aí
         * quebram sozinhos.
         */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">
            {t('tournament.overline')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={mostra === 'open' ? 'success' : 'default'} size="sm">
              {t(`tournament.status.${mostra}`)}
            </Badge>
            <Badge variant="strong" size="sm" title={t('tournament.generationHint')}>
              {t(POOL_KEY[tournament.pool])}
            </Badge>
            <Badge variant="outline" size="sm">
              {tournament.priceCents === 0
                ? t('tournament.free')
                : `${t('tournament.entry')} ${formatPrice(tournament.priceCents)}`}
            </Badge>
          </div>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-4">
          {/**
           * **O escudo é objeto-herói, e não miniatura** · palco escuro, anel da
           * marca e brilho por baixo. É o item nº 1 do `docs/design.md` sobre a
           * referência de walkout: *"escudo, carta de player e tática precisam
           * ser tratados como objeto, com palco e glow · não como imagem plana
           * num card. É o que faz parecer EA FC e não diretório de times."*
           */}
          {tournament.crestUrl && (
            <span className="relative shrink-0">
              <span aria-hidden className="absolute -inset-2 rounded-full bg-primary/20 blur-xl" />
              <img
                src={tournament.crestUrl}
                alt=""
                className="relative h-16 w-16 rounded-xl object-cover ring-2 ring-primary/40 sm:h-20 sm:w-20"
              />
            </span>
          )}
          <h1 className="min-w-0 font-display text-2xl uppercase leading-[0.95] text-foreground sm:text-4xl">
            {tournament.name}
          </h1>
        </div>

        {/* **O número grande é a vaga que sobra**, enquanto sobra · quem lê a
            página decide por escassez, não por tamanho. O total fica na linha
            de baixo, onde ele explica o número.

            **Duas exceções, e as duas mostram o total**: edição fechada (a
            pergunta deixou de existir) e edição lotada, onde "quantas sobram"
            é zero e o rótulo passa a falar do que se esgotou · ver logo abaixo. */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 sm:gap-x-6">
          <div>
            {/* **Edição fechada mostra quantos entraram**, e não quantas vagas
                sobraram · a segunda é uma pergunta que não existe mais. */}
            {/* `data-spots` é o alvo do probe de tempo real · retrato escopado,
                e não texto solto no corpo da página. */}
            {/* **O número e o rótulo têm que falar da mesma coisa** · com a
                edição cheia o rótulo virava `spotsFull` e o número continuava
                sendo `left`, ou seja zero · e zero esgotadas é o contrário do
                que aconteceu. Lotada mostra o `taken`, que é o número de vagas
                que de fato se esgotaram. */}
            <p data-spots className="font-display text-3xl leading-none text-primary sm:text-4xl">
              {open && left > 0 ? left : taken}
            </p>
            <p className="mt-1 text-[10px] uppercase text-muted-foreground sm:text-xs sm:tracking-widest">
              {!open
                ? t('tournament.teamsInLabel')
                : left === 0
                  ? t('tournament.spotsFull')
                  : t('tournament.spotsLeftLabel', { count: left })}
            </p>
          </div>

          {!drawn && (
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
                <span>{t('tournament.spotsOf', { taken, total: capacity })}</span>
                {open && (
                  <span>
                    {t('tournament.closesIn', {
                      when: relativeTime(tournament.registrationClosesAt),
                    })}
                  </span>
                )}
              </div>
              {/**
               * **A barra some na edição cancelada** · 19/08/2026, do mesmo
               * achado do aviso que dizia "já fechou".
               *
               * Ela é uma promessa de enchimento · desenha o quanto falta pra
               * edição fechar o degrau, e numa edição que não vai acontecer isso
               * é a capa afirmando que ainda há o que preencher. A contagem ao
               * lado fica, porque ela é fato: aqueles clubs estavam dentro.
               */}
              {tournament.status !== 'cancelled' && (
                <div
                  className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary"
                  role="progressbar"
                  aria-valuenow={taken}
                  aria-valuemin={0}
                  aria-valuemax={capacity}
                  aria-label={t('tournament.spotsOf', { taken, total: capacity })}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>
          )}
          {drawn && matches.length > 0 && (
            <div className="min-w-0 basis-full border-t border-border pt-3 sm:flex-1 sm:basis-0 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <p className="font-display text-base uppercase text-primary sm:text-xl">
                {mostra === 'cancelled'
                  ? t('tournament.status.cancelled')
                  : mostra === 'finished'
                    ? t(
                        resultsComplete
                          ? 'tournament.bracketComplete'
                          : 'tournament.status.finished',
                      )
                    : t(
                        phase === 'knockout' ? 'tournament.phaseKnockout' : 'tournament.phaseGroup',
                      )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('tournament.phaseProgress', { settled, total })}
              </p>
              {progress.thirdPending && mostra !== 'cancelled' && (
                <p className="mt-2 text-xs text-amber-400">{t('competitionUx.thirdPending')}</p>
              )}
            </div>
          )}
        </div>

        {/**
         * **As datas moram na capa desde 18/08/2026**, e não numa coluna ao
         * lado · a mudança é medida, não estética.
         *
         * Elas viviam numa `aside` de 20rem, e isso custava nas duas pontas: a
         * **1280** a caixa tinha 180px de altura e deixava ~5.000px de coluna
         * vazia à direita, com a chave espremida em ~670px de 1280; e a **390**
         * a coluna cai **depois** de tudo, então *quando é* virava a última
         * coisa da página · numa rolagem de treze telas.
         *
         * **Quando é** é informação de decisão, e ela entra junto com o que a
         * decisão custa.
         */}
        {!drawn && <TournamentDates tournament={tournament} />}
      </div>
    </header>
  );
}

/**
 * A premiação · **o pódio, e o primeiro lugar carrega o peso.**
 *
 * Três cartões iguais lêem como tabela. O que faz a pessoa querer entrar é o
 * primeiro número, então ele é o único no gradiente da marca e no maior corpo ·
 * a regra da casa é gastar ousadia num lugar só.
 */
/**
 * **O pódio** · quem levantou a taça, e é isto que fechava o ciclo do
 * campeonato.
 *
 * Nasce em 20/08/2026, com o pedido do Eduardo de *"fechar o que falta do
 * campeonato, de decretar as premiações"* · até aqui a edição **acabava e não
 * dizia quem ganhou**: a final fechava, a chave ficava desenhada com o placar,
 * e nenhuma tela afirmava o campeão. Quem chegava pelo link do Discord no dia
 * seguinte tinha que ler a chave de trás pra frente.
 *
 * **Ele é derivado das partidas** (`podiumOf`), e não gravado · o campeão já
 * está na final, e uma segunda fonte pro mesmo fato divergiria no dia em que a
 * organização corrigisse um placar, que é caminho normal aqui.
 *
 * **Ele vem no TOPO da edição terminada**, antes da chave · a pergunta de quem
 * abre uma edição que acabou é *"quem ganhou?"*, e a chave é a resposta longa.
 *
 * **O prêmio aparece junto quando existe**, e a entrega é por fora · o produto
 * **decreta**, e o Eduardo paga na mão. Prometer na tela um pagamento que o
 * código não executa é a documentação mentindo, versão pior: na cara de quem
 * ganhou.
 */
export function PodiumPanel({
  podium,
  clubs,
  clubHref,
  size,
}: {
  podium: Podium;
  clubs: ClubDirectory;
  clubHref: (tag: string) => string;
  /** O degrau que a edição jogou · é dele que sai o prêmio de cada posição. */
  size: BracketSize | null;
}) {
  const { t } = useTranslation();

  const places = [
    { tag: podium.champion, key: 'podiumFirst', cents: size?.prize.first ?? 0, place: 1 },
    { tag: podium.runnerUp, key: 'podiumSecond', cents: size?.prize.second ?? 0, place: 2 },
    ...(podium.third
      ? [{ tag: podium.third, key: 'podiumThird', cents: size?.prize.third ?? 0, place: 3 }]
      : []),
  ] as const;

  return (
    <section>
      <SectionTitle meta={t('tournament.podiumMeta')}>{t('tournament.podiumTitle')}</SectionTitle>

      <ol className="grid gap-3 sm:grid-cols-3">
        {places.map((one) => {
          const club = clubs.get(one.tag);
          const champion = one.place === 1;
          return (
            <li
              key={one.tag}
              className={cn(
                // **Hover nos três** · eles levam pra página do club, e card
                // clicável sem resposta ao mouse lê como card morto.
                'rounded-xl border bg-card p-4 transition-colors',
                /**
                 * **Ouro, prata e bronze** · 20/08/2026, achado do Eduardo: *"no
                 * pódio o vice parece que nem tem destaque nenhum"*.
                 *
                 * Ele estava certo · o vice ficava com `border-border`, que é a
                 * borda de **qualquer** card do produto: no meio de um verde e
                 * de um bronze, ele lia como caixa esquecida em vez de segundo
                 * lugar.
                 *
                 * **Só o campeão gasta a cor da marca**, e os outros dois usam a
                 * escala do pódio de verdade · três verdes seriam nenhum
                 * destaque, e é a mesma régua dos pesos da chave.
                 */
                /**
                 * **OURO, e não o verde da marca** · decisão do Eduardo em
                 * 05/09/2026, olhando o pódio da Copa de Estreia: *"deixar o
                 * campeão com dourado"*.
                 *
                 * **Ela substitui a de 20/08**, que dizia *"só o campeão gasta a
                 * cor da marca"* · o argumento de lá continua válido no que
                 * importa (três verdes seriam nenhum destaque), e o que mudou é
                 * qual cor carrega o primeiro lugar. Ouro, prata e bronze são a
                 * escada que **todo mundo já sabe ler**, e ela não gasta o verde
                 * · que aqui volta a significar só ação e marca.
                 */
                champion &&
                  'border-amber-300/60 bg-amber-300/10 ring-1 ring-amber-300/20 hover:border-amber-300/85',
                /**
                 * **Branco, e não um cinza novo** · prata na identidade da casa
                 * é o "sustenta", e `zinc-300` nem existe no tema (o
                 * `scan:tailwind` pegou a classe que não pintaria nada).
                 *
                 * **E ela precisa ser mais forte que o bronze** · 20/08/2026,
                 * segunda passada do Eduardo: *"no vice não dá pra perceber esse
                 * prata, parece que o terceiro tem mais destaque"*.
                 *
                 * A causa é que **cor vence tom**: o bronze é um âmbar de
                 * verdade e salta sozinho, enquanto a prata era branco a 25% num
                 * fundo escuro · quase a borda padrão. A escada só existe se a
                 * do meio for **mais visível** que a de baixo, e não apenas
                 * diferente dela.
                 */
                one.place === 2 &&
                  'border-slate-300/60 bg-slate-300/[0.12] ring-1 ring-slate-300/15 hover:border-slate-300/85',
                // **Bronze mais fundo desde 05/09/2026** · com o ouro no campeão,
                // o `amber-600` de antes ficava perto demais dele · a escada só
                // lê se o primeiro e o terceiro não competirem pelo mesmo tom.
                one.place === 3 && 'border-amber-700/50 bg-amber-700/8 hover:border-amber-700/70',
              )}
            >
              <p
                className={cn(
                  'flex items-center gap-1.5 text-[10px] uppercase tracking-widest',
                  champion && 'text-amber-300',
                  one.place === 2 && 'text-slate-300',
                  // **Bronze é SUPERFÍCIE em 700 e TINTA em 600** · medido em
                  // 05/09/2026: `amber-700` como texto dá 3,20:1 sobre o card, e
                  // o AA pede 4,5 · o `600` dá 5,03:1. A borda e o fundo ficam no
                  // 700, que é onde o tom mais fundo separa o terceiro do ouro.
                  one.place === 3 && 'text-amber-600',
                )}
              >
                {champion && <Trophy className="h-3.5 w-3.5" aria-hidden />}
                {/* A medalha nas duas, com a cor de cada uma · o campeão tem
                    troféu, que é outra coisa. */}
                {!champion && <Medal className="h-3.5 w-3.5" aria-hidden />}
                {t(`tournament.${one.key}` as 'tournament.podiumFirst')}
              </p>

              <ClubLink
                tag={one.tag}
                clubs={clubs}
                clubHref={clubHref}
                className="mt-2 flex min-w-0 items-center gap-2"
              >
                <ClubCrest
                  tag={one.tag}
                  crestUrl={club?.crestUrl ?? null}
                  className={cn(
                    'shrink-0 text-[9px]',
                    champion && 'h-10 w-10',
                    one.place === 2 && 'h-9 w-9',
                    one.place === 3 && 'h-8 w-8',
                  )}
                />
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate font-display uppercase tracking-tight text-foreground',
                    // O tamanho também é escada · o campeão é o único em corpo
                    // grande, e o vice fica acima do terceiro.
                    champion && 'text-lg text-amber-300',
                    one.place === 2 && 'text-base',
                    one.place === 3 && 'text-sm',
                  )}
                >
                  {club?.name ?? one.tag.toUpperCase()}
                </span>
              </ClubLink>

              {/* **O prêmio só onde ele existe** · "R$ 0" embaixo do campeão é a
                  tela gastando o lugar de mais destaque pra anunciar nada. */}
              {one.cents > 0 && (
                /**
                 * **O valor exato e o meio, na mesma linha** · pedido do Eduardo
                 * em 05/09/2026: quem lê "R$ 500" pergunta como recebe, e a
                 * resposta cabe aqui. O `formatPrice` é o que **não arredonda** ·
                 * prêmio é dinheiro que alguém vai receber, e a regra da casa é
                 * que valor de cobrança nunca arredonda.
                 */
                <p className="mt-2 font-display text-sm tabular-nums text-foreground">
                  {t('tournament.prizeViaPix', { value: formatPrice(one.cents) })}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function PrizePanel({ size }: { size: BracketSize }) {
  const { t } = useTranslation();
  const rows = [
    ['prizeFirst', size.prize.first, true],
    ['prizeSecond', size.prize.second, false],
    ['prizeThird', size.prize.third, false],
  ] as const;

  /**
   * **Edição sem prêmio não desenha pódio** · três cartões dizendo "R$ 0", com o
   * primeiro no gradiente da marca e no maior corpo da tela, é a página gastando
   * o seu lugar de mais destaque pra anunciar nada. Achado na captura da Copa
   * Demo, que é grátis.
   *
   * **Grátis não é defeito**, e a capa já diz isso no selo · aqui a resposta
   * certa é o silêncio, e não um zero em corpo 36.
   */
  if (size.prize.first === 0 && size.prize.second === 0 && size.prize.third === 0) return null;

  return (
    <section>
      <SectionTitle>{t('tournament.prizeTitle')}</SectionTitle>
      <dl className="grid gap-3 sm:grid-cols-3">
        {rows.map(([key, cents, hero]) => (
          <div
            key={key}
            className={cn(
              'rounded-xl border bg-card p-4',
              hero ? 'border-primary/30' : 'border-border',
            )}
          >
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">
              {t(`tournament.${key}`)}
            </dt>
            {/* **Os três no mesmo corpo** · 04/09/2026, pedido do Eduardo olhando
                a Copa de Estreia. O 1º vinha em `text-4xl` contra `text-xl` dos
                outros, e a diferença de escala fazia o 2º e o 3º lerem como nota
                de rodapé de um pódio que tem três lugares de verdade. **O
                destaque continua**, pela cor e pela borda · que é o que a casa
                faz em toda parte, e custa menos altura de página. */}
            <dd
              className={cn(
                'mt-1 font-display text-2xl sm:text-3xl',
                hero ? 'text-brand-gradient' : 'text-foreground',
              )}
            >
              <Money cents={cents} exact />
            </dd>
            {/**
             * **Como o dinheiro chega** · 05/09/2026, pedido do Eduardo. O
             * número responde *quanto*, e faltava o *como* · é a primeira
             * pergunta de quem lê um prêmio, e ela não custa uma linha nova de
             * seção: cabe embaixo do valor, em corpo pequeno.
             *
             * **Fica fora do `Money`** · aquela peça resolve o cifrão colado ao
             * número em display, e enfiar texto nela faria a próxima tela herdar
             * "no PIX" sem pedir.
             */}
            <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              {t('tournament.pixHint')}
            </p>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * **A escada de tamanhos · religada em 03/09/2026**, e o gatilho estava escrito
 * aqui desde que ela foi desligada: *"o dia em que uma edição paga grande abrir,
 * esta linha volta pra `true`"*. Esse dia é o da **Copa de Estreia**, a primeira
 * edição paga de verdade, com 32 vagas a R$ 49,90 e degraus de 24 e 16.
 *
 * **Ela ficou desligada de 19/08 a 03/09 por decisão do Eduardo**, e o argumento
 * era bom: a escada responde *"e se não encher?"*, mas também **anuncia que a
 * edição pode não encher**, no meio da página que precisa convencer.
 *
 * **O que mudou não foi a opinião, foram os fatos:**
 *
 * - a página anuncia **32 vagas** e mostra os inscritos · quem chega e vê 3 de
 *   32 já **tem** a dúvida, e aí a escada deixa de levantá-la e passa a
 *   respondê-la (é o oposto do caso da seção de reembolso, que criava um medo
 *   que ninguém tinha · ver `docs/design.md`);
 * - **o regulamento remete a ela** · ele diz que os tamanhos estão no topo da
 *   página, e sem isto aqui o texto mente;
 * - **a landing já mostra a escada com prêmio** desde 03/09 (`TournamentTerms`),
 *   então as duas telas estavam discordando sobre o mesmo campo.
 */
const SHOW_LADDER = true;

export function FormatPanel({
  tournament,
  current,
  paidCount,
  drawn = tournamentIsDrawn(tournament),
}: {
  tournament: TournamentRecord;
  current: BracketSize | null;
  /**
   * **Quantos já PAGARAM** · e não o `registeredCount`, que conta vaga.
   *
   * Ele vem de fora porque quem tem a lista de inscrições é a view · o `status`
   * já viaja no card, então isto não custa chamada nenhuma.
   */
  paidCount: number;
  drawn?: boolean;
}) {
  const { t } = useTranslation();
  const sizes = tournament.format.sizes;
  /**
   * **O que o painel desenha: o degrau congelado depois do sorteio, e o tamanho
   * anunciado antes dele** · é o `effectiveSize`, e ele mudou em 04/09/2026.
   *
   * Antes o `current` acompanhava o degrau alcançado enquanto a inscrição
   * corria, e o painel encolhia sozinho a cada degrau cruzado · hoje ele
   * descreve **a edição que foi vendida** até o sorteio decidir. Depois do
   * sorteio ele continua sendo o que de fato rodou, que era o ponto original
   * desta linha: o painel anunciava "12 grupos" numa edição que rodou com 3.
   */
  const shown = current ?? sizes[0]!;
  /**
   * **O degrau que de fato fechou**, e ele NÃO sai do `current`.
   *
   * São duas perguntas, e a escada faz a outra · o `current` diz o que a edição
   * anuncia, e aqui a pergunta é *"quanto já encheu de verdade"*. Elas
   * coincidiam antes de 04/09/2026 e hoje divergem de propósito **durante toda
   * a inscrição**: é justamente essa divergência que a escada existe pra
   * mostrar, dizendo que é o "e se não encher".
   *
   * Sem isto ela marcava *"com 32 times · é o tamanho de agora"* com 0
   * inscritos, afirmando o maior justamente quando não há nem o menor. Achado
   * pelo Eduardo olhando a tela em 03/09/2026.
   */
  /**
   * **E ela pergunta aos CONFIRMADOS, não ao contador** · 04/09/2026.
   *
   * O `registeredCount` conta **vaga** (reserva + pago) e o `drawTournament`
   * conta **dinheiro** · ele filtra `status: 'confirmed'` e recusa quando o
   * número não fecha um degrau exato. A escada fala do **sorteio**, então ela é
   * do lado do dinheiro.
   *
   * **Sem isto, o defeito PIORAVA quando o contador subia:** com 14 pagos e 2
   * reservados a frase de "faltam N" sumia e a escada passava a afirmar *"com 16
   * times · é o tamanho de agora"* · uma promessa sem número nenhum, com o
   * sorteio ainda recusando por `too-few`.
   *
   * **Contar vaga continua certo em tudo o mais** · a barra, o selo de vagas e a
   * guarda de capacidade perguntam *"tem vaga?"*, e lá a reserva conta mesmo.
   */
  const reached = tournament.drawnSize ?? sizeFor(tournament.format, paidCount);
  const smallest = sizes[sizes.length - 1]!;

  return (
    // A âncora existe pra captura e pra probe · a seção do formato é a única
    // que não tem um título único no DOM (a página tem outros ).
    <section data-format>
      <SectionTitle>
        {t(drawn ? 'tournament.playedFormatTitle' : 'tournament.formatTitle')}
      </SectionTitle>

      {/* **O desenho à esquerda e a leitura à direita, a partir de `sm`** · numa
          coluna só, a 1280 o painel tinha 1.200px de largura com o conteúdo
          ocupando os primeiros 15%. Empilhado no celular, que é onde não há
          largura pra dividir.

          **A divisão era em `md` até 03/09/2026**, e a faixa de 640 a 767 era o
          pior lugar do painel: empilhado numa caixa de ~590px, o diagrama
          espalhava quatro colunas por meia tela e a frase começava 200px abaixo.
          A 640 a coluna do texto ainda tem ~390px · mais do que ela tem no
          celular inteiro, onde já se lê bem. */}
      <Chamfer
        border="bg-border"
        innerClassName="bg-card p-5 sm:p-6 sm:flex sm:items-center sm:gap-6 md:gap-8 lg:gap-12"
      >
        <FormatDiagram size={shown} />

        <div className="mt-5 min-w-0 sm:mt-0 sm:flex-1">
          {/* **A frase virou a manchete do painel** · ela é o que explica o
              desenho, e era legenda cinza embaixo de dois números. */}
          <p className="text-sm leading-relaxed text-foreground sm:text-base">
            {/**
             * **Os três números vêm marcados** · pedido do Eduardo em
             * 19/08/2026: *"o número em si poderia ficar em destaque também,
             * tipo '3' grupos de '4'"*.
             *
             * Ele está certo, e a razão é a mesma que fez a frase virar
             * manchete: **os números são a informação, e o resto é a
             * gramática**. Lidos no mesmo peso das preposições, eles somem numa
             * linha corrida.
             *
             * `<Trans>` com o `<0>` do catálogo, e não três `t()` costurados ·
             * a ordem dos números muda entre idiomas, e frase montada por
             * concatenação é a que quebra no espanhol.
             */}
            <Trans
              i18nKey="tournament.formatLine"
              values={{
                groups: groupCount(shown),
                groupSize: shown.groupSize,
                qualifiers: shown.qualifiersPerGroup,
              }}
              /**
               * **Três componentes pra três marcações** · o `<Trans>` numera os
               * filhos a partir de zero e casa **por índice**, então repetir
               * `<0>` três vezes não repete o mesmo componente: ele deixa os
               * dois últimos sem par. Quem cobra é o teste do catálogo.
               */
              components={[
                <strong key="g" className="font-display text-base text-primary sm:text-lg" />,
                <strong key="s" className="font-display text-base text-primary sm:text-lg" />,
                <strong key="q" className="font-display text-base text-primary sm:text-lg" />,
              ]}
            />
            {/* **A disputa de terceiro saiu junto** · ela é partida de mata-mata,
                e a frase afirmava que a edição tem uma. Volta com a fase. */}
          </p>

          {/**
           * **A repescagem saiu da frase corrida** · 19/08/2026, apontado pelo
           * Eduardo: *"queria de alguma forma trazer destaque para esse caso
           * dos 2 melhores terceiros"*.
           *
           * Ela é a regra que mais muda o que a pessoa faz com a tabela · é o
           * que transforma um terceiro lugar em vaga, e era a segunda metade de
           * uma frase de duas linhas, no mesmo peso do resto.
           *
           * **A barra é a mesma da zona `bestNext` da chave**, e é ela que faz
           * o destaque valer mais que negrito: quem lê aqui reconhece o mesmo
           * meio-tom na linha do terceiro colocado, três seções abaixo. Um
           * `strong` chamaria atenção e não ensinaria nada.
           */}
          {shown.bestThirds > 0 && (
            <p className="mt-2 flex items-baseline gap-2">
              {/* O número em display é o que faz a repescagem ter o mesmo peso
                  do total que fecha o painel · o sinal de mais diz que ela
                  **soma** ao que a frase acima acabou de contar. */}
              <span className="font-display text-xl leading-none text-primary">
                +{shown.bestThirds}
              </span>
              <span className="text-sm text-foreground">
                {t('tournament.formatBestThirds', { count: shown.bestThirds })}
              </span>
            </p>
          )}

          {/* **O total fecha a frase, e não abre o painel** · ele é a conclusão
              da conta que o desenho e a frase acabaram de mostrar. Como ladrilho
              no topo ele era um número sem premissa. */}
          <p className="mt-3 flex items-baseline gap-2 border-t border-border/60 pt-3">
            <span className="font-display text-2xl text-primary">{qualifiedCount(shown)}</span>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {t('tournament.factQualifiers')}
            </span>
          </p>
        </div>
      </Chamfer>

      {SHOW_LADDER && !drawn && sizes.length > 1 && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <h3 className="font-display text-sm uppercase tracking-wide text-foreground">
            {t('tournament.ladderTitle')}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{t('tournament.ladderBody')}</p>
          {/**
           * **O pior caso é o que a seção promete responder** · ela se chama "e
           * se não encher", e sem esta linha ela respondia só o caso bom (roda
           * menor). O que tranquiliza quem paga cedo é saber que **se não
           * fechar nem o menor, o dinheiro volta inteiro**.
           */}
          {reached === null && (
            <p className="mt-2 text-xs text-primary">
              {t('tournament.ladderNoneYet', { count: smallest.slots - paidCount })}
            </p>
          )}
          <ul className="mt-3 space-y-1">
            {sizes.map((size) => {
              const now = reached?.slots === size.slots;
              return (
                <li
                  key={size.slots}
                  className={cn(
                    'flex flex-wrap items-baseline justify-between gap-2 rounded-lg px-2 py-1 text-sm',
                    now && 'bg-primary/10',
                  )}
                >
                  <span className={now ? 'font-semibold text-primary' : 'text-muted-foreground'}>
                    {t('tournament.ladderRow', { count: size.slots })}
                    {now && (
                      <span className="ml-2 text-xs font-normal">
                        {t('tournament.ladderCurrent')}
                      </span>
                    )}
                  </span>
                  {/* **Sem premiação, a escada mostra só os tamanhos** · a
                      coluna de "R$ 0 · R$ 0 · R$ 0" repetida em cada degrau é a
                      mesma poluição do pódio zerado, e o que a escada promete
                      numa edição grátis é o **tamanho**, não o dinheiro. */}
                  {size.prize.first > 0 && (
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatCents(size.prize.first)} · {formatCents(size.prize.second)} ·{' '}
                      {formatCents(size.prize.third)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

/**
 * As datas · **e o sorteio carrega a explicação.**
 *
 * Ele é a data que vale três promessas de uma vez (o club precisa existir, o
 * elenco congela, a chave sai), então dizer isso aqui é mais barato que a pessoa
 * descobrir no dia.
 */
export function TournamentDates({
  tournament,
  historical = false,
}: {
  tournament: TournamentRecord;
  historical?: boolean;
}) {
  const { t } = useTranslation();
  const rows = [
    ['registrationCloses', tournament.registrationClosesAt],
    ['draw', tournament.drawAt],
    ['starts', tournament.startsAt],
  ] as const;

  return (
    /**
     * **Fita dentro da capa, e não cartão de barra lateral** · ela deixou de ser
     * uma `aside` em 18/08/2026.
     *
     * **Empilha a 320 e vira três colunas a partir de `sm`** · com `grid` e não
     * `space-y`, porque o conteúdo muda por breakpoint e `space-y` conta filho
     * escondido. A 320 a data fica **embaixo** do rótulo, e não ao lado: é a
     * mesma regra que já vale pra ação dentro de linha estreita.
     */
    <div className="mt-4 border-t border-border/60 pt-3">
      {/**
       * **O cabeçalho "DATAS" saiu** · 19/08/2026, junto do aperto da capa. Ele
       * gastava uma linha inteira com ícone pra rotular três coisas que já se
       * apresentam ("inscrições até", "sorteio", "começa") · rótulo que nomeia
       * o óbvio é altura sem informação.
       *
       * **E o rótulo fica ao lado da data a partir de `sm`**, em vez de acima ·
       * são três pares curtos, e empilhados eles gastavam o dobro da altura pra
       * ocupar metade da largura disponível.
       */}
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-3">
        {rows.map(([key, value]) => (
          <div key={key} className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              {historical ? t(`tournament.calendarPast.${key}`) : t(`tournament.${key}`)}
            </dt>
            {/**
             * **Com HORA, desde 03/09/2026** · esta fita é a superfície de
             * decisão da edição (o comentário do painel diz isso), e ela dizia
             * *"começa 04 de set"* pra um campeonato que começa **às 21h**.
             *
             * **Entre o sorteio e o começo há uma hora**, e sem o relógio os
             * dois apareciam como o mesmo dia, indistinguíveis. Quem lê isto é
             * quem já se inscreveu, tentando saber a que horas estar em casa.
             */}
            <dd className="font-display text-sm uppercase text-foreground">
              {formatMatchTime(value)}
            </dd>
          </div>
        ))}
      </dl>

      {/**
       * **A tela DIZ o fuso** · e este parágrafo é a chave `tournament.timeZone`
       * que o docblock do `tournament-format.ts` afirmava existir desde sempre.
       * Ela não existia em catálogo nenhum · achado na auditoria de 03/09/2026.
       *
       * Uma vez por fita, e não por linha: são três horários juntos, e repetir
       * "horário de Brasília" três vezes é ruído.
       */}
      <p className="mt-2 text-xs text-muted-foreground">{t('tournament.timeZone')}</p>

      {/**
       * **A dica do sorteio só existe antes dele** · "no sorteio o elenco
       * congela e a chave sai" é aviso de quem ainda vai decidir. Depois que a
       * chave saiu, ela descreve uma coisa que **já aconteceu**, e a página
       * inteira mostra o resultado logo abaixo.
       */}
      {/**
       * **`!drawnAt`, e não `=== null`** · pendência 179.
       *
       * O campo é `optional()` no schema e o `createTournament` **não o
       * escreve**, então o documento nasce sem ele, o JSON o omite e o cliente
       * recebe `undefined` · `undefined === null` é **false**, e a frase que
       * explica o sorteio nunca apareceu em edição nenhuma criada pelo
       * formulário. Quem lia a data esperava chave automática, e o produto não
       * faz isso desde 22/08.
       *
       * **A armadilha é o par `optional()` + comparação estrita** · ausente e
       * nulo são a mesma coisa pra quem lê, e não pro `===`.
       */}
      {!tournament.drawnAt && (
        <p className="mt-2 text-xs text-muted-foreground">{t('tournament.drawHint')}</p>
      )}
    </div>
  );
}
