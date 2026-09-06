import type { ParseKeys } from 'i18next';
import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export type MobileNavItem = {
  to: string;
  /** Chave do catálogo, não texto · `ParseKeys` faz o compilador cobrar que ela exista. */
  labelKey: ParseKeys;
  icon: LucideIcon;
  end?: boolean;
};

/**
 * Navegação flutuante de celular. Só aparece abaixo de `sm` · no desktop a
 * navegação continua no header, que é onde o mouse já procura.
 *
 * Três cuidados que não são estética:
 * - `env(safe-area-inset-bottom)` afasta a barra do indicador de home do iPhone,
 *   senão o último item fica embaixo dele e não recebe o toque.
 * - Cada alvo tem 44px, o mínimo pra dedo.
 * - Ícone sozinho precisa de `aria-label`: sem ele, leitor de tela anuncia o
 *   link como "link" e nada mais.
 */
export function MobileNav({
  items,
  /**
   * Até onde a barra flutuante substitui a navegação do header.
   *
   * **Existe porque a navegação e a marca disputam a mesma linha**, e o ponto em
   * que elas param de caber depende de quantos itens cada área tem. Quem paga o
   * degrau é quem precisa dele:
   *
   * | | até onde |
   * |---|---|
   * | o produto, com dois itens | **`md`** |
   * | o admin, com quatro ferramentas | **`lg`** |
   *
   * **Os dois já foram um degrau mais cedo e voltaram pelo mesmo motivo**, com
   * um ano de distância de horas: o header estourou 108px a 640 no admin em
   * 11/08, virou `md`; e em 12/08 estourava de novo · **7px a 640 no produto e
   * 28px a 768 no admin**. A causa da segunda rodada foi o **sininho**, que
   * entrou nas ações em 11/08 e ninguém remediu o header depois. Ver a
   * pendência 80.
   */
  until = 'sm',
}: {
  items: ReadonlyArray<MobileNavItem>;
  until?: 'sm' | 'md' | 'lg';
}) {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t('nav.primary')}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]',
        // Classe inteira e literal · o Tailwind varre o texto do arquivo, então
        // `${until}:hidden` montado em tempo de execução não é gerado no CSS e
        // a barra ficaria visível em toda largura, sem erro nenhum.
        { sm: 'sm:hidden', md: 'md:hidden', lg: 'lg:hidden' }[until],
      )}
    >
      {/* **O vidro é mais aberto do que era** · `/80` com desfoque médio ainda
          lia como placa opaca sobre conteúdo escuro. Os números são os mesmos
          da faixa do jogo, que flutua ao lado desta · duas peças flutuantes com
          transparências diferentes leem como camadas de sistemas diferentes. */}
      <ul className="flex items-center gap-1 rounded-full border border-border/70 bg-background/70 p-1.5 shadow-lg backdrop-blur-xl">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              aria-label={t(item.labelKey)}
              title={t(item.labelKey)}
              className={({ isActive }) =>
                cn(
                  'flex h-11 w-14 items-center justify-center rounded-full transition-colors',
                  isActive
                    ? 'bg-secondary text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <item.icon
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.4 : 2}
                  aria-hidden
                  focusable="false"
                />
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
