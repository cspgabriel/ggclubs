import { Eye, EyeOff } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Campo de senha com alternância de visibilidade **nossa**.
 *
 * O Edge desenha um olho próprio em `input[type=password]` (`::-ms-reveal`), e o
 * WebView2 herda isso · resultado: o app desktop mostrava um controle que o site
 * no Chrome não tinha, com outro desenho e fora do nosso design. O nativo é
 * escondido no `index.css` e este componente é o único olho do produto, igual
 * nas duas plataformas.
 *
 * Todo campo de senha do produto passa por aqui · login, cadastro e o que vier
 * de troca de senha. Um `input type=password` solto reintroduz a divergência.
 */
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentPropsWithoutRef<typeof Input>, 'type'>
>(({ className, ...props }, ref) => {
  const { t } = useTranslation();
  const [visible, setVisible] = React.useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        // Espaço pro botão · sem isto o texto longo passa por baixo do ícone.
        className={cn('pr-11', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // Fora da ordem de tabulação: quem navega por teclado está indo do campo
        // pro botão de entrar, e um passo extra no meio atrapalha mais do que
        // ajuda. Continua acessível por leitor de tela e por clique.
        tabIndex={-1}
        aria-label={t(visible ? 'auth.hidePassword' : 'auth.showPassword')}
        aria-pressed={visible}
        className={cn(
          'absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md',
          'text-muted-foreground transition-colors hover:text-foreground',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';
