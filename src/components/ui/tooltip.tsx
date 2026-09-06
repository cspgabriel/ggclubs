import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Primitivo do Radix, como o resto do design system: posicionamento, atraso,
// fechar no ESC e abrir por foco de teclado já vêm resolvidos.

export const TooltipProvider = TooltipPrimitive.Provider;

/**
 * Dica curta pendurada em qualquer gatilho.
 *
 * **Abre no toque, não só no ponteiro** · e isso é a parte que não vem de
 * graça. O tooltip do Radix, como o do resto do mundo, nasce ligado a `hover`
 * e `focus`: num celular não existe hover, e o gatilho ainda fecha a dica no
 * `pointerdown` pra ela não ficar presa depois de um clique de mouse. Somados,
 * os dois faziam a dica **não existir no telefone** · a informação estava lá e
 * era inalcançável justo pra metade que mais vai usar o produto.
 *
 * O conserto é assumir o estado **por inteiro**, e a versão do meio não serve:
 * deixando o Radix ainda mandar em parte, ele emite `false` no `pointerdown` e
 * no começo do próprio atraso, desfazendo o que a gente acabou de abrir. Medido
 * instrumentando o componente · o segundo toque reabria a dica porque o `false`
 * do Radix chegava antes do nosso clique, e o hover não pegava porque o `false`
 * dele chegava depois. Dos primitivos dele ficam só o portal, o posicionamento
 * e a seta, que é o que a gente não quer reescrever.
 *
 * Quem abre e fecha somos nós, por caminhos explícitos:
 *
 * | Entrada | Abre quando |
 * |---|---|
 * | Ponteiro | o ponteiro passa por cima, e só quando ele é mouse |
 * | Toque | no clique, alternando |
 * | Teclado | no foco, **desde que ele não tenha vindo de um ponteiro** |
 *
 * A última linha é a que custou uma medição. Deixando o Radix abrir no foco, o
 * toque virava um ciclo: tocar dá foco (abre), o clique alterna (fecha), o foco
 * abre de novo · e a dica nunca fechava no segundo toque. Medido com emulação
 * de toque, não deduzido.
 *
 * **Só pra explicar, nunca pra esconder.** Informação que a pessoa precisa pra
 * decidir mora na tela; dica é pro "por que isto já veio preenchido", que é a
 * pergunta que ela faria depois de olhar, não antes.
 */
export function Hint({
  label,
  children,
  content,
}: {
  label: string;
  /** O gatilho. Precisa aceitar `ref` e eventos · use elemento, não texto solto. */
  children: ReactNode;
  /** Conteúdo, quando ele for mais que o próprio `label`. */
  content?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // Marca que o foco que vem a seguir nasceu de um toque ou clique, e não do
  // teclado. Sem isso, tocar reabre a dica que o próprio toque acabou de fechar.
  const fromPointer = useRef(false);

  return (
    <TooltipPrimitive.Root
      open={open}
      // Ignorado de propósito · ver o bloco acima. O que o Radix quer não entra
      // no estado, senão as duas máquinas brigam.
      onOpenChange={() => undefined}
    >
      <TooltipPrimitive.Trigger
        asChild
        // Marca o gatilho no DOM pra que o fechamento por "toque fora" saiba
        // que ele **não** é fora. O gatilho fica fora do conteúdo portalizado,
        // então ele contava como clique externo: o segundo toque fechava e o
        // clique logo em seguida reabria · a dica nunca fechava no telefone.
        data-hint-trigger=""
        onPointerDown={() => {
          fromPointer.current = true;
        }}
        // `pointerType` do próprio evento, **não** `matchMedia('(hover: hover)')`.
        // A consulta de mídia responde pelo dispositivo e erra nos dois lados:
        // sob emulação de toque ela ainda dizia `hover`, e num laptop com tela
        // sensível ela diz `hover` enquanto o dedo está na tela. O evento sabe
        // o que encostou nele; a mídia só sabe o que o aparelho tem.
        onPointerMove={(e) => e.pointerType === 'mouse' && setOpen(true)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => !fromPointer.current && setOpen(true)}
        onBlur={() => {
          fromPointer.current = false;
          setOpen(false);
        }}
      >
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={6}
          collisionPadding={12}
          // Fechar por ESC e por toque fora vem daqui, já que o `onOpenChange`
          // está desligado · os dois são o comportamento nativo e não podem
          // sumir junto com a máquina de estado dele.
          onEscapeKeyDown={() => setOpen(false)}
          onPointerDownOutside={(e) => {
            const target = e.target;
            if (target instanceof Element && target.closest('[data-hint-trigger]')) return;
            setOpen(false);
          }}
          className={cn(
            'z-50 max-w-64 rounded-lg border bg-popover px-3 py-2 text-xs leading-snug text-popover-foreground shadow-lg',
            'data-[state=delayed-open]:animate-fade-in',
          )}
        >
          {content ?? label}
          <TooltipPrimitive.Arrow className="fill-border" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/** A dica com o ícone padrão, ao lado de um rótulo de campo. */
export function InfoTip({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <Hint label={label} content={children}>
      {/* `type=button` porque isto vive dentro de formulário · sem ele o
          clique na dica enviaria o formulário. */}
      <button
        type="button"
        aria-label={label}
        className="touch-target inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
    </Hint>
  );
}
