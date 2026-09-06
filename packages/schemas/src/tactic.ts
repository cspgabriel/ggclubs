import { z } from 'zod';
import { baseDocumentFields, objectIdString } from './common.js';
import { formationId, SLOTS_PER_FORMATION } from './formations.js';

/**
 * A escalação do club · formação e quem joga em cada slot.
 *
 * ## Isto é o plano, não o espelho do lobby do jogo
 *
 * **No EA FC 26 quem escolhe o slot é o próprio player, no lobby, entre as
 * posições vagas.** O nosso modelo é o contrário: quem gerencia atribui. Não é
 * desconhecimento do jogo, é a diferença de propósito · o lobby é a **execução**,
 * e o que falta ao Pro Clubs hoje é o **plano**: a escalação combinada antes, que
 * vive em print de WhatsApp e em mensagem fixada de Discord.
 *
 * Está escrito aqui porque quem ler depois vai conhecer o lobby e pode achar que
 * a atribuição é bug nosso. Não é.
 *
 * ## Uma por club, e o caminho de virar várias
 *
 * O índice único em `clubId` é o que garante a unicidade · **não há campo
 * `isDefault` nem `name`**, de propósito: campo que nenhuma tela mostra é peso
 * morto, e este projeto já removeu uma copy criada "pra depois" que nunca foi
 * usada.
 *
 * O jogo permite várias (o FC 25 documentou até cinco por club), então a nossa
 * única é escopo nosso, não espelho. Quando virar várias, são três passos e
 * nenhum deles mexe em collection: trocar `tactic_club_unique` por um parcial
 * único em `(clubId)` com `isDefault: true`, acrescentar `name` e `isDefault`, e
 * preencher os dois no `pnpm migrate` · exatamente o que ele já fez pro
 * `isCaptain` e pra mudança de forma do `club_status_idx`.
 *
 * É por isso que ela nasce como **collection própria e não subdocumento de
 * `clubs`**: ali a mesma evolução seria mover dado de uma collection pra outra.
 */

/**
 * Um slot ocupado · o índice na formação e quem está nele.
 *
 * **Guarda o índice, não a posição.** A posição do slot sai da tabela de
 * formações a partir do índice · gravá-la junto criaria dois lugares capazes de
 * discordar no dia em que a EA mexer num esquema, que é a mesma regra do pool de
 * crossplay.
 */
export const tacticSlot = z.object({
  index: z.number().int().min(0).max(SLOTS_PER_FORMATION - 1),
  userId: objectIdString,
});

export type TacticSlot = z.infer<typeof tacticSlot>;

/**
 * A lista de slots ocupados, conferida como conjunto.
 *
 * **Só entra quem está escalado.** Slot vazio não vira entrada com `userId`
 * nulo: um club de cinco pessoas tem seis buracos, e representá-los como
 * ausência é o que faz "quantos faltam" ser o tamanho da diferença em vez de uma
 * contagem condicional.
 *
 * As duas regras que o schema **consegue** garantir sozinho ficam aqui; a
 * terceira (o player estar no elenco) mora no repositório, porque depende de
 * outra collection.
 */
const lineup = z
  .array(tacticSlot)
  .max(SLOTS_PER_FORMATION)
  .refine((slots) => new Set(slots.map((s) => s.index)).size === slots.length, {
    message: 'Dois players no mesmo slot',
  })
  .refine((slots) => new Set(slots.map((s) => s.userId)).size === slots.length, {
    // Uma pessoa não joga em dois lugares · e sem isto o mesmo player poderia
    // preencher o time inteiro, o que a tela mostraria como escalação completa.
    message: 'O mesmo player em dois slots',
  });

export const tacticSchema = z.object({
  ...baseDocumentFields,
  clubId: objectIdString,
  formation: formationId,
  slots: lineup,
  /**
   * Quem gravou por último · o elenco quer saber de quem foi a mudança, e sem
   * isto a única resposta possível é "alguém que gerencia".
   */
  updatedBy: objectIdString,
});

export type Tactic = z.infer<typeof tacticSchema>;

/**
 * O que a tela manda ao salvar.
 *
 * **A formação vem junto da escalação, numa gravação só.** Separar em duas
 * rotas ("trocar formação" e "mover player") deixaria um instante em que os
 * slots apontam pra índices da formação anterior · num 4-4-2 o índice 9 é
 * atacante e num 3-5-2 é o segundo volante, então a escalação salva mudaria de
 * significado sem ninguém ter mexido nela.
 */
export const saveTacticInput = z.object({
  formation: formationId,
  slots: lineup,
});

export type SaveTacticInput = z.infer<typeof saveTacticInput>;

/**
 * O slot como a tela recebe · **o `@handle`, não o `userId`.**
 *
 * A assimetria com o `tacticSlot` é a decisão, e cada lado está certo pro que
 * faz. **Escrever é ação**, e ação precisa de identificador estável: o handle é
 * trocável, e entre a tela carregar e o clique a pessoa pode ter mudado de nick
 * · é a mesma razão pela qual a fila de pedidos expõe id. **Ler é desenho**, e
 * aqui o handle é o que faz o desenho existir pra todo mundo.
 *
 * Por que não devolver o `userId`: só quem gerencia recebe o elenco com id · a
 * view pública não expõe. Com `userId` no slot, **membro comum receberia a
 * escalação e não teria como saber quem é cada um**, o que contradiz a decisão
 * de o elenco inteiro poder ler. O handle vem da junção no servidor, então é
 * sempre o de agora, mesmo que a pessoa tenha trocado depois de ser escalada.
 */
export const tacticSlotView = z.object({
  index: z.number().int(),
  handle: z.string(),
});

export type TacticSlotView = z.infer<typeof tacticSlotView>;

/**
 * A tática como a tela recebe · **sem nome, avatar nem posição, de propósito.**
 *
 * Este é o contrário do `squadMember`, e a diferença vale explicar. Lá a junção
 * no banco traz o player inteiro porque `userId` sozinho não desenha linha de
 * elenco nenhuma. Aqui **quem mostra a tática já mostrou o elenco** · a página
 * do club carrega os dois. O servidor resolve só o que a tela não tem como
 * resolver (o id vira handle) e o resto vem do elenco que já está em mãos, que
 * é a mesma regra que tirou o `GET /me/clubs` da página do club.
 *
 * **E a junção no cliente conserta um caso sozinha:** quem foi escalado e depois
 * saiu do club não aparece no elenco, então o slot dele desenha vazio, sem
 * ninguém precisar limpar a tática na hora em que a pessoa sai.
 */
export const tacticView = z.object({
  formation: formationId,
  slots: z.array(tacticSlotView),
  updatedAt: z.coerce.date(),
});

export type TacticView = z.infer<typeof tacticView>;
