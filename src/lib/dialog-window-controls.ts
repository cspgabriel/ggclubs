/** Minimizar ou maximizar não deve descartar a seleção de um diálogo aberto. */
export function keepDialogOnWindowControl(event: {
  target: EventTarget | null;
  preventDefault: () => void;
}) {
  if (event.target instanceof Element && event.target.closest('[data-desktop-titlebar]')) {
    event.preventDefault();
  }
}
