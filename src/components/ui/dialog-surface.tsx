import * as AlertDialog from '@radix-ui/react-alert-dialog';
import type { ReactNode } from 'react';
import { BrandWatermark } from '@/components/brand';
import { cn } from '@/lib/utils';

/**
 * A caixa dos diálogos de decisão · overlay, cartão centralizado, marca d'água
 * e o conteúdo rolando por dentro.
 *
 * **O que ela conserta, e não é estética:** o `ConfirmDialog` e o
 * `PositionPicker` eram `overflow-hidden` **sem altura máxima**, então em tela
 * baixa o cartão passava da viewport. Como ele é centralizado por
 * `translateY(-50%)`, o excesso vai pra **cima** · e ali não há como chegar.
 * Medido em 07/08/2026, no diálogo de posição (585px fixos): num celular
 * pequeno **deitado** (740x360) o título e o chip "Sem posição" ficavam a -6px,
 * inalcançáveis por rolar o documento, rolar o diálogo ou `scrollIntoView`. No
 * iPhone SE deitado sobrava **1px**.
 *
 * **É o caso que o `docs/design.md` já descrevia** em "rolagem interna tem dois
 * pré-requisitos": centralizar corta o topo, e o corte é inalcançável. A regra
 * estava escrita e os dois diálogos nasceram sem ela.
 *
 * **O `min-h-0` é o que faz o `overflow-y-auto` valer** · filho de flex nasce
 * com `min-height: auto` e se recusa a encolher, e aí nunca falta espaço pro
 * scroll aparecer.
 *
 * **O seletor de formação não usa esta moldura de propósito** · ele é `max-w-3xl`
 * com duas colunas e rodapé fixo, e já resolvia isso sozinho. Forçá-lo aqui
 * viraria configuração, que é o oposto do que extrair componente serve.
 *
 * **O `Portal` mora aqui dentro, e isso é conserto de 07/08/2026.** Antes ele
 * ficava no chamador, com a moldura como filho único · e como ela devolve
 * **dois** elementos num fragmento, o `Portal` envolvia o par inteiro num
 * `Presence` só e tentava dar um `ref` a um fragmento. O React avisava
 * `Function components cannot be given refs` na saída dos testes, e o efeito de
 * verdade é o `Presence` ficar sem o nó que ele usa pra **segurar o portal
 * durante a animação de saída** · hoje esses diálogos só animam a entrada,
 * então nada quebrava na tela, e era exatamente esse o risco: a próxima pessoa
 * a escrever um `data-[state=closed]:animate-*` aqui veria a animação ser
 * cortada sem nenhuma pista do porquê. Era a pendência 57.
 *
 * Com o `Portal` por dentro, `Overlay` e `Content` voltam a ser filhos diretos
 * dele · cada um ganha o próprio `Presence` e o próprio nó, que é a estrutura
 * que o Radix documenta.
 */
export function DialogSurface({
  children,
  className,
  bodyClassName,
  watermark = true,
}: {
  children: ReactNode;
  /** Só o que é da tela · hoje ninguém precisou, e é bom que continue assim. */
  className?: string;
  /** Salas com compositor fixo distribuem a altura entre cabeçalho e mensagens. */
  bodyClassName?: string;
  /**
   * **A marca de fundo, e o primeiro diálogo que a desliga é a conversa** ·
   * 27/08/2026, olhando a captura.
   *
   * Numa janela de decisão (encerrar, confirmar, lançar placar) o ladrilho é
   * textura atrás de três linhas de texto. **Numa sala de conversa ele vira o
   * assunto**: o vazio acima das mensagens é a maior parte da janela, e ali a
   * marca compete com o conteúdo em vez de emoldurá-lo.
   */
  watermark?: boolean;
}) {
  return (
    <AlertDialog.Portal>
      {/**
       * **O véu escurece mais do que borra** · o `blur` num diálogo alto e
       * estreito custa o desenho da página inteira e ainda deixa o fundo
       * "sujo". Pedido do Eduardo em 27/08/2026 · a conversa fica lida sem
       * competir com a tela atrás.
       */}
      <AlertDialog.Overlay className="dialog-overlay fixed inset-x-0 bottom-0 z-50 bg-background/80 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
      <AlertDialog.Content
        className={cn(
          'dialog-frame fixed left-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-md',
          '-translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden',
          'rounded-2xl border bg-card shadow-2xl',
          'data-[state=open]:animate-dialog-in motion-reduce:animate-none',
          className,
        )}
      >
        {/* Metade da opacidade padrão · numa janela de 28rem o ladrilho fica
            muito mais denso que num painel de tela cheia, e o que era textura
            vira ruído atrás do texto que a pessoa precisa ler. */}
        {watermark && <BrandWatermark className="opacity-50" />}
        {/**
         * **`overscroll-contain` é o que impede o scroll de vazar pra página de
         * trás** · 28/08/2026, achado do Eduardo na súmula da EA: *"está com o
         * scroll diferente dos outros padrões"*.
         *
         * Ele estava certo, e a diferença não era do diálogo dele: era **a
         * ausência disto aqui**, que vale pros seis. Sem a regra, chegar ao fim
         * da rolagem interna **continua rolando o documento atrás** · o diálogo
         * fica parado e a página se move debaixo dele, que é a sensação de
         * "scroll estranho" mesmo quando ninguém sabe nomear.
         *
         * **Ela já existia em dois lugares** (`MessageScroller` e
         * `StickyAside`) e não em quem mais precisava · quem rola por cima da
         * página segura o próprio scroll. É regra de `docs/design.md` desde
         * hoje.
         */}
        <div
          className={cn('relative min-h-0 overflow-y-auto overscroll-contain p-6', bodyClassName)}
        >
          {children}
        </div>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  );
}
