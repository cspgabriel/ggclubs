import { useContext, useEffect, useRef } from 'react';
import type { TopicEvent } from './client.js';
import { RealtimeContext } from './realtime-context.js';

/**
 * A tela ouve um tópico enquanto estiver montada.
 *
 * **A ordem é `snapshot` e então stream, sempre** · a tela faz o `GET` que ela
 * já fazia e **só então** aplica evento. Este hook é a segunda metade disso: ele
 * avisa que algo mudou, e quem decide o que buscar é a tela, que já sabe.
 *
 * **O `onChange` não entra nas dependências**, e isso é deliberado: a tela
 * costuma passar uma função nova a cada render, e depender dela faria a
 * inscrição sair e voltar a cada pintura · o servidor veria um `sub`/`unsub` por
 * render. Quem guarda a versão atual é a `ref`.
 *
 * **`topic` nulo não assina nada** · é o caso da tela que ainda não sabe qual
 * club está olhando, e ela não deve inventar uma inscrição enquanto espera.
 *
 * **Aceita uma lista**, e ela existe pra um caso concreto: a página de um
 * jogador mostra a relação dele com **cada club que você gerencia**, e são até
 * três tópicos pra uma busca só. Lista vazia é o mesmo que nulo.
 */
/**
 * O que junta vários tópicos numa chave só de dependência.
 *
 * **Ele era o byte NUL escrito CRU no arquivo**, e não um escape · o fonte
 * carregava dois `0x00` de verdade, o que fazia o `grep` tratar o arquivo como
 * binário (some das buscas) e, pior, deixava o separador à mercê de qualquer
 * ferramenta que normalize texto: um editor que o engula transforma isto em
 * `join('')` e `split('')` · a primeira **cola** os tópicos e a segunda quebra
 * **por caractere**, e as duas falham em silêncio.
 *
 * Achado em 19/08/2026 investigando o "Binary file matches" de um grep. O
 * caractere continua sendo o mesmo (é o único que não aparece em id nem em
 * nome de tópico) · o que mudou é ele estar **escrito como escape**.
 */
const TOPIC_SEPARATOR = '\u0000';

export function useRealtimeTopic(
  topic: string | null | readonly string[],
  onChange: (event: TopicEvent) => void,
  /**
   * **Avise quando a inscrição ficar pronta**, com um `resync`.
   *
   * Serve a tela que **não pode perder um evento publicado entre a busca dela e
   * a inscrição** · a janela é o tempo de o servidor autorizar o tópico, medido
   * em 600ms a 1,1s contra o Atlas, e nela o evento passa sem inscrito.
   *
   * Não é o padrão porque custa uma busca a mais por montagem, e a maioria das
   * telas não perde nada ficando um instante sem o evento.
   */
  options: { syncOnSubscribe?: boolean } = {},
) {
  const { client } = useContext(RealtimeContext);
  const handler = useRef(onChange);
  handler.current = onChange;
  const syncOnSubscribe = options.syncOnSubscribe ?? false;

  // **A dependência é a lista achatada, não o array** · quem passa
  // `clubs.map(...)` cria um array novo a cada render, e depender dele faria a
  // inscrição sair e voltar a cada pintura · exatamente o que o comentário do
  // `onChange` acima evita pelo outro lado.
  const key = topic === null ? '' : typeof topic === 'string' ? topic : topic.join(TOPIC_SEPARATOR);

  useEffect(() => {
    if (!client || !key) return;
    const offs = key
      .split(TOPIC_SEPARATOR)
      .map((one) => client.subscribe(one, (e) => handler.current(e), { syncOnSubscribe }));
    return () => offs.forEach((off) => off());
  }, [client, key, syncOnSubscribe]);
}

/**
 * **Existe canal nesta parte do site?**
 *
 * O `RealtimeProvider` só é montado dentro do `/app` e do `/admin` · nas telas
 * abertas não há sessão, e o canal exige bilhete. Quem precisa disto é quem tem
 * um plano B pra quando ele não existe · hoje é a página aberta da edição, que
 * se atualiza sozinha de minuto em minuto em vez de ficar congelada.
 *
 * **Ele responde sobre a montagem, e não sobre a conexão estar de pé** · uma
 * queda momentânea não deve ligar o plano B, porque o cliente reconecta sozinho
 * e o `resync` recupera o que passou.
 */
export function useHasRealtime(): boolean {
  return useContext(RealtimeContext).client !== null;
}

/**
 * **A conexão está aberta AGORA?** · e é outra pergunta que o `useHasRealtime`.
 *
 * O de cima responde *"existe canal nesta parte do site"*, que é sobre a
 * montagem do provider · dentro do `/app` ele é **sempre** verdadeiro. Este
 * responde sobre o socket.
 *
 * **A distinção nasceu de um defeito, em 28/08/2026** · a sala do confronto
 * desligava o polling de 10s com `useHasRealtime()`, e o comentário dela
 * prometia *"no dia em que o WebSocket cair, a mensagem chega em 10s"*. **Não
 * chegava:** com o provider montado e a conexão morta, a sala ficava muda até
 * alguém fechar e reabrir.
 *
 * **Quem cai por um instante não liga o plano B** · o cliente reconecta sozinho
 * com espera crescente, e uma requisição a mais durante a volta é barata perto
 * de uma sala congelada. Quem usa isto liga o polling **enquanto** não está
 * aberto, e não "quando cair".
 */
export function useRealtimeConnected(): boolean {
  return useContext(RealtimeContext).state === 'open';
}
