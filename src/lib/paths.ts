import type { LegalKind } from '@ggclubs/schemas';

/**
 * Os endereços que existem em **duas versões**, dentro e fora do app.
 *
 * O club já tinha esse par desde 03/08 (`clubUrl` pro público, `/app/clubs/:tag`
 * escrito na tela), e o player nasce com ele em 08/08. Moram juntos aqui porque
 * a divergência entre os dois lados é invisível: mandar pro lugar errado não
 * quebra nada, não aparece em captura, e só se descobre quando alguém reclama de
 * ter caído noutra tela. É o mesmo argumento do `publicTwinOf`, que é a volta
 * deste caminho e **lê estas funções pra não escrever a rota uma terceira vez**.
 *
 * **Minúscula na saída**, como o `clubUrl` já fazia: as rotas aceitam qualquer
 * caixa, então isto não é sobre funcionar · é sobre existir um endereço só.
 * Link em duas grafias vira duas URLs pra mesma página, e buscador trata como
 * conteúdo duplicado.
 *
 * O prefixo de idioma **não entra aqui** · ele é `basename` do router, então
 * tudo continua escrito como `/player/...` e o `/es` é problema do router.
 */

export function publicPlayerPath(handle: string): string {
  return `/player/${handle.toLowerCase()}`;
}

export function appPlayerPath(handle: string): string {
  return `/app/players/${handle.toLowerCase()}`;
}

export function appClubPath(tag: string): string {
  return `/app/clubs/${tag.toLowerCase()}`;
}

/**
 * O campeonato · **e ele tem gêmea, como o club e o player.**
 *
 * > **Eu tinha decidido que não teria**, com o argumento de que uma página só
 * > evitaria a segunda cópia pra divergir. **O Eduardo derrubou em 12/08/2026 e
 * > está certo:** o que evita a cópia é o `TournamentView` ser um componente só
 * > · a moldura é outra coisa. Mandar quem está logado pra fora do app pra ver
 * > uma edição do próprio app é troca de contexto sem motivo, e é exatamente o
 * > que a página do club já resolvia desde 03/08.
 *
 * **E as duas conversam diferente de propósito** · a aberta vende o produto pra
 * quem não tem conta, a de dentro vende **esta edição** pra quem tem club. Estar
 * logado não é estar convertido.
 */
export function tournamentPath(slug: string): string {
  return `/campeonato/${slug.toLowerCase()}`;
}

export function appTournamentPath(slug: string): string {
  return `/app/campeonatos/${slug.toLowerCase()}`;
}

/** A mesma edição pelo lado de quem organiza · é lá que a mesa de conversas mora. */
export function adminTournamentPath(slug: string): string {
  return `/admin/campeonatos/${slug.toLowerCase()}`;
}

/**
 * As novidades do produto · **o mesmo caminho nos dois idiomas**, como
 * `/download`: é o endereço que as duas faixas de versão nova apontam, e que
 * alguém repete de cabeça no Discord.
 *
 * Mora aqui, e não em `lib/changelog.ts`, porque as faixas vivem no bundle de
 * entrada e o `changelog.ts` carrega os dois markdowns · importar o caminho de
 * lá poria o texto inteiro no primeiro carregamento de todo mundo.
 */
export const CHANGELOG_PATH = '/novidades';

/**
 * Os documentos legais · **um caminho por tipo, cobrado pelo tipo.**
 *
 * O `satisfies` é o mesmo do `LEGAL_TITLE_KEY`, e pelo mesmo motivo: com um
 * quarto tipo, uma lista escrita à mão continua compilando e o documento novo
 * simplesmente **não aparece** na navegação. Foi assim que o `/reembolso`
 * viveu fora da lista de rotas sem sessão desde que nasceu, com os dois
 * caminhos irmãos listados lá · o rodapé, a navegação da página e essa lista
 * escreviam o mesmo trio cada um por si.
 *
 * O router continua declarando as rotas uma a uma (o `element` de cada uma é
 * diferente), e o `paths.test.ts` confere que cada caminho daqui está lá.
 */
export const LEGAL_PATH = {
  terms: '/termos',
  privacy: '/privacidade',
  refund: '/reembolso',
} as const satisfies Record<LegalKind, string>;
