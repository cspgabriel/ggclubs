/**
 * Cabeçalho de cada modo do formulário de entrada. Mora fora das páginas porque
 * são duas portas (`/login` do site e a do app desktop) e o mapeamento estava
 * copiado nas duas · a cópia já tinha divergido, mostrando "ainda não tem conta"
 * em cima do formulário de recuperar senha.
 */
export type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password';

// `as const` porque o `t()` só aceita chave literal · anotar como `string`
// desliga a checagem e deixa passar chave que não existe no catálogo. O
// `satisfies` continua cobrando um par pra cada modo.
export const authCopy = {
  'sign-in': { title: 'auth.signInTitle', subtitle: 'auth.signInSubtitle' },
  'sign-up': { title: 'auth.signUpTitle', subtitle: 'auth.signUpSubtitle' },
  'forgot-password': { title: 'auth.forgotTitle', subtitle: 'auth.forgotSubtitle' },
} as const satisfies Record<AuthMode, { title: string; subtitle: string }>;
