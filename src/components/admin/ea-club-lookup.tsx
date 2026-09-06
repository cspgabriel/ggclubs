import { Search } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EaClubCard } from '@/components/admin/ea-club-card';
import {
  toNumber,
  type EaClubOverall,
  type EaClubRow,
  type EaMatch,
  type EaMember,
  type EaSeason,
} from '@/lib/ea-format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionTitle } from '@/components/ui/section-title';
import { SelectField } from '@/components/ui/select-field';
import { SkeletonBar, SkeletonGroup } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';

/**
 * Buscar um club pelo nome e ver a ficha dele · pedido do Eduardo em 24/08/2026.
 *
 * **Ela não substitui o banco de teste abaixo, e é de propósito.** O JSON cru
 * continua sendo o instrumento de medida (forma, tempo, tamanho); esta seção
 * responde a outra pergunta, que é de produto: *o dado da EA dá pra virar uma
 * ficha que um jogador de Pro Clubs reconheça?* As duas leituras convivem, e a
 * de cima é a única que alguém que não seja eu vai querer abrir.
 *
 * **A rota é a mesma lista branca** · a tela manda a chave `clubSearch` e o
 * servidor monta a URL. Nada aqui conhece host nem caminho.
 */

/** O corpo da busca chega como array · qualquer outra coisa é o serviço falhando. */
function rowsOf(body: unknown): EaClubRow[] {
  return Array.isArray(body) ? (body as EaClubRow[]) : [];
}

/** O `overallStats` vem como array de um · e como objeto em algumas respostas. */
function overallOf(body: unknown): EaClubOverall | null {
  // `Array.isArray` estreita pra `any[]`, e `body[0]` sai `any` · o lint
  // type-aware pega isso, e é a regra que impede `any` vazar do JSON de fora.
  const doc: unknown = Array.isArray(body) ? (body as unknown[])[0] : body;
  return doc && typeof doc === 'object' ? (doc as EaClubOverall) : null;
}

/** O elenco vem embaixo de `members` · nunca na raiz. */
function membersOf(body: unknown): EaMember[] {
  const list = (body as { members?: unknown } | null)?.members;
  return Array.isArray(list) ? (list as EaMember[]) : [];
}

/**
 * O acumulado e o elenco de um club, buscados **em paralelo** · são duas
 * chamadas independentes contra um serviço de terceiro, e encadeá-las dobraria a
 * espera sem motivo. Falha de uma não derruba a outra: a ficha desenha o que
 * chegou, e é por isso que `overall` pode ser `null` no card.
 */
/** As partidas vêm como array · qualquer outra coisa é o serviço falhando. */
function matchesOf(body: unknown): EaMatch[] {
  return Array.isArray(body) ? (body as EaMatch[]) : [];
}

/**
 * As últimas partidas · **os três tipos juntos**, cada uma dizendo qual é.
 *
 * **O amistoso não é o parente pobre aqui, é o principal:** os campeonatos do
 * GGClubs são disputados como amistoso dentro do jogo. Uma ficha que só mostre
 * liga esconde justamente a competição que nos interessa.
 *
 * Antes isto caía pro amistoso só quando a liga vinha vazia, e o Eduardo
 * apontou · quem tem os dois via só metade.
 *
 * **São as chamadas mais caras do catálogo** · ~4s e até ~190 kB cada, contra
 * 290 B do histórico por temporada. Vão em paralelo, e o `playoffMatch` fica de
 * O `playoffMatch` entra junto · ele veio vazio em todo club medido, mas custa
 * uma chamada e o dia em que existir a lista já o mostra.
 */
async function recentMatchesOf(clubId: string, platform: string) {
  const ask = (matchType: string) =>
    api
      .callEa({ endpoint: 'clubMatches', platform, clubIds: clubId, matchType, maxResultCount: '10' })
      .catch(() => null);

  const [league, friendly, playoff] = await Promise.all([
    ask('leagueMatch'),
    ask('friendlyMatch'),
    ask('playoffMatch'),
  ]);
  const tagged = (result: Awaited<ReturnType<typeof ask>>, kind: EaMatch['kind']) =>
    (result?.status === 200 ? matchesOf(result.body) : []).map((match) => ({ ...match, kind }));

  return (
    [
      ...tagged(league, 'league'),
      ...tagged(friendly, 'friendly'),
      ...tagged(playoff, 'playoff'),
    ]
      // **Mais recente primeiro, misturando os três tipos** · o `timestamp` da
      // EA é unix em segundos, e é o único jeito de ordenar entre as listas.
      // Empate de instante desempata pro amistoso, que é o que interessa aqui.
      .sort((a, b) => {
        const dt = toNumber(b.timestamp) - toNumber(a.timestamp);
        if (dt !== 0) return dt;
        return (a.kind === 'friendly' ? 0 : 1) - (b.kind === 'friendly' ? 0 : 1);
      })
  );
}

