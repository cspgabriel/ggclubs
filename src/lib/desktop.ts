import { isDesktop } from './platform.js';

// Tudo aqui é importado sob demanda. Import estático de `@tauri-apps/*` entraria
// no bundle do navegador, que nunca vai executar nada disso.

const HINT_KEY = 'ggclubs:tray-hint-shown';

export type WindowControls = {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
};

export async function getWindowControls(): Promise<WindowControls | null> {
  if (!isDesktop()) return null;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const win = getCurrentWindow();
  return {
    minimize: () => win.minimize(),
    toggleMaximize: () => win.toggleMaximize(),
    close: () => win.close(),
    isMaximized: () => win.isMaximized(),
  };
}

/** Janela sem foco esmaece a barra · é o que aplicativo nativo faz. */
export async function onFocusChange(cb: (focused: boolean) => void): Promise<() => void> {
  if (!isDesktop()) return () => undefined;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const win = getCurrentWindow();
  cb(await win.isFocused());
  return win.onFocusChanged(({ payload }) => cb(payload));
}

/** Reage a mudanças de maximizado, pra alternar o ícone do botão. */
export async function onMaximizeChange(cb: (maximized: boolean) => void): Promise<() => void> {
  if (!isDesktop()) return () => undefined;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const win = getCurrentWindow();
  cb(await win.isMaximized());
  return win.onResized(() => void win.isMaximized().then(cb));
}

type Labels = {
  trayOpen: string;
  trayQuit: string;
  hiddenTitle: string;
  hiddenBody: string;
};

/**
 * Liga o shell ao idioma ativo e ao aviso de bandeja. Chamar uma vez, no boot.
 *
 * O Rust esconde a janela e avisa · quem decide o texto é o front, porque é ele
 * que sabe o idioma e se o aviso já apareceu alguma vez.
 */
export async function initDesktopShell(labels: Labels): Promise<() => void> {
  if (!isDesktop()) return () => undefined;

  const [{ invoke }, { listen }] = await Promise.all([
    import('@tauri-apps/api/core'),
    import('@tauri-apps/api/event'),
  ]);

  await invoke('set_tray_labels', { open: labels.trayOpen, quit: labels.trayQuit });

  // Permissão pedida no boot, não na hora de esconder · lá a janela já sumiu, e
  // pedir autorização pra uma janela invisível é a pior hora possível.
  void ensureNotificationPermission();

  return listen('window://hidden-to-tray', () => {
    if (localStorage.getItem(HINT_KEY)) return;
    localStorage.setItem(HINT_KEY, '1');
    void notifyHidden(labels);
  });
}

/**
 * Atalhos da janela. De propósito **não** usa o plugin de atalho global: aquele
 * captura a tecla no sistema inteiro e roubaria `Ctrl+W` de qualquer outro
 * aplicativo aberto. Aqui só vale com a janela em foco, que é o esperado.
 */
export async function registerShortcuts(): Promise<() => void> {
  if (!isDesktop()) return () => undefined;

  const [{ invoke }, { getCurrentWindow }] = await Promise.all([
    import('@tauri-apps/api/core'),
    import('@tauri-apps/api/window'),
  ]);
  const win = getCurrentWindow();

  const onKeyDown = (e: KeyboardEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key === 'w') {
      e.preventDefault();
      void win.close();
    } else if (ctrl && e.key === 'q') {
      e.preventDefault();
      void invoke('quit_app');
    } else if (ctrl && e.key === 'm') {
      e.preventDefault();
      void win.minimize();
    } else if (e.key === 'F5' || (ctrl && e.key === 'r')) {
      e.preventDefault();
      window.location.reload();
    } else if (ctrl && (e.key === 'p' || e.key === 's')) {
      // Imprimir e salvar como são do navegador, não do produto · e continuam
      // acessíveis por atalho mesmo com o menu de contexto substituído. Fica
      // fácil esquecer disso e concluir que o vazamento foi resolvido.
      e.preventDefault();
    }
  };

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}

/**
 * A versão do app instalado, que vai no `X-Client-Version` de toda requisição.
 *
 * **Sai do binário, não do build do front.** Injetar a versão por `define` do
 * Vite seria mais barato em runtime e criaria dois números capazes de divergir ·
 * o `tauri.conf.json` é quem manda, e um front compilado noutra hora afirmaria
 * uma versão que o executável não tem. Aqui a resposta vem do próprio programa
 * que está rodando.
 *
 * A promessa é memoizada porque isto entra no caminho de **toda** chamada de
 * API: o IPC acontece uma vez por sessão.
 */
