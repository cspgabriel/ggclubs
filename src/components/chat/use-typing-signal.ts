import type { ChatTypingSignal } from '@ggclubs/schemas';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

/** Quanto o aviso de digitação fica na tela sem ser renovado. */
const SHOWS_FOR_MS = 5_000;

/** O intervalo mínimo entre dois sinais que a gente **manda**. */
const SIGNALS_EVERY_MS = 3_000;

/**
 * O "está digitando" da sala · **as duas pontas dele, num lugar só.**
 *
 * Saiu do `match-chat.tsx` em 01/09/2026 (pendência 156) e é a primeira coisa
 * que sai de lá que **não é desenho**: eram dois `ref`, um estado e um efeito
 * de limpeza espalhados por trezentas linhas, mais a regra de três segundos
 * enterrada no `onChange` do campo.
 *
 * **Juntá-los é o que torna o compositor extraível** · enquanto o campo
 * precisava de um `ref` de contador e do cliente da API pra digitar uma letra,
 * ele carregava comportamento e não dava pra tratar como peça de tela.
 *
 * ## As duas pontas
 *
 * | | |
 * |---|---|
 * | **o que a gente manda** | um sinal a cada três segundos · digitar é evento por tecla, e mandar um por tecla seria a definição de flood |
 * | **o que a gente mostra** | some sozinho em cinco segundos · não existe "parou de digitar", e inventar um segundo evento pra isso seria manter dois sinais em vez de um |
 *
 * **Cinco é maior que três de propósito** · é o intervalo em que o outro lado
 * re-sinaliza enquanto escreve, então o aviso se renova antes de apagar.
 */
export function useTypingSignal(matchId: string): {
  /** Quem está digitando do outro lado · `null` quando ninguém está. */
  typing: ChatTypingSignal | null;
  /** Chegou um sinal pelo canal · reinicia o relógio de cinco segundos. */
  noteTyping: (signal: ChatTypingSignal) => void;
  /** A sala foi trocada ou a conversa recarregou · esquece quem estava digitando. */
  forget: () => void;
  /** A pessoa digitou · manda um sinal se já passaram os três segundos. */
  onLocalTyping: (hasText: boolean) => void;
} {
  const [typing, setTyping] = useState<ChatTypingSignal | null>(null);
  const lastSent = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const noteTyping = useCallback((signal: ChatTypingSignal) => {
    setTyping(signal);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTyping(null), SHOWS_FOR_MS);
  }, []);

  const forget = useCallback(() => setTyping(null), []);

  const onLocalTyping = useCallback(
    (hasText: boolean) => {
      const now = Date.now();
      if (!hasText || now - lastSent.current <= SIGNALS_EVERY_MS) return;
      lastSent.current = now;
      /**
       * **Falhar aqui é silêncio** · o sinal é enfeite, e um erro vermelho
       * porque o "está digitando" não saiu contaria uma história errada sobre a
       * conversa inteira.
       */
      void api.signalTyping(matchId).catch(() => undefined);
    },
    [matchId],
  );

  // **A limpeza importa** · sem ela o `setTyping` roda depois de a sala fechar.
  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  return { typing, noteTyping, forget, onLocalTyping };
}
