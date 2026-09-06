import * as LabelPrimitive from '@radix-ui/react-label';
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      // **`block` não é enfeite, e ele entrou com o Tailwind 4** · o `space-y-*`
      // do 4 põe a margem no filho **anterior** (`margin-block-end`) em vez de
      // no seguinte, e `<label>` é **inline** por padrão · margem vertical em
      // elemento inline não faz nada. O gap de 8px entre rótulo e campo
      // simplesmente sumia, em todo formulário, sem nada ficar vermelho.
      // Medido em 26/08/2026: `margin-bottom: 8px` declarado e **3px** de
      // distância real.
      'block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className,
    )}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;
