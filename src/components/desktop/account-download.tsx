import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { SectionTitle } from '@/components/ui/section-title';
import { DESKTOP_INSTALLER_MB } from '@/lib/desktop-download';
import { isDesktop, viewerPlatform } from '@/lib/platform';

/**
 * A seção "Aplicativo" de `/app/conta`, **vista do navegador** · o par da
 * `DesktopSettings`, que é a mesma seção vista de dentro do app.
 *
 * Ela existe porque, até 06/09/2026, **não havia porta pro app em tela nenhuma
 * de dentro do produto**: a landing e o rodapé são públicos, e quem já estava
 * logado só chegava ao instalador saindo do app. A conta é onde a pessoa
 * procura as coisas dela, e é o mesmo endereço em que o app instalado guarda
 * a chave de abrir com o Windows · uma seção, dois lados.
 *
 * **Só no Windows, e só fora do app.** Oferecer aqui o que a pessoa não pode
 * usar é ruído numa tela de configuração, e a landing já responde ao Mac e ao
 * celular. Condicionada na composição e protegida por dentro, como a irmã.
 *
 * **O download abre em outra guia** · a `/download` dispara o arquivo e termina
 * na landing, e esta tela pode ter um formulário com alteração não salva.
 *
 * **Arquivo próprio, e não o `download-section.tsx`** · aquele é importado pela
 * landing, que mora na entrada do bundle. Uma seção da página da conta, que é
 * `lazy`, viajaria no primeiro carregamento de todo visitante · medido no
 * `dist` antes de separar.
 */
export function AccountDownloadSection() {
  const { t } = useTranslation();

  if (isDesktop()) return null;
  if (viewerPlatform() !== 'windows') return null;

  return (
    <section data-app-download className="rounded-2xl border bg-card p-5 sm:p-6">
      <SectionTitle>{t('desktop.settingsTitle')}</SectionTitle>
      <p className="text-sm text-muted-foreground">{t('desktop.accountPitch')}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button asChild variant="ctaOutline" size="sm">
          <Link to="/download" target="_blank" rel="noopener">
            {t('desktop.downloadCta')}
          </Link>
        </Button>
        <span className="text-xs text-muted-foreground">
          {t('desktop.downloadMeta', { mb: DESKTOP_INSTALLER_MB })}
        </span>
      </div>
    </section>
  );
}
