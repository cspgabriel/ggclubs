import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EaMatchDialog } from '@/components/admin/ea-match-dialog';
import { Badge } from '@/components/ui/badge';
import { SkeletonBar, SkeletonGroup } from '@/components/ui/skeleton';
import { StatStrip } from '@/components/ui/stat-strip';
import {
  MATCHES_SHOWN,
  MATCH_TABS,
  SQUAD_SHOWN,
  crestUrlsOf,
  divisionLabel,
  kitColor,
  monogramOf,
  positionLabel,
  toNumber,
  unitLabel,
  pulseOf,
  reputationLabel,
  rivalCrestOf,
  FORM_TONE,
  type EaClubOverall,
  type EaClubRow,
  type EaMatch,
  type EaMember,
  type EaSeason,
} from '@/lib/ea-format';
import { formatMatchTime } from '@/lib/tournament-format';
import { cn } from '@/lib/utils';

const DIVISION_CREST = 'https://media.contentapi.ea.com/content/dam/eacom/fc/pro-clubs';

function DivisionCrest({ division, className }: { division: unknown; className?: string }) {
  const n = Number(division);
  if (!Number.isFinite(n) || n < 1 || n > 6) return null;
  return (
    <img
      src={`${DIVISION_CREST}/divisioncrest${n}.png`}
      alt=""
      loading="lazy"
      className={cn('shrink-0 object-contain', className)}
      aria-hidden
    />
  );
}

