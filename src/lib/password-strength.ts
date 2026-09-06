export type PasswordStrength = 'weak' | 'medium' | 'strong';

/**
 * Força de senha por heurística própria, sem biblioteca.
 *
 * O `zxcvbn` faria melhor, mas custa centenas de KB no bundle pra ajudar numa
 * tela que a pessoa vê uma vez na vida · não paga. O que está aqui cobre o que
 * de fato acontece: senha curta, senha óbvia e senha derivada do próprio e-mail.
 *
 * **Isto é orientação, não segurança.** Quem guarda e valida a senha é o
 * Firebase, e o piso dele (6 caracteres) continua sendo o único bloqueio. Medidor
 * que impede de enviar empurra as pessoas pro gerenciador de senhas do post-it.
 *
 * O peso está no **comprimento**, não em exigir símbolo. É o que o NIST
 * recomenda desde 2017: regra de composição produz `Senha@123`, que parece forte
 * e está em toda lista de vazamento.
 */

/**
 * Piso da senha. **Tem que ser o mesmo configurado no Firebase** · aqui é
 * conveniência, lá é a regra. Subiu pra 8 em 29/07/2026, com um argumento que
 * não é sobre hoje: senha definida agora sobrevive à chegada da assinatura e
 * dos dados sensíveis, e não dá pra fortalecer senha existente sem forçar
 * troca. O momento barato de subir o piso é enquanto quase não há contas.
 */
export const MIN_PASSWORD_LENGTH = 8;

// Lista curta de propósito: não é filtro de vazamento, é o que as pessoas
// digitam quando querem se livrar do campo.
const OBVIOUS = [
  'senha',
  'password',
  'qwerty',
  'asdf',
  '123456',
  'abc123',
  'ggclubs',
  'admin',
  'iloveyou',
];

function hasVariety(password: string): number {
  return [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((re) => re.test(password)).length;
}

function isObvious(password: string, email?: string): boolean {
  const lower = password.toLowerCase();
  if (OBVIOUS.some((term) => lower.includes(term))) return true;

  // Um caractere só, repetido · "aaaaaaaa" tem oito de comprimento e valor zero.
  if (/^(.)\1+$/.test(password)) return true;

  // Sequência de teclado ou de contagem, nos dois sentidos.
  if (/0123456789|9876543210/.test(password)) return true;

  // Senha derivada do próprio e-mail é a primeira coisa que alguém tenta.
  const local = email?.split('@')[0]?.toLowerCase();
  if (local && local.length >= 3 && lower.includes(local)) return true;

  return false;
}

export type PasswordRejection = 'too-short' | 'obvious';

/**
 * O que o cadastro **recusa**, separado do que ele apenas desencoraja.
 *
 * A régua não é "fraca": senha de nove letras minúsculas é fraca e ainda assim
 * é escolha legítima de alguém. O que se recusa é o indefensável · curta demais
 * e adivinhável em primeira tentativa. Barrar a faixa do meio empurraria as
 * pessoas pra senha reusada, que é pior que senha fraca e única.
 *
 * A parte de "óbvia" é **guia, não defesa**: roda no cliente e alguém falando
 * direto com o Firebase passa por cima. Quem garante o piso é a política de
 * senha do projeto, e é lá que o número de verdade mora.
 */
export function passwordRejection(password: string, email?: string): PasswordRejection | null {
  if (password.length < MIN_PASSWORD_LENGTH) return 'too-short';
  if (isObvious(password, email)) return 'obvious';
  return null;
}

/**
 * A chave de catálogo de cada recusa.
 *
 * **Extraída quando a segunda cópia apareceu** · o ternário vivia dentro do
 * `SignInForm`, e a tela de criar senha nova (24/08/2026) faz a **mesma**
 * pergunta. Duas cópias divergem no dia em que uma recusa nova entrar: uma tela
 * ganharia a frase e a outra cairia num `t()` de chave inexistente, que aparece
 * na tela como o próprio nome da chave.
 */
export function passwordRejectionKey(
  rejection: PasswordRejection,
): 'auth.passwordTooShort' | 'auth.passwordObvious' {
  return rejection === 'too-short' ? 'auth.passwordTooShort' : 'auth.passwordObvious';
}

/** `null` quer dizer "não há o que mostrar ainda" · campo vazio não é fraco. */
export function passwordStrength(password: string, email?: string): PasswordStrength | null {
  if (!password) return null;
  if (password.length < MIN_PASSWORD_LENGTH || isObvious(password, email)) return 'weak';

  const variety = hasVariety(password);

  // Comprimento sozinho já resolve a partir de um ponto: uma frase de 14 letras
  // minúsculas é mais difícil que oito caracteres com símbolo no meio.
  if (password.length >= 14 || (password.length >= 10 && variety >= 3)) return 'strong';
  if (password.length >= 10 || (password.length >= 8 && variety >= 2)) return 'medium';
  return 'weak';
}
