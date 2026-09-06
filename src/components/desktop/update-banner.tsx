import { Download, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UpdateNotice } from '@/components/update-notice';
import { notifyUpdateAvailable, type UpdateInfo } from '@/lib/desktop';
import { changelogUrl } from '@/lib/public-url';
import { watchForUpdate } from './update-watch';

/**
 * Aviso de atualização. É o primeiro motivo real de o app notificar · e é o que
 * justifica ele continuar na bandeja quando a janela fecha.
 *
 * **Quando a pergunta é feita mora em `update-watch.ts`** · montagem, volta ao
 * foco e o sinal de deploy do canal. Até 06/09/2026 era só a montagem, e com o
 * app na bandeja isso podia ser uma vez por semana.
 *
 * **O balão só sai quando a janela está atrás.** É a regra do sininho: quem
 * está olhando a faixa não precisa de um balão dizendo a mesma coisa, e quem
 * está com o app na bandeja só tem o balão pra ficar sabendo.
 *
 * **"Agora não" dispensa a versão, não a faixa.** O processo vive semanas na
 * bandeja, e uma dispensa que valesse pra sempre esconderia a 1.4.1 que corrige
 * falha porque a pessoa dispensou a 1.4.0 · a versão seguinte é notícia nova,
 * e a faixa volta com ela. A trava do 426 continua sendo o piso.
 *
 * **Falhar em instalar diz que falhou.** UAC cancelado, download que caiu no
 * meio, assinatura que não bate · o botão que só pisca e volta lê como app
 * quebrado, e a irmã da trava obrigatória já tratava isso com frase própria.
 *
 * Sem `tauri-plugin-updater`, cada correção obrigaria o usuário a baixar e
 * instalar o app de novo. Ver docs/auth-e-desktop.md.
 */
export function UpdateBanner() {
  const { t, i18n } = useTranslation();
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [installing, setInstalling] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);

  // `i18n` e não `t` na dependência · trocar de idioma remontaria o vigia, e o
  // texto do balão é lido na hora do disparo de qualquer jeito.
  useEffect(
    () =>
      watchForUpdate(({ update: found, away }) => {
        setUpdate(found);
        setFailed(false);
        if (!away) return;
        void notifyUpdateAvailable(
          i18n.t('desktop.updateTitle'),
          i18n.t('desktop.updateBody', { version: found.version }),
        );
      }),
    [i18n],
  );

  if (!update || update.version === dismissedVersion) return null;

  async function install(target: UpdateInfo) {
    setInstalling(true);
    setFailed(false);
    try {
      await target.install();
    } catch {
      setFailed(true);
    } finally {
      // Instalar de verdade encerra o processo antes disto rodar · chegar aqui
      // é a instalação ter voltado sem reiniciar, e o botão volta a valer.
      setInstalling(false);
    }
  }

  return (
    <UpdateNotice
      icon={Download}
      title={t('desktop.updateTitle')}
      changelogHref={changelogUrl()}
      changelogLabel={t('desktop.updateChangelog')}
      action={
        installing ? (
          <>
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            {t('desktop.updateInstalling')}
          </>
        ) : (
          t('desktop.updateCta')
        )
      }
      actionDisabled={installing}
      onAction={() => void install(update)}
      alert={failed ? t('desktop.updateFailed') : null}
      dismissLabel={t('desktop.updateLater')}
      onDismiss={() => setDismissedVersion(update.version)}
    >
      {t('desktop.updateBody', { version: update.version })}
    </UpdateNotice>
  );
}
