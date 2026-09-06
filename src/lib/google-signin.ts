/**
 * **O SDK entra por import dinâmico**, e o motivo não é este módulo: quem o
 * importa é o formulário de entrada, que o router carrega **estaticamente**
 * (ele é a raiz do app instalado). Com o import no topo daqui, `isGoogleSignInAvailable`
 * · uma função que só olha a plataforma · arrastava os 161 kB do Firebase pro
 * pacote de entrada de todo visitante, landing incluída.
 *
 * Só as duas funções que de fato falam com o Firebase pagam por ele, e quando
 * elas rodam o módulo já veio.
 */
const loadSdk = async () => {
  const [{ firebaseAuth }, sdk] = await Promise.all([
    import('./firebase.js'),
    import('firebase/auth'),
  ]);
  return { firebaseAuth, ...sdk };
};
import { pkceChallenge, randomVerifier } from './pkce.js';
import { isDesktop } from './platform.js';

/**
 * No navegador, popup do Firebase. No desktop, o fluxo nativo da RFC 8252:
 * navegador do sistema + servidor de loopback + PKCE, com o shell Rust cuidando
 * da porta e do retorno. Ver docs/auth-e-desktop.md.
 *
 * O popup não serve no app porque a origem `tauri://` não pode ser autorizada no
 * Firebase, e embutir a tela do Google no webview seria pedir a senha numa
 * janela sem barra de endereço · exatamente o que a RFC proíbe.
 */
export function isGoogleSignInAvailable(): boolean {
  if (!isDesktop()) return true;
  return desktopOauthReady;
}

/** Resolvido no boot do app · o botão não pode aparecer sem credencial no build. */
let desktopOauthReady = false;

export async function initGoogleSignIn(): Promise<void> {
  if (!isDesktop()) return;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    desktopOauthReady = await invoke<boolean>('google_oauth_available');
  } catch {
    // Shell antigo, sem o comando · o botão simplesmente não aparece.
    desktopOauthReady = false;
  }
}

export async function signInWithGoogle(): Promise<void> {
  if (!isGoogleSignInAvailable()) {
    throw new Error('Google sign-in indisponível nesta plataforma');
  }
  if (!isDesktop()) {
    const { firebaseAuth, signInWithPopup, GoogleAuthProvider } = await loadSdk();
    await Promise.race([
      signInWithPopup(firebaseAuth, new GoogleAuthProvider()),
      giveUpOnFocus(),
    ]);
    return;
  }
  await signInWithGoogleOnDesktop();
}

