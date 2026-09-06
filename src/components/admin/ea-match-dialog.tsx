import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useTranslation } from 'react-i18next';
import { looksAbandoned, toNumber, type EaMatch, type EaMember } from '@/lib/ea-format';
import { Button } from '@/components/ui/button';
import { DialogSurface } from '@/components/ui/dialog-surface';
import { SkeletonBar, SkeletonGroup } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatMatchTime } from '@/lib/tournament-format';
import { cn } from '@/lib/utils';
import { useResource } from '@/lib/use-resource';

/**
 * A súmula de uma partida · o terceiro nível da ficha da EA.
 *
 * **Só desenha o que veio na própria partida** · nenhuma chamada nova. A EA
 * manda os dois lados inteiros dentro de `/clubs/matches`, então abrir a súmula
 * custa zero rede · o que custou já foi pago pela lista.
 *
 * ## O que NÃO está aqui, e por quê
 *
 * - **Quem marcou e em que minuto não existe.** Há gols por jogador na partida,
 *   que é outra coisa · o `match_event_aggregate` guarda contagem por código e
 *   vem **vazio em 100% dos amistosos** medidos.
 * - **`aggregate` é soma, não média** · apareceu `rating: 10.9` numa escala que
 *   vai até 10. Qualquer coisa útil dele se recalcula dos jogadores.
 * - **`realtimeidle` não é AFK** · deu maior que zero em 21 de 23 atuações, o
 *   que inclui menu, pausa e replay. Métrica que acusa quase todo mundo não
 *   separa ninguém.
 * - **`secondsPlayed` é o relógio DO JOGO**, não o tempo real · 4934 s de
 *   partida contra 1149 s de relógio de parede. Mostrar "82 min" numa partida
 *   de 19 minutos confundiria, então o rótulo diz "em campo".
 */

type Player = {
  playername?: string;
  pos?: string;
  rating?: string;
  goals?: string;
  assists?: string;
  mom?: string;
  shots?: string;
  passesmade?: string;
  passattempts?: string;
  tacklesmade?: string;
  saves?: string;
  redcards?: string;
  secondsPlayed?: string;
};

/** Ordena por nota · quem jogou melhor primeiro, que é como súmula se lê. */
function sortedPlayers(raw: Record<string, unknown> | undefined): Player[] {
  return Object.values(raw ?? {})
    .filter((p): p is Player => typeof p === 'object' && p !== null)
    .sort((a, b) => toNumber(b.rating) - toNumber(a.rating));
}

