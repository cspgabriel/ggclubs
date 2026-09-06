import { canPlayTogether, poolOf, type Platform } from '@ggclubs/schemas';
import { useTranslation } from 'react-i18next';
import { Hint } from '@/components/ui/tooltip';
import { POOL_KEY } from '@/lib/clubs';
import { cn } from '@/lib/utils';

/**
 * Selo de crossplay · a geração, e o que ela significa pra quem olha.
 *
 * **Mora em arquivo próprio desde 09/08/2026, e serve club E player** · ele
 * estava dentro do `club-view.tsx`, e por isso a página do player desenhava a
 * geração **à mão**, num selo cinza que só dizia o nome dela · a mesma faixa,
 * dois desenhos, e só um deles respondia a pergunta. Apontado pelo Eduardo.
 *
 * Sem sessão (ou sem plataforma no perfil) ele é neutro e informa a geração.
 * Com plataforma conhecida ele **responde**, em verde ou em cinza, porque essa
 * é a pergunta que traz alguém na página de um club que não é o dele. A
 * explicação inteira fica no tooltip · a resposta cabe em duas palavras e o
 * porquê não precisa ocupar a faixa.
 */
export function CrossplayBadge({
  platform,
  viewerPlatform,
}: {
  platform: Platform;
  viewerPlatform?: Platform | null | undefined;
}) {
  const { t } = useTranslation();
  const generation = t(POOL_KEY[poolOf(platform)]);
  const canPlayHere = viewerPlatform ? canPlayTogether(viewerPlatform, platform) : null;
  // "Você joga aqui" foi a primeira copy e não servia: no próprio club ela é
  // óbvia, e ao lado do selo "Seu club" vira a mesma frase duas vezes. "Mesma
  // geração" é factual, serve pro dono e pro visitante, e quem responde a
  // pergunta é a **cor** · verde quando dá, cinza quando não dá.

  return (
    // O selo **inteiro** é o gatilho da dica. Com um ícone de informação dentro
    // dele, a altura passava a ser a do ícone e o selo ficava mais alto que o
    // texto ao lado · num selo de duas palavras não existe onde tocar que não
    // seja ele mesmo, então o ícone só ocupava espaço.
    <Hint
      label={
        canPlayHere === null
          ? t('club.crossplayHint', { generation: generation })
          : t('club.crossplayHintViewer', { generation: generation })
      }
    >
      <button
        type="button"
        className={cn(
          // A forma é a do `Badge` do produto · `rounded-md`, altura fixa e o
          // anel de dentro. Ele é um `button` porque é o gatilho da dica, então
          // não dá pra usar o componente direto · o que não pode divergir é a
          // aparência.
          //
          // **O `touch-target` é obrigatório e não é enfeite:** no celular o
          // `index.css` dá `min-height: 2.75rem` a todo `button`, e sem a classe
          // o selo inflava de 22 pra **44px**, ficando maior que o dado que ele
          // acompanha. Ela desliga isso **e** desenha os 44px de alvo por fora,
          // com pseudo-elemento · o `min-h-0` que morava aqui virou parte da
          // própria classe na pendência 73. Visto pelo Eduardo em 09/08/2026 e
          // medido em ponteiro grosso · **em janela estreita de desktop o
          // defeito não aparece**, porque a regra é de `pointer: coarse` e não
          // de largura.
          'touch-target inline-flex h-[22px] shrink-0 cursor-help items-center rounded-md px-2 text-[10px] font-semibold uppercase leading-none tracking-widest ring-1 ring-inset',
          canPlayHere
            ? 'bg-primary/15 text-primary ring-primary/25'
            : 'bg-secondary text-muted-foreground ring-border',
        )}
      >
        {canPlayHere === null ? generation : canPlayHere ? t('club.crossplayYes') : t('club.crossplayNo')}
      </button>
    </Hint>
  );
}