/**
 * **Fechar a janela do Google deixava a tela esperando pra sempre**, e isto é o
 * conserto · 26/08/2026.
 *
 * **O `signInWithPopup` promete cobrir esse caso e não cobre de forma
 * confiável**, e o motivo está no código do SDK, não em suposição. O
 * `pollUserCancellation` faz:
 *
 * ```js
 * if (this.authWindow?.window?.closed) {
 *   this.pollId = window.setTimeout(() => {
 *     this.reject(_createError(this.auth, 'popup-closed-by-user'));
 *   }, 8000);   // _Timeout.AUTH_EVENT
 * }
 * ```
 *
 * São **dois** problemas ali, e o segundo é o que morde:
 *
 * | | |
 * |---|---|
 * | mesmo funcionando, ele demora **8 segundos** | é o `_Timeout.AUTH_EVENT`, e existe issue aberta sobre isso ([#8061], [#8367]) |
 * | **ele depende de `authWindow.window` continuar existindo** | quando o navegador corta o vínculo `opener` (COOP, bloqueio de terceiros, navegação cross-origin), a referência vira `null`, o `if` nunca é verdadeiro e **nada rejeita, nunca** |
 *
 * O segundo caso é o que o Eduardo relatou, e ele acontecia **antes** de o
 * `authDomain` virar domínio nosso · ou seja, não tem a ver com aquela mudança.
 * É o mesmo movimento dos navegadores que matou o `signInWithRedirect` em 2024.
 *
 * **O sinal que sobra é o foco:** a janela principal o recupera quando o popup
 * morre. No desktop não há equivalente (o loopback nunca sabe que a pessoa
 * desistiu, e a RFC 8252 não tem resposta pra isso) · lá quem cobre é o botão
 * de cancelar e o prazo do shell.
 *
 * **Cancelar aqui é seguro, e é isso que sustenta a heurística.** O que se
 * cancela é a **espera visual**, não o login: quem decide se a pessoa entrou é o
 * `onAuthStateChanged` no `auth.tsx`. Se o popup na verdade tinha concluído, o
 * Firebase dispara e ela entra do mesmo jeito · o pior desfecho de um falso
 * positivo é o botão voltar ao normal um instante antes da hora.
 *
 * **E sim, nós ganhamos a corrida do SDK de propósito** · 1,5s + 2s é bem menos
 * que os 8s dele, então mesmo quando ele **funcionaria** quem responde é isto.
 * Não é redundância pra remover: com a referência viva a espera cairia de 8s pra
 * ~3,5s, e sem ela o SDK não responde nunca.
 *
 * **Os dois atrasos existem contra falso positivo**, e não por gosto: o primeiro
 * ignora o foco que a própria abertura do popup devolve, e o segundo dá margem
 * pro caso em que a pessoa **concluiu** o login (aí o foco também volta, e o
 * `onAuthStateChanged` chega logo em seguida).
 *
 * [#8061]: https://github.com/firebase/firebase-js-sdk/issues/8061
 * [#8367]: https://github.com/firebase/firebase-js-sdk/issues/8367
 */
const FOCUS_GRACE_MS = 1_500;
const SDK_WINDOW_MS = 2_000;

function giveUpOnFocus(): Promise<never> {
  return new Promise((_resolve, reject) => {
    const startedAt = Date.now();

    const onFocus = () => {
      if (Date.now() - startedAt < FOCUS_GRACE_MS) return;
      window.removeEventListener('focus', onFocus);
      setTimeout(() => {
        // **A forma importa, e não o tipo** · o `auth-errors.ts` reconhece erro
        // do Firebase por carregar `code` string, de propósito (importar o SDK
        // só pra um `instanceof` prenderia o pacote na entrada de todo
        // visitante, inclusive na landing). Então o objeto daqui precisa ter a
        // mesma forma · com `auth/popup-closed-by-user` ele cai no
        // `isUserCancelledAuth` e vira silêncio, não erro vermelho.
        reject(Object.assign(new Error('popup fechado'), { code: 'auth/popup-closed-by-user' }));
      }, SDK_WINDOW_MS);
    };

    window.addEventListener('focus', onFocus);
  });
}

async function signInWithGoogleOnDesktop(): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core');

  // PKCE nasce aqui porque o Web Crypto já resolve, mas quem troca o código é o
  // shell Rust: assim o segredo do cliente e o refresh token nunca entram no
  // webview. O que volta é só o `id_token`.
  const verifier = randomVerifier();
  const challenge = await pkceChallenge(verifier);
  // A porta de loopback aceita conexão de qualquer processo da máquina · o
  // `state` é o que impede outro programa local de entregar um código dele.
  const state = randomVerifier();

  const idToken = await invoke<string>('google_oauth_sign_in', { challenge, verifier, state });

  const { firebaseAuth, signInWithCredential, GoogleAuthProvider } = await loadSdk();
  await signInWithCredential(firebaseAuth, GoogleAuthProvider.credential(idToken));
}

/**
 * Desistir pelo app. Precisa avisar o shell: abandonar a promessa aqui deixava
 * **a porta de loopback escutando até os 180s**, e um código chegando nela ainda
 * entraria na conta muito depois de a pessoa ter desistido.
 */
export async function cancelGoogleSignIn(): Promise<void> {
  if (!isDesktop()) return;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('google_oauth_cancel');
  } catch {
    // Shell antigo, sem o comando · o fluxo ainda expira sozinho em 3 minutos.
  }
}
