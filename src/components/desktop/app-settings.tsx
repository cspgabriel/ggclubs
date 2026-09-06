import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { SectionTitle } from '@/components/ui/section-title';
import { readAutostart, writeAutostart } from '@/lib/desktop';
import { isDesktop } from '@/lib/platform';

/**
 * A seção "Aplicativo" de `/app/conta` · **só existe no app instalado**, e é o
 * endereço de toda configuração de máquina. Nasce com uma chave, "Abrir junto
 * com o Windows", e é o lugar das próximas.
 *
 * **Ela fica fora do formulário da conta, e isso é decisão.** O formulário
 * grava no servidor quando a pessoa salva; esta chave grava **no registro do
 * Windows, na hora**, e uma caixa que vale no clique no meio de caixas que
 * esperam o "Salvar" mentiria sobre uma das duas. A dica diz que vale na hora
 * e só neste computador.
 *
 * **A chave mostra o que o registro respondeu, não o que foi clicado.** Depois
 * de gravar ela lê de novo · o Gerenciador de Tarefas pode desligar por fora, e
 * é a regra do `docs/design.md`: o estado visual diz a verdade.
 *
 * Condicionada na composição (`isDesktop()` na tela) **e** protegida por dentro,
 * como a barra de título · componente de desktop não conta com quem o chama
 * pra não existir na web.
 */
export function DesktopSettings() {
  const { t } = useTranslation();
  // `undefined` é "ainda não perguntei"; `null` é "o shell não soube responder".
  const [autostart, setAutostart] = useState<boolean | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    void readAutostart().then((value) => {
      if (alive) setAutostart(value);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!isDesktop()) return null;

  async function toggle(next: boolean) {
    setBusy(true);
    setFailed(false);
    try {
      await writeAutostart(next);
    } catch {
      setFailed(true);
    } finally {
      // O registro é quem responde · inclusive depois de uma falha, pra chave
      // voltar ao que está valendo em vez de ficar no que foi pedido.
      setAutostart(await readAutostart());
      setBusy(false);
    }
  }

  const unavailable = autostart === null;
  const disabled = busy || autostart === undefined || unavailable;

  return (
    <section data-desktop-settings className="rounded-2xl border bg-card p-5 sm:p-6">
      <SectionTitle>{t('desktop.settingsTitle')}</SectionTitle>

      <label className="flex cursor-pointer items-start gap-3">
        <Checkbox
          checked={autostart === true}
          disabled={disabled}
          onCheckedChange={(v) => void toggle(v === true)}
          className="mt-0.5"
        />
        <span className="space-y-1">
          <span className="block text-sm font-medium">{t('desktop.autostartLabel')}</span>
          <span className="block text-xs text-muted-foreground">{t('desktop.autostartHint')}</span>
          {/* Botão desligado diz por que está desligado · regra da casa. */}
          {unavailable && (
            <span className="block text-xs text-amber-400">
              {t('desktop.autostartUnavailable')}
            </span>
          )}
          {failed && (
            <span className="block text-xs text-destructive" role="alert">
              {t('desktop.autostartFailed')}
            </span>
          )}
        </span>
      </label>
    </section>
  );
}
