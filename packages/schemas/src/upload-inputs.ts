import { z } from 'zod';
import { httpUrl } from './common.js';

/**
 * Teto do arquivo que a pessoa **escolhe**, em bytes.
 *
 * **A referência inclui fotos e capturas 4K sem tratamento**: um
 * teto abaixo disso faria o caso mais comum (escolher a foto da galeria) falhar,
 * e o `docs/design.md` já registra que teto que a pessoa não sabe defender é
 * teto que ninguém respeita.
 *
 * Ele vale **no navegador**, antes de decodificar · é o que evita tentar abrir
 * um arquivo de 50 MB e derrubar a aba. O que o servidor assina é outro número,
 * bem menor · ver `NORMALIZED_MAX_BYTES`.
 */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/**
 * Teto do arquivo **já normalizado**, que é o único que o servidor assina.
 *
 * **É aqui que a normalização deixa de ser confiança e vira contrato.** O
 * navegador reduz a imagem antes de subir, mas cliente adulterado não obedece
 * navegador nenhum · o que impede o bucket de receber o original é o servidor não
 * emitir assinatura acima deste número.
 *
 * **512 KB é folga deliberada, não estimativa apertada.** Um escudo de 512px em
 * WebP dá 30 a 80 KB, então na prática este teto nunca encosta em quem usa o
 * produto normalmente. Ele existe pro caso contrário: quem pular a normalização
 * não consegue assinatura. A folga cobre o fallback pra PNG, que é bem maior e
 * é o que sobra em navegador sem codificação WebP.
 */
export const NORMALIZED_MAX_BYTES = 512 * 1024;

/**
 * O que cada finalidade produz depois de normalizada.
 *
 * **Mora aqui, e não no front, porque os dois lados precisam do mesmo número.**
 * O navegador desenha por ele e o servidor decide o teto por ele · duas tabelas
 * capazes de divergir é o que produz imagem cortada de um jeito na tela e de
 * outro no banco.
 *
 * O escudo é quadrado porque é assim que ele aparece em todo lugar · o
 * `ClubCrest` recorta com `object-cover` e aplica o chanfro, e essa forma é do
 * produto, não da imagem (decisão do Eduardo em 04/08/2026).
 */
export const IMAGE_TARGETS = {
  user_avatar: { width: 512, height: 512, fit: 'cover' },
  club_crest: { width: 512, height: 512, fit: 'cover' },
  club_banner: { width: 1600, height: 400, fit: 'cover' },
  /**
   * O print do placar · **paisagem e largo, porque é foto de tela de jogo.**
   *
   * Ele é o único alvo que **não** é peça de identidade: os outros três são
   * recortados pelo produto (o escudo é quadrado porque aparece quadrado em todo
   * lugar), e este é **prova** · cortar a tela do EA FC pra caber num quadrado é
   * cortar justamente o placar.
   *
   * **1024 e não 1280**, e o número saiu do teto de área que o teste cobra (o
   * mesmo do banner, 640k pixels): 720p passa dele, e o que se perde entre um e
   * outro é resolução que o placar não usa · o número na tela final do EA FC é
   * enorme. Quem precisar de mais um dia mexe no teto **com medida**, não pra
   * caber um alvo.
   */
  match_shot: { width: 1024, height: 576, fit: 'contain' },
} as const;

/**
 * **`cover` recorta pra preencher; `contain` só encolhe.**
 *
 * Os três primeiros alvos são **peças de identidade**, e a forma é do produto:
 * o escudo aparece quadrado em todo lugar, então recortar é o certo · a prévia
 * mostra o mesmo recorte que vai ficar gravado.
 *
 * **O print é prova, e prova não se recorta** · 19/08/2026. O docblock acima já
 * dizia isso desde 15/08 (*"cortar a tela do EA FC pra caber num quadrado é
 * cortar justamente o placar"*), e o código fazia o contrário: com o alvo em
 * 16:9 fixo, uma captura **em faixa** (a barra de placar recortada pelo próprio
 * jogador, que é o formato mais comum) tinha as laterais comidas · o Eduardo
 * mandou o antes e o depois, e o que sobrou no CDN foi o miolo, sem os nomes
 * dos dois clubs.
 *
 * Com `contain`, o alvo vira **teto** e a proporção é a da imagem que a pessoa
 * mandou · nada é cortado, e o número continua limitando o peso do arquivo.
 */
export type ImageFit = 'cover' | 'contain';

export type UploadPurpose = keyof typeof IMAGE_TARGETS;

// POST /me/uploads/presigned-url · o browser sobe direto pro S3, sem passar pela API.
export const presignedUploadRequest = z
  .object({
    /** Vira parte da key no S3, depois de `public/`. */
    purpose: z.enum(['user_avatar', 'club_crest', 'club_banner', 'match_shot']),
    /**
     * **Só o que a normalização produz.** JPEG saiu do enum em 04/08/2026: ele
     * não guarda transparência, e logo de club com fundo transparente virava
     * retângulo preto. Sobrou WebP, que é o alvo, e PNG, que é o fallback de
     * navegador sem codificação WebP (Safari abaixo de 16.4).
     */
    contentType: z.enum(['image/webp', 'image/png']),
    /** Sanitizado no servidor · só a extensão é aproveitada. */
    filename: z.string().min(1).max(200),
    /**
     * **O tamanho vem no pedido porque é ele que é assinado.**
     *
     * URL pré-assinada de `PUT` não limita nada por si só: até 04/08/2026 o
     * `CLAUDE.md` afirmava que o upload tinha "content-type e tamanho
     * limitados", e só a primeira metade era verdade · com um token válido dava
     * pra mandar arquivo de qualquer tamanho. Recebendo o tamanho aqui, ele
     * entra no `ContentLength` da assinatura, e o S3 recusa qualquer corpo que
     * não bata **exatamente**.
     *
     * Ou seja: o cliente não está sendo acreditado. Se ele mentir o número, o
     * upload falha na hora, que é o resultado certo.
     */
    size: z.number().int().positive().max(NORMALIZED_MAX_BYTES),
  })
  .strict();

export type PresignedUploadRequest = z.infer<typeof presignedUploadRequest>;

export const presignedUploadResponse = z
  .object({
    uploadUrl: httpUrl,
    publicUrl: httpUrl,
    expiresIn: z.number().int().positive(),
  })
  .strict();

export type PresignedUploadResponse = z.infer<typeof presignedUploadResponse>;
