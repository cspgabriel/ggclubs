import { z } from 'zod';
import { clubTag, HANDLE_MAX, httpUrl, objectIdString, slug } from './common.js';
import { crossplayPool } from './crossplay.js';
import { platform, playerPosition } from './enums.js';

/**
 * Busca de player por @nick · a peça que o convite usa hoje e que o mercado de
 * free agents (fatia 3 do `produto.md`) reaproveita.
 *
 * **A busca estreita nasce com a forma da larga**, de propósito: a fatia 3
 * precisa da mesma coisa com filtro de posição, plataforma e horário, e
 * construir as duas separadas garante que uma diverge · é o mesmo erro dos
 * cinco headers escritos à mão. O que ficou de fora foram os filtros, não a
 * forma.
 */

/**
 * A partir de quantos caracteres a busca sai.
 *
 * Dois é o mínimo do próprio `slug`, então abaixo disso não existe nick pra
 * achar · e um caractere devolveria uma fatia grande da base a cada tecla, que
 * é enumeração com outro nome.
 */
export const PLAYER_SEARCH_MIN = 2;

/**
 * Teto de resultados.
 *
 * Oito é o que cabe numa lista sem virar rolagem dentro de um campo, e é pouco
 * o bastante pra que raspar a base exija muitas requisições em vez de poucas.
 * Quem procura sabe o nick e está conferindo a grafia, não navegando um
 * diretório · o diretório é a fatia 3, e lá a paginação nasce junto.
 */
export const PLAYER_SEARCH_LIMIT = 8;

/**
 * O que a pessoa digitou, e é **prefixo, não nick**.
 *
 * Por isso ele não usa o `slug`: o `slug` exige terminar em alfanumérico, e
 * quem está digitando `rei-baixada` passa por `rei-` no caminho · validar com
 * `slug` devolveria erro no meio da digitação, num campo que existe justamente
 * pra ser digitado aos poucos.
 *
 * **O charset restrito é o que torna a interpolação no regex segura** · sobram
 * só `[a-z0-9-]`, e nenhum deles é metacaractere no começo de um padrão
 * ancorado. Afrouxar esta linha é reabrir injeção de regex na consulta.
 */
export const playerSearchPrefix = z
  .string()
  .trim()
  .toLowerCase()
  .min(PLAYER_SEARCH_MIN)
  .max(HANDLE_MAX)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'Lowercase letters, digits, hyphens only');

export const playerSearchQuery = z.object({
  q: playerSearchPrefix,
  /**
   * De qual club é o convite. Opcional porque a fatia 3 vai procurar sem club
   * nenhum · quando vem, é ele que preenche o `relationToClub`.
   */
  clubId: objectIdString.optional(),
});

export type PlayerSearchQuery = z.infer<typeof playerSearchQuery>;


/**
 * O que o player já é em relação àquele club.
 *
 * Existe pra impedir convite jogado fora, e a tela **mostra o resultado
 * desabilitado com o motivo** em vez de escondê-lo: sumir da lista faz quem
 * procura concluir que a pessoa não existe e digitar de novo, que é o oposto
 * do que a busca resolve.
 */
export const playerRelationToClub = z.enum(['member', 'invited', 'pending', 'none']);

export type PlayerRelationToClub = z.infer<typeof playerRelationToClub>;

/**
 * Um resultado.
 *
 * **Só o que já está na página pública do player**, e nada além · e-mail,
 * `firebaseUid`, plano e status nunca saem daqui. A projeção do repositório é
 * derivada deste schema pelo mesmo motivo do `adminUserView`: campo novo
 * sensível em `users` só vaza depois de alguém escrevê-lo nesta lista.
 */
export const playerSearchResult = z.object({
  handle: slug,
  displayName: z.string(),
  avatarUrl: httpUrl.nullable(),
  platform: platform.nullable(),
  position: playerPosition.nullable(),
  /**
   * Se o player ainda tem vaga no teto de 3.
   *
   * **Ele revela "esta pessoa está em 3 clubs"**, e isso é decisão explícita,
   * não descuido: convidar quem está cheio é frustração dos dois lados, e o
   * dado é pouco sensível perto do convite desperdiçado que ele evita.
   */
  hasRoom: z.boolean(),
  relationToClub: playerRelationToClub,
});

export type PlayerSearchResult = z.infer<typeof playerSearchResult>;

/**
 * A **vitrine de players** · `GET /me/players`, a aba que lista gente.
 *
 * **É a busca estreita com os filtros que ela já previa**, e não uma segunda
 * consulta: o comentário no topo deste arquivo diz que a forma larga nasceu
 * junto de propósito · "o que ficou de fora foram os filtros, não a forma".
 * Estes são eles.
 *
 * A diferença que importa: aqui o **termo é opcional**. Sem ele a tela é uma
 * vitrine (quem procura club primeiro), com ele é a mesma busca de sempre ·
 * duas telas seriam duas listas capazes de discordar sobre quem aparece.
 */
