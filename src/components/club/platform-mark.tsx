import type { Platform } from '@ggclubs/schemas';
import { useTranslation } from 'react-i18next';
import { PlatformGlyph } from '@/components/icons/platform';
import { PLATFORM_LABEL } from '@/lib/clubs';
import { cn } from '@/lib/utils';

/**
 * Marca de plataforma · o glifo dentro de um selo chanfrado.
 *
 * O chanfro é a regra da marca aplicada no menor tamanho possível: corta o
 * canto superior esquerdo e o inferior direito, e nenhum outro (ver
 * docs/design.md). É ele que faz três ícones de origens diferentes lerem como
 * peças do mesmo sistema em vez de adesivos colados.
 *
 * Neutro por padrão · plataforma é informação, não destaque. Verde é da marca
 * e do estado ativo, e três selos verdes num card matariam o destaque de tudo.
 * A exceção é `tone="on"`, usado quando a opção está selecionada num
 * formulário, que é exatamente o caso em que verde significa ativo.
 */

const CHAMFER = 'polygon(26% 0, 100% 0, 100% 74%, 74% 100%, 0 100%, 0 26%)';

// Medido, não escolhido no olho: a 12px os quatro botões do PlayStation não
// se separam e o xis do Xbox fecha. 14px é o piso em que os três ainda lêem.
const SIZES = {
  sm: { caixa: 'h-[22px] w-[22px]', glifo: 'h-3.5 w-3.5' },
  md: { caixa: 'h-8 w-8', glifo: 'h-5 w-5' },
} as const;

export function PlatformMark({
  platform,
  className,
  withLabel = false,
  size = 'sm',
  tone = 'muted',
  variant = 'chip',
  subject = 'club',
}: {
  platform: Platform;
  className?: string;
  /** Mostra o nome ao lado · onde há espaço, o nome ganha do ícone sozinho. */
  withLabel?: boolean;
  /**
   * De quem é a plataforma · só muda o texto do leitor de tela.
   *
   * **Existe porque o rótulo dizia "Onde o club joga" para qualquer um.** Ele
   * viveu assim sem incomodar ninguém por um motivo que engana: **os sete
   * chamadores anteriores passavam `withLabel`**, e aí o ramo `sr-only` nem
   * roda · o texto de club era código morto até a busca de player usar o ícone
   * sozinho, em 04/08/2026. Componente compartilhado se confere em todos os
   * chamadores, e este só tinha sido conferido nos que não o exercitavam.
   */
  subject?: 'club' | 'player';
  size?: keyof typeof SIZES;
  tone?: 'muted' | 'on';
  /**
   * `chip` é o selo chanfrado, pra contexto denso (card, faixa de dados).
   * `plain` é o glifo solto, pro seletor do formulário · ali o cartão inteiro
   * já muda de cor quando marcado, e um selo com fundo próprio vira uma
   * segunda superfície brigando com a primeira.
   */
  variant?: 'chip' | 'plain';
}) {
  const { t } = useTranslation();
  const label = PLATFORM_LABEL[platform];
  const { caixa, glifo } = SIZES[size];

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {variant === 'chip' ? (
        <span
          aria-hidden
          style={{ clipPath: CHAMFER }}
          className={cn(
            'flex shrink-0 items-center justify-center',
            caixa,
            tone === 'on' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
          )}
        >
          <PlatformGlyph platform={platform} className={glifo} />
        </span>
      ) : (
        <PlatformGlyph platform={platform} className={cn('shrink-0', glifo)} />
      )}
      {withLabel ? (
        <span className={variant === 'plain' || tone === 'on' ? undefined : 'text-muted-foreground'}>
          {label}
        </span>
      ) : (
        // Sem rótulo visível o ícone sozinho não diz "plataforma" pra leitor de
        // tela · o nome completo entra como texto acessível.
        <span className="sr-only">
          {t(subject === 'player' ? 'club.platformLabelPlayer' : 'club.platformLabel')}: {label}
        </span>
      )}
    </span>
  );
}
