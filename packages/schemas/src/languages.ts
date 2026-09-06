import { z } from 'zod';

/**
 * **Este módulo não importa nenhum outro do pacote, e isso é uma restrição.**
 *
 * Ele é o único do `@ggclubs/schemas` alcançável pelo **Node cru**, por um
 * subcaminho declarado no `exports` · o gerador do `robots.txt` e do
 * `sitemap.xml` (`apps/web/vite-site-files.ts`) roda dentro da config do Vite,
 * que o Node carrega, e o Node **não resolve** os `./algo.js` que o índice do
 * pacote usa pra apontar pra `.ts`.
 *
 * Quem acrescentar aqui um `import` de outro arquivo daqui deixa `lint`,
 * `typecheck`, `test` e `scan:cycles` verdes e **derruba o `pnpm build`** num
 * `ERR_MODULE_NOT_FOUND` que não cita este arquivo.
 */

/**
 * Os idiomas que o produto serve · **a única lista, e ela mora aqui.**
 *
 * Antes disso a mesma lista estava escrita em quatro lugares: o
 * `SUPPORTED_LANGUAGES` do front, o `SchemaLocale` do `zod-locale`, as chaves
 * do corpo dos documentos legais e o enum da rota que os serve. Quatro listas
 * livres pra divergir, e a divergência não quebraria nada na hora · ela
 * apareceria como um idioma que existe na URL e não tem texto legal, ou como um
 * documento publicado que a rota recusa.
 *
 * Fica em `packages/schemas` porque é o único lugar que **o front e a API
 * alcançam**. O front não pode ser a fonte: a API não importa dele.
 *
 * **Acrescentar idioma é mexer aqui e deixar o compilador e os testes
 * apontarem o resto** · o catálogo de tradução, o corpo legal e o basename de
 * URL têm par travado.
 */
export const SUPPORTED_LANGUAGES = ['pt-BR', 'es'] as const;

export const language = z.enum(SUPPORTED_LANGUAGES);

export type Language = z.infer<typeof language>;

/** pt-BR na raiz · os demais idiomas ganham prefixo de caminho. */
export const DEFAULT_LANGUAGE: Language = 'pt-BR';

/**
 * O prefixo de caminho de cada idioma · **e ele mora aqui pelo mesmo motivo que
 * a lista acima.**
 *
 * Era do front, com o argumento de que basename é decisão de roteamento e a API
 * não conhece. **Ela conhecia** · o e-mail transacional escrevia
 * `locale === 'es' ? '/es/...' : '/...'` em dois lugares, com um comentário
 * dizendo que aquilo era *"o mesmo que o `LANGUAGE_BASENAME` declara"*. Duas
 * cópias e uma nota pedindo pra não divergirem é exatamente o estado que esta
 * lista já teve quando morava em quatro arquivos.
 *
 * O terceiro consumidor é o que fechou a questão: o `sitemap.xml` é gerado no
 * **build**, fora do projeto TypeScript do app, e não alcança `apps/web/src`.
 */
export const LANGUAGE_BASENAME: Record<Language, string> = {
  'pt-BR': '/',
  es: '/es',
};

/**
 * Um caminho como ele existe naquele idioma · `/campeonatos` vira
 * `/es/campeonatos`, e a raiz vira `/es`.
 *
 * **Não use isto dentro do React** · lá o prefixo é `basename` do router, e todo
 * `<Link>` continua escrito sem ele. Isto é pra quem monta link **de fora**: o
 * e-mail, o sitemap, e qualquer coisa que não passe pelo router.
 *
 * > **No e-mail quem chama é o `siteUrl`**, e não esta função direto · ele
 * > carrega o `SITE` junto. Os quinze links de lá passaram a usá-lo em
 * > 02/09/2026 (a pendência 168) · até então treze montavam `${SITE}/...` cru e
 * > mandavam quem lê em espanhol pra versão em português.
 */
export function pathWithLanguage(path: string, lang: Language): string {
  const base = LANGUAGE_BASENAME[lang];
  if (base === '/') return path;
  return path === '/' ? base : base + path;
}
