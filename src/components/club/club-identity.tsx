import type { Platform } from '@ggclubs/schemas';
import { PlatformMark } from './platform-mark';
import { ClubCrest } from './club-crest';
import { cn } from '@/lib/utils';

/**
 * Escudo + nome + tag + plataforma. Mora num componente só porque aparece em
 * três lugares que precisam ser **a mesma coisa**: a página pública, a prévia
 * do formulário e, mais pra frente, o card compartilhável. Duas versões do
 * cabeçalho do club é como a prévia começa a mentir sobre o resultado.
 */
export function ClubIdentity({
  name,
  tag,
  crestUrl,
  platform,
  size = 'lg',
  className,
}: {
  name: string;
  tag: string;
  crestUrl?: string | null;
  /** `null` só na prévia do formulário, antes de a pessoa escolher. */
  platform: Platform | null;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const isLarge = size === 'lg';

  return (
    <div className={cn('flex items-center gap-4 sm:gap-5', className)}>
      <ClubCrest
        tag={tag}
        crestUrl={crestUrl}
        className={isLarge ? 'h-20 w-20 text-3xl sm:h-24 sm:w-24 sm:text-4xl' : 'h-14 w-14 text-xl'}
      />
      <div className="min-w-0">
        {/* Entrelinha junto do tamanho em cada breakpoint · a escala do Tailwind
            carrega entrelinha própria e atropela `leading-` solto. E não desce
            de 0.95 por causa do acento em caixa alta. */}
        {/* **Duas linhas, não reticências**, e o número veio de medição: no h1
            de display cabem 7 letras médias a 320px, 10 a 390 e 12 a 430 · o
            teto do nome é 20, então em **todo** celular um nome comprido era
            cortado. Reticências num nome de club escondem justamente o que
            identifica o time. Com duas linhas o teto inteiro cabe a partir de
            390px, e a 320 ainda sobra o dobro do que cabia.

            `line-clamp` e não `truncate`: o segundo traz `nowrap` e por isso
            nunca quebra. O clamp continua cortando o caso absurdo, só que
            depois de usar o espaço que existe. */}
        <h1
          className={cn(
            'line-clamp-2 break-words font-display uppercase tracking-tight',
            isLarge ? 'text-3xl/[0.95] sm:text-5xl/[0.95]' : 'text-xl/[0.95]',
          )}
        >
          {name}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {/* A tag é selo, não texto solto · é o que a pessoa grita no jogo e o
              que ela reconhece antes do nome. */}
          <span className="rounded-md bg-primary/10 px-2 py-0.5 font-semibold uppercase tracking-widest text-primary">
            {tag}
          </span>
          {platform ? (
            <PlatformMark platform={platform} withLabel />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </p>
      </div>
    </div>
  );
}
