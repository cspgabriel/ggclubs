import { ShieldOff, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router';
import { ClubView } from '@/components/club/club-view';
import { ClubViewSkeleton } from '@/components/club/club-view-skeleton';
import { TacticBoard } from '@/components/club/tactic-board';
import { SeoHead } from '@/components/seo-head';
import { SiteFooter } from '@/components/site-footer';
import { PublicHeaderActions, SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Marquee } from '@/components/ui/marquee';
import { api } from '@/lib/api';
import { ApiError, apiErrorMessage } from '@/lib/api-error';
import { publicPlayerPath } from '@/lib/paths';
import { useAuth } from '@/lib/use-auth';
import { useResource } from '@/lib/use-resource';

/**
 * Página pública do club · o link que circula no Discord, e por isso o canal de
 * aquisição do produto.
 *
 * **Quem já entrou não vê esta tela.** A rota manda pra dentro do app, onde o
 * mesmo club aparece com a navegação em volta e o botão de configurar. Manter a
 * pessoa logada numa moldura de visitante é fazer o app parecer site.
 *
 * Aberta a quem não tem conta, de propósito: exigir cadastro pra ver um club
 * mataria justamente a divulgação.
 */
export function PublicClubPage() {
  const { t } = useTranslation();
  const { tag = '' } = useParams<{ tag: string }>();
  const { user, loading } = useAuth();

  /**
   * **Não busca nada pra quem tem sessão** · quem está logado é redirecionado
   * logo abaixo, pra mesma página com a moldura do app.
   *
   * **As três coisas vêm de uma resposta só**, então elas saem de um
   * `useResource` só · club, elenco e tática chegam juntos ou não chegam.
   */
  const { data, error, reload } = useResource(
    (signal) => api.getPublicClub(tag, { signal }),
    [tag],
    { skip: Boolean(user) },
  );
  const club = data?.club ?? null;
  const squad = data?.squad ?? [];
  const tactic = data?.tactic ?? null;
  /**
   * **"Não existe" e "não deu pra carregar" são coisas diferentes**, e juntá-las
   * era o defeito: qualquer falha caía em `notFound`, então um 429, um 500 ou
   * uma queda de rede diziam ao visitante que **o link estava quebrado ou o
   * club tinha sido removido**. Numa página de aquisição, isso é afirmar um
   * fato falso e ainda desencorajar a segunda tentativa · a única saída
   * oferecida era voltar pra home.
   *
   * **É o mesmo defeito da pendência 40, noutra tela** · lá a de configurar
   * dizia "club não encontrado" pros quatro desfechos. Ela foi consertada em
   * 06/08/2026 e esta ficou de fora da rodada, que é a pergunta de sempre:
   * **por quantos caminhos se chega ali.**
   */
  // Só o código do próprio club vira ausência · o resto passa sozinho e merece
  // um "tentar de novo".
  const failure: 'notFound' | 'error' | null = !error
    ? null
    : error instanceof ApiError && error.code === 'CLUB_NOT_FOUND'
      ? 'notFound'
      : 'error';
  // A frase do erro sai do `apiErrorMessage`, que é quem sabe dizer **quanto
  // falta** quando a recusa é de limite · sem isso o visitante lia um genérico
  // onde a API tinha mandado o número.
  const errorMessage = failure === 'error' ? apiErrorMessage(error, t) : null;

  // Espera a sessão resolver antes de decidir · sem isto quem tem conta vê a
  // moldura pública piscar antes de ser mandado pra dentro.
  if (loading) return null;
  if (user) return <Navigate to={`/app/clubs/${tag}`} replace />;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* **O escudo do club ganha do cartão genérico** · o link do club é o que
          mais circula, e quem recebe reconhece o time antes de ler. Sem escudo
          cai no cartão do produto, que é o certo · escudo vazio seria um
          quadrado cinza no lugar de uma promessa. */}
      <SeoHead
        title={club ? `${club.name} · ${t('common.brandName')}` : t('common.brandName')}
        ogImage={club?.crestUrl ?? undefined}
        description={club?.bio ?? t('common.brandTagline')}
      />

      {/* **O cadastro entra no header só aqui**, e o porquê está no
          `PublicHeaderActions`: esta é a página que o link do Discord abre, e
          o único caminho acima da dobra era um "Entrar", que fala com quem já
          tem conta. Na landing seria regressão · o hero dela já tem o CTA. */}
      <SiteHeader actions={<PublicHeaderActions withSignUp />} />

      {failure && (
        <main className="container flex-1 py-8 sm:py-12">
          {/* **Repetir só é oferecido onde repetir pode mudar o resultado** · é
              a mesma regra da tela de configurar club. Num club que não existe,
              repetir não muda nada e o botão seria falsa esperança; numa recusa
              temporária, repetir é exatamente o que resolve. */}
          {failure === 'notFound' ? (
            <EmptyState
              icon={ShieldOff}
              title={t('club.notFoundTitle')}
              description={t('club.notFoundBody')}
              action={{ label: t('common.ctaBackHome'), to: '/' }}
            />
          ) : (
            <EmptyState
              icon={WifiOff}
              tone="error"
              title={t('club.loadErrorTitle')}
              description={errorMessage ?? t('common.errorGeneric')}
              action={{ label: t('common.retry'), onClick: reload }}
              secondaryAction={{ label: t('common.ctaBackHome'), to: '/' }}
            />
          )}
        </main>
      )}

      {/* A moldura é a **do conteúdo que vem**, e não a de um bloco centralizado:
          o `ClubView` de página traz o próprio container, então envolver a
          silhueta num `container` a empurraria pra dentro duas vezes e a página
          saltaria de largura ao carregar. */}
      {!club && !failure && (
        <main className="flex flex-1 flex-col">
          <ClubViewSkeleton />
        </main>
      )}

      {/* Coluna flex, e o convite com `mt-auto`: **a sobra vai pra cima dele,
          nunca pra baixo.** Sem isso, club de elenco pequeno em tela alta
          deixava até 300px de fundo vazio embaixo do convite, e a página
          parecia interrompida no meio. Medido em 1920x1080 e 768x1024, que é
          onde a conta aparece. */}
      {club && (
        <main className="flex flex-1 flex-col">
          <ClubView club={club} squad={squad} playerHref={publicPlayerPath} />

          {/* **Club sem escalação não desenha a seção**, em vez de mostrar campo
              vazio · pra quem chegou de fora, um campo com onze buracos não
              informa nada e ainda faz o club parecer abandonado. É a mesma regra
              da fila de pedidos, que não renderiza quando não há nada nela. */}
          {tactic && (
            <div className="container pb-10 sm:pb-12">
              <TacticBoard squad={squad} tactic={tactic} canEdit={false} />
            </div>
          )}

          {/* O convite fecha a página, depois do elenco · quem chegou pelo link
              veio ver o time, e pedir cadastro antes de mostrar o que a pessoa
              veio ver é o jeito mais rápido de perder a visita. */}
          <section className="mt-auto border-t bg-card">
            <div className="container flex flex-col items-start gap-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:py-12">
              <div className="max-w-xl">
                <h2 className="font-display text-2xl/[0.95] uppercase tracking-tight sm:text-3xl/[0.95]">
                  <span className="text-primary">{t('club.ctaTitleAccent')}</span>{' '}
                  {t('club.ctaTitle')}
                </h2>
                <p className="mt-3 text-base text-foreground">{t('club.ctaBody')}</p>
              </div>
              {/* **Uma voz só pro cadastro**, decidido em 06/08/2026 · este botão
                  falava em criar perfil enquanto o header, o rodapé e o próprio
                  formulário falavam em criar conta. Três peças numa voz e uma
                  noutra, na mesma tela.

                  Ganhou a da conta porque a outra descreve o que o produto faz
                  **depois**, e quem está aqui ainda decide **se entra** · o
                  trabalho de convencer já foi feito pelo título logo acima.

                  O `?criar=1` abre o formulário no cadastro: apontar pro
                  `/login` cru fazia a pessoa cair na tela de entrar. */}
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
