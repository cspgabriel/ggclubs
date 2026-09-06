import type { LegalKind } from '@ggclubs/schemas';

/**
 * O nome de cada documento legal · **um mapa, e não um ternário.**
 *
 * Era `kind === 'terms' ? ... : ...` em **duas** telas (a pública e a do admin),
 * e o defeito disso não é estilo: com um terceiro tipo, o ternário dá um
 * **título errado** em vez de um erro. A política de reembolso teria nascido com
 * o nome da de privacidade nas duas, e nenhum dos cinco checks veria.
 *
 * Como `Record<LegalKind, string>`, tipo novo sem título **reprova no
 * typecheck** · e a chave é escrita inteira, porque o catálogo tipado só cobra
 * frase faltando quando ela é literal.
 *
 * O caminho de cada documento é o `LEGAL_PATH`, em `lib/paths.ts`, com o mesmo
 * `satisfies` · os dois mapas crescem juntos, e o tipo cobra os dois.
 */
export const LEGAL_TITLE_KEY = {
  terms: 'legal.termsTitle',
  privacy: 'legal.privacyTitle',
  refund: 'legal.refundTitle',
} as const satisfies Record<LegalKind, string>;