let version: Promise<string | null> | null = null;

export function appVersion(): Promise<string | null> {
  if (!isDesktop()) return Promise.resolve(null);
  version ??= import('@tauri-apps/api/app')
    .then((m) => m.getVersion())
    // Falhar aqui devolve `null`, e o servidor trata ausência **em origem de
    // desktop** como versão anterior ao piso · ou seja, o erro cai pro lado
    // seguro sem precisar de tratamento próprio.
    .catch(() => null);
  return version;
}

export type UpdateInfo = { version: string; install: () => Promise<void> };

/**
 * Procura atualização e devolve o que fazer com ela. Falha em silêncio de
 * propósito: sem internet, ou antes do primeiro release existir no endpoint, a
 * verificação erra · e isso não é assunto do usuário.
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!isDesktop()) return null;
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (!update) return null;
    return {
      version: update.version,
      install: async () => {
        await update.downloadAndInstall();
        const { relaunch } = await import('@tauri-apps/plugin-process');
        await relaunch();
      },
    };
  } catch {
    return null;
  }
}

/**
 * O balão nativo do sistema · **um caminho só, dois assuntos.**
 *
 * Nasceu pro aviso de atualização e o sininho passou a usar o mesmo em
 * 11/08/2026 · extrair na segunda cópia é a regra da casa, e aqui ela se paga
 * na permissão: o pedido acontece num lugar, e quem chamar de outro lugar não
 * esquece dele.
 *
 * **Quem decide se dispara é sempre o cliente**, nunca o servidor · é ele que
 * sabe se a janela está na frente. A regra do sininho está no `produto.md`.
 *
 * **E o pisco da barra de tarefas sai daqui, junto com todo balão.** Ele vivia
 * ao lado de um só dos três chamadores (o sininho), e o balão de atualização
 * dispara justamente com a janela atrás · sem o pisco, ele passava e não
 * deixava rastro. Vai antes da permissão de propósito: quem negou o balão
 * ainda ganha o sinal mais leve.
 */
export async function notifyDesktop(title: string, body: string, image?: string): Promise<void> {
  if (!isDesktop()) return;
  void flashTaskbar();
  if (!(await ensureNotificationPermission())) return;

  // **No Windows quem monta o balão é o nosso comando**, e não o plugin · o
  // porquê está em `src-tauri/src/windows_toast.rs`, e ele é sobre a identidade
  // do app estar registrada antes do primeiro disparo. Fora do Windows o
  // comando devolve `false` e o plugin assume, que lá desenha certo.
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const shown = await invoke<boolean>('notify_native', { title, body, image: image ?? null });
    if (shown) return;
  } catch {
    // Balão é acabamento · falhar aqui cai pro plugin em vez de sumir o aviso.
  }

  const { sendNotification } = await import('@tauri-apps/plugin-notification');
  sendNotification({ title, body });
}

/** Aviso de atualização · o primeiro uso real da notificação nativa. */
export async function notifyUpdateAvailable(title: string, body: string): Promise<void> {
  await notifyDesktop(title, body);
}

async function ensureNotificationPermission(): Promise<boolean> {
  const { isPermissionGranted, requestPermission } =
    await import('@tauri-apps/plugin-notification');
  return (await isPermissionGranted()) || (await requestPermission()) === 'granted';
}

/**
 * No Windows a notificação **exige o app instalado**: o toast depende de
 * identidade de pacote, que o `tauri dev` não tem. Rodando em dev ela
 * simplesmente não aparece · isso não é falha do código.
 */
async function notifyHidden(labels: Labels): Promise<void> {
  await notifyDesktop(labels.hiddenTitle, labels.hiddenBody);
}

/**
 * Abrir um endereço **fora** do produto · a única forma que funciona no app.
 *
 * **No WebView2, `window.open` e `<a target="_blank">` são engolidos em
 * silêncio.** Sem um `new_window_req_handler` registrado, o `NewWindowRequested`
 * é marcado como tratado e nada mais acontece: nenhuma janela, nenhum erro,
 * nenhuma linha de console. Foi assim que o checkout do cartão, o ticket do Pix
 * e todo link de regulamento não abriam nada no app instalado · e a tela ainda
 * dizia que a aba tinha aberto.
 *
 * Quem abre no desktop é o plugin `opener`, que chama o navegador padrão do
 * sistema · é o mesmo caminho que o login com Google já usa, do lado do Rust
 * (`google_auth.rs`).
 *
 * **O comando é invocado pelo nome, sem o pacote `@tauri-apps/plugin-opener`** ·
 * o guest-js dele é literalmente esta linha (conferido no fonte do crate 2.5.4:
 * `invoke('plugin:opener|open_url', { url, with })`), e uma dependência a mais
 * no bundle da **web** pra isso não se paga. A permissão `opener:default` da
 * capability já cobre `http`, `https`, `mailto` e `tel`, e nada além disso.
 *
 * **Falhar aqui não lança**, porque quem chama costuma ser um `onClick`: o pior
 * caso é o endereço não abrir, e a tela que oferece o link continua de pé pra
 * tentar de novo.
 */
