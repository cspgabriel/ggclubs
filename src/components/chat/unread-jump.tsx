import { useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  useMessageScroller,
  useMessageScrollerVisibility,
} from '@/components/ui/message-scroller';

/**
 * **"3 mensagens novas ↓"** · o que aparece quando chega mensagem enquanto a
 * pessoa está lendo o histórico.
 *
 * **O problema que ele resolve não é o scroll, é a escolha entre dois males.**
 * Rolar sozinho arranca quem está lendo; não fazer nada esconde que chegou
 * coisa. Numa sala onde se combina horário de jogo, o segundo é o caro.
 *
 * **O botão que existia era mudo** · ele já aparecia ao sair da base, com uma
 * seta e rótulo só pra leitor de tela · ou seja ele dizia *"você subiu"* e nunca
 * *"chegou mensagem"*, que é a informação pela qual a pessoa desce.
 *
 * **A contagem é por POSIÇÃO na lista, e não um contador que soma** · três
 * defeitos vieram da primeira versão, que incrementava a cada mudança do id da
 * última mensagem (achados pelo `revisor` em 28/08/2026):
 *
 * 1. **duas mensagens no mesmo commit contavam como uma** · o polling de 10s
 *    troca a lista inteira de uma vez, então uma rajada de três virava "1";
 * 2. **a minha própria mensagem contava como nova** · eu subia pra reler, mandava
 *    "vlw", e a pílula aparecia apontando pro que eu tinha acabado de escrever;
 * 3. **piscava na montagem e a cada mensagem recebida no fim** · o snapshot do
 *    scroller nasce vazio e só é publicado num `requestAnimationFrame`, então
 *    havia sempre um quadro em que "a última não está visível" era falso-positivo.
 */
export function UnreadJump({
  messageIds,
  isMine,
}: {
  /** Os ids na ordem da tela · a contagem é a distância até o fim. */
  messageIds: string[];
  /** A mensagem é de um club meu · o que eu escrevo nunca é "novo" pra mim. */
  isMine: (messageId: string) => boolean;
}) {
  const { t } = useTranslation();
  const { scrollToEnd } = useMessageScroller();
  const { visibleMessageIds } = useMessageScrollerVisibility();
  /** A última que a pessoa viu enquanto estava na base. */
  const [anchor, setAnchor] = useState<string | null>(null);
  /**
   * **O snapshot do scroller nasce vazio**, e sem esta espera o primeiro quadro
   * responde "fora da base" pra quem acabou de abrir a sala no fim dela.
   */
  const ready = useRef(false);
  if (visibleMessageIds.length > 0) ready.current = true;

  const last = messageIds.at(-1);
  const atEnd = !ready.current || last === undefined || visibleMessageIds.includes(last);

  useEffect(() => {
    // Na base, a âncora acompanha o fim · sair de lá congela ela.
    if (atEnd) setAnchor(last ?? null);
  }, [atEnd, last]);

  if (atEnd || anchor === null) return null;

  /**
   * **Conta o que veio depois da âncora, e ignora o que é meu** · a distância
   * até o fim responde certo mesmo quando a lista troca inteira de uma vez, que
   * é o que o polling faz.
   */
  const from = messageIds.indexOf(anchor);
  const newCount = from === -1 ? 0 : messageIds.slice(from + 1).filter((id) => !isMine(id)).length;
  if (newCount === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center">
      <Button
        size="sm"
        variant="secondary"
        className="pointer-events-auto shadow-lg"
        onClick={() => scrollToEnd({ behavior: 'smooth' })}
      >
        {t('chat.newMessages', { count: newCount })}
        <ArrowDown className="ml-1.5 h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
