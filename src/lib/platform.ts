// Ponto único de divergência entre web e desktop · tela pede adaptador daqui
// em vez de checar plataforma no meio do componente.

/** Detecta o Tauri sem importar pacote dele: o global existe desde o boot do webview. */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Onde esta pessoa está, pra decidir **o que oferecer** · não é o mesmo que
 * `isDesktop()`, que pergunta se o código roda dentro do app.
 *
 * O app instalado existe **só pra Windows**, então quem abre o site precisa de
 * três respostas diferentes: baixar, "ainda não pro seu sistema", ou nem falar
 * de download (celular).
 */
export type Viewer = 'windows' | 'other-desktop' | 'mobile' | 'unknown';

/**
 * **Lê o `userAgent`, e isso é uma escolha com o custo na mesa.**
 *
 * O caminho moderno é `navigator.userAgentData.platform`, e ele **não serve
 * sozinho**: só existe em navegadores Chromium, então Firefox e Safari cairiam
 * no desconhecido · que são justamente os que mais precisam ouvir "ainda não
 * pro seu sistema". A string é feia, é falsificável e é o que funciona nos
 * quatro.
 *
 * **Errar aqui não impede ninguém de baixar**, e é por isso que dá pra usar
 * heurística: a página **mostra o link mesmo assim**, e o que muda é o destaque.
 * Detecção que esconde o download de quem podia baixar seria pior que não ter
 * detecção nenhuma.
 */
export function viewerPlatform(agent = navigator.userAgent): Viewer {
  const ua = agent.toLowerCase();

  // **Celular antes de tudo** · o Android carrega "linux" na string e o iPad
  // moderno se anuncia como Mac, então perguntar por desktop primeiro erraria
  // nos dois. `maxTouchPoints` é o que separa iPad de Mac de verdade.
  const iPadOnMacString =
    ua.includes('macintosh') && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1;
  if (/android|iphone|ipad|ipod|windows phone/.test(ua) || iPadOnMacString) return 'mobile';

  if (ua.includes('windows')) return 'windows';
  if (ua.includes('macintosh') || ua.includes('mac os x') || ua.includes('linux')) {
    return 'other-desktop';
  }
  return 'unknown';
}
