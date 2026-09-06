import type { ptBR } from '@/i18n/locales/pt-BR';

type AuthErrorKey = keyof typeof ptBR.authErrors;

// Mapeia código do Firebase pra chave do catálogo · o texto sai do idioma
// ativo, não daqui. Chave desconhecida cai no genérico e o código cru nunca
// vaza pra tela.
const KEY_BY_CODE: Record<string, AuthErrorKey> = {
  'auth/invalid-credential': 'invalidCredential',
  'auth/invalid-login-credentials': 'invalidCredential',
  'auth/wrong-password': 'wrongPassword',
  'auth/user-not-found': 'userNotFound',
  'auth/user-disabled': 'userDisabled',
  'auth/invalid-email': 'invalidEmail',
  'auth/missing-password': 'missingPassword',
  'auth/missing-email': 'missingEmail',

  'auth/too-many-requests': 'tooManyRequests',
  'auth/network-request-failed': 'networkFailed',
  'auth/internal-error': 'internal',

  'auth/email-already-in-use': 'emailInUse',
  'auth/weak-password': 'weakPassword',
  'auth/operation-not-allowed': 'operationNotAllowed',
  // Sai quando a política de senha do projeto recusa. Sem este mapeamento, quem
  // fosse barrado veria "não conseguimos completar a ação" e não teria como
  // adivinhar que precisa redefinir a senha · e o erro cai justamente em quem
  // não consegue entrar, que é quem menos pode ficar sem instrução.
  'auth/password-does-not-meet-requirements': 'passwordPolicy',

  'auth/expired-action-code': 'expiredActionCode',
  'auth/invalid-action-code': 'invalidActionCode',

  'auth/id-token-expired': 'sessionExpired',
  'auth/id-token-revoked': 'sessionRevoked',
  'auth/requires-recent-login': 'requiresRecentLogin',

  'auth/invalid-verification-code': 'invalidVerificationCode',
  'auth/invalid-verification-id': 'invalidVerificationId',

  'auth/popup-blocked': 'popupBlocked',
  'auth/unauthorized-domain': 'unauthorizedDomain',
};

const GENERIC_KEY: AuthErrorKey = 'generic';

const USER_CANCELLED = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
]);

/**
 * O fluxo nativo do desktop não passa por `FirebaseError`: o shell Rust rejeita
 * com string crua (ver `google_auth.rs`). Por isso este arquivo não é só de
 * Firebase · ele é o **único lugar** que decide se uma falha de autenticação
 * vira texto na tela, e as duas plataformas precisam chegar na mesma resposta.
 * Enquanto ele ignorava a string, desistir no Google virava erro vermelho no
 * app e silêncio na web.
 */
const DESKTOP_CANCELLED = new Set(['cancelled', 'timeout', 'oauth-error: access_denied']);

const DESKTOP_KEY_BY_PREFIX: [string, AuthErrorKey][] = [['browser-failed', 'browserFailed']];

function desktopAuthCode(err: unknown): string | null {
  return typeof err === 'string' ? err : null;
}

/**
 * O código de um erro do Firebase, **sem importar o SDK**.
 *
 * Era `err instanceof FirebaseError`, e um `import` só pra um `instanceof`
 * prendia o pacote do Firebase na entrada de todo visitante · inclusive na
 * landing, que nunca chama nada disto. A forma é o que importa aqui: erro do
 * SDK carrega `code` string, e é só ele que a tabela abaixo consulta.
 */
function firebaseCode(err: unknown): string | null {
  if (typeof err !== 'object' || err === null) return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

/** Desistir do login não é falha · não deve virar mensagem de erro na tela. */
export function isUserCancelledAuth(err: unknown): boolean {
  const firebase = firebaseCode(err);
  if (firebase !== null) return USER_CANCELLED.has(firebase);
  const code = desktopAuthCode(err);
  return code !== null && DESKTOP_CANCELLED.has(code);
}

/** Devolve a chave de tradução · quem chama passa por `t()`. */
export function authErrorKey(err: unknown): AuthErrorKey {
  const firebase = firebaseCode(err);
  if (firebase !== null) {
    return KEY_BY_CODE[firebase] ?? GENERIC_KEY;
  }
  const desktop = desktopAuthCode(err);
  if (desktop !== null) {
    const match = DESKTOP_KEY_BY_PREFIX.find(([prefix]) => desktop.startsWith(prefix));
    return match?.[1] ?? GENERIC_KEY;
  }
  if (err instanceof Error) {
    // O SDK às vezes embrulha o erro num Error comum, com o código no meio da mensagem.
    const match = err.message.match(/\(auth\/[a-z-]+\)/);
    if (match) {
      const code = match[0].slice(1, -1);
      return KEY_BY_CODE[code] ?? GENERIC_KEY;
    }
  }
  return GENERIC_KEY;
}
