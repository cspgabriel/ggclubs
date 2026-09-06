import type { TournamentProofTotals } from '@ggclubs/schemas';
import { isLiveTournament, TOURNAMENT_EVENT, tournamentTopic } from '@ggclubs/schemas';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MatchCard, TournamentClubCard } from '@ggclubs/schemas';
import { api, type RegistrationCard, type TournamentRecord } from '@/lib/api';
import { ApiError, apiErrorMessage } from '@/lib/api-error';
import { useRealtimeConnected, useRealtimeTopic } from '@/lib/realtime/use-realtime-topic';

/**
 * Uma edição, com os inscritos e o contador que anda sozinho.
 *
 * **Existe porque a edição tem duas molduras** · a página aberta e a de dentro
 * do app, como o club e o player. **Hoje são cinco pontos de montagem**, e os
 * três a mais são peças que precisam da chave sem estar na edição: a faixa da
 * sua partida no `/app` e em `/app/campeonatos`, e a `LiveMatchBar` da casca. Se cada uma buscasse por conta própria, a
 * divergência entre elas seria invisível: as duas continuariam funcionando, e um
 * conserto feito numa só apareceria pra metade das pessoas. É o mesmo argumento
 * do `ClubView`, um nível acima · lá o que é compartilhado é o desenho, aqui é
 * **o dado e o comportamento**.
 *
 * **A ordem é `snapshot` e então stream**, como manda o `docs/tempo-real.md`: a
 * tela busca o que ela já sabia buscar, e o evento só diz *que* mudou.
 */
export type TournamentState = {
  tournament: TournamentRecord | null;
  registrations: RegistrationCard[];
  /** A chave · vazia até o sorteio, e é o mesmo dado nas duas molduras. */
  matches: MatchCard[];
  /**
   * Os clubs que a **chave** menciona · e ele não é a grade.
   *
   * A grade lista quem ocupa vaga; a chave mostra quem **jogou**, e os dois
   * deixaram de ser o mesmo conjunto quando encerrar club passou a soltar a
   * vaga. Ver `ClubDirectory` no `TournamentView`.
   */
  clubs: TournamentClubCard[];
  loading: boolean;
  /** `notFound` e `error` são coisas diferentes · ver o comentário abaixo. */
  failure: 'notFound' | 'error' | null;
  errorMessage: string | null;
  reload: () => void;
};

/**
 * **"A edição que está rolando agora"**, no lugar de um `slug`.
 *
 * Ela existe pra faixa da partida do topo do app · pendência 109. Antes, a casca
 * descobria qual edição estava rolando **listando todas** (`useTournamentList`) e
 * só então buscava a dela · duas requisições em toda carga do app, e a primeira
 * não servia a tela nenhuma. Achado pelo Eduardo em 20/08/2026, lendo o log.
 *
 * **É um sentinela e não um hook novo, e essa é a decisão inteira.** Um
 * `useLiveTournament` próprio teria a **própria** assinatura de tópico, e o
 * `docs/tempo-real.md` é explícito sobre onde o defeito do canal se esconde:
 * numa segunda cópia que declara tipos de evento levemente diferentes, e que
 * **não dá erro em canto nenhum** · a tela simplesmente para de reagir. Aqui o
 * bloco de tempo real é literalmente o mesmo código.
 *
 * **O `@` garante que nenhuma edição colida com ele** · apelido de edição é
 * `slug`, e `slug` não aceita arroba.
 */
export const LIVE_TOURNAMENT = '@live';

