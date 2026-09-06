import { keepDialogOnWindowControl } from '@/lib/dialog-window-controls';
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronLeft, ChevronRight, ExternalLink as ExternalLinkIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from '@/components/ui/external-link';
import { cn } from '@/lib/utils';

/**
 * Uma imagem do nosso CDN, vista **dentro do site**.
 *
 * **O pedido do Eduardo em 19/08/2026** foi este: *"deveria ter um componente
 * para visualizar dentro do site por um dialog/modal, ao invés de clicar e
 * abrir outra guia e tirar o jogador do site"*. Ele está certo, e o custo do
 * jeito antigo é maior do que parece · a aba nova mostra a imagem **crua, no
 * fundo branco do navegador**, sem dizer de quem é nem de que partida, e a
 * volta depende de a pessoa lembrar de fechar a aba.
 *
 * **Ele é `Dialog`, e não `AlertDialog`** · o `DialogSurface` da casa é de
 * **decisão** (role `alertdialog`, que o leitor de tela anuncia como algo que
 * pede resposta). Aqui não há resposta a dar: é conteúdo.
 *
 * **Serve a chave e o painel do admin com a mesma peça** · era isso ou dois
 * visualizadores divergindo no primeiro ajuste, que é a regra da segunda cópia.
 */
export type ViewerImage = {
  url: string;
  /** De quem é · vai no cabeçalho, e é o que o ícone sozinho não dizia. */
  caption: string;
  /** A linha de baixo · placar, horário, o que der contexto. */
  detail?: string;
};

