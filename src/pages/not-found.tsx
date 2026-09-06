import { Compass } from 'lucide-react';
import { SeoHead } from '@/components/seo-head';
import { SiteFooter } from '@/components/site-footer';
import { PublicHeaderActions, SiteHeader } from '@/components/site-header';
import { EmptyState } from '@/components/ui/empty-state';
import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* **`noindex` aqui nao e zelo, e conserto de um defeito real de SEO.**
          O CloudFront do site reescreve 403 e 404 pra `/index.html` com status
          **200**, que e o que faz uma SPA funcionar em qualquer URL · e o efeito
          colateral e que toda URL quebrada devolve 200 com esta tela. Sem o
          `noindex`, o Google indexa infinitas paginas identicas. */}
      <SeoHead title={t('empty.notFoundTitle')} noindex />
      {/* O 404 é onde cai quem veio de link quebrado · ou seja, gente de fora.
          Ele era o único header sem idioma e sem porta de entrada. */}
      <SiteHeader actions={<PublicHeaderActions />} />
      <main className="container flex flex-1 items-center justify-center">
        <EmptyState
          icon={Compass}
          size="lg"
          title={t('empty.notFoundTitle')}
          description={t('empty.notFoundBody')}
          action={{ label: t('common.ctaBackHome'), to: '/' }}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
