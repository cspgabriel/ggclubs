import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * As duas peças de que todo esqueleto daqui é feito.
 *
 * **O pulso mora no grupo, não em cada barra.** Barra pulsando por conta
 * própria dessincroniza assim que uma delas entra na tela depois das outras, e
 * meia dúzia de cinzas piscando fora de fase lê como defeito de render. O
 * grupo pulsa uma vez e tudo dentro dele acompanha.
 *
 * A regra que decide o desenho está no `docs/design.md`: **esqueleto repete a
 * geometria do conteúdo**, não um retângulo genérico. Silhueta errada troca o
 * vazio por um salto de layout, que é o defeito que ela existia pra evitar.
 */
export function SkeletonGroup({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & { 'aria-label'?: string }) {
  return (
    <div
      // Esqueleto é enfeite de espera, não conteúdo · quem usa leitor de tela
      // recebe o aviso pelo `role="status"` de quem o renderiza, e ouvir uma
      // dúzia de caixas vazias não ajudaria ninguém.
      aria-hidden
      className={cn('motion-safe:animate-pulse motion-reduce:animate-none', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * A silhueta de um cartão, **com o chanfro da marca.**
 *
 * A regra do `docs/design.md` diz que esqueleto **repete a geometria do
 * conteúdo**, e desde 18/08/2026 a geometria dos cartões deste produto tem
 * canto cortado. Silhueta de canto arredondado onde vai entrar uma peça
 * chanfrada não é só fora da marca: é uma forma que **muda** no instante em que
 * o dado chega, que é exatamente o salto que a silhueta existe pra evitar.
 *
 * **Ela não repete o `Chamfer`** de propósito · aqui não há borda a preservar,
 * então uma camada só basta e a segunda seria peso sem desenho.
 */
export function SkeletonCard({
  className,
  size = '0.9rem',
}: {
  className?: string;
  /** O corte · o mesmo número que o cartão de verdade vai usar. */
  size?: string;
}) {
  return (
    <span
      className={cn('chamfer block bg-secondary', className)}
      style={{ ['--chamfer' as string]: size }}
    />
  );
}

/** Uma barra ou caixa do esqueleto. Sem animação própria · ver `SkeletonGroup`. */
export function SkeletonBar({ className }: { className?: string }) {
  return <span className={cn('block rounded bg-secondary', className)} />;
}
