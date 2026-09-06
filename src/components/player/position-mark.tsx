import type { PlayerPosition } from '@ggclubs/schemas';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { positionKey } from '@/lib/position';
import { cn } from '@/lib/utils';

/**
 * A posição do player, ao lado do nome · **card da vitrine e capa do perfil**.
 *
 * **Nasceu como componente e não como duas classes** porque as duas telas já
 * desenhavam a mesma coisa de dois jeitos parecidos, e a terceira (a prévia da
 * tela de conta) desenha pela mesma peça da capa · é a regra da casa: quando a
 * segunda cópia aparece, extrai.
 *
 * **Por que ela ganhou caixa** (pedido do Eduardo em 10/08/2026): como texto
 * solto ela perdia pro `@nick`, que tem selo · numa tela cujo assunto é quem
 * joga onde, a posição é a informação mais **de futebol** que o card carrega, e
 * era a única sem forma própria.
 *
 * **O destaque vem do tamanho e da fonte, não de um verde novo.** O caminho até
 * aqui passou por uma versão **chapada**, recusada pelo Eduardo por sair da
 * identidade e do resto dos selos · e a medição dá razão a ele sobre a causa: o
 * que fazia a primeira tentativa parecer fraca não era a falta de preenchimento,
 * era ela ter **10px ao lado de um nome de 16px**, com as três letras afastadas
 * em 1px. Corrigido o tamanho, o tom de sempre (`success`) destaca sozinho.
 *
 * A `font-display` faz o resto: ela é a voz de placar e de nome de time deste
 * produto, e é o que separa esta peça dos selos do rodapé **sem** gastar uma cor
 * nova · três letras em Archivo Black leem como etiqueta de camisa.
 *
 * **A altura sai do `Badge`**, e isso é o que impede a peça de destoar da
 * fileira do rodapé · foi exatamente o defeito do `PlatformMark` antes de 09/08.
 */
export function PositionMark({
  position,
  size = 'sm',
  className,
}: {
  position: PlayerPosition;
  /** `lg` é a capa do perfil · `sm` é o card e a prévia. */
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <Badge
      variant="success"
      size={size === 'lg' ? 'md' : 'sm'}
      // A sigla sozinha não diz o que ela é · quem passa o ponteiro lê o campo,
      // e o texto continua sendo a sigla do jogo, que é o que quem joga procura.
      title={t('account.positionLabel')}
      className={cn(
        // **A régua desta peça é o nome ao lado, e não a fileira do rodapé** ·
        // por isso ela sai da escada de tamanho do `Badge`. Na medida do selo
        // (10px com 1px de espaçamento) o Eduardo leu a sigla como "fina e
        // pequena", e o número explica: ela era 10 ao lado de um nome de 16, com
        // as três letras afastadas · pouca tinta espalhada em muito espaço.
        // Hoje ela é 13 ao lado de 16, e 16 ao lado de 30/48.
        //
        // **O espaçamento largo saiu junto** · ele é o que dá ar a rótulo de
        // catálogo, e aqui o efeito pretendido é o contrário: etiqueta de
        // camisa, com as letras encostadas.
        'font-display tracking-normal',
        size === 'lg' ? 'h-8 px-2.5 text-base' : 'h-[26px] px-2 text-[13px]',
        className,
      )}
    >
      {t(positionKey(position))}
    </Badge>
  );
}