export function useTournament(slug: string, clubTags?: readonly string[]): TournamentState {
  const { t } = useTranslation();
  const clubFilter = clubTags?.join(',');
  const [tournament, setTournament] = useState<TournamentRecord | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationCard[]>([]);
  const [matches, setMatches] = useState<MatchCard[]>([]);
  const [clubs, setClubs] = useState<TournamentClubCard[]>([]);
  const [loading, setLoading] = useState(true);
  /**
   * **"Não existe" e "não deu pra carregar" são coisas diferentes**, e juntá-las
   * é o defeito que a página aberta do club já custou uma vez: um 429 dizendo ao
   * visitante que o link está quebrado é fato falso, na tela de aquisição, e sem
   * oferecer repetir.
   */
  const [failure, setFailure] = useState<'notFound' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // **Slug vazio não busca**, e é o que permite chamar este hook de forma
    // condicional sem furar a regra dos hooks · o Início só quer a edição
    // quando ela já foi sorteada, e sem esta linha ele pediria
    // `/public/tournaments/` e levaria 404 em toda visita.
    if (!slug) {
      setLoading(false);
      return;
    }

    const ctrl = new AbortController();
    /**
     * **Só espera quem ainda não tem nada na mão**, e isso é conserto: recarregar
     * por evento punha `loading` em `true`, a tela inteira voltava pra silhueta e
     * **piscava a cada vaga tomada** · justamente na página em que o contador
     * mexendo é o argumento.
     *
     * É o mesmo defeito que o `refreshAccount` teve em 08/08/2026, e o mesmo
     * conserto: **estado de espera é pra ausência de dado, não pra atualização
     * de dado**. Quem achou foi o probe de duas sessões, que perdeu o
     * `[data-spots]` do DOM no meio da medição.
     */
    setLoading((was) => was && tournament === null);
    // **A única diferença entre as duas origens é a URL** · o resto do efeito, o
    // tratamento de falha e o bloco de tempo real logo abaixo são os mesmos.
    const load =
      slug === LIVE_TOURNAMENT
        ? api.getLiveTournament({ signal: ctrl.signal }, clubFilter)
        : api.getTournament(slug, { signal: ctrl.signal });
    load
      .then((r) => {
        setTournament(r.tournament);
        setRegistrations(r.registrations);
        // **O `?? []` é a janela do deploy, e não desconfiança do tipo** · a web
        // sobe depois da API, mas entre uma coisa e outra existe um intervalo em
        // que a página nova conversa com a resposta antiga · sem campo, a tela
        // inteira cairia num `length` de `undefined`. Custou um teste vermelho
        // pra aparecer, e o desfecho em produção seria a página branca.
        setMatches(r.matches ?? []);
        setClubs(r.clubs ?? []);
        setFailure(null);
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        /**
         * **Não-encontrado apaga; falha de rede não** · pendência 176.
         *
         * A edição que sumiu de verdade merece a tela vazia. Uma falha de rede
         * não: o `tick` desta busca dispara **a cada evento do canal** e a cada
         * 60s na pública, então um 429 no meio da rodada apagava a chave, a
         * faixa e o botão de declarar de quem estava com a página aberta, e
         * punha *"não deu pra carregar"* no lugar · com o dado bom na memória.
         *
         * Quem decide o que mostrar é a tela, e ela agora só troca a página
         * inteira pela falha quando **não há o que mostrar**.
         */
        if (err instanceof ApiError && err.code === 'TOURNAMENT_NOT_FOUND') setFailure('notFound');
        else {
          setFailure('error');
          setErrorMessage(apiErrorMessage(err, t));
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
    // `tournament` fica **fora** das dependências de propósito · ele muda a cada
    // resposta, e depender dele faria a busca se rechamar sozinha em laço. O que
    // ela lê dali é só o valor no instante do disparo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, tick, t, clubFilter]);

  /**
   * **O contador de vagas anda sozinho**, e é a única coisa desta tela que se
   * mexe.
   *
   * A escassez aqui é verdadeira · o teto existe, e ver a vaga sumindo enquanto
   * se lê o regulamento é a diferença entre decidir agora e voltar depois.
   *
   * **`resync` recarrega junto**: depois de um buraco na sequência ou de uma
   * reconexão, o número na tela é o de antes · e contador de vagas errado é a
   * única coisa desta página que mente.
   */
  useRealtimeTopic(tournament ? tournamentTopic(tournament._id) : null, (event) => {
    if (event.kind === 'resync') {
      setTick((n) => n + 1);
      return;
    }
    // **`matches` cobre o sorteio e o placar**, e é o mesmo aviso magro dos
    // outros: quem chegou não recebe o resultado no evento, recarrega e lê. Sem
    // ele, quem estivesse com a chave aberta veria a partida do adversário
    // fechar só no F5 · e a tabela do grupo é calculada a partir dela.
    if (
      event.type === TOURNAMENT_EVENT.registrations ||
      event.type === TOURNAMENT_EVENT.status ||
      event.type === TOURNAMENT_EVENT.matches
    ) {
      setTick((n) => n + 1);
    }
  });

  const reload = useCallback(() => setTick((n) => n + 1), []);

  /**
   * **A página aberta se atualiza sozinha, de minuto em minuto** · 19/08/2026,
   * decisão do Eduardo depois de perguntar como ficaria o tempo real fora do
   * app.
   *
   * **O canal não alcança quem não tem sessão** · ele exige bilhete, e o
   * `RealtimeProvider` só existe dentro do `/app` e do `/admin`. Como é
   * justamente a página pública que circula no Discord no dia da rodada, uma
   * chave congelada ali é a pior tela pra ficar parada.
   *
   * **Ele não substitui o canal, e desliga onde ele existe** · dentro do app o
   * `useRealtimeTopic` acima já recarrega em ~400ms, e somar os dois seria
   * pagar duas vezes pela mesma resposta.
   *
   * Três condições, e cada uma corta consumo que não vira informação:
   *
   * - **só com a edição em jogo** · rascunho, encerrada e cancelada não mudam
   *   sozinhas, e a inscrição aberta tem o contador de vagas, que **é** o que
   *   muda (por isso `drawnAt` não é a condição, e sim o status);
   * - **só com a aba visível** · aba de fundo esquecida por horas custaria uma
   *   requisição por minuto pra ninguém ler;
   * - **e ela volta a buscar ao reaparecer**, porque o que interessa quando a
   *   pessoa retorna é o estado de agora, não o de quando ela saiu.
   */
  /**
   * **A pergunta é se a conexão está DE PÉ, e não se o provider está montado** ·
   * 05/09/2026, e este era o defeito mais caro do tempo real.
   *
   * O `useHasRealtime()` responde sobre a **montagem**, e o docblock dele diz
   * isso em letras. Dentro do `/app` o provider está **sempre** montado, então
   * `live` era **sempre falso** e o relógio de segurança abaixo **nunca rodava
   * ali dentro**. Medido: com o canal bloqueado, a página fez **zero** buscas em
   * 100 segundos enquanto uma partida fechava · e o poller do chat da mesma
   * tela batia a cada 10s o tempo todo, então a página e a rede estavam vivas.
   *
   * **O desfecho era "não atualiza a noite toda"**, e ele explica o relato do
   * Eduardo em 04/09/2026 ser "pra uns sim e pra outros não": todo deploy fecha
   * as conexões com `1001`, e quem não voltasse (429 no handshake, `denied`
   * mudo, notebook que dormiu) ficava com dado velho **sem nenhum sinal na
   * tela**, pra sempre.
   *
   * **É o mesmo defeito que a sala do confronto já teve** (28/08/2026) · o
   * `useRealtimeConnected` existe por causa dele, e esta tela nunca recebeu o
   * conserto.
   */
  const hasRealtime = useRealtimeConnected();
  // **A quarta lista de status escrita à mão**, e ela esquecia `closed` · quem
  // esperava o sorteio numa edição fechada só via a chave com F5. Hoje quem
  // responde "a edição está de pé" é o `isLiveTournament`, num lugar só.
  // O tópico é de uma edição: não anuncia a primeira inscrição nem uma outra edição.
  // A descoberta compartilhada continua a cada minuto, inclusive com o canal conectado.
  const live =
    slug === LIVE_TOURNAMENT ||
    (!hasRealtime && tournament !== null && isLiveTournament(tournament.status));

  useEffect(() => {
    if (!live) return;

    const refreshOnTick = () => {
      if (document.visibilityState === 'visible') setTick((n) => n + 1);
    };
    const timer = window.setInterval(refreshOnTick, PUBLIC_REFRESH_MS);
    document.addEventListener('visibilitychange', refreshOnTick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshOnTick);
    };
  }, [live]);

  return { tournament, registrations, matches, clubs, loading, failure, errorMessage, reload };
}

/**
 * De quanto em quanto a página **aberta** se atualiza.
 *
 * **Um minuto tem referência**: o prazo pra uma partida chegar à mesa do
 * organizador é de **30 minutos** contados do horário marcado
 * (`REPORT_DEADLINE_MINUTES`) · num cenário em que nada acontece em menos de
 * meia hora, um minuto de atraso na tela é invisível pra quem lê e custa 60
 * requisições por hora de aba aberta.
 *
 * **Esta linha citava `MINUTES_BETWEEN_ROUNDS`, que NÃO EXISTE**, e um prazo de
 * declaração de 24 horas, que caiu em 22/08/2026 · pendência 180.
 *
 * **Ele não vale dentro do app** · lá o canal entrega em ~400ms.
 */
const PUBLIC_REFRESH_MS = 60_000;

/** Quantas edições por página · o mesmo número que o **default** do servidor (o teto lá é 24). */
const PAGE_SIZE = 12;

/**
 * A lista de edições · a mesma busca nas duas molduras, pelo mesmo motivo.
 *
 * **Ela não ouve o canal**, e a ausência é a mesma decisão das duas vitrines:
 * lista que se reordena embaixo do dedo é o oposto de útil. O contador ao vivo
 * mora na página da edição, que é onde a decisão acontece.
 */
export function useTournamentList() {
  const [tournaments, setTournaments] = useState<TournamentRecord[] | null>(null);
  const [proof, setProof] = useState<TournamentProofTotals>();
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [tick, setTick] = useState(0);
  /** Quantas páginas já foram publicadas · é o que distingue abrir de revalidar. */
  const loadedPages = useRef(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoadingMore(true);
    /**
     * **Abrir uma página busca UMA página; revalidar busca todas.**
     *
     * As duas coisas passam por aqui e não custam o mesmo. Enquanto o efeito
     * refazia sempre de `0` a `pageCount`, cada clique em "carregar mais" ficava
     * mais caro que o anterior: cinco cliques custavam **quinze** requisições em
     * série, e não cinco. Ninguém decidiu isso · é o efeito relendo o que já
     * tinha na mão só porque uma dependência mudou.
     *
     * **O tique continua revalidando tudo**, e isso é o desenho: ele existe pra
     * a vitrine mostrar edição nova sem F5, e situação que muda reordena a
     * lista. O que mudou é o clique parar de pagar por ele.
     */
    const from = pageCount > loadedPages.current ? loadedPages.current : 0;
    // Revalida desde a primeira página e publica a lista de uma vez; mantém o dado anterior se falhar.
    async function load() {
      const fetched: TournamentRecord[] = [];
      let offset: number | null = from * PAGE_SIZE;
      let totals: TournamentProofTotals | undefined;
      for (let page = from; page < pageCount && offset !== null; page += 1) {
        const result = await api.listTournaments(
          { limit: PAGE_SIZE, offset },
          { signal: ctrl.signal },
        );
        if (ctrl.signal.aborted) return;
        fetched.push(...result.tournaments);
        totals = result.proof;
        offset = result.nextOffset ?? null;
      }
      loadedPages.current = pageCount;
      // **A junção é funcional**, e não por ler o estado aqui dentro: o efeito
      // não declara `tournaments` como dependência (declarar o faria rodar de
      // novo a cada resposta, sozinho), e ler sem declarar é o array de
      // dependências mentindo · que é o que o `exhaustive-deps` cobra.
      setTournaments((previous) => {
        const editions = new Map((from > 0 ? (previous ?? []) : []).map((one) => [one._id, one]));
        fetched.forEach((one) => editions.set(one._id, one));
        return [...editions.values()];
      });
      setProof((previous) => totals ?? previous);
      setNextOffset(offset);
      setFailed(false);
    }
    void load().catch(() => {
      if (!ctrl.signal.aborted) setFailed(true);
    }).finally(() => {
      if (!ctrl.signal.aborted) setLoadingMore(false);
    });
    return () => ctrl.abort();
  }, [tick, pageCount]);

  const loadMore = () => {
    if (loadingMore) return;
    if (failed) setTick((n) => n + 1);
    else if (nextOffset !== null) setPageCount((n) => n + 1);
  };

  /**
   * **Quem ouve é quem exibe uma peça sozinha** · o card em destaque do
   * dashboard e, desde 19/08/2026, a faixa da sua partida no `/app` e em
   * `/app/campeonatos`. **A lista aberta continua sem ouvir, de propósito** ·
   * lista que se reordena embaixo do dedo é o oposto de útil.
   */
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  /**
   * **A vitrine também se atualiza sozinha** · 19/08/2026, e quem levantou o
   * caso foi o Eduardo: *"penso na questão de lançar um campeonato novo"*.
   *
   * A página de **uma** edição não resolve isso · quem está com a lista aberta
   * quando a edição é publicada continuaria sem ver, e é justamente a hora em
   * que alguém está olhando (o anúncio sai no Discord e a pessoa abre o link da
   * vitrine).
   *
   * **E aqui vale nas duas molduras, com canal ou sem** · o tópico do tempo
   * real é **por edição**, e não existe um de "a lista mudou" · dentro do app a
   * vitrine está tão parada quanto fora. Criar esse tópico seria um evento novo
   * pra uma tela que muda algumas vezes por mês.
   *
   * Revalida apenas as páginas já abertas, preservando a quantidade carregada.
   * Alterações de situação podem mudar a ordem; a resposta anterior fica visível até concluir.
   */
  useEffect(() => {
    const refreshOnTick = () => {
      if (document.visibilityState === 'visible') setTick((n) => n + 1);
    };
    const timer = window.setInterval(refreshOnTick, PUBLIC_REFRESH_MS);
    document.addEventListener('visibilitychange', refreshOnTick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshOnTick);
    };
  }, []);

  return { tournaments, proof, failed, refresh, loadMore, loadingMore, hasMore: nextOffset !== null };
}
