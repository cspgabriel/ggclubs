import { keepDialogOnWindowControl } from '@/lib/dialog-window-controls';
import * as Dialog from '@radix-ui/react-dialog';
import { FORMATION_IDS, type FormationId } from '@ggclubs/schemas';
import { Check, ChevronDown, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormationPreview } from '@/components/club/formation-preview';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { useFormationLabel } from '@/lib/formation';
import { cn } from '@/lib/utils';

/**
 * A escolha da formação · a lista **e** o campo desenhado, lado a lado.
 *
 * **Quatro desenhos foram tentados, e o caminho explica o resultado:**
 *
 * 1. `select` nativo · morreu porque `option` não desenha nada, e a diferença
 *    entre `4-1-2-1-2 Aberto` e `Fechado` não cabe em palavra.
 * 2. Painel flutuante sobre a página · quatro defeitos que eram o mesmo: uma
 *    camada sobreposta precisa **decidir sozinha** quanta tela tem, e daí saíam
 *    altura em pixels, barra de rolagem própria, título grudado no topo e duas
 *    rolagens brigando.
 * 3. A lista **no lugar** do campo. Resolveu os cinco apontamentos do Eduardo e
 *    ainda assim não era a resposta.
 * 4. Este, escolhido por ele em 05/08/2026 entre três caminhos.
 *
 * **A terceira não foi recusada por defeito · ela foi superada.** O problema
 * nunca foi a estética da lista: era que ela **substituía** o campo, e a pessoa
 * perdia a referência exatamente no instante em que comparava. As outras duas
 * opções que estavam na mesa (dialog só com a lista; lista ao lado sem dialog)
 * foram recusadas por não resolverem isso · e a segunda é a que **parece mais
 * barata**, então fica registrada pra não voltar como ideia nova.
 *
 * **O que a terceira versão ganhou e esta não pode perder:** sem painel
 * flutuando sobre a página, sem título de grupo solto, sem rolagem interna
 * brigando com a da página, com a seta indicando o estado, sem desenho nos
 * botões e sem o "de 2 na posição". A camada aqui é um **modal de verdade** ·
 * ele prende o foco e a página de trás não rola, que é o oposto do painel
 * flutuante da segunda tentativa: lá duas rolagens disputavam, aqui só existe
 * uma, a da lista.
 *
 * **A prévia segue o item em destaque, não o escolhido.** É isso que faz
 * percorrer a lista valer alguma coisa · com ela presa na escolha atual, o
 * campo seria uma decoração parada.
 */

/** Quantos zagueiros a formação joga · é o primeiro número do próprio id. */
const BACK_LINES = [3, 4, 5] as const;

