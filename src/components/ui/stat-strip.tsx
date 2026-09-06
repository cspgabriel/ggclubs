import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A faixa de dados de uma entidade · o placar de topo das páginas de perfil.
 *
 * **Mora em `ui/` e não em `club/` porque ela nunca foi do club** · o `ClubView`,
 * o `PlayerView` e a ficha da EA (`EaClubCard`, com quatro células) usam a mesma
 * peça · são **três** chamadores desde 24/08/2026, e o nome antigo
 * (`ClubStats`) fazia a tela do player importar algo de `components/club`. Nome
 * que mente sobre o dono é o começo de alguém escrever uma segunda cópia por
 * achar que a primeira não serve · renomeada a pedido do Eduardo em 09/08/2026.
 *
 * É uma **barra**, não três cartões. Cartão com número gigante e rótulo
 * pequeno é a resposta de catálogo pra qualquer painel, e num club de cinco
 * pessoas ela transforma "5" numa manchete. A barra com divisórias finas lê
 * como placar de transmissão, que é o vocabulário deste produto.
 */
export function StatStrip({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="flex flex-wrap items-stretch overflow-hidden rounded-xl border bg-card">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            // `min-w` largo o bastante pra que a faixa vire uma coluna no
            // celular em vez de duas apertadas · com duas, "PLAYSTATION"
            // transbordava a célula a 390px. A divisória some quando a peça é
            // a primeira da linha, senão sobra um risco solto na quebra.
            'min-w-[13rem] flex-1 px-5 py-4',
            i > 0 && 'border-t sm:border-l sm:border-t-0',
          )}
        >
          <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {item.label}
          </dt>
          <dd className="mt-1 truncate font-display text-lg uppercase leading-none tracking-tight sm:text-2xl">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
