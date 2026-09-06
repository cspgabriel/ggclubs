import { Slot } from '@radix-ui/react-slot';
import { type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from './button-variants.js';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

/**
 * **`disabled` num `asChild` não desabilita nada, e por isso ele é tratado
 * aqui.**
 *
 * Com `asChild` quem renderiza é o filho · quase sempre um `<Link>`, ou seja um
 * `<a>`. E `<a>` **não tem** estado desabilitado: o atributo é ignorado, e as
 * classes do design system (`disabled:opacity-50`,
 * `disabled:pointer-events-none`) dependem do pseudo-seletor `:disabled`, que
 * nunca casa. Resultado medido em 05/08/2026: o "Criar club" ficava **verde e
 * clicável** com a conta no teto de 3, e a recusa só chegava depois de a pessoa
 * preencher o formulário inteiro.
 *
 * O conserto mora na primitiva, e não na tela, pela razão de sempre: era uma
 * ocorrência hoje e seria a segunda no dia em que alguém repetisse o padrão.
 * O link continua sendo link, mas fica **inerte e fora da tabulação**, com a
 * mesma aparência de desabilitado · e `aria-disabled` diz ao leitor de tela o
 * que o `disabled` diria.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, disabled, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const inertLink = asChild && disabled;
    return (
      <Comp
        ref={ref}
        /**
         * **Botão sem `type` é `submit`, e isso é padrão do HTML** · dentro de
         * um `<form>`, qualquer botão que a tela pôs ali "só pra clicar"
         * **envia o formulário**. É a pegadinha mais silenciosa que existe em
         * formulário: nada quebra, o formulário só é enviado por um botão que
         * não era pra isso.
         *
         * Aqui o padrão vira `button`, e quem envia **declara** · os seis
         * formulários do produto já declaravam (o `SaveBar` inclusive), então
         * isto não muda nenhum deles · fecha o caminho pro sétimo.
         *
         * Achado em 27/08/2026 quando um probe procurou o botão de enviar da
         * conversa por `type === 'submit'` e clicou no **"chamar a
         * organização"**, que está fora do formulário e mesmo assim se declara
         * assim pro DOM.
         */
        {...(asChild ? {} : { type: type ?? 'button' })}
        className={cn(
          buttonVariants({ variant, size, className }),
          inertLink && 'pointer-events-none opacity-50',
        )}
        // Passar `disabled` pro `<a>` só imprimiria um atributo que o HTML não
        // conhece · quem comunica ali é o `aria-disabled`.
        {...(inertLink ? { 'aria-disabled': true, tabIndex: -1 } : { disabled })}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