/**
 * A divisão **atual**, e ela só existe pros 100 melhores.
 *
 * **Medido, com os desfechos separados:** o `/currentSeasonLeaderboard/search`
 * acertou **0** (2 erradas, 18 não achou) e o `/allTimeLeaderboard/search`
 * acertou 4 contra **14 erradas**. Os dois índices de busca são inúteis pra
 * isso · o único que bate com o `overallStats` é o leaderboard em si.
 *
 * Custa ~107 kB e ~700 ms, e é **uma chamada por busca** e não por club · o
 * mapa serve todos os resultados. Club fora do top 100 fica sem, e a ficha
 * mostra a melhor divisão **dizendo que é a melhor**.
 */
async function currentDivisionsOf(platform: string): Promise<Record<string, string>> {
  const board = await api.callEa({ endpoint: 'leaderboard', platform }).catch(() => null);
  if (board?.status !== 200 || !Array.isArray(board.body)) return {};
  const byClub: Record<string, string> = {};
  for (const row of board.body as { clubId?: string; currentDivision?: string }[]) {
    if (row.clubId && row.currentDivision) byClub[row.clubId] = row.currentDivision;
  }
  return byClub;
}

async function detailsOf(clubId: string, platform: string) {
  const [overall, members, seasons, matches] = await Promise.all([
    api.callEa({ endpoint: 'clubOverallStats', platform, clubIds: clubId }).catch(() => null),
    // **`memberSeasonStats` (`/members/stats`) e não o `career`** · ele é por
    // club, e o outro é a vida inteira da pessoa · ver o tipo `EaMember`.
    api.callEa({ endpoint: 'memberSeasonStats', platform, clubId }).catch(() => null),
    api.callEa({ endpoint: 'playoffAchievements', platform, clubId }).catch(() => null),
    recentMatchesOf(clubId, platform),
  ]);
  return {
    overall: overall?.status === 200 ? overallOf(overall.body) : null,
    members: members?.status === 200 ? membersOf(members.body) : [],
    seasons:
      seasons?.status === 200 && Array.isArray(seasons.body) ? (seasons.body as EaSeason[]) : [],
    matches,
  };
}

