import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

/**
 * **O protocolo da casa pra buscar dado numa tela** · estado, `AbortController`,
 * cancelamento e falha, num lugar só.
 *
 * Nasceu da medição de 28/08/2026 (pendência 155): **36 arquivos** montavam esta
 * mesma sequência à mão, com **41** `AbortController` escritos um a um. O custo
 * nunca foi a repetição · foi a **variação**. Três nomes diferentes pro mesmo
 * estado de falha (`setError`, `setFailed`, `setFailure`), e só 5 dos 36 usando
 * o `LoadingState` da casa.
 *
 * **O defeito aparece sempre como buraco:** quem esqueceu o `AbortController`
 * deixa resposta velha sobrescrever a nova quando o filtro muda rápido, e quem
 * esqueceu o carregamento pinta o corpo em branco · foi assim que o painel de
 * usuários subiu **sem estado de carregamento**, com os três estados existindo
 * no código e dois chegando à tela.
 *
 * ## O que ele NÃO é
 *
 * Ele cobre o caso simples, que é a maioria. **Não substitui** o `useShowcase`
 * (paginação por cursor), nem os providers de sessão (`useAuth`, `useMyClubs`),
 * nem a sala do confronto, que tem relógio próprio.
 *
 * **E cinco telas ficaram de fora depois de olhadas uma a uma**, em 01/09/2026
 * · fica escrito pra ninguém tentar de novo achando que é esquecimento:
 *
 * | quem | por quê |
 * |---|---|
 * | `pages/app/account` | o `AbortController` vive dentro de uma verificação de nick com `setTimeout` · não é busca de recurso |
 * | `pages/admin/legal` | o `bodies` é **rascunho que a pessoa edita**, semeado por uma busca em duas etapas · é estado de formulário |
 * | `notification-bell` | `items` e `unread` andam **independentes**, movidos por evento do canal em quatro lugares · um `data` só viraria spread |
 * | `public/unsubscribe` e `public/reset-password` | o `state` é máquina que a **ação da pessoa** também move · o hook seria uma entrada a mais, não uma simplificação |
 *
 * **A régua é uma pergunta:** *o estado é a resposta de uma pergunta ao
 * servidor, ou é outra coisa que por acaso começa com uma?* Rascunho, máquina
 * de estados e caixa alimentada por evento são outra coisa.
 *
 * ## As dependências são conferidas pelo ESLint
 *
 * O `react-hooks/exhaustive-deps` está configurado com `additionalHooks` pra
 * enxergar este hook · sem isso o array seria uma armadilha nova, porque
 * esquecer um valor aqui produz **tela parada com dado velho**, que é o defeito
 * mais difícil de ver que existe. Como o `pnpm lint` roda com `--max-warnings 0`,
 * o aviso reprova a bateria.
 */
export type Resource<T> = {
  /** O que voltou · `null` enquanto não voltou nada, ou quando `skip`. */
  data: T | null;
  /**
   * O que a busca lançou · **cru, e não uma frase.**
   *
   * A tela é quem decide o que aquilo significa: a página pública do player
   * separa `PROFILE_NOT_FOUND` de qualquer outra falha, porque *"não existe"* e
   * *"não deu pra carregar"* são coisas diferentes e juntá-las já custou caro
   * (a página do club afirmava "club não encontrado" pra qualquer erro, o que é
   * um fato falso na página de aquisição). Quem quer só a frase chama o
   * `apiErrorMessage`.
   */
  error: unknown;
  /** A busca está em voo · `false` quando `skip`, porque ali não há pergunta. */
  loading: boolean;
  /**
   * Pede de novo, **sem apagar o que está na tela.**
   *
   * É a diferença deliberada em relação à mudança de dependência: recarregar é
   * "confirme o que eu já estou vendo" e não deve piscar; trocar de `handle` é
   * outra pergunta, e manter a resposta anterior mostraria **a pessoa errada**
   * enquanto carrega.
   */
  reload: () => void;
  /**
   * Edita o que está na mão, sem ir à rede · pra depois de uma mutação.
   *
   * O caso medido é a lista de convites: aceitar um tira ele da lista na hora,
   * e buscar tudo de novo por causa disso é uma volta à API pra remover uma
   * linha que a tela já sabe que saiu.
   */
  setData: React.Dispatch<React.SetStateAction<T | null>>;
};

