import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import * as React from 'react';
import { cn } from '@/lib/utils';

// Mesmo primitivo do resto do design system. Menu acessível exige foco preso,
// navegação por seta, ESC, clique fora, portal e virar de lado perto da borda ·
// reimplementar isso à mão é onde bug de acessibilidade nasce.

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

export const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content
      ref={ref}
      className={cn(
        'z-50 min-w-52 overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg',
        'data-[state=open]:animate-fade-in',
        className,
      )}
      {...props}
    />
  </ContextMenuPrimitive.Portal>
));
ContextMenuContent.displayName = 'ContextMenuContent';

export const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Item
    ref={ref}
    className={cn(
      // Altura menor que a do dropdown: aqui o ponteiro já está em cima do item
      // e a lista costuma ter quatro linhas. Alvo de 44px vira um menu que
      // ocupa meia tela.
      'flex cursor-pointer select-none items-center justify-between gap-6 rounded-lg px-3 py-2 text-sm outline-hidden transition-colors',
      // Destaque por hover **e** por foco. O Radix destaca dando foco ao item
      // sob o ponteiro; aqui o foco fica no campo de texto pra não apagar a
      // marcação da seleção, então sem a regra de hover o menu ficaria sem
      // nenhum retorno visual ao passar o mouse. O foco continua valendo pra
      // quem navega por teclado.
      'hover:bg-secondary hover:text-foreground focus:bg-secondary focus:text-foreground',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
      className,
    )}
    {...props}
  />
));
ContextMenuItem.displayName = 'ContextMenuItem';

export const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    {...props}
  />
));
ContextMenuSeparator.displayName = 'ContextMenuSeparator';

/** Atalho do item, à direita. Informa sem competir · é referência, não ação. */
export function ContextMenuShortcut({ children }: { children: React.ReactNode }) {
  return <span className="text-xs tabular-nums text-muted-foreground">{children}</span>;
}
