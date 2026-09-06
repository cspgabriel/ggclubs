import { activeLanguage } from '@/i18n';
import { LANGUAGE_BASENAME } from '@/i18n/language';
import { LEGAL_PATH } from './paths.js';
import { isDesktop } from './platform.js';

/**
 * As telas que **não** precisam da sessão pra decidir o que desenhar.
 *
 * **A lista é de quem não precisa, e a inversão é a decisão de projeto aqui.**
 * Rota nova que ninguém lembrou de listar cai no lado que **boota**: ela paga
 * duas requisições que talvez não use. Com a lista ao contrário, a mesma
 * distração deixaria a rota com `loading` eterno e a guarda travada na marca do
 * boot · que é o beco que este projeto já criou duas vezes (o `ProtectedRoute`
 * em 29/07 e o `accountStatus` que nascia e morria em `idle`).
 *
 * Errar pra cá custa desempenho. Errar pro outro lado custa a tela.
 */
// Os documentos legais entram pelo `LEGAL_PATH`, e não escritos aqui: o
// `/reembolso` nasceu em 13/08/2026 e ficou fora desta lista até 06/09, com os
// dois irmãos dentro · a página é a mesma, e bootava a sessão só no terceiro.
const SESSION_FREE = new Set<string>(['/', ...Object.values(LEGAL_PATH)]);

/**
 * O caminho **sem o prefixo do idioma**, que é a forma em que a lista acima
 * está escrita.
 *
 * Existe porque as duas fontes de caminho do produto entregam formas
 * diferentes: `useLocation()` já vem sem o prefixo (o `BrowserRouter` roda com
 * ele como `basename`), e `window.location.pathname` vem com. Trocar um pelo
 * outro sem notar isso mandou o seletor de idioma pra `/p/clubs/...` em
 * 06/08/2026 · aqui o efeito seria pior e mais quieto: `/es` não estaria na
 * lista, a landing em espanhol bootaria a sessão, e ninguém veria.
 */
export function withoutLanguagePrefix(pathname: string): string {
  const base = LANGUAGE_BASENAME[activeLanguage];
  if (base === '/') return pathname;
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  return rest.startsWith('/') ? rest : `/${rest}`;
}

/**
 * Esta rota precisa da sessão resolvida pra decidir o que desenhar?
 *
 * Recebe o caminho **na forma da raiz** · quem tem o caminho cru passa pelo
 * `withoutLanguagePrefix` antes.
 *
 * **No app instalado a resposta é sempre sim**, porque lá a raiz *é* a tela de
 * entrar · a mesma troca que o router faz no `path="/"`.
 */
export function needsSession(pathname: string): boolean {
  if (isDesktop()) return true;
  return !SESSION_FREE.has(pathname);
}