export const playerDirectoryQuery = z.object({
  q: playerSearchPrefix.optional(),
  position: playerPosition.optional(),
  /**
   * **Geração, e não plataforma** · decisão do Eduardo em 08/08/2026, e ela é
   * de produto: no Clubs do EA FC só joga junto quem está na mesma geração, e
   * plataforma específica é detalhe dentro disso. Filtrar por `ps5` esconderia o
   * Xbox Series da mesma geração, que é justamente quem **pode** entrar no seu
   * club · o filtro estaria trabalhando contra a pergunta que a tela responde.
   *
   * O servidor expande a geração nas plataformas dela (`platformsInPool`), então
   * a query continua servida pelo mesmo índice.
   */
  pool: crossplayPool.optional(),
  /** Só quem declarou que procura club · o filtro que dá função à vitrine. */
  lookingForClub: z.coerce.boolean().optional(),
  /**
   * Só quem joga num club de quem está pedindo · o par do selo verde que o card
   * já mostrava. Pedido do Eduardo em 10/08/2026.
   *
   * **Ele não recebe os clubs pelo corpo, e isso é a regra de identidade**: o
   * servidor resolve os vínculos de quem pediu a partir do token. Aceitar uma
   * lista de clubs aqui seria deixar qualquer conta enumerar o elenco de
   * qualquer club por uma rota que não confere vínculo nenhum.
   */
  sharedClub: z.coerce.boolean().optional(),
  /** Quantos trazer · o teto existe pra a tela não poder pedir a base inteira. */
  limit: z.coerce.number().int().min(1).max(48).optional(),
  /**
   * Onde a página anterior parou · **cursor, como a vitrine de clubs**, e não
   * `skip`. O formato é opaco pro cliente de propósito: ele vem da resposta
   * anterior e volta sem ser interpretado.
   */
  cursor: z.string().max(200).optional(),
});

export type PlayerDirectoryQuery = z.infer<typeof playerDirectoryQuery>;

/**
 * Uma linha da vitrine.
 *
 * **Herda o resultado da busca** em vez de repeti-lo · a lista e o campo de
 * convite mostram a mesma pessoa, e duas formas seriam duas decisões de
 * exposição capazes de divergir. O que ela acrescenta é o que só a vitrine
 * mostra: se a pessoa está aberta a convite, a frase dela, e em quantos clubs
 * ela está.
 */
export const playerCard = playerSearchResult.extend({
  lookingForClub: z.boolean(),
  bio: z.string().nullable(),
  clubCount: z.number().int().nonnegative(),
  /**
   * Esta pessoa **pode jogar com quem está olhando**?
   *
   * **É a comparação já feita, e não o dado cru pra tela comparar.** Mostrar a
   * geração de cada um obriga o visitante a saber qual é a dele e cruzar as duas
   * em cada card · a pergunta que ele tem é "dá pra chamar essa pessoa". O
   * servidor já calcula isto pra **ordenar** a vitrine, então devolver custa
   * zero, e não devolver seria a tela reimplementando o `crossplay.ts`.
   *
   * **São três valores e não um booleano**, e a diferença é o que impede a tela
   * de mentir: `unknown` é quem não preencheu plataforma · de um lado ou do
   * outro. Com booleano, "não sei" e "não dá" viravam o mesmo `false`, e a tela
   * acusaria de outra geração quem só não respondeu.
   *
   * **Quem desenha isso marca o `other`, não o `same`** · a geração atual é a
   * maioria da base, então um selo em quem combina aparece em quase todo card e
   * deixa de informar. Ver o `PlayerRow` e a decisão de 08/08/2026.
   */
  generationMatch: z.enum(['same', 'other', 'unknown']),
  /**
   * Os clubs que **você e essa pessoa dividem**, hoje.
   *
   * **É lista e não booleano**, e a ressalva é do Eduardo: dá pra jogar em mais
   * de um club junto ao mesmo tempo. Vazia é o caso normal · a vitrine é de
   * estranhos.
   *
   * **Só tag e nome** · a tag já é o endereço público do club, e id interno não
   * sai em resposta de lista. Mesma regra da escalação e do elenco.
   */
  sharedClubs: z.array(z.object({ tag: clubTag, name: z.string() })),
});

export type PlayerCard = z.infer<typeof playerCard>;

/**
 * O que a página de um player oferece a **quem está olhando**: os clubs dele
 * que podem chamar aquela pessoa.
 *
 * **Existe porque a página afirmava que alguém procurava club e não dava verbo
 * nenhum** · quem quisesse chamar tinha que decorar o @nick, sair dali e achar
 * o campo de convite dentro do próprio club. É a pendência 60.
 *
 * **A relação vem por club, e não uma vez só**, porque a resposta muda por club:
 * a mesma pessoa pode ser do elenco de um, ter convite esperando noutro e ser
 * estranha no terceiro.
 */
export const inviteTargets = z.object({
  /**
   * O player está no teto de clubs?
   *
   * **É global e não por club** · o limite do produto é de quantos clubs uma
   * pessoa tem, não de quantos players um club leva. Sem isto o botão acenderia
   * pra quem o backend vai recusar, que é a regra do "esconder é UX, não
   * segurança" ao contrário.
   */
  targetHasRoom: z.boolean(),
  /**
   * O id do player, pra **desistir** de um convite já mandado.
   *
   * **Sai só pra quem gerencia**, e é o mesmo contexto do `listManageableSquad`,
   * que já devolve id de membro pra quem gerencia o club · a regra de não expor
   * id interno é sobre **dado aberto**, e esta rota exige gerenciar pelo menos
   * um club. Quem não gerencia nenhum recebe a lista vazia e nunca vê este
   * campo servir pra nada.
   */
  targetId: objectIdString,
  clubs: z.array(
    z.object({
      /**
       * **O id vem, e aqui isso está certo** · o club é de quem chamou a rota, e
       * o `/me/clubs` já o devolve. A regra de não expor id interno é sobre
       * **dado aberto** · esconder o id do próprio club obrigaria o convite a
       * ser por tag, e a rota de convite é por id desde que existe.
       */
      id: objectIdString,
      tag: clubTag,
      name: z.string(),
      crestUrl: httpUrl.nullable(),
      relation: playerRelationToClub,
    }),
  ),
});

export type InviteTargets = z.infer<typeof inviteTargets>;
