import type { PlayerPosition } from '@ggclubs/schemas';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { buttonVariants } from '@/components/ui/button-variants';
import { DialogSurface } from '@/components/ui/dialog-surface';
import { positionKey } from '@/lib/position';
import { cn } from '@/lib/utils';

/**
 * As doze posições agrupadas por linha do campo.
 *
 * **O agrupamento não é pra caber melhor, é pra ler.** Doze siglas numa lista
 * corrida obrigam a procurar; em quatro linhas o olho vai direto, porque é assim
 * que quem joga pensa o campo. Mesmo raciocínio do seletor de plataforma, que
 * agrupa por geração pra ensinar a regra do crossplay.
 */
const LINES: { key: string; positions: PlayerPosition[] }[] = [
  { key: 'goalkeeper', positions: ['GK'] },
  { key: 'defense', positions: ['CB', 'LB', 'RB'] },
  { key: 'midfield', positions: ['CDM', 'CM', 'CAM', 'LM', 'RM'] },
  { key: 'attack', positions: ['LW', 'RW', 'ST'] },
];

/**
 * A grade de posições, sem janela.
 *
 * Existe separada porque a segunda tela que precisou dela é um **formulário**
 * (o cadastro), não um dialog · duas cópias da mesma grade divergiriam no
 * primeiro ajuste, que é a regra de extrair o componente quando duas telas
 * fazem a mesma coisa.
 */