export type ResourceOptions = {
  /**
   * **As dependências são gatilho, e não identidade** · não apaga o que está na
   * tela quando elas mudam.
   *
   * O padrão (apagar) existe porque mudar de `handle` é **outra pergunta**, e
   * manter a resposta anterior mostraria a pessoa errada. Mas há dependência
   * que só quer dizer *"pergunte de novo"* · o caso medido é o contador de não
   * lidas por sala, que depende da bandeja de conversas: ela muda **a cada
   * mensagem que chega**, e apagar ali faria os números piscarem o tempo todo.
   *
   * A pergunta que decide: *o que está na tela ficou errado quando isto mudou?*
   * Se ficou, é identidade e o padrão vale. Se só ficou **velho**, é gatilho.
   */
  keepPrevious?: boolean;

  /**
   * Não busca nada · para o caso em que a pergunta ainda não existe.
   *
   * Medido em três telas: `clubId` nulo enquanto a página não sabe de qual club
   * se trata, e a página pública que não busca quando há sessão (ela vai
   * redirecionar). **Pular zera o dado**, porque o que estava ali respondia
   * outra pergunta.
   */
  skip?: boolean;
};

export function useResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
  options: ResourceOptions = {},
): Resource<T> {
  const { skip = false, keepPrevious = false } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  /**
   * **Nasce ligado quando vai buscar**, e não `false`.
   *
   * O efeito roda **depois** da pintura, então com `false` o primeiro quadro
   * diz "não estou carregando" com nada na mão · e a tela desenha o estado
   * vazio antes de a pergunta sair. Achado por revisão em 01/09/2026, e o
   * cenário que ele produziu é o pior possível: a **página legal pública**
   * pintava *"nada publicado ainda"* por um quadro, que é afirmar um fato falso
   * pra quem chegou de fora.
   *
   * **Duas telas já tinham compensado isso na mão**, cada uma com um comentário
   * explicando · quando duas cópias consertam o mesmo buraco, o buraco é da
   * peça e não delas.
   */
  const [loading, setLoading] = useState(!skip);
  const [tick, setTick] = useState(0);

  /**
   * **Qual foi a última recarga** · é o que distingue `reload()` de mudança de
   * dependência sem exigir comparar arrays. Ver o `reload` acima.
   */
  const lastTick = useRef(tick);

  /**
   * O `fetcher` é lido de uma ref, e as dependências de verdade são o array que
   * quem chama declara.
   *
   * **Sem isto o hook seria inutilizável**: uma função escrita no corpo do
   * componente é nova a cada render, então pô-la no array faria a busca rodar
   * pra sempre. Exigir `useCallback` de quem chama transferiria a armadilha em
   * vez de resolvê-la · e quem esquecesse o `useCallback` teria um laço
   * infinito, que é como o relógio da sala do confronto quebrou em 29/08/2026.
   */
  const latest = useRef(fetcher);
  latest.current = fetcher;

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    const fromReload = lastTick.current !== tick;
    lastTick.current = tick;

    if (skip) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Pergunta nova apaga a resposta velha · recarga não, e gatilho declarado
    // como tal também não.
    if (!fromReload && !keepPrevious) setData(null);
    setError(null);
    setLoading(true);

    const ctrl = new AbortController();

    /**
     * **Chamar o `fetcher` pode explodir ANTES de virar promessa**, e aí a
     * exceção sobe pelo efeito e derruba a árvore inteira em vez de virar
     * `error`. Achado em 01/09/2026 convertendo o contador de não lidas: o
     * dublê da API de um teste não tinha o método, e quatro casos que não
     * falavam de contador nenhum passaram a renderizar **nada**.
     *
     * O código que este hook substituiu tinha `try/catch` em volta do `await`,
     * e engolia isso de graça · perder essa proteção seria trocar repetição por
     * fragilidade.
     */
    let pending: Promise<T>;
    try {
      pending = latest.current(ctrl.signal);
    } catch (err: unknown) {
      setError(err);
      setLoading(false);
      return () => ctrl.abort();
    }

    pending
      .then((result) => {
        if (ctrl.signal.aborted) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        // **Cancelado não é falha** · em desenvolvimento o `StrictMode` monta,
        // desmonta e remonta, então toda busca é abortada uma vez de propósito.
        if (ctrl.signal.aborted) return;
        setError(err);
        setLoading(false);
      });

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- as dependências são as de quem chama, mais o relógio da recarga
  }, [...deps, tick, skip, keepPrevious]);

  return { data, error, loading, reload, setData };
}
