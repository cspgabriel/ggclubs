import type { PlayerPosition } from '@ggclubs/schemas';
import { PositionMark } from '@/components/player/position-mark';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/**
 * Foto + nome + @nick + posição.
 *
 * **Componente pelo mesmo motivo do `ClubIdentity`:** aparece na página do
 * player e na **prévia** da tela de configurar a conta, e as duas precisam ser
 * a mesma coisa. Duas versões do cabeçalho é como a prévia começa a mentir
 * sobre o resultado · foi o argumento que criou a do club, e vale igual aqui.
 *
 * **A plataforma saiu daqui em 10/08/2026**, e foi o Eduardo quem viu: na página
 * do player ela aparecia nesta linha **e** de novo na faixa de números, a uns
 * dois palmos de distância. Quem ficou foi a de baixo, porque lá ela vem com a
 * comparação de geração ao lado · ou seja, ela responde *dá pra jogar junto* em
 * vez de só dizer o aparelho. **A prévia da tela de conta perde a plataforma
 * junto, e isso é acerto e não perda:** prévia que mostra o que a página não
 * mostra é prévia mentindo · quem está escolhendo a plataforma tem o cartão
 * dela aceso no formulário, dois campos acima.
 */
export function PlayerIdentity({
  displayName,
  handle,
  avatarUrl,
  position,
  size = 'lg',
  className,
}: {
  displayName: string;
  handle: string;
  avatarUrl?: string | null;
  position: PlayerPosition | null;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const isLarge = size === 'lg';

  return (
    <div className={cn('flex items-center gap-4 sm:gap-5', className)}>
      <Avatar
        name={displayName}
        src={avatarUrl}
        className={
          isLarge ? 'h-20 w-20 text-2xl sm:h-24 sm:w-24 sm:text-3xl' : 'h-14 w-14 text-lg'
        }
      />
      <div className="min-w-0">
        {/* **Nome de identidade quebra, não corta** · reticências escondem
            justamente o que identifica a pessoa. Mesma decisão do nome do club,
            e a entrelinha anda junto do tamanho em cada breakpoint. */}
        <p
          className={cn(
            'line-clamp-2 break-words font-display uppercase tracking-tight',
            isLarge ? 'text-3xl/[0.95] sm:text-5xl/[0.95]' : 'text-xl/[0.95]',
          )}
        >
          {displayName}
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {/* **A posição vem primeiro, colada no nome** · o começo da linha é o
              lugar mais forte dela, e é o que põe a posição logo abaixo do nome
              em vez de atrás do endereço. No card da vitrine ela fica **depois**
              do nome porque lá os dois dividem a mesma linha · nas duas telas o
              que vale é o mesmo: ela encosta no nome. */}
          {position && <PositionMark position={position} size={size} />}
          {/* O @ fica visível porque é ele que comunica que aquilo é endereço
              público, e não apelido · mesmo selo da tag do club. */}
          <span className="rounded-md bg-primary/10 px-2 py-0.5 font-semibold tracking-widest text-primary">
            @{handle}
          </span>
        </p>
      </div>
    </div>
  );
}
