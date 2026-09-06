import { z } from 'zod';
import { baseDocumentFields, clubTag, httpUrl, objectIdString } from './common.js';
import { clubStatus, platform } from './enums.js';

/**
 * Teto do nome, compartilhado com o `maxLength` do campo na tela.
 *
 * **Quinze, medido no próprio EA FC 26 pelo Eduardo em 30/07/2026** · ele abriu
 * a criação de club no modo Clubs e digitou até o campo parar. É fonte
 * primária, e substitui duas rodadas de pesquisa que não fechavam: o número
 * andou por 40 (sem origem) e por 20 (de uma página que, lida de verdade, não
 * traz número nenhum).
 *
 * O motivo do teto existir: nome que não cabe no jogo é nome que a pessoa vai
 * ter que mudar depois, num campo que ela escolheu acreditando estar
 * espelhando o club de verdade.
 *
 * **Como reconferir, e vale a cada título novo:** é no campo do jogo, não em
 * busca · a EA não documenta limite de campo em lugar nenhum.
 */
export const CLUB_NAME_MAX = 15;

/** Uma frase · o porquê do limite está no campo `bio`, logo abaixo. */
export const CLUB_BIO_MAX = 280;

// O club é o time. Elenco, tática e resultados moram nos schemas deles · aqui
// fica só a identidade pública, que é o que a página do club mostra.

export const clubSchema = z.object({
  ...baseDocumentFields,
  /** Endereço público (`/club/fcx`). Único e **imutável** · ver docs/dados.md. */
  tag: clubTag,
  name: z.string().trim().min(2).max(CLUB_NAME_MAX),
  /**
   * Uma frase. O limite é curto de propósito: a página do club se sustenta no
   * elenco e no escudo, e campo de texto longo em perfil vira mural sem
   * moderação.
   */
  bio: z.string().trim().max(CLUB_BIO_MAX).nullable().optional(),
  crestUrl: httpUrl.nullable().optional(),
  bannerUrl: httpUrl.nullable().optional(),
  /**
   * Plataforma de origem do club. O FC 26 tem crossplay, então isto não impede
   * ninguém de jogar · serve pra busca e pra recrutamento. Se um dia crossplay
   * virar filtro, entra como campo próprio, **não** como valor deste enum:
   * "crossplay" não é uma plataforma, é uma propriedade do club.
   */
  platform,
  ownerId: objectIdString,
  status: clubStatus,
  /**
   * Tamanho do elenco ativo, **gravado no próprio club**.
   *
   * É número denormalizado, e isso é escolha, não descuido: a vitrine ordena
   * por ele. Contar por `$lookup` na hora obriga a varrer todos os clubs ativos
   * e ordenar em memória a cada carregamento · funciona com dez clubs e cai com
   * dez mil. Com o número no documento, a vitrine vira um top-N servido por
   * índice, e o custo não cresce com a base.
   *
   * **O preço é manutenção: toda escrita em `memberships` que muda `status`
   * ajusta este contador na mesma transação.** Contador que alguém esquece de
   * incrementar é pior que consulta lenta, porque mente calado. O `pnpm migrate`
   * recalcula tudo, e é o conserto quando a suspeita aparecer.
   */
  memberCount: z.number().int().nonnegative(),
  /**
   * Palavras do nome e da tag, minúsculas e sem acento · é o que a busca
   * consulta. Interno: **não sai em resposta pública** (`clubPublicView` o
   * omite), porque é estrutura de índice, não informação do club.
   *
   * Existe pelo mesmo motivo do `memberCount`: a alternativa era varrer a
   * collection com regex a cada tecla digitada. Ver `apps/api/src/lib/search.ts`.
   */
  searchTokens: z.array(z.string()),
  /**
   * Pra quem o dono ofereceu a posse do club, e quando.
   *
   * **Campo no club, e não collection própria, porque a cardinalidade é um.**
   * Um club tem uma oferta aberta ou nenhuma · oferecer pra três pessoas e ver
   * quem pega primeiro seria leilão, não sucessão. Collection só se pagaria pra
   * guardar **histórico** de transferências, e isso o `memberships` já conta,
   * porque a passagem de cada um fica lá.
   *
   * A data existe pra expiração, conferida **na leitura**: oferta mais velha
   * que `OWNERSHIP_OFFER_TTL_DAYS` é tratada como inexistente. Não há agendador
   * neste produto, e criar um pra varrer um campo seria infra nova pra um caso
   * que a leitura resolve · o preço é um campo velho parado até alguém tocar no
   * club, e ele não atrapalha ninguém.
   *
   * Interno: **não sai em resposta pública.**
   */
  pendingOwnerId: objectIdString.nullable().optional(),
  pendingOwnerAt: z.date().nullable().optional(),
});

export type Club = z.infer<typeof clubSchema>;

/**
 * Quantos dias uma oferta de posse vale.
 *
 * Sete porque é a janela em que alguém volta ao produto sem precisar ser
 * lembrado · abaixo disso a oferta morre antes de a pessoa ver (não temos
 * notificação, ver pendência 19), e acima ela vira promessa esquecida que
 * reaparece meses depois num club que já mudou.
 */
export const OWNERSHIP_OFFER_TTL_DAYS = 7;

/**
 * O que sai numa resposta pública. Existe pra que a decisão de exposição more no
 * schema, como no `adminUserView`: a projeção do repositório é derivada daqui,
 * então campo novo só vaza depois de entrar nesta lista.
 *
 * `ownerId` fica de fora porque é id interno · quando a página precisar mostrar
 * o dono, ela mostra o `@handle` dele, que é o endereço público.
 */
export const clubPublicView = clubSchema.omit({
  ownerId: true,
  status: true,
  searchTokens: true,
  pendingOwnerId: true,
  pendingOwnerAt: true,
});

export type ClubPublicView = z.infer<typeof clubPublicView>;
