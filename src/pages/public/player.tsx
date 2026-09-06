import { UserX, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router';
import { PlayerView } from '@/components/player/player-view';
import { PlayerViewSkeleton } from '@/components/player/player-view-skeleton';
import { SeoHead } from '@/components/seo-head';
import { SiteFooter } from '@/components/site-footer';
import { PublicHeaderActions, SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Marquee } from '@/components/ui/marquee';
import { api } from '@/lib/api';
import { ApiError, apiErrorMessage } from '@/lib/api-error';
import { clubUrl } from '@/lib/clubs';
import { appPlayerPath } from '@/lib/paths';
import { useAuth } from '@/lib/use-auth';
import { useResource } from '@/lib/use-resource';

/**
 * Página pública de um player · a ponta que faltava no elenco.
 *
 * O link do club circula no Discord, o visitante abre, vê o elenco e clica num
 * nome · e até 08/08/2026 esse clique não existia, porque não havia pra onde ir.
 * A rota da API existia desde sempre e o cliente também: o que faltava era a
 * tela, e por isso a função era código órfão.
 *
 * **Quem já entrou não vê esta moldura**, como no club: a rota manda pra dentro
 * do app, onde o mesmo perfil aparece com a navegação em volta. Manter a pessoa
 * logada numa moldura de visitante é fazer o app parecer site.
 */
export function PublicPlayerPage() {
  const { t } = useTranslation();
  const { handle = '' } = useParams<{ handle: string }>();
  const { user, loading } = useAuth();

  /**
   * **Não busca nada pra quem tem sessão** · quem está logado é redirecionado
   * logo abaixo, e buscar aqui seria uma requisição pra uma tela que não vai
   * aparecer.
   */
  const { data: profile, error, reload } = useResource(
    (signal) => api.getPublicProfile(handle, { signal }).then((r) => r.profile),
    [handle],
    { skip: Boolean(user) },
  );

  /**
   * **"Não existe" e "não deu pra carregar" são coisas diferentes**, e a página
   * do club pagou por juntá-las: qualquer falha virava "club não encontrado", o
   * que afirma um fato falso na página de aquisição e ainda desencoraja a
   * segunda tentativa. Aqui a distinção nasce junto · repetir o defeito numa
   * tela nova, com ele já descrito em dois lugares, seria o pior dos dois.
   *
   * **Ela é derivada, e não guardada** · o `useResource` entrega o erro cru
   * justamente pra a tela decidir o que aquilo significa, e um estado paralelo
   * seria mais uma coisa pra sair de sincronia.
   */
  const failure: 'notFound' | 'error' | null = !error
    ? null
    : error instanceof ApiError && error.code === 'PROFILE_NOT_FOUND'
      ? 'notFound'
      : 'error';
  // A frase sai do `apiErrorMessage`, que é quem sabe dizer **quanto falta**
  // quando a recusa é de limite.
  const errorMessage = failure === 'error' ? apiErrorMessage(error, t) : null;

  // Espera a sessão resolver antes de decidir · sem isto quem tem conta vê a
  // moldura pública piscar antes de ser mandado pra dentro.
  if (loading) return null;
  if (user) return <Navigate to={appPlayerPath(handle)} replace />;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Mesma regra do club · o avatar identifica a pessoa antes da leitura, e
          quem não tem cai no cartão do produto. */}
      <SeoHead
        title={
          profile
            ? `${profile.displayName} · ${t('common.brandName')}`
            : t('common.brandName')
        }
        description={profile ? t('player.seoDescription', { name: profile.displayName }) : t('common.brandTagline')}
        ogImage={profile?.avatarUrl ?? undefined}
      />

      <SiteHeader actions={<PublicHeaderActions withSignUp />} />

      {failure && (
        <main className="container flex-1 py-8 sm:py-12">
          {/* **Repetir só é oferecido onde repetir pode mudar o resultado** ·
              num @nick que não existe, o botão seria falsa esperança. */}
          {failure === 'notFound' ? (
            <EmptyState
              icon={UserX}
              title={t('player.notFoundTitle')}
              description={t('player.notFoundBody')}
              action={{ label: t('common.ctaBackHome'), to: '/' }}
            />
          ) : (
            <EmptyState
              icon={WifiOff}
              tone="error"
              title={t('player.loadErrorTitle')}
              description={errorMessage ?? t('common.errorGeneric')}
              action={{ label: t('common.retry'), onClick: reload }}
              secondaryAction={{ label: t('common.ctaBackHome'), to: '/' }}
            />
          )}
        </main>
      )}

      {/* A moldura é a **do conteúdo que vem** · o `PlayerView` de página traz o
          próprio container, então envolver a silhueta num `container` a
          empurraria pra dentro duas vezes e a página saltaria ao carregar. */}
      {!profile && !failure && (
        <main className="flex flex-1 flex-col">
          <PlayerViewSkeleton />
        </main>
      )}

      {/* Coluna flex com o convite em `mt-auto`: **a sobra vai pra cima dele**.
          Aqui a conta aparece mais do que no club · um player sem club nenhum
          deixa a página curta, e sem isto o convite subiria pro meio da tela. */}
      {profile && (
        <main className="flex flex-1 flex-col">
          <PlayerView profile={profile} clubHref={clubUrl} />

          <section className="mt-auto border-t bg-card">
            <div className="container flex flex-col items-start gap-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:py-12">
              <div className="max-w-xl">
                <h2 className="font-display text-2xl/[0.95] uppercase tracking-tight sm:text-3xl/[0.95]">
                  <span className="text-primary">{t('player.ctaTitleAccent')}</span>{' '}
                  {t('player.ctaTitle')}
                </h2>
                <p className="mt-3 text-base text-foreground">{t('player.ctaBody')}</p>
              </div>
              {/* Mesma voz do cadastro das outras três portas, e o `?criar=1`
                  abre o formulário já no cadastro · apontar pro login cru faz a
                  pessoa cair na tela de entrar. */}
              <Button asChild variant="cta" size="hero" className="shrink-0">
                <Link to="/login?criar=1">{t('common.createAccount')}</Link>
              </Button>
            </div>
          </section>
        </main>
      )}

      <Marquee items={t('landing.marquee').split(' · ')} />
      <SiteFooter />
    </div>
  );
}
