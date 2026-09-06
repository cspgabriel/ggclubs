import { Check, Loader2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

/**
 * A barra de gravar do produto · o botão, o motivo de ele estar desligado e a
 * confirmação temporária.
 *
 * **Ela existe porque quatro telas resolviam a mesma coisa de quatro jeitos**, e
 * a quarta inventou um quinto: `/app/conta` chegou a mostrar **"Salvo"** e
 * **"Nada mudou ainda"** lado a lado, que se contradiz. Apontado pelo Eduardo em
 * 08/08/2026, e é a pendência 64.
 *
 * O que ela é dona, e que cada tela vinha escrevendo à mão:
 *
 * - **o "salvo" ganha a vez** do "nada mudou" · os dois são verdade no instante
 *   depois de gravar, porque salvar zera a edição;
 * - **o relógio da confirmação** · ela some sozinha, e o número mora aqui;
 * - **o `aria-live`**, pra quem não está olhando o canto da tela;
 * - **o botão desligado dizendo por quê** · controle inerte sem explicação lê
 *   como tela quebrada, e essa regra já foi furada uma vez (pendência 41).
 *
 * **O que fica de cada tela é o verbo** · "Salvar", "Salvar escalação",
 * "Publicar". É a mesma divisão do `site-header` e do `ShowcaseList`: moldura
 * compartilhada, miolo em slot.
 */

/** Quanto tempo a confirmação fica na tela. */
const SAVED_MS = 4000;

export function SaveBar({
  label,
  savingLabel,
  onSave,
  dirty,
  saving,
  saved,
  idleHint,
  dirtyHint,
  disabled,
  children,
}: {
  label: string;
  savingLabel?: string;
  /** Ausente quando a tela grava por `<form>` · aí o botão é `type="submit"`. */
  onSave?: () => void;
  dirty: boolean;
  saving: boolean;
  /**
   * Acabou de gravar.
   *
   * **Quem controla é a tela, e o sumiço é daqui** · o estado nasce de uma
   * resposta da API, e o relógio é apresentação.
   */
  saved: boolean;
  /** Por que o botão está desligado quando nada mudou. */
  idleHint: string;
  /** O que dizer quando há mudança pendente · a escalação usa, as outras não. */
  dirtyHint?: string;
  /** Outro motivo pra travar, além de não ter mudança (nick tomado, envio em voo). */
  disabled?: boolean;
  /** Entra depois da confirmação · hoje ninguém usa, e é a porta pra desfazer. */
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    setShowSaved(true);
    const timer = setTimeout(() => setShowSaved(false), SAVED_MS);
    return () => clearTimeout(timer);
  }, [saved]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type={onSave ? 'button' : 'submit'}
        variant={dirty ? 'cta' : 'default'}
        disabled={!dirty || saving || disabled}
        onClick={onSave}
      >
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            {savingLabel ?? t('club.saving')}
          </>
        ) : (
          label
        )}
      </Button>

      {/* **O "salvo" ganha a vez, e essa ordem é a decisão inteira desta peça.**
          Sem ela a tela afirma que gravou e que nada mudou, ao mesmo tempo. */}
      <span aria-live="polite" className="text-sm">
        {showSaved ? (
          <span className="inline-flex items-center gap-1.5 text-primary">
            <Check className="h-4 w-4" aria-hidden />
            {t('club.saved')}
          </span>
        ) : saving ? null : dirty ? (
          dirtyHint ? <span className="text-muted-foreground">{dirtyHint}</span> : null
        ) : (
          <span className="text-muted-foreground">{idleHint}</span>
        )}
      </span>

      {children}
    </div>
  );
}