export function FormationPicker({
  value,
  onChange,
  labelId,
}: {
  value: FormationId;
  onChange: (next: FormationId) => void;
  /** O `<span>` que rotula o campo · é ele que dá nome acessível ao controle. */
  labelId: string;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const optionId = useId();
  const [open, setOpen] = useState(false);
  /**
   * **O rascunho, e ele é a mudança de 07/08/2026.**
   *
   * Antes o clique aplicava e fechava, e a prévia seguia o **cursor** · quem
   * usa teclado ou toque nunca via formação nenhuma antes de escolher, e quem
   * usa mouse via a prévia mudar sem ter pedido. O Eduardo pediu que o clique
   * **selecione** e que a aplicação seja um passo próprio.
   *
   * Com dois estados a tela passa a dizer duas coisas diferentes: **qual o club
   * joga hoje** (`value`) e **qual você está olhando** (`draft`).
   */
  const [draft, setDraft] = useState<FormationId>(value);
  const [active, setActive] = useState(() => FORMATION_IDS.indexOf(value));

  const label = useFormationLabel();

  // Abrir com 29 opções e começar do topo esconde a escolhida quando ela é uma
  // das últimas · o destaque nasce nela, como o controle nativo fazia.
  // Abrir zera o rascunho na formação atual · sair sem aplicar não pode deixar
  // resíduo da visita anterior esperando na próxima abertura.
  useEffect(() => {
    if (!open) return;
    setDraft(value);
    setActive(FORMATION_IDS.indexOf(value));
  }, [open, value]);

  const changed = draft !== value;

  function select(id: FormationId, index: number) {
    setDraft(id);
    setActive(index);
  }

  function apply() {
    if (!changed) return;
    onChange(draft);
    setOpen(false);
  }

  /**
   * **Rolar é do teclado, e não da abertura** · na versão anterior abrir rolava
   * 1367px medidos, porque a escolhida costuma estar no meio da lista.
   */
  function moveTo(index: number) {
    setActive(index);
    requestAnimationFrame(() =>
      document.getElementById(`${optionId}-${index}`)?.scrollIntoView({ block: 'nearest' }),
    );
  }

  function onKeyDown(e: React.KeyboardEvent) {
    /**
     * **A grade anda como lista, e isso é escolha.** Seta pra baixo num grid
     * "deveria" pular uma linha inteira, e o número de colunas muda com a
     * largura · seguir a grade exigiria medir o layout a cada tecla pra
     * entregar um passo que muda de tamanho quando a janela muda.
     */
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      moveTo((active + 1) % FORMATION_IDS.length);
      return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      moveTo((active - 1 + FORMATION_IDS.length) % FORMATION_IDS.length);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      moveTo(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      moveTo(FORMATION_IDS.length - 1);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const target = FORMATION_IDS[active];
      // **Seleciona, não aplica** · o mesmo que o clique faz. Aplicar é o botão,
      // e ter duas portas pra aplicar traria de volta o "escolhi sem querer".
      if (target) select(target, active);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-labelledby={labelId}
        className="flex min-h-11 w-full items-center gap-3 rounded-lg border bg-card px-3 text-left text-sm font-semibold text-foreground outline-hidden focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span className="flex-1 truncate">{label(value)}</span>
        <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-x-0 bottom-0 z-50 bg-background/80 backdrop-blur-sm" />
        {/*
          **A altura é `dvh` e não `vh`**, e isso não é preciosismo: no celular a
          barra do navegador entra e sai, e `vh` mede a tela sem ela · a lista
          ficaria com o fim escondido atrás da barra justamente quando ela
          reaparece. No app instalado o `index.css` já corrige `vh`, mas ali a
          correção não alcança valor arbitrário do Tailwind.
        */}
        <Dialog.Content
          onInteractOutside={keepDialogOnWindowControl}
          aria-labelledby={titleId}
          onKeyDown={onKeyDown}
          className="dialog-frame fixed left-1/2 z-50 flex w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-background px-4 py-3">
            <Dialog.Title
              id={titleId}
              className="font-display text-lg uppercase tracking-tight sm:text-xl"
            >
              {t('tactic.formation')}
            </Dialog.Title>
            <Dialog.Close
              aria-label={t('common.cancel')}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </Dialog.Close>
          </div>

          {/*
            **A prévia vem primeiro no celular, e isso inverte o que eu tinha
            escrito na pendência.** Lá dizia "lista em cima e campo embaixo" ·
            com a lista rolando, o campo sairia da tela justamente enquanto a
            pessoa percorre, que é o defeito que este desenho existe pra
            resolver. Em cima e parada, ela acompanha.
          */}
          <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:grid-rows-[minmax(0,1fr)]">
            <div className="border-b px-4 py-3 sm:order-2 sm:border-b-0 sm:border-l">
              <p className="mb-2 flex flex-wrap items-center gap-x-2 text-sm font-semibold text-primary">
                {label(draft)}
                {!changed && (
                  <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {t('tactic.formationCurrent')}
                  </span>
                )}
              </p>
              {/* No celular a prévia divide a altura com a lista · 13rem deixava só
                    três linhas visíveis, e percorrer 29 formações vira rolagem
                    demais. Medido: 11rem devolve uma linha e meia.

                    **E em janela baixa o teto é a altura, convertida em largura.**
                    O campo é `aspect-[3/4]` dirigido pela largura, então limitar a
                    altura dele é limitar a largura a 3/4 do que sobra da janela
                    útil (`--app-viewport-h`, nunca a conta escrita à mão) depois
                    da moldura do diálogo: cabeçalho, rótulo, rodapé e uma faixa
                    da lista, ~20rem empilhado e ~12rem lado a lado. É estimativa
                    de propósito · deixar a linha da grade responder exigiria o
                    campo crescer pela altura, e ele é dirigido pela largura. */}
              <div className="mx-auto w-full max-w-[clamp(6rem,calc((var(--app-viewport-h)-20rem)*0.75),11rem)] sm:max-w-[clamp(6rem,calc((var(--app-viewport-h)-12rem)*0.75),20rem)]">
                <FormationPreview formation={draft} />
              </div>
            </div>

            {/* **Uma rolagem só no diálogo inteiro**, e é esta · o cabeçalho, a
                prévia e o rodapé ficam parados. Era exatamente o que a segunda
                tentativa não conseguiu, com duas rolagens brigando. */}
            <div
              role="listbox"
              aria-labelledby={titleId}
              className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-4 py-3 sm:order-1"
            >
              {BACK_LINES.map((back) => (
                <div key={back} className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t('tactic.backLine', { count: back })}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {FORMATION_IDS.map((id, index) => {
                      if (!id.startsWith(`${back}-`)) return null;
                      const applied = id === value;
                      const previewing = id === draft;

                      return (
                        <button
                          key={id}
                          id={`${optionId}-${index}`}
                          type="button"
                          role="option"
                          aria-selected={previewing}
                          onClick={() => select(id, index)}
                          onFocus={() => setActive(index)}
                          /**
                           * **Passar o mouse não muda mais nada** · até 07/08 a
                           * prévia seguia o cursor, e o Eduardo pediu o clique.
                           * Duas fontes movendo a mesma prévia é a pessoa vendo
                           * o campo trocar sem ter pedido.
                           */
                          className={cn(
                            'flex min-h-11 items-center justify-between gap-1 rounded-lg border bg-card px-2 py-2 text-left',
                            previewing && 'border-primary bg-primary/10',
                            !previewing && applied && 'border-primary/40',
                            !previewing &&
                              !applied &&
                              index === active &&
                              'border-muted-foreground/50',
                          )}
                        >
                          <span
                            className={cn(
                              'text-sm font-semibold leading-tight',
                              previewing ? 'text-primary' : 'text-foreground',
                            )}
                          >
                            {label(id)}
                          </span>
                          {/* **A marca da atual não é a mesma da que está em
                              prévia**, e a diferença é o ponto desta tela: uma
                              diz o que o club joga, a outra diz o que você está
                              olhando. */}
                          {applied && (
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                              {t('tactic.formationCurrent')}
                            </span>
                          )}
                          {previewing && !applied && (
                            <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* **O rodapé fica fora da rolagem**, ao lado do cabeçalho · a ação
              principal de um diálogo não pode depender de a pessoa chegar ao
              fim de 29 opções pra existir.

              **Ele empilha no celular em vez de deixar o `flex-wrap` decidir**,
              e a razão é de significado, não de espaço. Com `flex-wrap` numa
              fileira só, abaixo de 500px quem descia era o **botão**, e a frase
              ficava lado a lado com o **Cancelar** · ou seja, a explicação de um
              botão desligado colava no botão ativo, que não precisa de
              explicação nenhuma. Apontado pelo Eduardo em 06/08/2026.

              Empilhado, a frase encabeça o bloco e os dois botões ficam numa
              fileira só. De quebra o rodapé caiu de 125px pra ~101px, na
              largura onde altura é mais escassa.

              **O limiar é 480px e não o `sm` do Tailwind**, e isso foi medido:
              a quebra acontecia abaixo de ~500px, então empilhar até 640 (o
              `sm`) piorava em 32px uma faixa que estava certa. Conserto de
              layout se reconfere na faixa inteira, não só na largura onde o
              defeito apareceu. */}
          <div className="flex shrink-0 flex-col gap-3 border-t bg-background px-4 py-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-end">
            {/* Botão desligado diz por que está desligado · é a mesma regra do
                Salvar da tela de configurar club, e o mesmo motivo: controle
                inerte sem explicação lê como tela quebrada. */}
            {!changed && (
              <span className="text-sm text-muted-foreground min-[480px]:mr-auto">
                {t('tactic.formationUnchanged')}
              </span>
            )}
            <div className="flex items-center justify-end gap-3">
              <Dialog.Close className={cn(buttonVariants({ variant: 'ghost' }))}>
                {t('common.cancel')}
              </Dialog.Close>
              <Button type="button" variant="cta" disabled={!changed} onClick={apply}>
                {t('tactic.formationApply')}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
