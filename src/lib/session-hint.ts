const KEY = 'ggclubs:had-session';

/**
 * Marca de que **havia** sessão no último uso. Serve só pra escolher o que
 * desenhar no primeiro quadro, enquanto o Firebase ainda está resolvendo se o
 * token guardado presta.
 *
 * **Não é credencial e não libera nada.** Quem tem sessão é quem tem token
 * válido, e isso continua sendo decidido pelo Firebase e pelo backend. Se
 * alguém escrever esta chave à mão, o único efeito é ver a marca por um
 * instante antes de cair na tela de entrada.
 */
export function hadSession(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    // Navegador com armazenamento bloqueado · sem dica, mostra a entrada.
    return false;
  }
}

export function rememberSession(exists: boolean): void {
  try {
    if (exists) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    // Sem armazenamento, o app funciona igual · só perde a dica de boot.
  }
}
