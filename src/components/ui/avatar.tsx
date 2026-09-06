import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export type AvatarProps = {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
} as const;

/**
 * Foto com reserva de iniciais. A reserva **não** é detalhe: a URL da foto do
 * Google expira e às vezes é recusada, e sem tratar o erro o `<img>` quebrado
 * mostra o ícone de imagem partida com o texto alternativo do lado · foi o que
 * apareceu no app depois do primeiro login por lá.
 */
export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  // Trocar de conta troca a URL · sem isto a falha da foto anterior ficaria
  // grudada e a nova nunca seria tentada.
  useEffect(() => setFailed(false), [src]);

  const sizeCls = SIZE_CLASSES[size];

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setFailed(true)}
        // O Google recusa a imagem quando o referenciador não é dele · no app
        // a origem é `tauri://`, que é exatamente o caso que ele recusa.
        referrerPolicy="no-referrer"
        // **`<img>` nasce arrastável no HTML**, e isso rouba o gesto de quem
        // está por baixo: no campo da escalação, arrastar em cima da foto
        // levava **a imagem** em vez do slot · achado pelo Eduardo em
        // 07/08/2026. Foto de perfil não é conteúdo pra arrastar pra fora em
        // lugar nenhum deste produto, então a trava vale pro componente todo.
        draggable={false}
        className={cn('shrink-0 rounded-full bg-secondary object-cover', sizeCls, className)}
      />
    );
  }

  return <AvatarFallback name={name} className={cn(sizeCls, className)} />;
}

/**
 * Iniciais em caixa alta com a fonte de display e um anel verde discreto. É a
 * imagem que mais aparece num produto de perfil, então ela veste a marca em vez
 * de ser um círculo cinza genérico.
 */
function AvatarFallback({ name, className }: { name: string; className?: string }) {
  return (
    <div
      aria-label={name}
      role="img"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-display uppercase leading-none tracking-tight',
        'bg-secondary text-primary ring-1 ring-inset ring-primary/30',
        className,
      )}
    >
      {getInitials(name)}
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  const first = parts[0]?.[0] ?? '';
  const last = parts[parts.length - 1]?.[0] ?? '';
  return `${first}${last}`.toUpperCase();
}
