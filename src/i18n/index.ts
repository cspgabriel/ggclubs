import { setSchemaLocale } from '@ggclubs/schemas';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { detectLanguage, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './language.js';

const language = detectLanguage(
  typeof window === 'undefined' ? '/' : window.location.pathname,
  typeof navigator === 'undefined' ? undefined : navigator.language,
);

/**
 * **Só o catálogo do idioma ativo viaja**, e essa é a mudança de 25/08/2026.
 *
 * Enquanto os dois eram `import` estático, **quem abria em português baixava o
 * espanhol inteiro** · e isso valia pra todo visitante, não só pra quem fosse
 * trocar de idioma. Medido no `dist`: a entrada caiu de **496,5 KB pra
 * 435,9 KB**, sessenta KB que ninguém usava.
 *
 * **Carregar sob demanda é seguro aqui porque a troca de idioma é navegação de
 * página inteira** · o seletor é um `<a href>` com o prefixo do destino (ver
 * `components/language-switcher.tsx`), então o outro catálogo nunca precisa
 * existir na mesma sessão: a página recarrega e este boot roda de novo.
 *
 * > **Isto é o alvo maior, e não era o que a pendência 127 apontava.** Ela
 * > nasceu mirando o catálogo do **admin** (~32 KB), e medir os dois cortes
 * > mostrou que o idioma não usado custava quase o dobro. O admin continua
 * > viajando dentro do catálogo do idioma ativo, e é o próximo corte.
 *
 * **O `await` mora aqui dentro e nunca no topo do módulo** · top-level await
 * passa por lint, typecheck e teste e quebra só no `pnpm build`, que é o único
 * que compila com o alvo de produção. Está no `CLAUDE.md`.
 */
export async function initI18n(): Promise<void> {
  const translation =
    language === 'es'
      ? (await import('./locales/es.js')).es
      : (await import('./locales/pt-BR.js')).ptBR;

  await i18next.use(initReactI18next).init({
    // Namespace único com chave aninhada (`auth.signInCta`). Namespace separado
    // exigiria `auth:signInCta` em toda chamada · se um dia precisar carregar
    // catálogo sob demanda, dá pra fatiar sem mexer nas telas.
    //
    // **Um idioma só no `resources`**, e o `fallbackLng` abaixo não tem recurso
    // pra cair quando o ativo é o espanhol · isso não é buraco porque a
    // **paridade de chaves é garantida em compilação**: o `Translation` de
    // `types.ts` deriva de `typeof ptBR`, então catálogo com chave faltando não
    // builda.
    resources: { [language]: { translation } },
    lng: language,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: { escapeValue: false },
  });

  // Sem isto o formulário em espanhol reclama em português · a mensagem de
  // validação vem do Zod, não do catálogo.
  setSchemaLocale(language);

  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
  }
}

/**
 * **Continua síncrono de propósito** · dez módulos leem isto pra decidir formato
 * de data, host da API e idioma do Firebase, e nenhum deles deveria virar
 * assíncrono por causa de catálogo. Quem é assíncrono é só o **texto**, e o
 * idioma sai da URL, que já está aí quando o primeiro módulo carrega.
 */
export { language as activeLanguage };
export default i18next;
