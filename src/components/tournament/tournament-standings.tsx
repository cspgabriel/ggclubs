import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { QualifyZone, StandingRow, ThirdInRace } from '@ggclubs/schemas';
import { Check, Crown, Shirt, X } from 'lucide-react';
import { ClubCrest } from '@/components/club/club-crest';
import { Chamfer } from '@/components/ui/chamfer';
import { SectionTitle } from '@/components/ui/section-title';
import { cn } from '@/lib/utils';
import { groupLetter } from './tournament-shared.js';
import type { groupStandings } from './tournament-shared.js';
import { ClubLink } from './club-link.js';
import type { ClubDirectory } from './tournament-shared.js';

/**
 * Os grupos. · **A fase de grupos · a tabela, as zonas e a corrida dos terceiros.**
 *
 *
 *
 * > **Era um arquivo de 4.118 linhas até 01/09/2026** · o corte é a fase 2 do
 * > [arquitetura.md](../../../../docs/arquitetura.md), e o motivo dele está escrito
 * > lá: arquivo que ninguém lê inteiro é arquivo onde a exceção se esconde.
 */

/**
 * A legenda das zonas · **o que faz a barra ser informação e não enfeite.**
 *
 * Três pesos de verde à esquerda das linhas são três cinzas pra quem não sabe o
 * que eles querem dizer. Ela aparece **uma vez por fase**, e não em cada card ·
 * repetida em doze grupos ela vira o item mais presente da página.
 *
 * **Só mostra o que existe naquela chave** · sem repescagem, "repescado" e "na
 * briga" nunca acontecem, e listá-los prometeria uma disputa que o formato não
 * tem.
 */
