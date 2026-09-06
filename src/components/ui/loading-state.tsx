import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export type LoadingStateProps = {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  /**
   * Ocupa a área em vez de sentar no topo dela.
   *
   * **`justify-center` não centraliza nada sem altura**, e por isso este
   * componente sempre foi centralizado só na horizontal · dentro de uma seção
   * com conteúdo em volta isso passa, mas como espera de uma tela inteira ele
   * virava um spinner de 24px grudado no topo de uma página vazia, que lê como
   * tela quebrada e não como carregamento.
   *
   * **A altura é em `rem`, nunca em `vh`.** No app instalado a barra de título
   * come 40px da janela, então `vh` mede uma coisa e o espaço disponível é
   * outra · o `index.css` já carrega duas regras só pra corrigir isso em
   * `min-h-screen` e `h-screen`, e elas **não** alcançam valor arbitrário do
   * Tailwind. Medida que não depende da janela não precisa de correção nenhuma
   * e se comporta igual nas duas plataformas.
   */
  fill?: boolean;
  className?: string;
};

const SIZES = {
  sm: { wrapper: 'py-8', icon: 'h-5 w-5', text: 'text-xs' },
  md: { wrapper: 'py-16', icon: 'h-6 w-6', text: 'text-sm' },
  lg: { wrapper: 'py-24', icon: 'h-7 w-7', text: 'text-base' },
} as const;

/** Spinner com rótulo. Para espera de tela inteira, use `fill`. */
export function LoadingState({ label, size = 'md', fill, className }: LoadingStateProps) {
  const { t } = useTranslation();
  const sz = SIZES[size];
  const text = label ?? t('common.loading');
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-muted-foreground',
        fill ? 'min-h-[22rem]' : sz.wrapper,
        className,
      )}
    >
      <Loader2 className={cn('animate-spin text-primary/70', sz.icon)} />
      <span className={cn('font-medium', sz.text)}>{text}</span>
    </div>
  );
}