export function EaClubCard({
  club,
  overall,
  members,
  matches,
  seasons,
  pending,
  currentDivision,
  expanded,
  onToggle,
}: {
  club: EaClubRow;
  overall: EaClubOverall | null;
  members: EaMember[] | null;
  matches: EaMatch[] | null;
  seasons: EaSeason[] | null;
  /** Ainda buscando · **é diferente de ter falhado**, e a tela dizia o segundo. */
  pending: boolean;
  /** Só existe pros 100 melhores · `null` quando não dá pra saber. */
  currentDivision: string | null;
  /** Aberto mostra tudo; fechado é só a identidade · **e é o fechado que a busca desenha**. */
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t, i18n } = useTranslation();
  /** Qual das URLs de escudo está sendo tentada · a última falha cai no disco. */
  const [crestTry, setCrestTry] = useState(0);
  /**
   * Quantas partidas a lista mostra · **paginação nossa, não da EA.**
   *
   * A EA **não pagina** · teto duro de 10 por `matchType` e onze parâmetros
   * testados que não abrem caminho. Então o máximo alcançável é 30, e o "ver
   * mais" só revela o que já está na mão · dizer o contrário seria prometer
   * histórico que não existe.
   */
  const [matchPage, setMatchPage] = useState(1);
  /** A partida aberta no terceiro nível · `null` fecha. */
  const [openMatch, setOpenMatch] = useState<EaMatch | null>(null);
  /** O elenco inteiro em vez dos cinco · pedido do Eduardo. */
  const [allSquad, setAllSquad] = useState(false);
  /**
   * Qual competição a lista mostra · **`friendly` é o padrão**.
   *
   * O campeonato do GGClubs é disputado como amistoso dentro do jogo, então é
   * essa a aba que responde a pergunta de quem abre a ficha. As outras existem
   * porque o dado existe, não porque são o assunto.
   */
  const [tab, setTab] = useState<'friendly' | 'league' | 'playoff'>('friendly');
  const crestOptions = crestUrlsOf(club);
  const crest = crestOptions[crestTry] ?? null;

  const kit = club.clubInfo?.customKit ?? {};
  /**
   * **`kitColor*` só descreve o que o club veste quando o kit é PRÓPRIO.**
   *
   * Achado do Eduardo olhando a tela: o Pipokets usa o tema da Fiorentina e
   * deveria ser roxo, e a listra saía preta e branca. Medido nos dois casos:
   *
   * | `selectedKitType` | `kitColor1..2` | o que veste |
   * |---|---|---|
   * | `0` · time licenciado | `#f2f2f2` `#090a0d` | a camisa da Fiorentina |
   * | `1` · kit próprio | `#961f30` `#fec526` | esse uniforme mesmo |
   *
   * No tipo `0` esses campos são **resto do kit customizado que o club não
   * usa**, e a API não diz a cor do time licenciado. Pintar com eles seria a
   * tela afirmando uma cor errada · então a listra só aparece no tipo `1`, e
   * quem carrega a identidade do outro é o escudo, que é o de verdade.
   *
   * > **Tirar a cor dos pixels do escudo não dá** · com `crossOrigin` a imagem
   * > nem carrega (o CDN não manda `access-control-allow-origin`), então ler o
   * > `canvas` está fora. Medido de uma origem https real, não de `about:blank`.
   */
  const ownKit = String(kit.selectedKitType) === '1';
  const primary = kitColor(kit.kitColor1, '#f2f2f2');
  const secondary = kitColor(kit.kitColor2, '#0a0a0a');
  const accent = kitColor(kit.kitThrdColor1, primary);
  // **Kit de cor única existe** · quando as duas batem, a listra sumiria, então
  // a segunda vira o terceiro uniforme.
  const stripe = secondary.toLowerCase() === primary.toLowerCase() ? accent : secondary;
  const stadium = kit.stadName?.trim();

  const wins = toNumber(overall?.wins);
  const draws = toNumber(overall?.ties);
  const losses = toNumber(overall?.losses);
  const played = wins + draws + losses;
  const goals = toNumber(overall?.goals);
  const conceded = toNumber(overall?.goalsAgainst);
  const balance = goals - conceded;

  // **Aproveitamento e não "vitórias"** · é o número que quem joga Pro Clubs usa
  // pra comparar time, e ele já embute o empate valendo um.
  const rate = played > 0 ? Math.round(((wins * 3 + draws) / (played * 3)) * 100) : 0;
  const nf = new Intl.NumberFormat(i18n.language);
  const rating = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  // **`toFixed` devolve ponto** · em pt-BR o separador é vírgula, e "3.0 por
  // jogo" foi visto na tela antes de isto existir.
  const perGame = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(played > 0 ? goals / played : 0);

  const share = (n: number) => (played > 0 ? `${(n / played) * 100}%` : '0%');

  const form = overall
    ? Array.from({ length: 5 }, (_, i) => toNumber(overall[`lastMatch${i}`])).filter(
        (code) => code in FORM_TONE,
      )
    : [];

  /**
   * **Os cinco que mais jogaram AQUI**, e não os de maior nota.
   *
   * Ordenar por nota parece melhor e é frágil: quem entrou pra duas partidas com
   * 9,0 encabeça a lista e o time de verdade some. Jogos não tem esse buraco ·
   * ele responde a pergunta que alguém de fora faz, que é *quem é esse time*.
   * A nota continua na linha, à direita.
   *
   * Cinco e não onze · card de levantamento com o elenco inteiro vira tabela, e
   * tabela é o que o JSON cru já faz melhor.
   */
  /**
   * As partidas da aba escolhida · **com queda pra primeira que tem algo**.
   *
   * O padrão é amistoso, e club que só joga liga ficaria com uma lista vazia e
   * nenhuma explicação · a aba escolhida cai pra que existe.
   */
  /**
   * As temporadas em ordem, cada uma sabendo se subiu ou caiu.
   *
   * **Subir de divisão é o número DIMINUIR** · 1 é Elite e 6 é a última. Por
   * isso o `trend` compara ao contrário do que a leitura ingênua espera, e essa
   * inversão é a coisa mais fácil de errar nesta tela inteira.
   */
  const seasonPath = (seasons ?? [])
    .slice()
    .sort((a, b) => toNumber(a.seasonId) - toNumber(b.seasonId))
    .map((season, i, all) => {
      const previous = i > 0 ? toNumber(all[i - 1]!.bestDivision) : 0;
      const current = toNumber(season.bestDivision);
      // **Sem divisão nos dois lados não há tendência** · faltava a guarda do
      // `current`, e uma temporada com divisão zero virava seta verde de acesso
      // ao lado de um chip cujo escudo nem desenha.
      const known = previous >= 1 && previous <= 6 && current >= 1 && current <= 6;
      return { season, trend: known ? previous - current : 0 };
    });

  const pulse = pulseOf(matches, club.clubId);
  const kinds = MATCH_TABS.filter((kind) => (matches ?? []).some((m) => m.kind === kind));
  const activeTab = kinds.includes(tab) ? tab : (kinds[0] ?? tab);
  const shownMatches = (matches ?? []).filter((m) => m.kind === activeTab);

  const ordered = (members ?? [])
    .slice()
    .sort((a, b) => toNumber(b.gamesPlayed) - toNumber(a.gamesPlayed));
  const top = allSquad ? ordered : ordered.slice(0, SQUAD_SHOWN);

  return (
    <article className="overflow-hidden rounded-2xl border bg-card">
      {/* **Envolve no celular** · a 320 o escudo de 56px mais o selo deixavam
          22px pro nome, e "PIPOKETS" era cortado. Com `flex-wrap` o selo cai
          pra linha de baixo e o nome fica inteiro · medido, não suposto. */}
      {/* **O cabeçalho é o botão** · a linha inteira abre e fecha, e não um
          ícone de 16px no canto · alvo pequeno em lista é o que faz a pessoa
          errar o clique no celular. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="relative flex w-full flex-wrap items-center gap-x-4 gap-y-2 overflow-hidden border-b p-4 text-left transition-colors hover:bg-muted/40 sm:flex-nowrap sm:p-5"
      >
        {/* **Listra de camisa, e só quando o kit é do club** · ela usa as duas
            cores do uniforme, então aparece qualquer que seja ele, e a máscara
            faz o padrão nascer do meio pra direita · o texto e o escudo ficam
            sempre sobre fundo limpo. No time licenciado ela não aparece, e o
            porquê está em `ownKit` lá em cima. */}
        {/* **Quando há escudo, ele mesmo pinta a faixa** · e isso resolve o que
            a cor do kit não resolve: no time licenciado a API não diz a cor, mas
            o escudo É a cor. Ampliado, borrado e apagado, ele vira uma lavagem
            que traz o roxo da Fiorentina sem ninguém precisar saber que é roxo.
            Nada de ler pixel · quem desenha é o navegador, então o CORS que
            bloqueia o `canvas` não entra nesta conta. */}
        {crest && (
          <div
            className="pointer-events-none absolute inset-0 bg-[length:auto_320%] bg-[position:78%_center] bg-no-repeat opacity-40 blur-xl [mask-image:linear-gradient(to_right,transparent_28%,rgba(0,0,0,0.95)_100%)] [-webkit-mask-image:linear-gradient(to_right,transparent_28%,rgba(0,0,0,0.95)_100%)]"
            style={{ backgroundImage: `url(${crest})` }}
            aria-hidden
          />
        )}
        {ownKit && !crest && (
          <div
            // **A máscara vai em classe e não em `style`** · valor de CSS não é
            // texto de tela, e o `scan:strings` cobra string literal em qualquer
            // lugar · a lista de exceção dele é fechada de propósito, então quem
            // cede é o código. A cor continua no `style`, porque ela vem do dado.
            className="pointer-events-none absolute inset-0 opacity-50 [mask-image:linear-gradient(to_right,transparent_34%,rgba(0,0,0,0.9)_100%)] [-webkit-mask-image:linear-gradient(to_right,transparent_34%,rgba(0,0,0,0.9)_100%)]"
            style={{
              background: `repeating-linear-gradient(100deg, ${primary} 0 16px, ${stripe} 16px 32px)`,
            }}
            aria-hidden
          />
        )}
        {crest ? (
          // **A reserva é a nossa, e não a da EA** · ela tem um `notfound-crest`
          // próprio, e depender do placeholder de terceiro é herdar a marca dele.
          <img
            key={crest}
            src={crest}
            alt=""
            width={56}
            height={56}
            loading="lazy"
            onError={() => setCrestTry((n) => n + 1)}
            className="relative size-11 shrink-0 object-contain drop-shadow-lg sm:size-14"
          />
        ) : (
          <div
            className="relative grid size-11 shrink-0 place-items-center rounded-full border-2 border-border bg-muted shadow-lg sm:size-14"
            // Sem escudo e sem kit próprio não há cor do club · aí o disco usa o
            // tom neutro do tema em vez de uma cor que não é dele.
            style={ownKit ? { background: primary, borderColor: accent } : undefined}
            aria-hidden
          >
            <span
              className="font-display text-sm uppercase leading-none tracking-tight text-foreground sm:text-lg"
              style={ownKit ? { color: secondary } : undefined}
            >
              {monogramOf(club.clubName)}
            </span>
          </div>
        )}

        <div className="relative min-w-[9rem] flex-1">
          <h3 className="truncate font-display text-lg uppercase leading-tight text-foreground sm:text-2xl">
            {club.clubName}
          </h3>
          {/* **Nome do estádio** · é o detalhe que faz o jogador reconhecer o
              time dele, e a EA guarda o que a pessoa escolheu no jogo. */}
          {/* **O id do club some no celular** · a 320 esta linha cortava o nome
              do estádio pra caber um número que só serve pra depurar · o
              estádio é o que faz a pessoa reconhecer o time, então ele fica e o
              id sai. Era o último corte que sobrava nas 14 larguras. */}
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {stadium}
            <span className="hidden sm:inline">
              {stadium ? ' · ' : ''}
              {t('admin.eaCardId', { id: club.clubId })}
            </span>
          </p>
        </div>

        {/* **Só o selo fica na faixa** · a listra do kit é o fundo aqui, e texto
            solto sobre ela some · a linha da melhor divisão ficava cinza sobre
            cinza, visto na tela, e desceu pro rodapé do card. */}
        {/* **A divisão atual não tem fonte confiável, então não aparece.**
            O `currentDivision` só existe no `/allTimeLeaderboard/search`, e ele
            é o endpoint quebrado descrito no topo · o que sobra de divisão é o
            `bestDivision` do `overallStats`, que vai no rodapé com o rótulo
            certo. Selo vazio é melhor que selo mentindo. */}
        {overall && (
          <div className="relative flex shrink-0 items-center gap-2">
            {/* **A ATUAL quando dá pra saber, a melhor quando não** · e a tela
                diz qual das duas. A atual só existe pros 100 melhores clubs (o
                leaderboard); os dois índices de busca devolvem número inválido,
                medido. Mostrar a melhor como se fosse a atual seria a peça
                mentindo, e é a terceira vez que esta ficha quase fez isso. */}
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {t(currentDivision ? 'admin.eaDivNow' : 'admin.eaDivBest')}
            </span>
            <DivisionCrest division={currentDivision ?? overall.bestDivision} className="size-9" />
            {/* **A reputação com o nome do jogo** · o rótulo do topo diz mais
                que "tier 3", e é vocabulário que quem joga reconhece. */}
            {reputationLabel(t, overall.reputationtier) && (
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {reputationLabel(t, overall.reputationtier)}
              </span>
            )}
            {toNumber(overall.skillRating) > 0 && (
              <Badge variant="strong" size="sm">
                {t('admin.eaCardSkill', { n: nf.format(toNumber(overall.skillRating)) })}
              </Badge>
            )}
          </div>
        )}
        <ChevronDown
          className={cn(
            'relative size-4 shrink-0 text-muted-foreground transition-transform',
            expanded && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {/* **Esperando não é ter falhado** · as partidas levam ~8s, e enquanto
          elas não voltavam o card já mostrava a mensagem de erro do acumulado ·
          um estado que é só demora, desenhado como falha. Visto na tela. */}
      {!expanded ? null : pending ? (
        <SkeletonGroup className="space-y-3 p-4 sm:p-5">
          <SkeletonBar className="h-3 w-2/3" />
          <SkeletonBar className="h-16 w-full" />
        </SkeletonGroup>
      ) : overall === null ? (
        <p className="p-4 text-sm text-muted-foreground sm:p-5">{t('admin.eaCardNoStats')}</p>
      ) : (
        <div className="space-y-4 p-4 sm:p-5">
          {/* **O PULSO, e ele vem primeiro** · a ficha respondia se o time é
              bom e não respondia se ele ainda joga · um club com 1.568 jogos
              pode estar parado há meses, e o acumulado esconde isso. Tudo aqui
              sai das partidas que já foram baixadas. */}
          {pulse && (
            <div className="grid gap-3 rounded-xl border bg-muted/30 p-3 sm:grid-cols-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {t('admin.eaPulseLast')}
                </p>
                <p className="font-display text-sm uppercase text-foreground">
                  {pulse.lastAt
                    ? formatMatchTime(new Date(pulse.lastAt * 1000))
                    : t('admin.eaPulseNever')}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {t('admin.eaPulseTogether')}
                </p>
                <p className="font-display text-sm uppercase text-foreground">
                  {/* **Plural do i18next se escolhe por `count`, não por `n`** · com outro
                      nome a chave não resolve e a tela mostra o identificador
                      cru · foi o que apareceu na captura. */}
                  {t('admin.eaPulseTogetherValue', { count: pulse.perMatch })}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {t('admin.eaPulseWho')}
                </p>
                <p className="font-display text-sm uppercase text-foreground">
                  {/* **Sem elenco não há "de quantos"** · o `memberSeasonStats`
                      pode falhar sozinho, e a frase virava um total zerado. E o elenco
                      é o de HOJE, então quem saiu do club ainda aparece nas
                      partidas · por isso o total só entra quando faz sentido. */}
                  {(members?.length ?? 0) >= pulse.distinct
                    ? t('admin.eaPulseWhoValue', {
                        n: pulse.distinct,
                        total: members?.length ?? 0,
                        over: pulse.over,
                      })
                    : t('admin.eaPulseWhoOnly', { n: pulse.distinct, over: pulse.over })}
                </p>
              </div>
            </div>
          )}

          {/* **A forma vem antes dos números acumulados** · é o que quem joga
              olha primeiro, e 1563 jogos não dizem como o time está hoje. */}
          {form.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {t('admin.eaCardForm')}
              </span>
              {form.map((code, i) => (
                <span
                  key={`${code}-${i}`}
                  className={cn(
                    'grid size-6 place-items-center rounded font-display text-[11px] uppercase',
                    FORM_TONE[code],
                  )}
                >
                  {code === 1
                    ? t('admin.eaFormWin')
                    : code === 2
                      ? t('admin.eaFormLoss')
                      : t('admin.eaFormDraw')}
                </span>
              ))}

            </div>
          )}

          {/* **A barra é o resumo que substitui três números soltos** · quem lê
              súmula entende a proporção antes de ler o rótulo. */}
          <div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
              <div style={{ width: share(wins) }} className="bg-primary" />
              <div style={{ width: share(draws) }} className="bg-muted-foreground/50" />
              <div style={{ width: share(losses) }} className="bg-destructive/70" />
            </div>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
              {(
                [
                  ['admin.eaCardWins', wins, 'text-primary'],
                  ['admin.eaCardDraws', draws, 'text-muted-foreground'],
                  ['admin.eaCardLosses', losses, 'text-destructive'],
                ] as const
              ).map(([key, value, tone]) => (
                <div key={key} className="flex items-baseline gap-1.5">
                  <dt className={cn('font-display text-sm', tone)}>{nf.format(value)}</dt>
                  <dd className="uppercase tracking-widest text-muted-foreground">{t(key)}</dd>
                </div>
              ))}
              <div className="ml-auto flex items-baseline gap-1.5">
                <dt className="font-display text-sm text-foreground">{rate}%</dt>
                <dd className="uppercase tracking-widest text-muted-foreground">
                  {t('admin.eaCardRate')}
                </dd>
              </div>
            </dl>
          </div>

          {/* A faixa de números é uma só · `StatStrip`, como no club e no player. */}
          <StatStrip
            items={[
              { label: t('admin.eaCardPlayed'), value: nf.format(played) },
              {
                label: t('admin.eaCardGoals'),
                value: (
                  <>
                    {nf.format(goals)}
                    <span className="ml-1.5 font-sans text-xs normal-case tracking-normal text-muted-foreground">
                      {t('admin.eaCardPerGame', { n: perGame })}
                    </span>
                  </>
                ),
              },
              {
                label: t('admin.eaCardBalance'),
                // O sinal é o dado · "+345" e "345" dizem coisas diferentes.
                value: (
                  <span className={balance >= 0 ? 'text-primary' : 'text-destructive'}>
                    {balance > 0 ? '+' : ''}
                    {nf.format(balance)}
                  </span>
                ),
              },
              {
                label: t('admin.eaCardStreak'),
                value: nf.format(toNumber(overall.unbeatenstreak)),
              },
            ]}
          />

          {top.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                {/* **A conta de quem aparece, não de quem existe** · o rótulo
                    dizia "as 5" num club de 4 pessoas. */}
                {t(allSquad ? 'admin.eaCardSquadAll' : 'admin.eaCardSquad', {
                  count: members?.length ?? 0,
                  shown: top.length,
                })}
                {(members?.length ?? 0) > SQUAD_SHOWN && (
                  <button
                    type="button"
                    onClick={() => setAllSquad((v) => !v)}
                    className="ml-2 normal-case tracking-normal text-primary hover:underline"
                  >
                    {t(allSquad ? 'admin.eaCardSquadLess' : 'admin.eaCardSquadMore')}
                  </button>
                )}
              </p>
              <ul className="divide-y rounded-xl border">
                {top.map((member) => (
                  <li
                    key={member.name}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm"
                  >
                    {/* **Piso de largura, senão o nick é espremido em vez de
                        quebrar** · a 430 ele perdia 88px, e a 320 não, porque
                        lá o `flex-wrap` já dava a linha inteira pra ele. */}
                    <span className="min-w-[9rem] flex-1 truncate">
                      {member.proName?.trim() || member.name}
                      {member.proName?.trim() && (
                        <span className="ml-1.5 text-xs text-muted-foreground">{member.name}</span>
                      )}
                    </span>
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                      {positionLabel(t, member.favoritePosition)}
                    </span>
                    {/* **O OVR vem primeiro depois da posição** · é a primeira
                        coisa que se pergunta antes de aceitar alguém no club. */}
                    {/* **O OVR vira faixa** · `docs/design.md`: "seletos e faixas
                        contam mais que linhas de texto cinza" pra esse público.
                        A escala é de 60 a 99, que é a faixa que o Virtual Pro
                        alcança · abaixo de 60 ninguém joga Clubs. */}
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-muted sm:block">
                        <span
                          className="block h-full bg-primary"
                          style={{
                            width: `${Math.min(100, Math.max(0, ((toNumber(member.proOverall) - 60) / 39) * 100))}%`,
                          }}
                        />
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 font-display text-[11px] text-foreground">
                        {t('admin.eaCardOverall', { n: member.proOverall })}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {/* **Formatado como o resto do card** · o `StatStrip`
                          formatava o total com separador e a linha do elenco
                          mostrava o mesmo número cru, três linhas abaixo. */}
                      {t('admin.eaCardMemberLine', {
                        games: nf.format(toNumber(member.gamesPlayed)),
                        goals: nf.format(toNumber(member.goals)),
                        rate: member.winRate,
                      })}
                    </span>
                    {/* A nota também · ela saía "7.34" com ponto, e o diálogo
                        justificava a formatação DELE dizendo que aqui já era
                        assim · doc afirmando o que o código ao lado não fazia. */}
                    <span className="font-display text-sm text-primary">
                      {rating.format(toNumber(member.ratingAve))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* **A súmula, e ela é o que a fita de cinco letrinhas não conta** ·
              a fita diz QUE perdeu; isto diz de quem, quando e de quanto. */}
          {matches && matches.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                {/* **A conta é do que aparece, não do que veio** · a EA manda
                    dez por tipo e a lista mostra seis · anunciar o número que
                    chegou é a peça mentindo sobre ela mesma. */}
                {t('admin.eaCardLast', {
                  count: Math.min(shownMatches.length, MATCHES_SHOWN * matchPage),
                })}
              </p>
              {/* **Uma aba por competição, e o amistoso primeiro** · é a
                  modalidade em que o campeonato do GGClubs acontece. Aba sem
                  partida nenhuma não aparece · botão inerte lê como quebrado. */}
              <div className="mb-2 flex flex-wrap gap-1.5">
                {MATCH_TABS.filter((kind) => matches.some((m) => m.kind === kind)).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => {
                      setTab(kind);
                      setMatchPage(1);
                    }}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-xs uppercase tracking-widest transition-colors',
                      activeTab === kind
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {t(
                      kind === 'friendly'
                        ? 'admin.eaKindFriendly'
                        : kind === 'playoff'
                          ? 'admin.eaKindPlayoff'
                          : 'admin.eaKindLeague',
                    )}
                    <span className="ml-1.5 opacity-60">
                      {matches.filter((m) => m.kind === kind).length}
                    </span>
                  </button>
                ))}
              </div>
              <ul className="divide-y rounded-xl border">
                {shownMatches.slice(0, MATCHES_SHOWN * matchPage).map((match) => {
                  const mine = match.clubs[club.clubId];
                  const rivalId = Object.keys(match.clubs).find((id) => id !== club.clubId);
                  const rival = rivalId ? match.clubs[rivalId] : undefined;
                  /**
                   * **No amistoso `wins`/`ties`/`losses` vêm SEMPRE zero** ·
                   * medido em 320 lados. Confiar neles pintava toda vitória em
                   * amistoso de vermelho, e "5 x 0" saía como derrota na tela.
                   * O placar é o que funciona nos dois tipos, então é ele que
                   * decide · os contadores ficam só como desempate de 0x0.
                   */
                  const ours = toNumber(mine?.score);
                  const theirs = toNumber(rival?.score);
                  // **A mesma regra do diálogo** · a lista aceitava placar
                  // igual com `wins > 0` como vitória e o diálogo não, então a
                  // linha pintava verde e a súmula aberta dela não marcava
                  // ninguém. Placar igual é empate nos dois.
                  const won = ours > theirs;
                  const drew = ours === theirs;
                  // O W.O. é do lado que ganhou sem jogar · o outro abandonou.
                  const walkover = toNumber(mine?.winnerByDnf) > 0 || toNumber(rival?.winnerByDnf) > 0;
                  return (
                    <li key={match.matchId}>
                      <button
                        type="button"
                        onClick={() => setOpenMatch(match)}
                        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                      >
                      {/* **O placar ganha peso pelo tamanho do resultado** ·
                          uma goleada de 8x2 e um 3x2 apertado tinham o mesmo
                          desenho, e a lista lia como doze linhas iguais. Saldo
                          de 3 ou mais engrossa; o resto fica no peso normal. */}
                      <span
                        className={cn(
                          'w-14 shrink-0 text-center font-display tabular-nums',
                          Math.abs(ours - theirs) >= 3 ? 'text-base' : 'text-sm',
                          won ? 'text-primary' : drew ? 'text-muted-foreground' : 'text-destructive',
                        )}
                      >
                        {mine?.score ?? '-'} x {rival?.score ?? '-'}
                      </span>
                      {/* **O escudo do adversário, de graça** · a partida traz
                          o `details` inteiro do outro lado, `customKit`
                          incluído · a lista mostrava só o nome e jogava fora
                          dado que já tinha baixado. */}
                      {rivalCrestOf(rival?.details) && (
                        <img
                          src={rivalCrestOf(rival?.details) ?? ''}
                          alt=""
                          width={20}
                          height={20}
                          loading="lazy"
                          // **Escudo que falha some, não vira ícone quebrado** ·
                          // nem todo id existe (medi 3 falhas em 14 clubs), e o
                          // desenho de imagem cortada do navegador é pior que
                          // ausência · visto na tela, no "Los Brittos".
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                          className="size-5 shrink-0 object-contain"
                        />
                      )}
                      <span className="min-w-[8rem] flex-1 truncate">
                        {rival?.details?.name ?? '-'}
                      </span>
                      {/* **Qual competição** · o campeonato do GGClubs é
                          disputado como amistoso, então saber qual é qual é o
                          ponto da lista e não um detalhe. */}
                      {/* **A etiqueta de competição saiu da linha** · com a aba
                          em cima ela repetia a mesma palavra em toda linha, e
                          repetição é ruído, não reforço. Quem diz qual é a
                          competição agora é a aba selecionada. */}
                      {walkover && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                          {t('admin.eaCardWalkover')}
                        </span>
                      )}
                      {/* **`timeAgo` vem pronto da EA** · número e unidade, sem
                          conta nossa e sem fuso pra errar. */}
                      {match.timeAgo && (
                        <span className="text-xs text-muted-foreground">
                          {/* **A unidade vem em inglês da EA** · a frase saía
                              com a palavra inglesa no meio do português, e isso
                              foi visto na tela. A chave é literal porque o
                              catálogo é tipado · montar `eaUnit${...}` uniria os
                              parâmetros de todas as chaves do i18next. */}
                          {t('admin.eaCardAgo', {
                            n: match.timeAgo.number,
                            unit: unitLabel(t, match.timeAgo.unit, match.timeAgo.number),
                          })}
                        </span>
                      )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {shownMatches.length > MATCHES_SHOWN * matchPage && (
                <button
                  type="button"
                  onClick={() => setMatchPage((n) => n + 1)}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  {t('admin.eaCardMoreMatches', {
                    count: shownMatches.length - MATCHES_SHOWN * matchPage,
                  })}
                </button>
              )}
            </div>
          )}

          {/* **Por temporada** · custa 290 bytes e é o único que conta a
              história em vez do acumulado. Vem capado em 3 pela EA. */}
          {seasons && seasons.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                {t('admin.eaCardSeasons')}
              </p>
              {/* **Trajetória com seta, e não com altura** · a primeira versão
                  deslocava cada chip pela divisão, e o Eduardo viu na hora: saiu
                  como desalinhamento, não como gráfico. Quando o desenho falha
                  assim, o conserto é trocar o modelo e não ajustar o número · a
                  direção agora é dita com seta, que não depende de o olho medir
                  distância. */}
              <ul className="flex flex-wrap items-center gap-1.5">
                {seasonPath.map(({ season, trend }) => (
                    <li
                      key={season.seasonId}
                      className="flex items-center gap-1.5 rounded-lg border py-1 pl-1.5 pr-2.5 text-[11px] text-muted-foreground"
                    >
                      <DivisionCrest division={season.bestDivision} className="size-6" />
                      {/* O `seasonName` vem `CLUBS_LEAGUE_SEASON_09` · o número
                          é a única parte legível, e a tela mostra só ele. */}
                      <span>
                        {t('admin.eaCardSeason', {
                          n: season.seasonName.replace(/\D+/g, '') || season.seasonId,
                          div: divisionLabel(t, season.bestDivision),
                        })}
                      </span>
                      {/* **A seta é entre temporadas, então mora no chip da
                          direita** · subir de divisão é o número CAIR (1 é
                          Elite), e é por isso que a comparação parece invertida. */}
                      {trend !== 0 && (
                        <span
                          className={cn(
                            'font-display text-xs',
                            trend > 0 ? 'text-primary' : 'text-destructive',
                          )}
                          title={t(trend > 0 ? 'admin.eaSeasonUp' : 'admin.eaSeasonDown')}
                        >
                          {trend > 0 ? '↑' : '↓'}
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {t('admin.eaCardHistory', {
              best: divisionLabel(t, overall.bestDivision),
              up: nf.format(toNumber(overall.promotions)),
              down: nf.format(toNumber(overall.relegations)),
              league: nf.format(toNumber(overall.leagueAppearances)),
            })}
          </p>
        </div>
      )}
      <EaMatchDialog
        match={openMatch}
        clubId={club.clubId}
        platform={club.platform}
        members={members}
        onClose={() => setOpenMatch(null)}
      />
    </article>
  );
}
