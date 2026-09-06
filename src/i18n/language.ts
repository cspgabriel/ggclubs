// **A lista mora em `@ggclubs/schemas`**, não aqui · é o único lugar que o
// front, a API e o build alcançam, e antes disso a mesma lista estava escrita em
// quatro arquivos.
//
// **O basename desceu junto em 02/09/2026.** Ele ficava aqui com o argumento de
// que roteamento é assunto do front · e a API já escrevia `/es/...` à mão em
// dois lugares, com um comentário pedindo pra não divergir do que este arquivo
// declarava. O sitemap, que é gerado no build, seria a terceira cópia.
export {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_BASENAME,
  type Language,
} from '@ggclubs/schemas';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_BASENAME,
  type Language,
} from '@ggclubs/schemas';

export function detectLanguage(pathname: string, navigatorLanguage?: string): Language {
  // A URL manda: link compartilhado tem que abrir no idioma de quem mandou,
  // não no de quem clicou.
  for (const lang of SUPPORTED_LANGUAGES) {
    const prefix = LANGUAGE_BASENAME[lang];
    if (prefix !== '/' && (pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return lang;
    }
  }
  if (navigatorLanguage?.toLowerCase().startsWith('es')) return 'es';
  return DEFAULT_LANGUAGE;
}

/**
 * O que o i18next reporta, virando um `Language` de verdade.
 *
 * **Existe porque `i18n.language` é `string`** · ele pode voltar `pt`, `es-AR`
 * ou o que o navegador tiver, e quem manda esse valor **pra API** precisa de um
 * dos dois que o schema aceita, senão o Zod recusa a requisição inteira por
 * causa de um campo que é só uma dica.
 *
 * Sem cast: o `find` já devolve o membro da união, e o `??` cobre o resto.
 */
export function asLanguage(value: string | undefined): Language {
  return SUPPORTED_LANGUAGES.find((lang) => lang === value) ?? DEFAULT_LANGUAGE;
}

/**
 * Trocar de idioma é navegação de página inteira, não troca de estado: o
 * caminho muda, e é isso que faz o Google indexar as duas versões.
 */
export function pathInLanguage(pathname: string, from: Language, to: Language): string {
  const fromBase = LANGUAGE_BASENAME[from];
  const withoutPrefix = fromBase === '/' ? pathname : pathname.slice(fromBase.length);
  const rest = withoutPrefix.startsWith('/') ? withoutPrefix : `/${withoutPrefix}`;
  const toBase = LANGUAGE_BASENAME[to];
  return toBase === '/' ? rest : `${toBase}${rest === '/' ? '' : rest}`;
}
