import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Loader2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { buttonVariants } from '@/components/ui/button-variants';
import { DialogSurface } from '@/components/ui/dialog-surface';
import { cn } from '@/lib/utils';

/**
 * Confirmação de uma ação, com a identidade da casa.
 *
 * Primitivo `AlertDialog` do Radix e não `Dialog`: ele prende o foco, associa
 * título e descrição por `aria`, e **não fecha clicando fora** · janela de
 * confirmação que some com um clique distraído não confirma nada. O ESC
 * continua fechando, porque cancelar tem que ser fácil; é confirmar que tem
 * que ser deliberado.
 *
 * Três decisões de desenho, todas seguindo o que já está em docs/design.md:
 *
 * - **A marca d'água ladrilhada** aparece aqui como aparece no painel de
 *   entrada e na capa do club. É o que faz a janela pertencer ao produto em
 *   vez de parecer alerta do sistema.
 * - **Título em display, caixa alta.** É o vocabulário de placar da marca, e
 *   uma confirmação é exatamente o momento de a tela falar alto.
 * - **A ação confirmadora leva o peso**, a de cancelar é fantasma. Dois botões
 *   com o mesmo peso dividem a atenção, que é a regra da escada de botões.
 *
 * O rótulo do botão **repete o verbo da ação**, nunca "OK": a ação mantém o
 * mesmo nome do gatilho até o fim da jornada, e "OK" não diz o que vai
 * acontecer quando a pessoa já esqueceu o que clicou.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  body,
  confirmLabel,
  confirmDisabled,
  onConfirm,
  tone = 'brand',
  dismissLabel,
  confirmPhrase,
  confirmPhraseLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Aceita nó, e não só texto, porque **o sujeito da frase vai em verde** ·
   * `<Trans>` com `<0>` no catálogo, como o corpo do diálogo de remover já
   * fazia. Ver `docs/i18n.md`.
   */
  title: ReactNode;
  description: ReactNode;
  /**
   * O corpo **interativo** da janela, abaixo da descrição.
   *
   * Existe porque a `Description` do Radix é um `<p>`, e um formulário dentro
   * dela é `<div>` dentro de `<p>` · o React 19 reclama e a hidratação de um
   * dia quebraria. Achado pelo `revisor` em 01/09/2026, quando o campo de
   * telefone passou a ser pedido dentro do diálogo da inscrição.
   *
   * É o mesmo lugar onde o `confirmPhrase` já montava o `input` dele.
   */
  body?: ReactNode;
  confirmLabel: string;
  /**
   * Segura o botão de confirmar enquanto algo do corpo da janela ainda está
   * chegando.
   *
   * **Nasceu com a nota do que a posse leva junto** (18/08/2026): ela é
   * buscada quando a janela abre, e sem isto dava pra confirmar antes de ela
   * aparecer · ou seja, passar o club sem nunca ler que o campeonato ia junto.
   * O `sending` não servia: ele é sobre a chamada que **esta** janela faz.
   */
  confirmDisabled?: boolean;
  /**
   * Pode ser assíncrona · a janela segura o botão até resolver.
   *
   * Recebe **o que foi digitado** quando há `confirmPhrase`, pra quem confirma
   * mandar ao servidor o texto da pessoa e não uma cópia que o código já tinha
   * em mãos · assim a conferência de lá vale pro caminho da tela também, e não
   * só pra quem chama a API direto.
   */
  onConfirm: (typed: string) => Promise<void> | void;
  tone?: 'brand' | 'destructive';
  /**
   * O rótulo de **dispensar**, quando "Cancelar" colide com o assunto.
   *
   * Nasceu da janela de cancelar edição (19/08/2026): os dois botões começavam
   * com a mesma palavra · "Cancelar edição" agia e "Cancelar" desistia, lado a
   * lado. Numa janela cujo assunto **é** cancelar, essa é a pior ambiguidade
   * possível, e ela cai justo em cima de quem tem menos contexto.
   *
   * A saída não é renomear o destrutivo · ele repete o verbo do gatilho de
   * propósito. É o de dispensar que passa a dizer o que ele preserva.
   */
  dismissLabel?: string;
  /**
   * Exige digitar esta palavra pra liberar o botão.
   *
   * **Só pra ação que não tem desfazer**, e é o freio proporcional: clicar em
   * "sim" é reflexo, digitar a tag do próprio club é uma decisão. É o mesmo
   * mecanismo que GitHub e Discord usam pra apagar repositório e servidor.
   *
   * **Não é controle de segurança**, e vale dizer com todas as letras: a tag é
   * pública, então quem chama a API direto já a conhece.
   *
   * **E quem leva a frase adiante é o chamador, não este componente** · esta
   * linha já afirmou que "a conferência do servidor garante que a confirmação
   * faz parte do contrato", e isso só é verdade em **um** dos três que usam a
   * frase (encerrar club, que manda o `typed` pra rota). O de cancelar edição e
   * o de despublicar documento legal **descartam** o que foi digitado, e nas
   * rotas deles não há campo de confirmação nenhum · lá o freio é só do
   * navegador. Corrigido em 19/08/2026, achado pelo `revisor`.
   *
   * Quem quiser o contrato de verdade recebe o `typed` no `onConfirm` e o manda
   * adiante · aí o texto que chega ao servidor é o que a pessoa digitou, e não
   * uma cópia que o código já tinha em mãos.
   */
  confirmPhrase?: string;
  confirmPhraseLabel?: ReactNode;
}) {
  const { t } = useTranslation();
  const [sending, setSending] = useState(false);
  const [typed, setTyped] = useState('');

  // Comparação sem caixa e sem espaço · a tag aparece em caixa alta na tela e é
  // guardada em minúscula, então exigir a forma exata seria pegadinha.
  const phraseOk =
    !confirmPhrase || typed.trim().toLowerCase() === confirmPhrase.trim().toLowerCase();

  async function confirm() {
    setSending(true);
    try {
      await onConfirm(typed);
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        // Fechar limpa o que foi digitado · sem isto, reabrir a janela traz a
        // confirmação já preenchida, e aí o freio deixa de existir na segunda
        // vez, que é justamente quando a pessoa está no automático.
        if (!next) setTyped('');
        onOpenChange(next);
      }}
    >
      {/* O `Portal` mora dentro do `DialogSurface` desde 07/08/2026 · ver o
          comentário de lá, e a pendência 57. */}
      <DialogSurface>
          <div>
            <AlertDialog.Title className="font-display text-xl/[0.95] uppercase tracking-tight sm:text-2xl/[0.95]">
              {title}
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-3 text-sm text-muted-foreground">
              {description}
            </AlertDialog.Description>

            {body ? <div className="mt-4">{body}</div> : null}

            {confirmPhrase && (
              <div className="mt-4">
                <label
                  htmlFor="confirm-phrase"
                  className="mb-1.5 block text-xs text-muted-foreground"
                >
                  {confirmPhraseLabel}
                </label>
                <input
                  id="confirm-phrase"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 uppercase ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialog.Cancel
                className={cn(buttonVariants({ variant: 'ghost' }), 'sm:min-w-24')}
                disabled={sending}
              >
                {dismissLabel ?? t('common.cancel')}
              </AlertDialog.Cancel>
              {/* Não é `AlertDialog.Action`: ele fecha a janela no clique, e
                  aqui o fechamento tem que esperar a chamada terminar · senão
                  a janela some e a falha aparece atrás dela, sem dono. */}
              <button
                type="button"
                onClick={() => void confirm()}
                disabled={sending || !phraseOk || confirmDisabled === true}
                className={cn(
                  buttonVariants({ variant: tone === 'destructive' ? 'destructive' : 'cta' }),
                  'sm:min-w-32',
                )}
              >
                {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </div>
      </DialogSurface>
    </AlertDialog.Root>
  );
}
