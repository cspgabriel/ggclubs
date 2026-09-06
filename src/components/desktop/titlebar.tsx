import { Minus, Square, Copy, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Wordmark } from '@/components/brand';
import {
  getWindowControls,
  onMaximizeChange,
  onFocusChange,
  type WindowControls,
} from '@/lib/desktop';
import { isDesktop } from '@/lib/platform';
import { cn } from '@/lib/utils';

/**
 * Barra de título do app. Substitui a do Windows (`decorations: false`), que é
 * o elemento que mais denuncia "site numa moldura" · é o que Riot, Discord e
 * Spotify fazem.
 *
 * Custo assumido: sem a barra nativa, o Windows 11 perde o menu de Snap Layouts
 * que aparece ao pousar o mouse no maximizar. Registrado em docs/auth-e-desktop.md.
 */
export function DesktopTitlebar() {
  const { t } = useTranslation();
  const [controls, setControls] = useState<WindowControls | null>(null);
  const [maximized, setMaximized] = useState(false);
  const [focused, setFocused] = useState(true);

  useEffect(() => {
    void getWindowControls().then(setControls);
    const disposers: Array<() => void> = [];
    void onMaximizeChange(setMaximized).then((fn) => disposers.push(fn));
    void onFocusChange(setFocused).then((fn) => disposers.push(fn));
    return () => disposers.forEach((fn) => fn());
  }, []);

  // Guarda de plataforma. Quem decide é o `App`, mas este componente reservava
  // altura enquanto carregava, e sem esta linha a reserva aparecia como uma
  // faixa de 40px no topo do **site**. Componente de desktop não pode contar com
  // quem o chama pra não existir na web.
  if (!isDesktop()) return null;

  // Espaço reservado enquanto o módulo da janela carrega. Devolver `null` aqui
  // fazia a barra **nascer depois** e empurrar a tela 40px pra baixo · era esse
  // pulo, e não a espera em si, que dava a sensação estranha no F5.
  if (!controls) {
    return <header aria-hidden className="h-[var(--desktop-titlebar-h)] shrink-0 bg-background" />;
  }

  return (
    // `data-tauri-drag-region` é o que faz a faixa arrastar a janela · sem ele
    // a barra vira decoração inerte.
    //
    // **`pointer-events-auto`, e nenhum `z-`.** O Radix põe `pointer-events:
    // none` no `body` enquanto um modal está aberto, e é isso que tirava os
    // controles da janela de quem estava numa trava · o `auto` devolve. Já a
    // ordem de pintura não precisa de ajuda: todo véu e todo diálogo começam
    // em `top: var(--desktop-titlebar-h)`, então nada cobre a barra. E um
    // `z-` acima dos portais (`z-50`) faria o oposto do que parece: tooltip e
    // menu que abrem pra cima, colados no header, seriam pintados **atrás** da
    // barra · visíveis pela metade, com o ponteiro indo pra ela.
    <header
      data-desktop-titlebar
      data-tauri-drag-region
      onDoubleClick={() => void controls.toggleMaximize()}
      className={cn(
        'relative flex h-[var(--desktop-titlebar-h)] shrink-0 pointer-events-auto select-none items-center justify-between bg-background transition-opacity',
        // Janela sem foco esmaece, como aplicativo nativo faz · é o detalhe que
        // separa "tem barra própria" de "parece do sistema".
        !focused && 'opacity-60',
      )}
    >
      <div data-tauri-drag-region className="flex items-center pl-4">
        <Wordmark className="h-3.5 opacity-80 sm:h-3.5" />
      </div>

      <div className="flex items-center">
        <ControlButton label={t('desktop.minimize')} onClick={() => void controls.minimize()}>
          <Minus className="h-4 w-4" />
        </ControlButton>
        <ControlButton
          label={maximized ? t('desktop.restore') : t('desktop.maximize')}
          onClick={() => void controls.toggleMaximize()}
        >
          {maximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3 w-3" />}
        </ControlButton>
        <ControlButton
          label={t('desktop.close')}
          onClick={() => void controls.close()}
          className="hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="h-4 w-4" />
        </ControlButton>
      </div>

      {/* Fio de luz na base · verde saindo da esquerda e apagando à direita.
          É o que dá a leitura de "ligado" sem pintar a barra de verde. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-primary/70 via-primary/15 to-transparent"
      />
    </header>
  );
}

function ControlButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'flex h-[var(--desktop-titlebar-h)] w-12 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  );
}
