import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { App } from './App.js';
import { initGoogleSignIn } from './lib/google-signin.js';
// Antes de qualquer componente montar · tela não pode renderizar sem idioma.
import { initI18n } from './i18n/index.js';
import './index.css';

const rootEl: HTMLElement | null = document.getElementById('root');
if (!rootEl) throw new Error('#root element not found');
const container: HTMLElement = rootEl;

function mount() {
  // A marca estática do `index.html` **não** sai aqui: quem a remove é o `App`,
  // num efeito de layout, quando o React já tem o que pintar. Tirá-la antes do
  // `render` abria um buraco preto de mais de um segundo entre ela sumir e o
  // primeiro paint · medido em 29/07/2026, num hard reload.
  createRoot(container).render(
    <StrictMode>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </StrictMode>,
  );
}

// Resolvido antes do primeiro render porque `isGoogleSignInAvailable()` é
// síncrono e decide se o botão aparece · descobrir depois faria o botão piscar
// na tela. No navegador a promessa resolve na hora, sem tocar em nada.
//
// `then` e não `await` de topo: o alvo do build não aceita top-level await, e
// isso só aparece em `pnpm build` · lint, typecheck e teste passam batido.
//
// **O `initI18n` entrou aqui em 25/08/2026**, quando o catálogo deixou de ser
// `import` estático pra só o idioma ativo viajar · ver `i18n/index.ts`. Os dois
// resolvem **juntos** porque são independentes, e esperar em série somaria duas
// esperas pro mesmo primeiro paint.
//
// **`catch` antes do `finally`, e a tela monta de qualquer jeito**: falha de
// catálogo deixa chave crua na tela, o que é ruim · tela branca é pior, e era o
// que aconteceria deixando a promessa rejeitar sozinha.
void Promise.all([initGoogleSignIn(), initI18n()])
  .catch((error: unknown) => console.error('[boot] falhou antes de montar', error))
  .finally(mount);
