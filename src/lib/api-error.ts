import { type ErrorCode, MAX_MANAGERS_PER_CLUB } from '@ggclubs/schemas';
import { type TFunction } from 'i18next';
import { activeLanguage } from '@/i18n';

/**
 * A falha que a API devolveu.
 *
 * **Mora aqui e não junto do cliente de fetch** porque o cliente importa o
 * Firebase pra montar o cabeçalho de autenticação · qualquer teste que só
 * quisesse a classe de erro subia o SDK inteiro e explodia sem chave válida.
 * Tipo não deveria arrastar dependência de runtime.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    /** Quem decide o texto é a tela, traduzindo este código no idioma ativo. */
    public code: ErrorCode,
    message: string,
    /**
     * Segundos até valer a pena tentar de novo · a API manda em erro que passa
     * sozinho, hoje só o 429. É o que permite dizer **quanto** falta em vez de
     * "aguarde um instante", que era mentira numa janela de uma hora.
     */
    public retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Transforma qualquer falha de chamada numa frase pra tela.
 *
 * **Existe porque a mesma linha estava copiada em 16 lugares:**
 * `err instanceof ApiError ? t(\`errors.${err.code}\`) : t('common.errorGeneric')`.
 * É o cheiro que o `CLAUDE.md` chama de "tratamento de erro copiado por
 * chamada" · e o preço apareceu na hora de melhorar a mensagem de limite: sem
 * um lugar só, a melhoria valeria apenas onde alguém lembrasse de colar de
 * novo, e as outras quinze telas seguiriam mentindo.
 */
export function apiErrorMessage(err: unknown, t: TFunction): string {
  if (!(err instanceof ApiError)) return t('common.errorGeneric');

  if (err.code === 'RATE_LIMITED' && err.retryAfterSeconds) {
    return t('errors.RATE_LIMITED_IN', { when: humanWait(err.retryAfterSeconds) });
  }

  /**
   * **O teto de gerentes precisa dizer o número**, e teto sem número faz a
   * pessoa tentar de novo achando que foi engano.
   *
   * O valor sai da constante do schema e é interpolado · escrever "2" no
   * catálogo criaria a segunda fonte que o `MAX_CLUBS_PER_PLAYER` já provou
   * capaz de divergir em silêncio, aqui em dois idiomas de uma vez.
   */
  if (err.code === 'MANAGER_CAP_REACHED') {
    return t('errors.MANAGER_CAP_REACHED', { max: MAX_MANAGERS_PER_CLUB });
  }

  /**
   * **Código que este bundle não conhece cai no genérico**, e essa rede vale
   * pra sempre · não é conserto de uma versão.
   *
   * Sem o `defaultValue`, o i18next devolve **a própria chave** quando ela não
   * existe: a tela escrevia `errors.PHONE_REQUIRED` na cara da pessoa. É a
   * mesma janela que o `notifications.kinds.unknown` já cobria do outro lado ·
   * a API sobe antes da web em todo deploy, e **o app instalado é a versão
   * congelada por definição**, então ali a janela não é de minutos, é de
   * semanas. Sete códigos entraram depois da última versão publicada do
   * desktop, e um deles (`PHONE_REQUIRED`) era beco sem saída: quem inscrevia
   * um club pelo app lia a chave crua e não tinha campo de telefone naquele
   * bundle pra resolver.
   *
   * Genérico é pior que a frase certa e é **muito** melhor que um identificador
   * em SCREAMING_SNAKE · esse não diz nada e ainda parece defeito.
   */
  return t(`errors.${err.code}`, { defaultValue: t('common.errorGeneric') });
}

/**
 * "em 12 minutos", "dentro de 1 hora" · a frase certa em cada idioma.
 *
 * Usa `Intl.RelativeTimeFormat` em vez de chave por plural no catálogo porque
 * ele já resolve plural e preposição nos dois idiomas · a alternativa seria
 * quatro chaves por unidade, escritas à mão, capazes de divergir.
 *
 * Arredonda **pra cima** de propósito: mandar tentar de novo um segundo antes
 * de a janela abrir devolve outro 429, e aí a mensagem vira mentira duas vezes.
 */
export function humanWait(seconds: number, language = activeLanguage): string {
  const fmt = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  if (seconds < 60) return fmt.format(Math.ceil(seconds), 'second');
  if (seconds < 3600) return fmt.format(Math.ceil(seconds / 60), 'minute');
  return fmt.format(Math.ceil(seconds / 3600), 'hour');
}
