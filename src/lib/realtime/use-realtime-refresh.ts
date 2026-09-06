import { useRealtimeTopic } from './use-realtime-topic';

/**
 * **Refaz esta busca quando um destes eventos chegar.**
 *
 * É a forma que o desenho magro toma na tela: o evento diz *o que* mudou, e
 * **cada busca declara o que é com ela**. A página do club tem três buscas
 * independentes desde 07/08/2026, cada uma com o gatilho dela · um "algo mudou"
 * genérico recarregaria as três a cada mexida e desfaria a economia que aquele
 * bloco comprou (de 7 chamadas pra 3).
 *
 * ```ts
 * useRealtimeRefresh(topic, [CLUB_EVENT.tactic], refreshTactic);
 * ```
 *
 * **`resync` sempre refaz**, sem olhar a lista · ele não diz o que mudou, diz
 * que a tela **perdeu** evento. Nesse caso o certo é buscar, e é justamente o
 * caso em que buscar demais é melhor que mostrar velho.
 *
 * **Vários chamadores dividem uma inscrição só** · quem cuida disso é o cliente
 * do canal, então três buscas ouvindo o mesmo club não pedem o tópico três
 * vezes.
 */
export function useRealtimeRefresh(
  topic: string | null | readonly string[],
  types: readonly string[],
  refresh: () => void,
): void {
  useRealtimeTopic(topic, (event) => {
    if (event.kind === 'resync') {
      refresh();
      return;
    }
    if (types.includes(event.type)) refresh();
  });
}
