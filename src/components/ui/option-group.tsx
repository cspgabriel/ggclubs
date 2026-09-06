import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type Option<T extends string> = {
  value: T;
  label: ReactNode;
};

export type OptionGroupProps<T extends string> = {
  /** Precisa ser único na página · é o que agrupa os rádios. */
  name: string;
  value: T | null;
  onChange: (value: T | null) => void;
  options: ReadonlyArray<Option<T>>;
  /**
   * Deixa desmarcar clicando na opção já marcada. Use em campo opcional:
   * rádio nunca desmarca sozinho, e sem isso a primeira escolha vira prisão.
   */
  allowClear?: boolean;
  columns?: 2 | 3 | 4;
  className?: string;
};

// Em tela estreita a grade cai um degrau: três cartões lado a lado em 360px
// espremem o rótulo e derrubam o alvo de toque abaixo do mínimo.
const COLUMNS = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
} as const;

/**
 * Escolha única em formato de cartão. Usa `input[type=radio]` nativo em vez do
 * rádio do Radix: o estado marcado sai de `:checked` no CSS, sem depender de
 * atributo de biblioteca, e navegação por teclado e envio de formulário já vêm
 * de graça do navegador.
 */
export function OptionGroup<T extends string>({
  name,
  value,
  onChange,
  options,
  allowClear = false,
  columns = 3,
  className,
}: OptionGroupProps<T>) {
  return (
    <div role="radiogroup" className={cn('grid gap-2', COLUMNS[columns], className)}>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            // **`relative` prende o `input.sr-only` deste rótulo**, e sem ele a
            // PÁGINA rola · o `sr-only` do Tailwind é `position: absolute`, e um
            // absoluto sem ancestral posicionado se resolve contra o documento.
            // Num formulário longo isso põe o input a centenas de pixels do topo
            // e o `<html>` passa a rolar até lá, **com o `<body>` inteiro cabendo
            // na janela**.
            //
            // Achado em 28/08/2026 no `/onboarding`, medindo · era o segundo de
            // dois casos idênticos na mesma tela (o outro é o `Checkbox`), e os
            // dois só aparecem em tela com muito campo. Ver o `checkbox.tsx`.
            'relative flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-input px-3 py-2.5 text-sm font-medium transition-colors',
            'hover:border-muted-foreground',
            'has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary',
            'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background',
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            onClick={() => {
              if (allowClear && value === option.value) onChange(null);
            }}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
