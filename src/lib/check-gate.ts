/**
 * **A guarda de "pergunte ao servidor, mas não a cada gesto".** É o pedaço que
 * o vigia do site (`lib/app-version.ts`) e o do app instalado
 * (`components/desktop/update-watch.ts`) tinham copiado um do outro: uma
 * pergunta em voo por vez, um piso de tempo entre duas, e um `force` que pula o
 * piso. Duas cópias divergiriam na primeira vez que alguém afinasse uma · e a
 * primeira divergência já tinha nome, ver abaixo.
 *
 * **`force` com pergunta em voo espera e pergunta de novo.** Uma pergunta em
 * voo responde sobre o instante em que saiu · o `force` chega por um sinal
 * (deploy detectado, import que falhou) que diz "o mundo mudou **agora**", e
 * reaproveitar a resposta anterior seria responder sobre o mundo de antes. Nas
 * duas cópias o `inFlight` vinha antes do `force`, e o teste da faixa do
 * desktop contornava isso com um `setTimeout(0)` em vez de o código.
 *
 * O que fica de fora de propósito: o que fazer com a resposta (trava, aviso,
 * comparação de versão) é de quem chama.
 */
export type CheckGate<T> = {
  check: (options?: { force?: boolean }) => Promise<T | null>;
  /** Só pros testes · o estado é de módulo em quem usa. */
  reset: () => void;
};

export function createCheckGate<T>(run: () => Promise<T | null>, minIntervalMs: number): CheckGate<T> {
  let lastAt = 0;
  let inFlight: Promise<T | null> | null = null;

  async function check({ force = false } = {}): Promise<T | null> {
    if (inFlight) {
      if (!force) return inFlight;
      // O `finally` de baixo já limpou o `inFlight` quando isto roda · a
      // pergunta nova sai limpa, e `run` que rejeitou também deixa perguntar.
      const again = () => check({ force: true });
      return inFlight.then(again, again);
    }

    const now = Date.now();
    if (!force && now - lastAt < minIntervalMs) return null;
    lastAt = now;

    inFlight = run().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  return {
    check,
    reset: () => {
      lastAt = 0;
      inFlight = null;
    },
  };
}
