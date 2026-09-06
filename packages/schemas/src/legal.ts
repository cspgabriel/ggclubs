import { z } from 'zod';
import { baseDocumentFields, objectIdString } from './common.js';

/**
 * Documentos legais · termos de uso e política de privacidade.
 *
 * ## Por que isto é versionado no banco e não um `.md` no repositório
 *
 * **Porque a pergunta que importa não é "o que os termos dizem", é "o que a
 * pessoa aceitou".** Texto legal muda, e quem aceitou a versão 2 não aceitou a
 * 4 · sem versão gravada não há como responder isso, e é justamente o que
 * alguém vai perguntar no dia em que a assinatura existir. Arquivo no repo tem
 * histórico no git, que ninguém consegue mostrar pro usuário.
 *
 * A consequência prática é que a **versão publicada é imutável**. Corrigir
 * vírgula é publicar a versão seguinte · reescrever a que está no ar apaga o
 * que as pessoas leram, que é o oposto do motivo de isto existir.
 *
 * ## Uma versão carrega os dois idiomas
 *
 * A versão 3 dos termos é a **mesma decisão** escrita em português e em
 * espanhol, não dois documentos com numeração própria. Versionar por idioma
 * deixaria os dois divergirem em silêncio, e aí "a versão 3" não significaria
 * nada · é a mesma razão de a tática guardar um `formationId` e não a grafia.
 */
/**
 * **`refund` entrou em 12/08/2026, com o bloco do pagamento**, e ele não é mais
 * um documento na lista: é **pré-requisito de cobrar**.
 *
 * A regra que ele cumpre é do Eduardo, de 10/08/2026 · *a política de reembolso
 * precisa estar escrita antes de alguém pagar*. Publicar edição paga sem ela é
 * prometer com o dinheiro na mão e resolver depois, que é exatamente o que o
 * rival faz na base do WhatsApp.
 *
 * **Ele é documento legal e não um campo de texto da edição**, e a diferença é a
 * que este arquivo inteiro descreve: versão imutável, os dois idiomas juntos e
 * histórico consultável. Quem pagou na terça precisa poder ler a política **da
 * terça**, e não a que foi editada na quinta.
 */
export const legalKind = z.enum(['terms', 'privacy', 'refund']);
export type LegalKind = z.infer<typeof legalKind>;

/**
 * O corpo em cada idioma · **todos obrigatórios.**
 *
 * Publicar só em português deixaria quem está em espanhol lendo um texto que
 * ele não entende, ou pior, nenhum · e como o produto se apresenta nos dois
 * idiomas, um documento legal pela metade é o tipo de falha que não dá pra
 * explicar depois. Se um dia isso pesar demais, a saída é não publicar até
 * traduzir, não afrouxar o schema.
 *
 * **As chaves são escritas à mão de propósito**, e não geradas do
 * `SUPPORTED_LANGUAGES`: gerar exigiria um `as` pra o tipo inferido continuar
 * exato, e cast em schema é o que este projeto não aceita. O par fica travado
 * por teste · idioma novo que entre na lista e não aqui quebra a suíte, em vez
 * de virar documento sem tradução.
 */
export const legalBody = z.object({
  'pt-BR': z.string().min(1),
  es: z.string().min(1),
});

export type LegalBody = z.infer<typeof legalBody>;

export const legalDocumentSchema = z.object({
  ...baseDocumentFields,
  kind: legalKind,
  /**
   * Sobe de um em um **dentro de cada tipo** · a versão 3 dos termos não tem
   * relação com a 3 da privacidade. Quem garante que não há duas é o índice
   * único `(kind, version)`, não uma contagem prévia.
   */
  version: z.number().int().positive(),
  body: legalBody,
  /**
   * Quando entrou no ar. **Nulo é rascunho** · escrever e publicar são coisas
   * diferentes, e sem essa separação toda correção de texto ficaria visível
   * enquanto está sendo escrita.
   */
  publishedAt: z.coerce.date().nullable(),
  /** Quem publicou · documento legal sem autor é documento que ninguém assume. */
  publishedBy: objectIdString.nullable(),
});

export type LegalDocument = z.infer<typeof legalDocumentSchema>;

/**
 * O documento como a página pública recebe · **um idioma só, já escolhido.**
 *
 * Mandar os dois corpos pra tela seria dobrar o peso da resposta pra mostrar
 * metade · e quem sabe o idioma ativo é o cliente, que o manda na consulta.
 */
export const legalDocumentView = z.object({
  kind: legalKind,
  version: z.number().int().positive(),
  body: z.string(),
  publishedAt: z.coerce.date(),
});

export type LegalDocumentView = z.infer<typeof legalDocumentView>;

/** Uma linha do histórico · sem corpo, porque a lista não mostra texto. */
export const legalVersionSummary = z.object({
  version: z.number().int().positive(),
  publishedAt: z.coerce.date(),
});

export type LegalVersionSummary = z.infer<typeof legalVersionSummary>;

export const publishLegalInput = z.object({
  kind: legalKind,
  body: legalBody,
});

export type PublishLegalInput = z.infer<typeof publishLegalInput>;