export function ImageViewer({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: ViewerImage[];
  /** Qual está aberta · `null` fecha. */
  index: number | null;
  onIndexChange: (next: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const open = index !== null && images.length > 0;
  /**
   * **O índice, preso à lista** · a tela que abriu pode ter recarregado com
   * menos imagens no meio do caminho (o tempo real muda a partida sozinho), e
   * um índice fora da faixa deixaria o modal aberto sem nada dentro.
   */
  const at = index === null ? 0 : Math.min(Math.max(index, 0), images.length - 1);
  const current = open ? images[at] : undefined;
  const many = images.length > 1;

  /**
   * **Seta do teclado anda entre as imagens** · com duas provas lado a lado (o
   * caso da disputa), obrigar a fechar e reabrir pra ver a outra é o mesmo
   * atrito da aba nova, um nível abaixo. O `Esc` quem trata é o Radix.
   */
  useEffect(() => {
    if (!open || !many) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onIndexChange((at + 1) % images.length);
      if (e.key === 'ArrowLeft') onIndexChange((at - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, many, at, images.length, onIndexChange]);

  if (!current) return null;

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-x-0 bottom-0 z-50 bg-background/90 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content
          onInteractOutside={keepDialogOnWindowControl}
          className={cn(
            'dialog-frame fixed left-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-3xl',
            '-translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl',
            /**
             * **`dialog-in`, e nunca `fade-in`** · e este componente nasceu com
             * o errado, o que o Eduardo viu na hora: *"o dialog abre numa parte
             * da tela e só depois centraliza"*.
             *
             * **O porquê mudou com o Tailwind 4, e o sintoma é o mesmo.** No 3,
             * `-translate-x-1/2` virava `transform`, e qualquer animação de
             * `transform` **sobrescrevia** a centralização. No 4 o utilitário
             * virou a propriedade `translate`, que **soma** com o `transform` ·
             * então o `fade-in`, que anima `translateY(8px)`, abriria o modal
             * 8px fora do lugar em vez de no canto.
             *
             * De um jeito ou de outro, quem serve aqui é o `dialog-in`, que
             * anima **só a escala**. A regra está no `tailwind.config.ts`, ao
             * lado do keyframe · e ainda assim foi furada aqui uma vez.
             */
            'border border-border bg-card shadow-2xl',
            'data-[state=open]:animate-dialog-in motion-reduce:animate-none',
          )}
        >
          {/**
           * **`items-center`, e não `items-start`** · com uma legenda de uma
           * linha só (o print da conversa não tem placar embaixo), o título
           * encostava no topo enquanto os dois ícones de 36px ocupavam a faixa
           * inteira · a barra lia como desalinhada. Apontado pelo Eduardo em
           * 28/08/2026 na captura.
           *
           * Com duas linhas o bloco continua certo, porque quem centraliza é a
           * coluna inteira e não cada linha.
           */}
          <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="truncate font-display text-sm uppercase tracking-wide text-foreground">
                {current.caption}
              </Dialog.Title>
              {current.detail && (
                <Dialog.Description className="mt-0.5 truncate text-xs text-muted-foreground">
                  {current.detail}
                </Dialog.Description>
              )}
            </div>

            {/* **A saída pro original fica, e em peso menor** · quem quer
                inspecionar a imagem crua (ou salvar) continua conseguindo, e
                agora é escolha em vez de único caminho. */}
            <ExternalLink
              href={current.url}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              title={t('viewer.openOriginal')}
            >
              <ExternalLinkIcon className="h-4 w-4" aria-hidden />
              <span className="sr-only">{t('viewer.openOriginal')}</span>
            </ExternalLink>

            <Dialog.Close
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={t('viewer.close')}
            >
              <X className="h-4 w-4" aria-hidden />
            </Dialog.Close>
          </div>

          {/* **`object-contain` e fundo próprio** · print de placar é faixa larga
              desde 19/08 (ele deixou de ser recortado no upload), então a caixa
              tem que se adaptar à imagem, e não o contrário. */}
          {/**
           * **`py-8` e não `p-2`, e um piso de `12rem`** · as setas são alvos de
           * 44px ancorados no meio vertical, e num container curto (imagem
           * pequena, ou uma que não carregou) elas encostavam na borda de cima
           * e na de baixo · apontado pelo Eduardo em 19/08/2026.
           *
           * O `min-h` garante que o espaço exista mesmo quando a imagem é uma
           * faixa baixa · o print do placar é exatamente isso desde que ele
           * deixou de ser recortado. **Este piso já foi trocado por `min-h-0`
           * uma vez, com o comentário apagado no mesmo diff** · e é o defeito de
           * decisão sem motivo escrito que o `CLAUDE.md` descreve.
           *
           * **A rolagem é rede, e não o desenho.** O teto da imagem é uma conta
           * sobre a janela (abaixo), e conta é estimativa: legenda em duas
           * linhas ou contador presente comem mais que o previsto, e o excesso
           * precisa ter pra onde ir. Só que rolador com `items-center` corta o
           * topo **e o corte é inalcançável** (a regra da rolagem interna do
           * `docs/design.md`): quem centraliza é o `my-auto` da imagem, que se
           * rende quando falta espaço. E as setas ficam **fora** do rolador ·
           * dentro dele, `absolute top-1/2` desce junto com o conteúdo.
           */}
          <div className="relative flex min-h-48 flex-1 flex-col bg-background">
            <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto overscroll-contain px-14 py-8">
              <img
                src={current.url}
                alt={current.caption}
                /**
                 * **O teto sai da janela útil, e a conta é esta:** a moldura do
                 * diálogo desconta 10% (o `90dvh` do `.dialog-frame`, que a
                 * 600px são 3.75rem), o cabeçalho com duas linhas ocupa ~4rem,
                 * o contador ~2rem e o `py-8` 4rem · ~14rem. O `70dvh` manda
                 * na janela alta, onde a imagem não precisa encostar nas bordas.
                 */
                className="my-auto max-h-[min(70dvh,max(4rem,calc(var(--app-viewport-h)-14rem)))] w-auto max-w-full object-contain"
              />
            </div>

            {many && (
              <>
                <ViewerArrow
                  side="left"
                  label={t('viewer.previous')}
                  onClick={() => onIndexChange((at - 1 + images.length) % images.length)}
                />
                <ViewerArrow
                  side="right"
                  label={t('viewer.next')}
                  onClick={() => onIndexChange((at + 1) % images.length)}
                />
              </>
            )}
          </div>

          {many && (
            <p className="border-t border-border/60 px-4 py-2 text-center text-[11px] uppercase tracking-widest text-muted-foreground">
              {t('viewer.counter', { current: at + 1, total: images.length })}
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ViewerArrow({
  side,
  label,
  onClick,
}: {
  side: 'left' | 'right';
  label: string;
  onClick: () => void;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        // `touch-target` mantém os 44px de alvo sem inflar o botão · é a mesma
        // regra do sininho.
        'touch-target absolute top-1/2 -translate-y-1/2 rounded-full border border-border/60',
        'bg-card/80 p-2 text-muted-foreground backdrop-blur transition-colors hover:text-foreground',
        side === 'left' ? 'left-2' : 'right-2',
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}

/**
 * O estado do visualizador · **um por tela, e não um por imagem.**
 *
 * Sem ele, cada lugar que mostra prova repetiria os dois `useState` e a conta
 * do índice · e é assim que duas telas passam a fechar o modal de jeitos
 * diferentes.
 */
export function useImageViewer() {
  const [index, setIndex] = useState<number | null>(null);
  return {
    index,
    open: (at: number) => setIndex(at),
    close: () => setIndex(null),
    move: (to: number) => setIndex(to),
  };
}
