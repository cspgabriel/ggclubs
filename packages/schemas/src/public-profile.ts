import { z } from 'zod';
import { clubTag, httpUrl, slug } from './common.js';
import { membershipRole, platform, playerPosition } from './enums.js';

/**
 * A página pública do player · `/public/profile/:handle`.
 *
 * **Ela é a ponta solta do elenco.** O link do club circula no Discord, o
 * visitante abre, vê o elenco e clica num nome · e até 07/08/2026 não ia a lugar
 * nenhum. A rota existia desde sempre e devolvia quatro campos, sem schema e sem
 * consumidor.
 *
 * A decisão de exposição mora aqui pelo mesmo motivo do `adminUserView`, do
 * `squadMember` e do `playerSearchResult`: a projeção do repositório é derivada
 * desta lista, então campo novo de `users` só chega na página aberta depois de
 * alguém escrevê-lo aqui. Antes disso o tipo era escrito à mão no `api.ts` do
 * front, que é o lugar onde ninguém procura a decisão.
 */

/**
 * Um club onde o player joga, como a página aberta dele mostra.
 *
 * **Não é o `clubPublicView` enxugado**, e a diferença é a razão de existir: ali
 * a pergunta é "que time é esse", aqui é "onde essa pessoa joga". O que entra é
 * o que identifica o club numa linha (escudo, nome, tag) mais o que o **vínculo**
 * diz · papel, braçadeira e se é o principal.
 *
 * **Sem id interno**, como o elenco: o club é endereçado pela tag, que é o
 * endereço público dele, e a linha vira link pra `/club/:tag`. É o que devolve o
 * visitante ao funil em vez de a página do player ser um beco novo.
 */
export const playerClub = z.object({
  tag: clubTag,
  name: z.string(),
  crestUrl: httpUrl.nullable(),
  platform,
  /**
   * O papel **naquele club**. Sai porque é o que diferencia uma linha da outra:
   * a mesma pessoa é dona de um e reserva noutro, e uma lista de três escudos
   * iguais não diz nada sobre ela.
   */
  role: membershipRole,
  /** A braçadeira aparece junto do papel, nunca no lugar dele · o capitão pode ser gerente. */
  isCaptain: z.boolean(),
  /**
   * O club principal · o mesmo `isPrimary` do vínculo, e ele **ordena a lista**
   * antes de decorar qualquer coisa.
   *
   * Sai porque responde "qual time representa essa pessoa", que é a pergunta da
   * página. E é escolha dela, não dado inferido.
   */
  isPrimary: z.boolean(),
});

export type PlayerClub = z.infer<typeof playerClub>;

/**
 * O perfil aberto de um player.
 *
 * **O que fica de fora, e cada um por um motivo:**
 *
 * - `email`, `firebaseUid`, `status`, `role`, `serviceAccount` da conta e `searchTokens` ·
 *   a regra de nunca devolver documento cru do Mongo. `searchTokens` é estrutura
 *   de índice, não informação do player.
 * - **`phone`** · e este é o mais sensível da lista. Ele existe pra a organização
 *   falar com a pessoa e combinar pagamento de premiação · **não há chave que o
 *   torne público**, ao contrário de tudo o mais no perfil. Ele sai em exatamente
 *   dois lugares: pra **a própria pessoa** (`GET /me`) e pro **`/admin`**.
 * - `discoverable` · é a **preferência** de quem está sendo olhado, e quem a lê é
 *   a busca. Publicá-la contaria ao visitante uma decisão de privacidade que não
 *   é da conta dele.
 * - `hasRoom` (o teto de 3) · existe no `playerSearchResult` porque lá quem lê
 *   está prestes a convidar e o convite seria jogado fora. Numa página aberta é
 *   só "esta pessoa está em 3 clubs" pra qualquer um, sem nada que aquilo evite.
 * - clubs onde a pessoa **já esteve** · o vínculo vira histórico em vez de sumir,
 *   então o dado existe. Fica fora por decisão do Eduardo em 07/08/2026: expor de
 *   onde alguém saiu tem leitura social num produto de Pro Clubs, e ninguém pediu.
 *
 * **`discoverable: false` não esconde esta página**, e a copy da chave precisa
 * dizer isso: ele tira o player da **enumeração** (a busca por prefixo), não do
 * **endereço**. Quem tem o @nick inteiro continua chegando aqui, e o elenco do
 * club continua listando. Ver pendência 34.
 */
export const publicProfileView = z.object({
  handle: slug,
  displayName: z.string(),
  avatarUrl: httpUrl.nullable(),
  platform: platform.nullable(),
  /**
   * A posição de **identidade**, a do perfil · não a do vínculo.
   *
   * As duas existem e podem discordar de propósito (o cara é zagueiro e naquele
   * club joga de lateral). Aqui é a dele, e a de cada club aparece no elenco.
   */
  position: playerPosition.nullable(),
  /**
   * A frase do player · sai porque é a única coisa da página que ele escreve
   * com as próprias palavras. Sem ela o perfil é uma ficha preenchida por
   * seletores, e ficha não é perfil.
   */
  bio: z.string().nullable(),
  /**
   * **Está procurando club**, e este é o campo que dá função à página.
   *
   * Sem ele o visitante lê "quem é" e vai embora; com ele, quem gerencia um club
   * sabe que pode chamar · e é o que faz o perfil valer o link no Discord tanto
   * quanto a página do time.
   */
  lookingForClub: z.boolean(),
  /**
   * Quando a conta nasceu **aqui**, e não no EA FC · a mesma distinção que o
   * club faz, e pela mesma razão: não lemos nada da EA, e insinuar que sim seria
   * prometer integração que não existe.
   *
   * Sai porque é a única prova de tempo de casa que o produto tem hoje · num
   * lugar onde qualquer um cria conta em trinta segundos, "está aqui desde
   * março" é informação de verdade sobre com quem se está falando.
   */
  createdAt: z.coerce.date(),
  /** Vínculos **ativos** em clubs **ativos**, principal primeiro. Vazia é estado normal. */
  clubs: z.array(playerClub),
});

export type PublicProfileView = z.infer<typeof publicProfileView>;
