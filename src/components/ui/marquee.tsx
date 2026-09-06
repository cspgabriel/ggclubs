import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type MarqueeProps = {
  items: readonly string[];
  /** Tarja verde com texto preto (padrão) ou faixa escura com texto verde. */
  tone?: 'brand' | 'dark';
  className?: string;
};

function Track({ items, innerRef }: { items: string[]; innerRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div
      ref={innerRef}
      className="flex shrink-0 animate-marquee items-center motion-reduce:animate-none"
    >
      {items.map((item, i) => (
        <span key={`${item}-${i}`} className="flex shrink-0 items-center">
          <span className="font-display text-xl uppercase italic tracking-tight md:text-2xl">
            {item}
          </span>
          <span className="px-6 text-xs opacity-60">◆</span>
        </span>
      ))}
    </div>
  );
}

/**
 * Faixa de texto em movimento contínuo, da linguagem de transmissão esportiva.
 *
 * Duas trilhas idênticas lado a lado, cada uma deslocando a própria largura:
 * quando a primeira sai de cena a segunda já ocupou o lugar dela, e o reinício
 * não aparece.
 *
 * A lista é repetida até a trilha ficar mais larga que a tela. Sem isso, poucas
 * palavras deixam a faixa com buraco em monitor largo · e um número fixo de
 * repetições seria chute que quebra na próxima resolução.
 *
 * Decorativa: `aria-hidden` porque repetir a mesma frase em loop só atrapalha
 * quem usa leitor de tela.
 */
export function Marquee({ items, tone = 'brand', className }: MarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [repeat, setRepeat] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    function fill() {
      if (!container || !track) return;
      const unit = track.scrollWidth / repeat;
      if (unit === 0) return;
      const needed = Math.ceil(container.clientWidth / unit) + 1;
      if (needed !== repeat) setRepeat(needed);
    }

    fill();
    const observer = new ResizeObserver(fill);
    observer.observe(container);
    return () => observer.disconnect();
  }, [repeat, items]);

  const filled = Array.from({ length: repeat }, () => items).flat();

  return (
    <div
      aria-hidden
      ref={containerRef}
      className={cn(
        'flex select-none overflow-hidden border-y py-2.5',
        tone === 'brand'
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-primary',
        className,
      )}
    >
      <Track items={filled} innerRef={trackRef} />
      <Track items={filled} />
    </div>
  );
}
