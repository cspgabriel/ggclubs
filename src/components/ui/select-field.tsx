import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

/** O teto da lista, em pixels · o par do `max-h-80` lá embaixo. */
const LIST_MAX_HEIGHT = 320;

/**
 * O seletor do produto · o `<select>` nativo estava fora da identidade.
 *
 * **Pedido pelo Eduardo em 08/08/2026** ("esse input select é feio e fora da
 * identidade da plataforma"), e ele tem razão: o nativo é desenhado pelo sistema
 * operacional, então num produto dark com verde neon ele aparecia com a lista
 * branca do Windows e a seta do Chrome.
 *
 * **Não é Radix, e a escolha é deliberada.** O que se precisa aqui é lista curta
 * de opção única, e o `Select` do Radix traz portal, posicionamento e um
 * comportamento de teclado que este caso não usa · o produto já paga um chunk de
 * diálogo, e o seletor de formação (que é o caso complexo) tem tela própria.
 *
 * **O que ele mantém do nativo, porque é o que importa:** fecha no ESC, fecha ao
 * clicar fora, o gatilho é um `<button>` de verdade e a lista é `role="listbox"`.
 *
 * > **Probe que for validar isto começa aqui:** `element.click()` **não** abre
 * > menu que ouve `pointerdown`. Este aqui ouve `click` no gatilho, então
 * > funciona · a armadilha é do Radix e está registrada na pendência 70.
 */
export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  allLabel,
  className,
}: {
  id?: string;
  /** Rótulo acessível · a tela desenha o `<Label>` visível por fora. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  /** O rótulo do "sem filtro" · quando ausente, não existe opção vazia. */
  allLabel?: string;
  className?: string;
}) {
  const generated = useId();
  const listId = `${id ?? generated}-list`;
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);
  /**
   * **Onde a lista aparece na tela** · ela é desenhada por portal, então a
   * posição não vem do fluxo · ver o porquê no bloco do `createPortal`.
   */
  const [at, setAt] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    /**
     * **A posição se remede enquanto a lista está aberta** · rolar a página com
     * ela aberta a deixaria colada onde o gatilho estava. O `true` é a fase de
     * captura, e ela existe porque o scroll que importa pode ser de um pai com
     * rolagem própria, e não o da janela.
     */
    function place() {
      const rect = box.current?.getBoundingClientRect();
      if (!rect) return;
      /**
       * **Ela abre pra CIMA quando não cabe embaixo** · achado na captura, com
       * a mesa do organizador: o filtro fica a dois terços da altura da tela e a
       * lista de rodadas tem nove itens · aberta pra baixo, **os últimos ficavam
       * fora da janela**, e os últimos são justamente a final e a disputa de
       * terceiro.
       *
       * O teto de `max-h-80` é 320px · é ele que decide se cabe, e não a altura
       * real da lista, porque a medida acontece **antes** de ela existir.
       */
      const below = window.innerHeight - rect.bottom;
      const flip = below < LIST_MAX_HEIGHT && rect.top > below;
      setAt({
        top: flip ? undefined : rect.bottom + 4,
        bottom: flip ? window.innerHeight - rect.top + 4 : undefined,
        left: rect.left,
        width: rect.width,
      });
    }
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const all = allLabel !== undefined ? [{ value: '', label: allLabel }] : [];
  const items = [...all, ...options];
  const current = items.find((option) => option.value === value);

  return (
    <div ref={box} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-input bg-background px-3 text-left text-sm',
          'transition-colors hover:border-primary/50',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        )}
      >
        <span className={cn('truncate', !current?.value && 'text-muted-foreground')}>
          {current?.label ?? allLabel}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open &&
        at &&
        createPortal(
          /**
           * **A lista sai por PORTAL, e o motivo é `clip-path`** · 05/09/2026,
           * achado com a mesa do organizador na tela.
           *
           * O card da marca é desenhado com o chanfro (`.chamfer`), que é um
           * **`clip-path`** · e `clip-path` recorta **todo** descendente,
           * inclusive o que é `position: absolute`. A lista aberta era cortada
           * na borda do card, e nenhuma altura resolvia isso: o defeito não era
           * a lista ser alta, era ela não poder sair da caixa.
           *
           * > **Eu tinha "consertado" subindo o teto de `max-h-64` pra 80**, com
           * > um comentário afirmando que o corte era de altura. **Era falso** ·
           * > o teto maior fica porque a lista de rodadas tem nove itens, mas
           * > quem conserta o corte é este portal.
           *
           * **É a mesma armadilha que o [design.md] registra** pro menu de
           * convite da página do player, que não flutua por causa de um
           * `overflow-hidden` · aqui a causa é irmã e o efeito é o mesmo.
           *
           * **Portal exige posicionar na mão** · o `at` vem do retângulo do
           * gatilho e se remede no scroll e no resize. O clique fora continua
           * funcionando porque o `pointerdown` é ouvido no `document`, e o
           * `stopPropagation` daqui impede que o clique na própria lista feche
           * ela antes de escolher.
           */
          <ul
            id={listId}
            role="listbox"
            onPointerDown={(event) => event.stopPropagation()}
            style={{ top: at.top, bottom: at.bottom, left: at.left, width: at.width }}
            /**
             * **`pointer-events-auto` não é enfeite** · o `AlertDialog` do Radix
             * é modal, e modal dele desliga o ponteiro no resto do documento
             * enquanto está aberto. Como esta lista sai por portal no `body`,
             * ela ficaria **visível e não clicável** dentro de um diálogo · e o
             * caso real é o seletor de país no modal do telefone, que é fluxo de
             * inscrição paga.
             *
             * **`z-50` empata com o do diálogo de propósito** · quem desempata é
             * a ordem no DOM, e a lista é montada **depois** dele (ela só existe
             * a partir do clique). Subir mais alto aqui só criaria a próxima
             * corrida de z-index.
             */
            className="pointer-events-auto fixed z-50 max-h-80 overflow-auto overscroll-contain rounded-xl border bg-popover p-1 shadow-lg"
          >
          {items.map((option) => {
            const selected = option.value === value;
            return (
              <li key={option.value || '__all'}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                    selected && 'text-primary',
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {selected && <Check className="ml-auto h-3.5 w-3.5 shrink-0" aria-hidden />}
                </button>
              </li>
            );
          })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