export function ZoneLegend({ zones }: { zones: Map<string, QualifyZone> }) {
  const { t } = useTranslation();
  const present = new Set(zones.values());
  if (present.size === 0) return null;

  const items = [
    { zone: 'direct' as const, bar: 'border-primary', key: 'tournament.zoneDirect' as const },
    {
      zone: 'bestNext' as const,
      bar: 'border-amber-400',
      key: 'tournament.zoneBestNext' as const,
    },
    {
      zone: 'chasing' as const,
      bar: 'border-dashed border-amber-400/50',
      key: 'tournament.zoneChasing' as const,
    },
  ].filter((item) => present.has(item.zone));

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li key={item.zone} className="flex items-center gap-2">
          <span aria-hidden className={cn('h-3.5 w-0 border-l-2', item.bar)} />
          <span className="text-[11px] text-muted-foreground">{t(item.key)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * As colunas de estatística da tabela de grupo · **declaradas uma vez.**
 *
 * O cabeçalho e as linhas leem da mesma lista, então não há como uma ganhar
 * coluna e a outra não · esse é o mesmo motivo de `cancelBrakeFor` existir, e a
 * mesma lição de `col-span-2` ter divergido de `featured`.
 *
 * **A ordem é a do Brasileirão**, com pontos primeiro: é a resposta da tabela,
 * e ela não pode ser a última coluna a aparecer quando a pessoa começa a rolar.
 */
const STAT_COLUMNS = [
  {
    key: 'tournament.tablePoints' as const,
    width: 'w-8',
    strong: true,
    of: (r: StandingRow) => r.points,
  },
  {
    key: 'tournament.tablePlayed' as const,
    width: 'w-6',
    strong: false,
    of: (r: StandingRow) => r.played,
  },
  {
    key: 'tournament.tableWon' as const,
    width: 'w-6',
    strong: false,
    of: (r: StandingRow) => r.won,
  },
  {
    key: 'tournament.tableDrawn' as const,
    width: 'w-6',
    strong: false,
    of: (r: StandingRow) => r.drawn,
  },
  {
    key: 'tournament.tableLost' as const,
    width: 'w-6',
    strong: false,
    of: (r: StandingRow) => r.lost,
  },
  {
    key: 'tournament.tableGoalsFor' as const,
    width: 'w-6',
    strong: false,
    of: (r: StandingRow) => r.goalsFor,
  },
  {
    key: 'tournament.tableGoalsAgainst' as const,
    width: 'w-6',
    strong: false,
    of: (r: StandingRow) => r.goalsAgainst,
  },
  {
    key: 'tournament.tableDiff' as const,
    width: 'w-8',
    strong: false,
    // O sinal explícito no positivo · sem ele, "1" e "-1" não leem como par.
    of: (r: StandingRow) => (r.goalDiff > 0 ? `+${r.goalDiff}` : String(r.goalDiff)),
  },
] as const;

export function GroupCard({
  groupIndex,
  clubs,
  clubHref,
  mine,
  responds,
  qualified,
  repechage,
  standings,
  zones,
}: {
  groupIndex: number;
  clubs: ClubDirectory;
  clubHref: (tag: string) => string;
  mine: Set<string>;
  /** Por qual dos seus clubs você RESPONDE · ver o `MineMark`. */
  responds: Set<string>;
  /**
   * Quem **já está** no mata-mata · e isto é fato, não previsão.
   *
   * A zona (a barrinha) responde *"quem está passando"* enquanto os grupos
   * correm · com a chave sorteada, a pergunta vira outra, e o selo responde
   * ela. Ver `TournamentView`.
   */
  qualified: Set<string>;
  /** Quem entrou pela repescagem · muda a cor do selo, não o fato. */
  repechage: Set<string>;
  /** A tabela pronta · calculada acima, porque a repescagem compara os grupos. */
  standings: ReturnType<typeof groupStandings>;
  /**
   * A zona de cada club, por tag · vazia quando não há zona a desenhar (antes
   * do sorteio, antes do primeiro placar, ou no mata-mata).
   */
  zones: Map<string, QualifyZone>;
}) {
  const { t } = useTranslation();

  const { tags, table, anyPlayed } = standings;
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const directCount = anyPlayed ? table.filter((row) => zones.get(row.tag) === 'direct').length : 0;
  const someQualify = directCount !== 0 && directCount !== tags.length;
  const compact = (key: (typeof STAT_COLUMNS)[number]['key']) =>
    key === 'tournament.tablePoints' ||
    key === 'tournament.tablePlayed' ||
    key === 'tournament.tableDiff';
  return (
    <section
      data-group-table
      className="min-w-0 overflow-hidden rounded-xl border border-border bg-card"
    >
      <header className="flex items-center gap-3 border-b border-border bg-background/40 px-4 py-3">
        <span aria-hidden className="font-display text-3xl leading-none text-primary">
          {groupLetter(groupIndex)}
        </span>
        <div className="min-w-0">
          <h4 className="text-xs font-semibold">
            {t('tournament.groupName', { name: groupLetter(groupIndex) })}
          </h4>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t('tournament.groupSize', { count: tags.length })}
          </p>
        </div>
        {someQualify && (
          <span className="ml-auto text-right text-[10px] font-semibold uppercase text-primary">
            {t('tournament.groupQualify', { count: directCount })}
          </span>
        )}
        {!anyPlayed && (
          <span className="ml-auto text-right text-[10px] text-muted-foreground">
            {t('tournament.tableDrawOrder')}
          </span>
        )}
      </header>
      <div
        id={id}
        className="overflow-x-auto overscroll-x-contain"
        tabIndex={expanded ? 0 : undefined}
        role="region"
        aria-label={t('tournament.groupName', { name: groupLetter(groupIndex) })}
      >
        <table
          className={cn(
            'w-full table-fixed border-collapse',
            expanded && 'min-w-[24rem] sm:min-w-0',
          )}
        >
          <thead className="h-9 text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="w-7" scope="col">
                <span className="sr-only">{t('tournament.tablePosition')}</span>
              </th>
              <th className={cn('text-left font-normal', expanded && 'w-36 sm:w-auto')} scope="col">
                {t('tournament.tableClub')}
              </th>
              {STAT_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    col.width,
                    'text-center font-normal',
                    !compact(col.key) && !expanded && 'hidden sm:table-cell',
                  )}
                >
                  {t(col.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((row, index) => {
              const zone = anyPlayed ? zones.get(row.tag) : undefined;
              return (
                <tr key={row.tag} className="border-t border-border/50 hover:bg-secondary/60">
                  <td
                    className={cn(
                      'border-l-2 text-center text-xs tabular-nums text-muted-foreground',
                      zone === 'direct'
                        ? 'border-l-primary'
                        : zone === 'bestNext'
                          ? 'border-l-amber-400'
                          : zone === 'chasing'
                            ? 'border-l-amber-400/50 [border-left-style:dashed]'
                            : 'border-l-transparent',
                    )}
                  >
                    {index + 1}
                  </td>
                  <th scope="row" className="py-3 pr-1 text-left font-normal">
                    <ClubLink
                      tag={row.tag}
                      clubs={clubs}
                      clubHref={clubHref}
                      className="flex min-w-0 items-center gap-1.5"
                    >
                      <ClubCrest
                        tag={row.tag}
                        crestUrl={clubs.get(row.tag)?.crestUrl ?? null}
                        className="h-5 w-5 shrink-0 text-[7px]"
                      />
                      <span
                        className={cn(
                          'min-w-0 flex-1 break-words text-xs leading-4',
                          mine.has(row.tag) && 'font-semibold text-primary',
                        )}
                      >
                        {clubs.get(row.tag)?.name ?? row.tag.toUpperCase()}
                      </span>
                      <MineMark mine={mine.has(row.tag)} responds={responds.has(row.tag)} />
                      {qualified.size > 0 &&
                        (qualified.has(row.tag) ? (
                          <Check
                            className={cn(
                              'h-3 w-3 shrink-0',
                              repechage.has(row.tag) ? 'text-amber-400' : 'text-primary',
                            )}
                            aria-label={t(
                              repechage.has(row.tag)
                                ? 'tournament.qualifiedThird'
                                : 'tournament.qualifiedTag',
                            )}
                          />
                        ) : (
                          <X
                            className="h-3 w-3 shrink-0 text-destructive"
                            aria-label={t('tournament.eliminatedTag')}
                          />
                        ))}
                    </ClubLink>
                  </th>
                  {STAT_COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'text-center text-xs tabular-nums',
                        col.strong ? 'font-display text-foreground' : 'text-muted-foreground',
                        !compact(col.key) && !expanded && 'hidden sm:table-cell',
                      )}
                    >
                      {col.of(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded(!expanded)}
        className="min-h-11 w-full border-t border-border/50 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5 sm:hidden"
      >
        {t(expanded ? 'tournament.tableCompact' : 'tournament.tableComplete')}
      </button>
    </section>
  );
}

/**
 * A data curta · **mora em `lib/format.ts` e é reexportada aqui só por
 * conveniência**? Não · ela é de tela, e ficar aqui faria o `react-refresh`
 * reclamar de arquivo que exporta componente e função junto. Ver
 * `lib/tournament-format.ts`.
 */

/**
 * **A corrida da repescagem** · os terceiros de todos os grupos, na ordem, com
 * a linha de corte desenhada.
 *
 * Ela existe porque a tabela do grupo **levanta uma pergunta que não responde**:
 * a barrinha tracejada diz *"na briga pela repescagem"* e para aí · com 12
 * grupos disputando 8 vagas (o formato da Copa), o time não tem como saber se
 * está dentro sem comparar doze tabelas na mão.
 *
 * **Ela é uma tabela, e não um card por time** · o que importa aqui é a
 * **ordem**, e ordem se lê em lista. E a linha de corte é o desenho todo: acima
 * dela passa, abaixo não.
 */
export function ThirdsRace({
  race,
  clubs,
  mine,
  responds,
  bestThirds,
  decided,
}: {
  race: ThirdInRace[];
  clubs: ClubDirectory;
  mine: Set<string>;
  /** Por qual dos seus clubs você RESPONDE · ver o `MineMark`. */
  responds: Set<string>;
  bestThirds: number;
  /** A fase de grupos já jogou tudo · só então "fora da zona" vira "fora". */
  decided: boolean;
}) {
  const { t } = useTranslation();

  return (
    <section className="mt-8">
      {/* **A legenda dos critérios saiu daqui** · ela virou cabeçalho de
          coluna, que é onde ela se liga ao número. O que sobra é o que a seção
          **é**: quantas vagas estão em jogo · e isso é `meta`, o slot do
          título, e não um irmão dele num flex de fora. */}
      <SectionTitle meta={t('tournament.thirdsSubtitle', { count: bestThirds })}>
        {t('tournament.thirdsTitle')}
      </SectionTitle>

      {/**
       * **A mesma estrutura da tabela de grupo** · 19/08/2026, achado do
       * Eduardo: *"achei meio confuso o que é cada stat, e está desacoplada do
       * subtítulo"*.
       *
       * A versão anterior era uma lista com três números soltos no fim da linha
       * (`6 · +1 · 5`) e a legenda deles no **subtítulo da seção**, a duas
       * linhas de distância · ninguém liga um ao outro.
       *
       * Aqui eles ganham **cabeçalho de coluna**, como na tabela do grupo · e a
       * peça inteira usa a mesma divisão de lá: o club numa caixa que não rola
       * e os números noutra que rola, o que é o que faz uma tabela caber a
       * 320px sem espremer nome de club.
       */}
      {/**
       * **Duas colunas a partir de `xl`** · 19/08/2026, pedido do Eduardo:
       * *"nos melhores terceiros dá pra aproveitar mais o espaço em telas
       * grandes"*.
       *
       * Com doze linhas de ~44px a tabela ocupava 530px de altura numa largura
       * de 1280 · em duas metades ela cai pela metade, e **a linha de corte
       * continua legível** porque ela cai no fim da primeira coluna quando as
       * vagas são metade da lista, que é o caso da Copa (8 de 12).
       */}
      {/**
       * **Duas metades a partir de `xl`** · doze linhas de 44px ocupavam 530px
       * de altura numa tela de 1280 que tinha largura sobrando.
       *
       * **A ordem continua vertical dentro de cada metade** (1-6 à esquerda,
       * 7-12 à direita), que é como se lê ranking · e a linha de corte da Copa
       * cai no fim da primeira metade, porque as vagas são metade da lista.
       * Quando não for, ela aparece na metade certa do mesmo jeito.
       */}
      {/**
       * **Um card só, e duas metades a partir de `xl`** · 20/08/2026, achado do
       * Eduardo no celular: *"nesse caso do mobile poderia ser um card só · os
       * dois cards é só no caso de telas grandes que ficam um ao lado do
       * outro"*.
       *
       * Ele está certo, e o defeito era meu: eu cortei a lista em duas **no
       * dado** e deixei o CSS decidir só se elas ficam lado a lado · empilhadas,
       * viravam **dois cards** com dois cabeçalhos, cortando o ranking no meio
       * por um motivo que só existe em tela larga.
       *
       * **Os dois desenhos convivem, e um deles é escondido** · é o mesmo
       * arranjo da tabela de contas do painel (cartão no celular, tabela no
       * desktop), e a razão é a mesma: cada um tem cabeçalho próprio, e não há
       * como transformar um no outro só com classe.
       */}
      <Chamfer border="bg-border" innerClassName="bg-card" className="min-w-0 xl:hidden">
        <ThirdsTable
          rows={race}
          offset={0}
          bestThirds={bestThirds}
          clubs={clubs}
          mine={mine}
          responds={responds}
          decided={decided}
        />
      </Chamfer>

      <div className="hidden gap-4 xl:grid xl:grid-cols-2">
        {[race.slice(0, Math.ceil(race.length / 2)), race.slice(Math.ceil(race.length / 2))].map(
          (half, halfIndex) => (
            <Chamfer
              key={halfIndex}
              border="bg-border"
              innerClassName="bg-card"
              /**
               * **`min-w-0` no item da grade** · sem ele o item nasce com
               * `min-width: auto` e **se recusa a encolher abaixo do conteúdo** ·
               * a tabela pedia 319px dentro de uma trilha de 272 e a página
               * rolava de lado 23px a 320. É a mesma armadilha do `grid-cols-1`
               * explícito que este arquivo registra na grade dos grupos.
               */
              className="min-w-0"
            >
              <ThirdsTable
                rows={half}
                offset={halfIndex === 0 ? 0 : race.length - half.length}
                bestThirds={bestThirds}
                clubs={clubs}
                mine={mine}
                responds={responds}
                decided={decided}
              />
            </Chamfer>
          ),
        )}
      </div>
    </section>
  );
}

/** Uma metade da corrida · a tabela em si, pra as duas colunas usarem a mesma. */
function ThirdsTable({
  rows,
  offset,
  bestThirds,
  clubs,
  mine,
  responds,
  decided,
}: {
  rows: ThirdInRace[];
  /** Quantos vieram antes · a numeração continua de uma metade pra outra. */
  offset: number;
  bestThirds: number;
  clubs: ClubDirectory;
  mine: Set<string>;
  /** Por qual dos seus clubs você RESPONDE · ver o `MineMark`. */
  responds: Set<string>;
  /** Ver `ThirdsRace` · sem isso o X diria "eliminado" pra quem ainda joga. */
  decided: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex">
      {/* A coluna que não rola · club e a marca de quem passou. */}
      <div className="min-w-0 flex-1">
        <div className="flex h-9 items-center gap-2 border-b border-border/60 pl-3 pr-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="w-4 shrink-0" />
          <span className="min-w-0 flex-1">{t('tournament.tableClub')}</span>
        </div>
        {rows.map((one, i) => {
          const index = offset + i;
          const club = clubs.get(one.tag);
          const isMine = mine.has(one.tag);
          return (
            <div
              key={one.tag}
              className={cn(
                'flex h-11 items-center gap-2 border-t border-border/50 pl-3 pr-2 first:border-t-0',
                // A mesma cor da zona de repescagem na tabela do grupo.
                index === bestThirds - 1 && 'border-b-2 border-b-amber-400',
                one.qualifying && 'border-l-2 border-l-amber-400',
              )}
            >
              <span className="w-4 shrink-0 text-center text-[13px] tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <ClubCrest
                tag={one.tag}
                crestUrl={club?.crestUrl ?? null}
                className="h-5 w-5 shrink-0 text-[7px]"
              />
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-sm',
                  isMine ? 'font-semibold text-primary' : 'text-foreground',
                )}
              >
                {club?.name ?? one.tag.toUpperCase()}
              </span>
              <MineMark mine={isMine} responds={responds.has(one.tag)} />
              {one.qualifying ? (
                <Check
                  className="h-3.5 w-3.5 shrink-0 text-amber-400"
                  aria-label={t('tournament.qualifiedThird')}
                />
              ) : (
                /* O par do ✓ · e ele espera a última rodada, como na tabela. */
                decided && (
                  <X
                    className="h-3.5 w-3.5 shrink-0 text-destructive"
                    aria-label={t('tournament.eliminatedTag')}
                  />
                )
              )}
            </div>
          );
        })}
      </div>

      {/**
       * **A coluna que rola · e ela ENCOLHE, não empurra.**
       *
       * Com `shrink-0` ela reservava os 144px das quatro siglas e somava com o
       * nome do club · a 320px a soma passava da tela e **a página inteira
       * rolava de lado 23px**. Medido na faixa obrigatória logo depois de ela
       * nascer.
       *
       * Sem o `shrink-0`, ela cede largura e o `overflow-x-auto` rola **por
       * dentro** · que é o comportamento da tabela do grupo ao lado, e o motivo
       * de a divisão em duas caixas existir.
       */}
      <div className="min-w-0 overflow-x-auto overscroll-x-contain border-l border-border/60">
        <div className="flex h-9 w-max items-center border-b border-border/60 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="w-9 shrink-0 text-center">{t('tournament.thirdsGroupCol')}</span>
          <span className="w-9 shrink-0 text-center">{t('tournament.tablePoints')}</span>
          <span className="w-9 shrink-0 text-center">{t('tournament.tableDiff')}</span>
          <span className="w-9 shrink-0 text-center">{t('tournament.tableGoalsFor')}</span>
        </div>
        {rows.map((one, i) => {
          const index = offset + i;
          return (
            <div
              key={one.tag}
              className={cn(
                'flex h-11 w-max items-center border-t border-border/50 text-xs tabular-nums first:border-t-0',
                index === bestThirds - 1 && 'border-b-2 border-b-amber-400',
              )}
            >
              <span className="w-9 shrink-0 text-center text-[11px] uppercase text-muted-foreground">
                {groupLetter(one.groupIndex)}
              </span>
              <span className="w-9 shrink-0 text-center font-semibold text-foreground">
                {one.row.points}
              </span>
              <span className="w-9 shrink-0 text-center text-muted-foreground">
                {one.row.goalDiff > 0 ? `+${one.row.goalDiff}` : one.row.goalDiff}
              </span>
              <span className="w-9 shrink-0 text-center text-muted-foreground">
                {one.row.goalsFor}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * **Qual dos seus clubs é este** · e ela existe porque dois clubs seus na mesma
 * tabela ficavam idênticos. Achado pelo Eduardo em 03/09/2026, e o caso é comum:
 * dono de um, membro de outro.
 *
 * **A linguagem é a que a grade de inscritos já usava** · coroa é quem
 * responde (inscreve, paga, declara) e camisa é quem joga. Inventar um terceiro
 * sinal aqui seria a mesma informação com dois vocabulários na mesma página.
 */
function MineMark({ mine, responds }: { mine: boolean; responds: boolean }) {
  const { t } = useTranslation();
  if (!mine) return null;
  const label = t(responds ? 'tournament.youRespond' : 'tournament.youPlay');
  const Icon = responds ? Crown : Shirt;
  return (
    <span className="shrink-0 text-primary" title={label}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
