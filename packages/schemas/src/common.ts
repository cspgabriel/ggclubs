import { z } from 'zod';

export const objectIdString = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId hex string');

export type ObjectIdString = z.infer<typeof objectIdString>;

/** Spread into every document schema. */
export const baseDocumentFields = {
  _id: objectIdString,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  schemaVersion: z.number().int().positive(),
};

/** Integer cents · 159900 is R$ 1.599,00. */
export const moneyCents = z.number().int().nonnegative();

/**
 * **O `.pipe()` não é enfeite: a ordem é o que valida.** O `.trim()` e o
 * `.toLowerCase()` precisam rodar ANTES do formato · `z.email().trim()` recusa
 * `"  A@B.COM  "` antes de chegar a aparar, e foi medido em 27/08/2026 junto
 * da troca de `.email()` (depreciado no zod 4) por `z.email()`.
 */
export const emailLower = z.string().trim().toLowerCase().pipe(z.email());

export const sha256Hex = z.string().regex(/^[a-f0-9]{64}$/);

/**
 * **URL persistida · `https` obrigatório, e o teto é do zod 4.**
 *
 * Medido em 27/08/2026: `z.string().url()` sozinho aceita `javascript:alert(1)`,
 * `data:text/html,…`, `vbscript:` e `mailto:` · o construtor `URL` analisa
 * qualquer esquema, e ele é o único juiz ali. **Vários destes campos são
 * preenchidos pelo cliente** (escudo, banner, print de súmula), então o que
 * entrava no banco era o que o navegador dele mandasse.
 *
 * O `protocol` é opção nova do `z.url()` no 4 · na forma antiga isto seria um
 * `refine` escrito à mão, e é por isso que nunca existiu.
 */
export const httpUrl = z.url({ protocol: /^https$/ });

/** Public handles (@user) and any addressable resource. */
/**
 * Tetos que também viram `maxLength` no campo da tela · o mesmo motivo do
 * `CLUB_TAG_MAX`: número em dois lugares é número que diverge.
 *
 * **Os dois vêm do Discord**, que é onde este público já tem nick e nome:
 * usuário de 2 a 32, nome de exibição até 32. Os valores anteriores (80 e 60)
 * não vinham de lugar nenhum · eram o que couber. Teto sem referência é teto
 * que ninguém sabe defender quando alguém pedir mais.
 */
export const HANDLE_MAX = 32;
export const DISPLAY_NAME_MAX = 32;

/**
 * Quantos bytes aleatórios formam o token de descadastro · vira uma string de
 * 32 caracteres em `base64url`.
 *
 * **A referência é a RFC 4086 (§6.2), que pede 128 bits pra segredo que não
 * expira**, e este não expira: ele vive no documento até alguém regenerar. 24
 * bytes são 192 bits, acima do piso, e cabem numa URL sem quebrar linha no
 * cabeçalho `List-Unsubscribe` · que é o outro lado do teto, porque cabeçalho
 * dobrado é cabeçalho que cliente de e-mail lê torto.
 */
export const UNSUBSCRIBE_TOKEN_BYTES = 24;

/**
 * `@handle`, tag de club e qualquer endereço público.
 *
 * **Normaliza antes de validar, em vez de recusar.** O regex já exigia
 * minúscula, e quem digitasse `Bruno` levava erro de formato · sendo que a
 * intenção era óbvia e a normalização é trivial. Recusar aqui empurra o
 * conserto pra cada tela, e foi assim que o campo de convite ganhou um
 * `toLowerCase` próprio enquanto o de cadastro dependia de outro caminho.
 *
 * **O regex fica como rede, não como porteiro:** depois do `trim` e do
 * `toLowerCase` ele só pega o que normalização nenhuma resolve · acento,
 * espaço no meio, símbolo. Esses continuam sendo erro, e devem ser.
 */
export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(HANDLE_MAX)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Lowercase letters, digits, hyphens only');

/**
 * Tag do club · mesmo formato do `@handle` e teto bem menor.
 *
 * **Minúscula, como o handle**, e não porque a tela vá mostrar assim: a tela
 * mostra em caixa alta, que é a regra da tipografia de display. Guardar
 * normalizado é o que impede `FCX` e `fcx` de existirem como dois clubs
 * diferentes e o link de um cair no outro.
 */
/**
 * Os limites saem daqui pra **o campo da tela também**, não só pro schema. Um
 * `maxLength` que não bate com o schema é pior que não ter: ou deixa digitar o
 * que vai ser recusado, ou corta antes do que seria aceito. Com o número num
 * lugar só, os dois andam juntos.
 */
export const CLUB_TAG_MIN = 2;

/**
 * **Dez, e este número é nosso · não espelha o jogo, e a distinção importa.**
 *
 * A abreviação do EA FC 26 são **3 caracteres**, do tipo que aparece no placar
 * (`FUR`, `PAL`), e lá ela é um campo à parte que a pessoa escolhe. A nossa tag
 * é outra coisa: é o **endereço público** (`/club/fcx`), único no produto
 * inteiro e imutável. Amarrá-la aos 3 do jogo seria copiar a forma e perder a
 * função · com 3 caracteres alfanuméricos as combinações boas acabam no
 * primeiro mês, e a tag ficaria ilegível como URL.
 *
 * Dez é o ponto em que ela ainda é curta o suficiente pra ditar em voz alta e
 * comprida o suficiente pra caber um nome abreviado de verdade (`reibaixada`,
 * `madrugada`). Era 12, que não vinha de lugar nenhum.
 *
 * **Onde os 3 do jogo entram:** no escudo, que já mostra as três primeiras
 * letras da tag · é ali que a leitura de placar acontece, sem custar um campo
 * novo pra pessoa preencher.
 */
export const CLUB_TAG_MAX = 10;

export const clubTag = z
  .string()
  .min(CLUB_TAG_MIN)
  .max(CLUB_TAG_MAX)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Lowercase letters, digits, hyphens only');

export const countryCode = z
  .string()
  .length(2)
  .regex(/^[A-Z]{2}$/, 'Country code must be 2 uppercase letters');
