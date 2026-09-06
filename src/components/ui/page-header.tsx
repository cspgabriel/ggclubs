import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

/**
 * Cabeçalho de tela do app. **Toda página logada usa este componente**, e a
 * razão é concreta: antes dele havia três tratamentos diferentes em quatro
 * páginas · `text-3xl` no feed, `text-2xl` no admin e um terceiro nos clubs.
 * Ninguém decidiu isso, cada tela nasceu copiando o que estava por perto.
 *
 * O tamanho sobe num degrau só (`2xl` → `3xl`), e a entrelinha anda junto do
 * tamanho em cada breakpoint · a escala do Tailwind carrega entrelinha própria
 * e atropela um `leading-` solto, e abaixo de 0.95 o acento em caixa alta
 * encosta na linha de cima. Ver docs/design.md.
 */
export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  /** Caminho de volta · toda tela de formulário precisa de uma saída. */
  back?: { to: string; label: string };
  /** Ação principal da tela, alinhada à direita do título. */
  action?: ReactNode;
}) {
  return (
    // O espaçamento aqui é hierarquia, não estética. O link de volta, o título
    // e o subtítulo são **um bloco**: o vão entre eles é menor que o vão do
    // bloco pro conteúdo. Com os três igualmente espaçados o link lia como mais
    // um item da página em vez de a saída dela.
    // `mb-6` e não `mb-8`: com 32px o primeiro campo do formulário parecia
    // solto do cabeçalho, e o vão dizia menos sobre hierarquia do que sobre
    // sobra. 24px continua maior que o vão interno do bloco (6px do link pro
    // título, 8px do título pro subtítulo), que é a regra que importa aqui.
    <header className="mb-6">
      {back && (
        <Link
          to={back.to}
          className="mb-1.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl/[0.95] uppercase tracking-tight sm:text-3xl/[0.95]">
          {title}
        </h1>
        {action}
      </div>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
    </header>
  );
}