function Side({
  name,
  score,
  players,
  mine,
  won,
  proNames,
  averages,
}: {
  name: string;
  score: string;
  players: Player[];
  mine: boolean;
  /** Ganhou esta partida · o placar decide, porque no amistoso `wins` vem zero. */
  won: boolean;
  /** gamertag para o nome do Pro no jogo · vem do elenco, nao da partida. */
  proNames: Record<string, string>;
  /** gamertag para a nota media da temporada · so existe do lado de casa. */
  averages: Record<string, number>;
}) {
  const { t, i18n } = useTranslation();
  const rating = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  /**
   * **Os números do time saem da soma dos jogadores.**
   *
   * O `aggregate` da EA também é soma, mas mistura soma de código (`pos`,
   * `archetypeid`) e chega a dar `rating: 10.9` numa escala que vai até 10.
   * Recalcular do que dá pra nomear é mais honesto que repassar aquilo.
   */
  const sum = (field: keyof Player) => players.reduce((acc, p) => acc + toNumber(p[field]), 0);

  return (
    <div>
      {/* **Placar com peso, e o vencedor marcado** · antes os dois lados eram
          o mesmo desenho e o placar tinha o tamanho de um subtítulo · quem
          ganhou não aparecia. A largura do número é fixa pra os dois lados
          alinharem, senão "1" e "8" desencontram o nome. */}
      <div
        className={cn(
          'mb-2 flex items-center gap-3 rounded-lg px-2 py-1.5',
          mine && 'bg-primary/10 ring-1 ring-primary/30',
        )}
      >
        <span
          className={cn(
            'w-10 shrink-0 text-center font-display text-3xl leading-none tabular-nums',
            won ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {score}
        </span>
        <span
          className={cn(
            'min-w-0 flex-1 truncate font-display uppercase',
            won ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {name}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {won && (
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-primary">
              {t('admin.eaMatchWon')}
            </span>
          )}
          {mine && (
            <span className="text-[10px] uppercase tracking-widest text-primary">
              {t('admin.eaMatchMine')}
            </span>
          )}
        </span>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">
        {t('admin.eaMatchTeamLine', {
          humans: players.length,
          shots: sum('shots'),
          passes: sum('passesmade'),
          attempts: sum('passattempts'),
          tackles: sum('tacklesmade'),
          saves: sum('saves'),
        })}
      </p>
      {players.length === 0 ? (
        // **Time sem humano é normal** · a IA completa o elenco e ela não
        // aparece no payload. Dizer isso é melhor que uma lista vazia.
        <p className="text-xs text-muted-foreground">{t('admin.eaMatchNoHumans')}</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {players.map((player, i) => (
            <li key={`${player.playername ?? i}`} className="px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="min-w-0 flex-1 truncate">
                  {proNames[player.playername ?? ''] ?? player.playername ?? '-'}
                  {proNames[player.playername ?? ''] && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {player.playername}
                    </span>
                  )}
                </span>
                {toNumber(player.mom) > 0 && (
                  /* **O craque é o `mom` da EA, não conta nossa** · é um por
                     partida, marcado no próprio payload. O `title` diz isso,
                     porque o escolhido nem sempre bate com a intuição de quem
                     olha os números. */
                  <span
                    title={t('admin.eaMatchMomWhy')}
                    className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] uppercase tracking-widest text-primary"
                  >
                    {t('admin.eaMatchMom')}
                  </span>
                )}
                {toNumber(player.redcards) > 0 && (
                  <span className="rounded bg-destructive/20 px-1.5 py-0.5 text-[11px] uppercase tracking-widest text-destructive">
                    {t('admin.eaMatchRed')}
                  </span>
                )}
                {/* **A mesma formatação do elenco** · lá sai "8,5" e aqui saía
                    com ponto e duas casas. */}
                {/* **A nota contra a média da pessoa** · 3,0 não diz nada
                    sozinho; 3,0 de quem tem média 8,1 conta uma partida. */}
                {(() => {
                  const current = toNumber(player.rating);
                  const average = averages[player.playername ?? ''] ?? 0;
                  const delta = average > 0 ? current - average : 0;
                  return (
                    <span className="flex items-baseline gap-1.5">
                      {average > 0 && Math.abs(delta) >= 0.5 && (
                        // **O número sozinho não se explica** · "-0,8" no meio
                        // da linha deixou o Eduardo confuso, e com razão · agora
                        // ele vem com a palavra e com a média no `title`.
                        <span
                          title={t('admin.eaMatchVsAvgWhy', { n: rating.format(average) })}
                          className={cn(
                            'text-[11px] tabular-nums',
                            delta > 0 ? 'text-primary' : 'text-destructive',
                          )}
                        >
                          {t('admin.eaMatchVsAvg', {
                            sign: delta > 0 ? '+' : '',
                            n: rating.format(delta),
                          })}
                        </span>
                      )}
                      <span className="font-display text-sm text-primary">
                        {rating.format(current)}
                      </span>
                    </span>
                  );
                })()}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('admin.eaMatchLine', {
                  goals: toNumber(player.goals),
                  assists: toNumber(player.assists),
                  shots: toNumber(player.shots),
                  passes: toNumber(player.passesmade),
                  attempts: toNumber(player.passattempts),
                  tackles: toNumber(player.tacklesmade),
                })}
                {toNumber(player.saves) > 0 && ` · ${t('admin.eaMatchSaves', { n: toNumber(player.saves) })}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function EaMatchDialog({
  match,
  clubId,
  platform,
  members,
  onClose,
}: {
  match: EaMatch | null;
  clubId: string;
  /** Precisa dela pra buscar o elenco do adversário · a EA exige geração. */
  platform: string;
  /** O elenco do club aberto · e dele que sai o nome do Pro. */
  members: EaMember[] | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  /**
   * O elenco do ADVERSÁRIO · uma chamada, e só quando a súmula abre.
   *
   * A partida traz a gamertag dos dois lados e o nome do Pro de nenhum · o
   * nosso lado tinha nome porque a ficha já carregou o elenco do club aberto, e
   * o outro ficava com "AlexandreV81" enquanto o de casa aparecia como
   * "M. Galatro". A assimetria era visível e o Eduardo pegou.
   *
   * É barata (~800 ms, 7 kB) e paga só quem abre a súmula.
   */
  const rivalClubId = match ? Object.keys(match.clubs).find((id) => id !== clubId) : undefined;

  const { data: rivalFound, error: rivalError } = useResource(
    (signal) =>
      api
        .callEa(
          { endpoint: 'memberSeasonStats', platform, clubId: rivalClubId ?? '' },
          { signal },
        )
        .then((r) => {
          if (r.status !== 200) return [];
          const list = (r.body as { members?: unknown } | null)?.members;
          return Array.isArray(list) ? (list as EaMember[]) : [];
        }),
    [rivalClubId, platform],
    { skip: !rivalClubId },
  );
  const rivalMembers = rivalFound ?? [];

  /**
   * **Esperando o elenco do adversário.**
   *
   * Sem isto a súmula abre com a gamertag crua do outro lado e **troca pro nome
   * do Pro no meio da leitura** · o Eduardo viu o pisca. O bloco do rival
   * segura enquanto a chamada não volta, em vez de desenhar duas vezes.
   *
   * **É derivado de "ainda não tenho resposta", e não do `loading`** · o
   * `loading` do `useResource` nasce `false` e só vira `true` dentro do efeito,
   * que roda **depois** da pintura · exatamente o quadro que este bloco existe
   * pra evitar, e o motivo de o estado antigo nascer `true`. Falha encerra a
   * espera, como o `finally` fazia.
   */
  const rivalPending = Boolean(rivalClubId) && rivalFound === null && !rivalError;


  if (!match) return null;

  /**
   * gamertag para o nome do Pro · **so do lado de casa**.
   *
   * A partida traz a gamertag e o elenco traz o `proName`, e a gente so tem o
   * elenco do club aberto · o adversario fica com a gamertag mesmo, que e o
   * que existe. Inventar do outro lado seria mostrar nome de quem nao e.
   */
  const proNames = Object.fromEntries(
    (members ?? [])
      .filter((m) => m.proName?.trim() && m.name)
      .map((m) => [m.name, m.proName.trim()]),
  );
  const rivalId = rivalClubId;
  const rivalProNames = Object.fromEntries(
    rivalMembers
      .filter((m) => m.proName?.trim() && m.name)
      .map((m) => [m.name, m.proName.trim()]),
  );
  const totalsOf = (side: Record<string, unknown> | undefined) => {
    const ps = sortedPlayers(side);
    const sum = (field: keyof Player) => ps.reduce((acc, x) => acc + toNumber(x[field]), 0);
    return { shots: sum('shots'), passes: sum('passesmade'), tackles: sum('tacklesmade') };
  };
  const mineScore = toNumber(match.clubs[clubId]?.score);
  const rivalScore = toNumber(rivalId ? match.clubs[rivalId]?.score : 0);
  const mineTotals = totalsOf(match.players?.[clubId]);
  const rivalTotals = totalsOf(rivalId ? match.players?.[rivalId] : undefined);

  /**
   * A média da temporada de cada um · **é ela que dá contexto à nota**.
   *
   * Nota 3,0 não diz nada sozinha; nota 3,0 de quem tem média 8,1 conta uma
   * história. Só existe do lado de casa, porque o elenco que a gente tem é o do
   * club aberto · e é por isso que o outro lado fica sem, em vez de eu inventar.
   */
  const averages = Object.fromEntries(
    (members ?? []).filter((m) => m.name).map((m) => [m.name, toNumber(m.ratingAve)]),
  );
  const mine = match.clubs[clubId];
  const rival = rivalId ? match.clubs[rivalId] : undefined;

  return (
    <AlertDialog.Root open onOpenChange={(next) => !next && onClose()}>
      <DialogSurface className="max-w-2xl">
        <AlertDialog.Title className="font-display text-lg uppercase">
          {t('admin.eaMatchTitle')}
        </AlertDialog.Title>
        {/* **O tipo vira selo** · antes saía em minúscula colada na data, sem
            formatação nenhuma · num diálogo que abre por clique, ele é o rótulo
            que diz de que competição é a partida. */}
        <AlertDialog.Description className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[11px] uppercase tracking-widest',
              match.kind === 'friendly'
                ? 'bg-primary/15 text-primary'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {t(
              match.kind === 'friendly'
                ? 'admin.eaKindFriendly'
                : match.kind === 'playoff'
                  ? 'admin.eaKindPlayoff'
                  : 'admin.eaKindLeague',
            )}
          </span>
          {/* **Data e hora, e nao "faz tanto tempo"** · relativo e bom numa
              lista e ruim numa sumula, onde a pergunta e *quando foi esta
              partida*. O `timestamp` da EA e unix em segundos, e o formatador da
              casa ja escreve em Brasilia. */}
          {match.timestamp ? formatMatchTime(new Date(toNumber(match.timestamp) * 1000)) : ''}
        </AlertDialog.Description>

        {/* **Indício, não veredito** · o amistoso não tem campo de W.O., e a
            duração acerta ~99% mas erra alguma · por isso o texto diz "parece"
            em vez de acusar alguém de ter abandonado. */}
        {looksAbandoned(match) && (
          <p className="mt-3 rounded-md border border-amber-400/40 bg-amber-400/5 px-3 py-2 text-xs text-amber-400">
            {t(
              match.kind === 'friendly' ? 'admin.eaMatchShort' : 'admin.eaMatchShortLeague',
            )}
          </p>
        )}

        {/* **O confronto, e não duas pilhas** · a súmula tinha os dois lados
            empilhados e nada comparava um com o outro. Posse não existe na API;
            finalização, passe e desarme existem dos dois lados. */}
        <div className="mt-4 space-y-2 rounded-xl border p-3">
          {(
            [
              ['admin.eaMatchShots', mineTotals.shots, rivalTotals.shots],
              ['admin.eaMatchPasses', mineTotals.passes, rivalTotals.passes],
              ['admin.eaMatchTackles', mineTotals.tackles, rivalTotals.tackles],
            ] as const
          ).map(([key, a2, b2]) => {
            const total = a2 + b2;
            const share = total > 0 ? (a2 / total) * 100 : 50;
            return (
              <div key={key}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-display text-primary">{a2}</span>
                  <span className="uppercase tracking-widest text-muted-foreground">{t(key)}</span>
                  <span className="font-display text-foreground">{b2}</span>
                </div>
                <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-muted">
                  <div style={{ width: `${share}%` }} className="bg-primary" />
                  <div style={{ width: `${100 - share}%` }} className="bg-muted-foreground/40" />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 space-y-5">
          <Side
            name={mine?.details?.name ?? '-'}
            score={mine?.score ?? '-'}
            players={sortedPlayers(match.players?.[clubId])}
            mine
            won={mineScore > rivalScore}
            proNames={proNames}
            averages={averages}
          />
          {rivalPending ? (
            <div>
              <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-1.5">
                <span className="w-10 shrink-0 text-center font-display text-3xl leading-none tabular-nums text-muted-foreground">
                  {rival?.score ?? '-'}
                </span>
                <span className="min-w-0 flex-1 truncate font-display uppercase text-muted-foreground">
                  {rival?.details?.name ?? '-'}
                </span>
              </div>
              <SkeletonGroup className="space-y-2">
                <SkeletonBar className="h-3 w-2/3" />
                <SkeletonBar className="h-12 w-full" />
              </SkeletonGroup>
            </div>
          ) : (
            <Side
              name={rival?.details?.name ?? '-'}
              score={rival?.score ?? '-'}
              players={sortedPlayers(rivalId ? match.players?.[rivalId] : undefined)}
              mine={false}
              won={rivalScore > mineScore}
              proNames={rivalProNames}
              averages={{}}
            />
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <AlertDialog.Cancel asChild>
            <Button type="button" variant="ghost">
              {t('common.close')}
            </Button>
          </AlertDialog.Cancel>
        </div>
      </DialogSurface>
    </AlertDialog.Root>
  );
}
