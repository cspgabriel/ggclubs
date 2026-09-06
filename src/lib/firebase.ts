import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { activeLanguage } from '@/i18n';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);

/**
 * **Em que língua o Firebase fala com esta pessoa.**
 *
 * Sem esta linha ele cai no `defaultLocale` do projeto, e o desfecho estava
 * medido em 24/08/2026: o e-mail de recuperação de senha chegava **em inglês**
 * (*"Reset your password for %APP_NAME%"*) num produto que só fala português e
 * espanhol. Não era o template que estava errado · **ninguém nunca tinha dito a
 * ele em que língua o produto fala.**
 *
 * **O que ela cobre hoje é o que ainda não existe.** A recuperação de senha
 * deixou de passar por aqui no mesmo dia (quem manda é a nossa API, com o nosso
 * layout), e `verifyEmail` e `changeEmail` não têm chamador nenhum no produto.
 * Ela fica porque o dia em que o primeiro deles nascer é o dia em que ninguém
 * vai lembrar disto · e o sintoma seria uma caixa de entrada em inglês, que
 * nenhum dos nossos checks enxerga.
 *
 * **O valor sai do i18n, e não do `navigator`** · o idioma deste produto está na
 * URL, e é o i18n quem já resolveu isso na entrada.
 */
firebaseAuth.languageCode = activeLanguage;
