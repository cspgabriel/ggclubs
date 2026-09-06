import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * O comportamento de uma vitrine paginada por cursor, com busca.
 *
 * **Ele existe porque as duas vitrines do produto já tinham divergido em cinco
 * pontos que ninguém decidiu.** A de players nasceu copiando a de clubs, e o que
 * se perdeu na cópia não aparece em teste nenhum:
 *
 * | | clubs | players |
 * |---|---|---|
 * | guarda de um caractere | tinha | **não tinha** · uma letra esmaecia a lista e pedia a mesma vitrine de volta |
 * | espera ao limpar a busca | nenhuma | 350ms à toa |
 * | saída de teclado pra próxima página | botão | **só a sentinela** |
 * | a sentinela no DOM | sempre | só com cursor |
 * | esmaecido preso depois de abortar | **os dois** · ver abaixo |
 *
 * O último é defeito dos dois e só apareceu ao juntar: apagar uma letra de um
 * termo de dois **aborta a consulta em voo e cai na guarda**, então o
 * `setPending(false)` nunca acontecia e a lista ficava a 50% de opacidade pra
 * sempre. Aqui a guarda desliga a espera antes de sair.
 *
 * **O que fica de fora daqui, de propósito:** o card, o vazio e a silhueta. Eles
 * são conteúdo, e conteúdo é da tela · é a mesma divisão do `site-header`, que
 * é dono da moldura e recebe o miolo como nó. Vitrine nova acrescenta card, não
 * acrescenta modo.
 */

/** Abaixo disto a busca é ignorada e a vitrine volta · a API recusa. */
export const SHOWCASE_MIN_TERM = 2;

/** Quanto a busca espera a digitação parar. Sem termo não há o que esperar. */
const TYPING_DELAY = 350;

export type ShowcasePage<T> = { items: T[]; cursor: string | null };

/**
 * A consulta de uma página. Ela **fecha sobre os filtros da tela** · o hook só
 * sabe do termo e do cursor, então filtro novo não muda a assinatura daqui.
 */
export type ShowcaseLoad<T> = (
  args: { q?: string; cursor?: string },
  init?: RequestInit,
) => Promise<ShowcasePage<T>>;

export function useShowcase<T>({
  term = '',
  filterKey = '',
  load,
}: {
  term?: string;
  /** Muda quando qualquer filtro da tela muda · é o que refaz a primeira página. */
  filterKey?: string;
  load: ShowcaseLoad<T>;
}) {
  const [items, setItems] = useState<T[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  /** Repetir a busca · **só existe porque repetir pode mudar o resultado**. */
  const [tick, setTick] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  /**
   * **O estado de React não serve de tranca aqui**, e o defeito já aconteceu na
   * vitrine de clubs: duas interseções no mesmo tick leem o mesmo valor antigo
   * e disparam as duas, e a mesma página chega duas vezes com os cards
   * duplicados.
   */
  const loadingRef = useRef(false);

  /**
   * **A identidade da função não pode reiniciar a busca.** Quem decide refazer
   * a consulta é o termo e o `filterKey` · sem o ref, uma tela que esquecesse o
   * `useCallback` no `load` entraria em laço, e essa é a armadilha mais fácil de
   * cair num hook com callback na entrada.
   */
  const loadRef = useRef(load);
  loadRef.current = load;

  const trimmed = term.trim();
  const q = trimmed.length >= SHOWCASE_MIN_TERM ? trimmed : undefined;

  useEffect(() => {
    // Termo de um caractere casa com quase tudo, e a API recusa abaixo de dois ·
    // nem chega a pedir. **O `setPending(false)` aqui não é zelo:** a limpeza do
    // efeito anterior já abortou a consulta em voo, e sem ele a lista fica
    // esmaecida pra sempre.
    if (trimmed.length === 1) {
      setPending(false);
      return;
    }

    const ctrl = new AbortController();

    // **A lista some não; ela esmaece.** Zerar pra `null` a cada tecla trocava a
    // grade por silhueta no meio da digitação, então "mad" piscava duas vezes
    // antes de mostrar o resultado. Silhueta é pra quando não há o que mostrar.
    setPending(true);

    const timer = setTimeout(
      () => {
        void loadRef
          .current(q ? { q } : {}, { signal: ctrl.signal })
          .then((r) => {
            setItems(r.items);
            setCursor(r.cursor);
            setFailed(false);
          })
          /**
           * **Falha de rede não é "nenhum resultado"** · pendência 170.
           *
           * Aqui o `catch` fazia `setItems([])`, então a API fora do ar virava
           * *"ninguém aqui ainda"* em `/app/clubs` e `/app/players` · o mesmo
           * falso-verde que a página aberta do club já custou uma vez, e que o
           * `useTournamentList` corrigiu deixando a lista em `null`.
           *
           * **A lista anterior fica**, e só o `failed` sobe · quem exibe decide
           * entre "não deu pra carregar" (sem nada na tela) e o esmaecido de
           * quem já tinha resultado. É a mesma regra que o `TournamentProof`
           * aprendeu no mesmo dia.
           */
          .catch(() => {
            if (!ctrl.signal.aborted) setFailed(true);
          })
          .finally(() => {
            if (!ctrl.signal.aborted) setPending(false);
          });
      },
      // Trocar de filtro e limpar a busca respondem na hora · esperar ali é
      // atraso sem digitação pra acompanhar.
      q ? TYPING_DELAY : 0,
    );

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, trimmed, filterKey, tick]);

  /**
   * A próxima página · o cursor guarda onde a anterior parou.
   *
   * **O termo não vai junto de propósito:** com busca a API não devolve cursor,
   * nas duas vitrines, porque busca já é o recorte. Os filtros vão, porque o
   * `load` da tela fecha sobre eles.
   */
  const loadMore = useCallback(() => {
    if (!cursor || loadingRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    void loadRef
      .current({ cursor })
      .then((r) => {
        // **Cresce a lista, não substitui** · substituir era o que fazia a tela
        // piscar a cada página.
        setItems((current) => [...(current ?? []), ...r.items]);
        setCursor(r.cursor);
      })
      .catch(() => setCursor(null))
      .finally(() => {
        loadingRef.current = false;
        setLoadingMore(false);
      });
  }, [cursor]);

  useEffect(() => {
    const target = sentinel.current;
    if (!target || !cursor) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry?.isIntersecting && loadMore(),
      // Dispara antes de a sentinela aparecer · a página seguinte chega enquanto
      // a pessoa ainda está rolando a atual.
      { rootMargin: '300px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  return {
    /** `null` enquanto a primeira página não chegou · é o que pede a silhueta. */
    items,
    /**
     * A busca falhou · **e ela convive com lista na tela**, porque o `catch` não
     * apaga o que já tinha chegado. Quem exibe só mostra a falha quando não há
     * o que mostrar (`items === null`).
     */
    failed,
    /** Repete a busca · o par do `failed`, porque tela terminal precisa de saída. */
    refresh: () => setTick((n) => n + 1),
    cursor,
    /** Uma consulta em voo com lista já na tela · é o esmaecido, não a silhueta. */
    pending,
    loadingMore,
    sentinel,
    loadMore,
    /** O termo está valendo? É o que separa "nada aqui" de "nada pra esse termo". */
    searching: q !== undefined,
    term: trimmed,
  };
}