export async function openExternal(url: string): Promise<void> {
  if (!isDesktop()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('plugin:opener|open_url', { url });
  } catch (err) {
    console.warn('[desktop] não deu pra abrir o endereço fora do app', err);
  }
}

/**
 * Clipboard pelo plugin do Tauri, não pela `navigator.clipboard`. Ler a área de
 * transferência é operação privilegiada no webview: o Chromium exige permissão
 * que o WebView2 nega sem diálogo, e `execCommand('paste')` está bloqueado há
 * anos. Sem isto, "Colar" no nosso menu não teria como funcionar · e um menu que
 * substitui o nativo sem colar é uma regressão, não uma melhoria.
 */
export async function readClipboard(): Promise<string> {
  if (!isDesktop()) return '';
  try {
    const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
    return (await readText()) ?? '';
  } catch {
    return '';
  }
}

export async function writeClipboard(text: string): Promise<void> {
  if (!isDesktop() || !text) return;
  try {
    const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
    await writeText(text);
  } catch {
    // Falha de clipboard não derruba a tela · o pior caso é o item não ter efeito.
  }
}

/**
 * "Abrir junto com o Windows" · **a fonte da verdade é o registro**, lido a
 * cada pergunta. Nada em `localStorage`, nada no servidor: é configuração de
 * máquina, e o Gerenciador de Tarefas pode desligar por fora a qualquer hora ·
 * a chave mostra o que está valendo, não o que a pessoa clicou uma vez.
 *
 * `null` quando o shell não soube responder (o plugin fora do binário, a chave
 * do `Run` inacessível) · a tela desenha a chave desligada e diz por quê, em
 * vez de afirmar um estado que ninguém leu.
 */
export async function readAutostart(): Promise<boolean | null> {
  if (!isDesktop()) return null;
  try {
    const { isEnabled } = await import('@tauri-apps/plugin-autostart');
    return await isEnabled();
  } catch {
    return null;
  }
}

/**
 * Liga ou desliga · **lança** quando o registro recusou, porque quem chama é
 * a chave e ela precisa dizer que não pegou. Depois de gravar, quem responde o
 * estado continua sendo o `readAutostart`.
 */
export async function writeAutostart(enabled: boolean): Promise<void> {
  if (!isDesktop()) return;
  const { enable, disable } = await import('@tauri-apps/plugin-autostart');
  await (enabled ? enable() : disable());
}

/**
 * A marca de aviso não lido · o ponto sobre o ícone da barra de tarefas e a
 * variante da bandeja, com a contagem na dica. **Um IPC, dois lugares**: quem
 * desenha é o Rust (`src-tauri/src/badge.rs`), a partir do ícone que o app já
 * carrega · e o `setBadgeCount` do core não existe no Windows, o tipo instalado
 * diz isso com todas as letras.
 *
 * Sem aviso a dica vai vazia e o Rust volta ao nome do produto.
 */
export async function setUnreadBadge(unread: number, tooltip: string | null): Promise<void> {
  if (!isDesktop()) return;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('set_unread_badge', { unread, tooltip });
  } catch {
    // A marca é acabamento · o sininho continua contando sem ela.
  }
}

/**
 * Pisca o botão na barra de tarefas até a janela receber foco · o sinal que
 * **sobrevive ao balão**, que dispara uma vez por ausência e depois some. Numa
 * janela escondida na bandeja não há botão pra piscar, e o Windows ignora.
 * Quem chama é o `notifyDesktop`, pra todo balão · ninguém precisa lembrar.
 */
async function flashTaskbar(): Promise<void> {
  if (!isDesktop()) return;
  try {
    const { getCurrentWindow, UserAttentionType } = await import('@tauri-apps/api/window');
    await getCurrentWindow().requestUserAttention(UserAttentionType.Informational);
  } catch {
    // Mesmo motivo da marca: acabamento.
  }
}
