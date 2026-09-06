import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UpdateNotice } from '@/components/update-notice';
import { checkForNewerBuild, newerBuildId, onNewerBuild, watchVisibility } from '@/lib/app-version';
import { isDesktop } from '@/lib/platform';
import { changelogUrl } from '@/lib/public-url';

/**
 * **Saiu uma versão nova do site** · a faixa da camada 2 da pendência 193.
 *
 * ## Ela avisa, e nunca decide
 *
 * **Não recarrega sozinha, em nenhuma circunstância.** A regra do formulário
 * aberto do `CLAUDE.md` vale inteira aqui, e o pior desfecho possível deste
 * arquivo seria a página se recarregando debaixo de quem está digitando um
 * placar. Quem aperta é a pessoa, e enquanto ela não apertar **nada quebra**:
 * os chunks do build que ela carregou continuam no bucket desde que o
 * `--delete` saiu do `deploy.mjs`.
 *
 * Por isso ela também é **faixa e não diálogo**: o produto continua inteiro
 * atrás dela.
 *
 * ## O desenho é o da irmã, de propósito
 *
 * Usa `UpdateNotice`, assim como o updater do desktop · e é ele quem é dono do
 * link, do botão e do responsivo. Aqui fica só o que difere: o texto e o que o
 * botão faz. Não compete com a partida.
 *
 * **Em fluxo, e não `fixed`** · barra flutuante cobre o rodapé da tela no
 * celular, e área tapada não anda. É o defeito que o painel de formação já
 * pagou, e está escrito no `docs/design.md`.
 *
 * ## Ela não existe no app instalado
 *
 * Lá o bundle vem do disco e não envelhece, e quem atualiza é o updater · a
 * `UpdateBanner` já fala por ele. Duas faixas dizendo "versão nova" com
 * mecanismos diferentes é exatamente a divergência que o header único existe pra
 * impedir. **Condicionada na composição (`App.tsx`) e protegida por dentro**,
 * que é a regra que a barra de título ensinou quando vazou 40px pra web.
 *
 * **Dispensar vale até a próxima carga da página**, e não por build · uma vez
 * sabendo que existe versão nova, saber que existe uma ainda mais nova não muda
 * nada pra quem já dispensou uma vez. Guardar por build exigiria continuar
 * perguntando pra sempre, por uma informação que não muda decisão nenhuma.
 */
export function NewVersionBanner() {
  const { t } = useTranslation();
  const [build, setBuild] = useState<string | null>(() => newerBuildId());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isDesktop()) return;
    const off = onNewerBuild(setBuild);
    const unwatch = watchVisibility();
    // A primeira conferência acontece na montagem · quem abriu uma aba que
    // ficou horas em segundo plano antes de ser trazida pra frente já pode
    // estar velho, e esperar o próximo `visibilitychange` seria esperar um
    // gesto que talvez não venha.
    void checkForNewerBuild();
    return () => {
      off();
      unwatch();
    };
  }, []);

  if (isDesktop() || !build || dismissed) return null;

  return (
    <UpdateNotice
      icon={RefreshCw}
      title={t('siteVersion.bannerTitle')}
      changelogHref={changelogUrl()}
      changelogLabel={t('siteVersion.bannerChangelog')}
      action={t('siteVersion.bannerCta')}
      onAction={() => window.location.reload()}
      dismissLabel={t('siteVersion.bannerLater')}
      onDismiss={() => setDismissed(true)}
    >
      {t('siteVersion.bannerBody')}
    </UpdateNotice>
  );
}
