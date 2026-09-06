/**
 * O app foi recusado por ser velho demais (426 · `CLIENT_TOO_OLD`).
 *
 * **É estado global de verdade, e por isso não mora num contexto.** Quem
 * descobre é o cliente de API, que não é componente e roda fora da árvore do
 * React · e quem precisa reagir é a casca inteira, de uma vez. Um provider
 * exigiria que cada tela repassasse o erro pra cima, e bastaria **uma**
 * esquecer pra pessoa ficar olhando uma tela vazia sem entender por quê.
 *
 * **Não tem volta de propósito.** O caminho de saída é atualizar e reiniciar ·
 * um app abaixo do piso não vai voltar a ser aceito nesta execução, e oferecer
 * "tentar de novo" na trava seria prometer o que não acontece.
 */
let blocked = false;
const listeners = new Set<() => void>();

export function markClientTooOld(): void {
  if (blocked) return;
  blocked = true;
  for (const listener of listeners) listener();
}

export function subscribeClientBlocked(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isClientBlocked(): boolean {
  return blocked;
}

/** Só o teste usa · sem isto, um caso vaza o bloqueio pro seguinte. */
export function resetClientBlocked(): void {
  blocked = false;
  listeners.clear();
}