export function PositionChips({
  value,
  onPick,
  disabled,
  noneLabel,
}: {
  /**
   * **`null` e `undefined` são coisas diferentes aqui**, e é essa distinção que
   * decide se o chip de "sem posição" nasce marcado.
   *
   * `null` é **escolha**: a pessoa disse que não tem posição, e o chip fica
   * verde porque isso é verdade. `undefined` é **ainda não respondeu**, e aí
   * nada na grade fica marcado.
   *
   * Sem a distinção, o cadastro abria com "Sem posição" já verde · afirmando
   * uma escolha que ninguém fez, contra a regra *verde só quando ativo* do
   * `docs/design.md`. No diálogo do club o valor sempre existe (é o que está
   * gravado), então lá só o `null` acontece.
   */
  value: PlayerPosition | null | undefined;
  onPick: (position: PlayerPosition | null) => void;
  disabled?: boolean;
  /**
   * Quando presente, a grade ganha um chip de **sem posição**, no topo.
   *
   * **As duas telas passam**, desde 07/08/2026 · o diálogo do club porque
   * **edita** um valor que já existe e precisa voltar ao vazio, e o cadastro
   * porque antes ele limpava por **clique repetido na escolhida**, um toggle
   * que funcionava e que ninguém descobre.
   *
   * Ele nasceu naquele dia · antes, "sem posição" era um **botão no rodapé**
   * do diálogo, ao lado do Cancelar, o que a fazia ler como uma terceira ação
   * quando ela é só mais uma escolha. Apontado pelo Eduardo.
   */
  noneLabel?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {noneLabel && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onPick(null)}
          className={cn(
            // **Sem `touch-target` de propósito** · a classe quer dizer "sou
            // pequeno e não quero crescer", e este é um cartão de escolha de
            // largura inteira. No celular ele **deve** medir os 44px, e quem os
            // dá é a regra de `button` do `index.css`. Pendência 73.
            'w-full rounded-md border px-3 py-2 text-sm font-semibold transition',
            // `=== null`, e não `!value` · `undefined` é quem ainda não
            // respondeu, e nesse caso nada nasce marcado.
            value === null
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-input text-muted-foreground hover:bg-secondary',
          )}
        >
          {noneLabel}
        </button>
      )}
      {LINES.map((line) => (
        <div key={line.key}>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            {t(`positionLine.${line.key}` as 'positionLine.defense')}
          </p>
          <div className="flex flex-wrap gap-2">
            {line.positions.map((position) => (
              <button
                key={position}
                type="button"
                disabled={disabled}
                onClick={() => onPick(position)}
                className={cn(
                  // Mesmo motivo do cartão acima · chip de escolha quer os 44px
                  // de altura no toque, não uma área desenhada por fora.
                  'min-w-14 rounded-md border px-3 py-2 text-sm font-semibold transition',
                  position === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input text-foreground hover:bg-secondary',
                )}
              >
                {t(positionKey(position))}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Escolher a posição de alguém no club.
 *
 * `AlertDialog` como o `ConfirmDialog`, pelos mesmos motivos: foco preso, ESC
 * fechando e sem fechar clicando fora.
 *
 * **O clique seleciona; aplicar é um passo próprio** · pedido do Eduardo em
 * 07/08/2026, e é a mesma correção que o seletor de formação recebeu em 06/08.
 * Antes escolher aplicava e fechava na hora, e isso tem dois preços: encostar
 * na sigla errada grava, e a pessoa não consegue comparar duas escolhas sem
 * gravar as duas. Com rascunho, percorrer a grade é de graça.
 *
 * Este comentário existia dizendo o **contrário** ("escolher já resolve, um
 * segundo clique só confirmaria o que a pessoa acabou de apontar"). O argumento
 * ignorava o toque errado e a comparação · fica registrado porque ele volta
 * fácil como "simplificação".
 */
export function PositionPicker({
  open,
  onOpenChange,
  title,
  current,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  current: PlayerPosition | null;
  onPick: (position: PlayerPosition | null) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<PlayerPosition | null>(current);

  // Abrir zera o rascunho na posição atual · sair sem aplicar não pode deixar
  // resíduo da visita anterior esperando na próxima abertura. Mesma regra do
  // seletor de formação.
  useEffect(() => {
    if (open) setDraft(current);
  }, [open, current]);

  const changed = draft !== current;

  async function apply() {
    if (!changed) return;
    setBusy(true);
    try {
      await onPick(draft);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {/* O `Portal` mora dentro do `DialogSurface` desde 07/08/2026 · ver o
          comentário de lá, e a pendência 57. */}
      <DialogSurface>
          <div>
            <AlertDialog.Title className="font-display text-xl/[0.95] uppercase tracking-tight sm:text-2xl/[0.95]">
              {title}
            </AlertDialog.Title>

            <div className="mt-5">
              {/* Campo opcional precisa poder voltar ao vazio · regra do
                  docs/design.md. A saída virou **chip na grade** em 07/08/2026:
                  como botão de rodapé, ao lado do Cancelar, ela lia como uma
                  terceira ação quando é só mais uma escolha. */}
              <PositionChips
                value={draft}
                onPick={setDraft}
                disabled={busy}
                noneLabel={t('club.positionClear')}
              />
            </div>

            {/* **Empilhado em toda largura, e isso saiu da medição.** A ideia
                era virar fileira acima de um limiar, como o rodapé do seletor
                de formação · mas ali o diálogo cresce até 3xl e aqui ele é capado
                em `max-w-md`. Medido: com os dois botões ao lado, a frase quebra
                em **duas** linhas mesmo numa janela de 580px, e em três a 440.
                Empilhada, ela cabe numa linha só a partir de 320.

                Ou seja: o limiar não existia · a fileira nunca é melhor aqui. */}
            <div className="mt-6 flex flex-col gap-3">
              {/* Botão desligado diz por que está desligado. */}
              {!changed && (
                <span className="text-sm text-muted-foreground">
                  {t('club.positionUnchanged')}
                </span>
              )}
              <div className="flex items-center justify-end gap-3">
                <AlertDialog.Cancel
                  className={cn(buttonVariants({ variant: 'ghost' }))}
                  disabled={busy}
                >
                  {t('common.cancel')}
                </AlertDialog.Cancel>
                <button
                  type="button"
                  disabled={busy || !changed}
                  onClick={() => void apply()}
                  className={cn(buttonVariants({ variant: 'cta' }))}
                >
                  {t('club.positionApply')}
                </button>
              </div>
            </div>
          </div>
      </DialogSurface>
    </AlertDialog.Root>
  );
}
