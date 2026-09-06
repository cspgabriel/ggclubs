import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * **O `touch-target` aqui não é enfeite, é o que impede a caixa de virar uma
 * barra.** O Radix desenha a raiz como `button`, e o `index.css` dá 44px de
 * altura mínima a todo botão em ponteiro grosso · numa caixa de 20x20 isso
 * produz **20 de largura por 44 de altura**, que foi o que o Eduardo viu no
 * celular em 10/08/2026, na chave de privacidade. A classe desliga o mínimo e
 * desenha os 44px **por fora**, invisíveis.
 *
 * A área só cresce na vertical, e aqui isso basta: os dois usos põem a caixa
 * dentro de um `<label>` que embrulha o texto, então a linha inteira é alvo.
 *
 * ---
 *
 * **O `relative` é o que impede esta caixa de esticar a PÁGINA INTEIRA**, e o
 * defeito que ele conserta não tem nada a ver com a aparência dela.
 *
 * O Radix mantém um `<input type="checkbox">` nativo escondido junto da raiz,
 * pra o controle valer em formulário de verdade · e posiciona esse input com
 * `position: absolute` e um `top` em **pixels absolutos**, calculado a partir
 * de onde o botão está. **Sem um ancestral posicionado, esse `absolute` se
 * resolve contra o documento** · num formulário longo o `top` vira `1255px`, e
 * o `<html>` passa a rolar até lá **mesmo com o `<body>` inteiro cabendo na
 * janela**.
 *
 * Foi o que o Eduardo viu no `/onboarding` em 28/08/2026 · **dois scrolls e uma
 * faixa preta abaixo do rodapé**. Medido: a página rolava +475px a 1280x800 com
 * o `body` em 800, e esconder **só este input** devolvia o documento a 800.
 *
 * **O conserto mora aqui e não na tela** porque a causa é do componente: toda
 * tela que puser um `Checkbox` dentro de ancestral `static` teria o mesmo, e a
 * terceira ia nascer com o defeito de novo.
 *
 * > **E ele precisa ser um WRAPPER, não uma classe na raiz** · o Radix devolve
 * > um fragmento com **dois irmãos** (o `button` que se vê e o `input` que não),
 * > então `relative` na raiz não contém o vizinho · o pai de verdade do input é
 * > quem quer que envolva o componente. Pôr a classe na raiz foi a primeira
 * > tentativa, e o probe mediu **o mesmo número de antes**.
 */
export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  // `inline-flex` e não `block` · o wrapper vira o item do flex do `<label>`, e
  // um bloco esticaria a caixa de 20px pra largura toda da linha.
  <span className="relative inline-flex shrink-0">
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'touch-target peer h-5 w-5 shrink-0 rounded-sm border border-input transition-colors ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className={cn('flex items-center justify-center text-current')}>
        <Check className="h-4 w-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  </span>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
