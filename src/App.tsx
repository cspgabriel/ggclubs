import { lazy, Suspense, useEffect, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppContextMenu } from './components/desktop/app-context-menu.js';
import { TooltipProvider } from './components/ui/tooltip.js';
import { DesktopTitlebar } from './components/desktop/titlebar.js';
import { DesktopContent } from './components/desktop/desktop-content.js';
import { UpdateBanner } from './components/desktop/update-banner.js';
import { NewVersionBanner } from './components/new-version-banner.js';
import { initDesktopShell, registerShortcuts } from './lib/desktop.js';
import { isDesktop } from './lib/platform.js';
import { AppRouter } from './pages/router.js';

// Só o desktop usa a trava; a web não precisa carregar sua camada modal no boot.
const UpdateRequired = lazy(() =>
  import('./components/desktop/update-required.js').then((module) => ({
    default: module.UpdateRequired,
  })),
);

export function App() {
  const { t } = useTranslation();

  // A marca estática do `index.html` cobre a tela até aqui. `useLayoutEffect`
  // roda depois do React escrever no DOM e **antes** do navegador pintar, então
  // a troca acontece no mesmo quadro: sem buraco entre uma coisa e outra.
  //
  // Efeito comum não serve · ele roda depois do paint, e o quadro do meio
  // apareceria preto. Era o que acontecia quando a remoção ficava no `main.tsx`,
  // antes do `render`.
  useLayoutEffect(() => {
    document.getElementById('boot')?.remove();
  }, []);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    void initDesktopShell({
      trayOpen: t('desktop.trayOpen'),
      trayQuit: t('desktop.trayQuit'),
      hiddenTitle: t('desktop.hiddenTitle'),
      hiddenBody: t('desktop.hiddenBody'),
    }).then((fn) => {
      dispose = fn;
    });
    return () => dispose?.();
  }, [t]);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    void registerShortcuts().then((fn) => {
      dispose = fn;
    });
    return () => dispose?.();
  }, []);

  // No desktop a janela é a moldura: ela não rola, quem rola é o conteúdo
  // abaixo da barra. No navegador nada disso existe e a página rola normal.
  const desktop = isDesktop();

  return (
    <TooltipProvider delayDuration={200}>
      <AppContextMenu>
        <div
          className={desktop ? 'desktop-shell flex h-screen flex-col overflow-hidden' : undefined}
        >
          {desktop && <DesktopTitlebar />}
          {desktop && <UpdateBanner />}
          {/* Condicionado na composição **e** protegido por dentro (sem
              bloqueio ele não desenha nada), que é a regra que a barra de
              título ensinou quando vazou uma faixa de 40px pra web. */}
          {desktop && (
            <Suspense fallback={null}>
              <UpdateRequired />
            </Suspense>
          )}
          {/* **A par da `UpdateBanner`, do outro lado da plataforma** · lá quem
              atualiza é o updater, aqui é recarregar a página. Ela é montada
              **fora** do router de propósito: o aviso vale em qualquer tela,
              inclusive nas públicas, que não têm canal de tempo real nenhum.
              Ver `components/new-version-banner.tsx`. */}
          {!desktop && <NewVersionBanner />}
          <DesktopContent enabled={desktop}>
            <AppRouter />
          </DesktopContent>
        </div>
      </AppContextMenu>
    </TooltipProvider>
  );
}