export function EaClubLookup({ platforms }: { platforms: readonly string[] }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState(platforms[0] ?? '');
  const [rows, setRows] = useState<EaClubRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /** O termo que produziu o resultado na tela · o `name` muda enquanto digita. */
  const [asked, setAsked] = useState('');
  /** O detalhe por `clubId` · chega quando alguém ABRE o club, não na busca. */
  /** Qual club está aberto · um por vez, e é ele que paga as 6 chamadas. */
  const [open, setOpen] = useState<string | null>(null);
  /** Os clubs cujo detalhe já foi PEDIDO · diferente de já ter chegado. */
  const requested = useRef<Set<string>>(new Set());
  /** Qual busca está valendo · resposta de busca antiga é descartada. */
  const searchId = useRef(0);
  /** `clubId` → divisão atual · só os 100 melhores estão aqui. */
  const [divisions, setDivisions] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<
    Record<
      string,
      {
        overall: EaClubOverall | null;
        members: EaMember[];
        seasons: EaSeason[];
        matches: EaMatch[];
      }
    >
  >({});

  const search = useCallback(() => {
    const term = name.trim();
    if (!term || pending) return;
    setPending(true);
    setError(null);
    setAsked(term);
    setDetails({});
    setDivisions({});
    setOpen(null);
    requested.current = new Set();
    void api
      .callEa({ endpoint: 'clubSearch', platform, clubName: term })
      .then((result) => {
        // **HTTP 200 não é sucesso aqui** · a EA responde 200 com corpo vazio, e
        // tratar isso como erro faria "não achei" parecer queda do serviço.
        if (result.status !== 200) {
          setRows([]);
          setError(t('admin.eaLookupUpstream', { status: result.status }));
          return;
        }
        const found = rowsOf(result.body);
        setRows(found);
        // **A resposta velha não pode preencher a busca nova** · o leaderboard
        // leva ~700 ms, e trocar de geração no meio fazia a divisão da geração
        // anterior cair sobre os resultados da nova, com o selo dizendo "agora".
        const thisSearch = ++searchId.current;
        void currentDivisionsOf(platform).then((byClub) => {
          if (searchId.current === thisSearch) setDivisions(byClub);
        });
        // **O detalhe NÃO vem aqui** · são 6 chamadas por club, e antes disto a
        // busca disparava todas pra todo resultado, aberto ou não · ~8 s pra ver
        // uma lista de nomes. Pedido do Eduardo, e ele está certo: a lista é
        // leve e o detalhe chega quando alguém abre.
        if (found.length === 1 && found[0]) setOpen(found[0].clubId);
      })
      .catch((cause: unknown) => {
        // **A lista antiga sai junto** · `details` e `divisions` já foram
        // zerados, então deixá-la desenhada mostraria os cards do termo velho
        // sem detalhe nenhum, embaixo de um aviso de erro.
        setRows([]);
        setError(apiErrorMessage(cause, t));
      })
      .finally(() => setPending(false));
  }, [name, platform, pending, t]);

  const toggle = useCallback(
    (clubId: string) => {
      setOpen((current) => (current === clubId ? null : clubId));
      /**
       * **A busca NÃO pode morar dentro do updater do `setDetails`.**
       *
       * Era onde ela estava, e o React invoca o updater duas vezes de propósito
       * no `StrictMode` pra denunciar impureza · um clique virava 12 chamadas
       * contra um serviço que bloqueia por IP. E o guarda olhava o mapa, que só
       * fica preenchido **depois** da resposta: fechar e reabrir durante os ~8 s
       * disparava tudo de novo.
       *
       * O `asked` é um `ref` porque ele marca "já pedi", que é diferente de "já
       * chegou" · e ref não entra em renderização, então não há o que sincronizar.
       */
      if (requested.current.has(clubId)) return;
      requested.current.add(clubId);
      void detailsOf(clubId, platform).then((got) =>
        setDetails((current) => ({ ...current, [clubId]: got })),
      );
    },
    [platform],
  );

  // **O título fica FORA do container com vão** · dentro dele o espaço próprio
  // do `SectionTitle` soma com o `space-y` e o vão fica dobrado · é o que o
  // `pnpm scan:spacing` cobra, e é o mesmo conserto que o `admin/ea.tsx` levou.
  return (
    <section>
      <SectionTitle meta={rows ? t('admin.eaLookupCount', { count: rows.length }) : undefined}>
        {t('admin.eaLookupTitle')}
      </SectionTitle>

      <div className="space-y-4">

      <div className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-[1fr_14rem_auto] sm:items-end sm:p-5">
        <div className="space-y-2">
          <Label htmlFor="ea-lookup-name">{t('admin.eaLookupName')}</Label>
          <Input
            id="ea-lookup-name"
            value={name}
            placeholder={t('admin.eaLookupPlaceholder')}
            onChange={(e) => setName(e.target.value)}
            // Enter busca · quem digita nome de time não vai caçar o botão.
            onKeyDown={(e) => {
              if (e.key === 'Enter') search();
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ea-lookup-platform">{t('admin.eaLookupPlatform')}</Label>
          <SelectField
            id="ea-lookup-platform"
            label={t('admin.eaLookupPlatform')}
            value={platform}
            onChange={setPlatform}
            options={platforms.map((option) => ({ value: option, label: option }))}
          />
        </div>
        {/* **Desligado diz por que** · botão inerte sem explicação lê como tela
            quebrada, e é regra escrita no CLAUDE.md. */}
        <Button
          type="button"
          onClick={search}
          disabled={pending || name.trim().length === 0}
          title={name.trim().length === 0 ? t('admin.eaLookupNeedsName') : undefined}
        >
          <Search className="mr-1.5 h-4 w-4" aria-hidden />
          {pending ? t('common.loading') : t('admin.eaLookupGo')}
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {pending && (
        <SkeletonGroup className="space-y-3">
          <SkeletonBar className="h-40 w-full rounded-2xl" />
        </SkeletonGroup>
      )}

      {!pending && rows?.length === 0 && !error && (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('admin.eaLookupEmpty', { name: asked })}
        </p>
      )}

      {!pending && rows && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((club) => (
            <EaClubCard
              key={club.clubId}
              club={club}
              overall={details[club.clubId]?.overall ?? null}
              members={details[club.clubId]?.members ?? null}
              matches={details[club.clubId]?.matches ?? null}
              seasons={details[club.clubId]?.seasons ?? null}
              expanded={open === club.clubId}
              onToggle={() => toggle(club.clubId)}
              pending={open === club.clubId && details[club.clubId] === undefined}
              currentDivision={divisions[club.clubId] ?? null}
            />
          ))}
        </div>
        )}
      </div>
    </section>
  );
}
