import { BellOff, BellRing, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { SeoHead } from '@/components/seo-head';
import { SiteFooter } from '@/components/site-footer';
import { PublicHeaderActions, SiteHeader } from '@/components/site-header';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { api } from '@/lib/api';

/**
 * Descadastro do e-mail · **a página que deixa sair e deixa voltar.**
 *
 * **O buraco que ela fecha:** quem sai pelo botão nativo do cliente de e-mail
 * some sem nunca ver uma tela nossa, e a chave da reativação mora **atrás de
 * login**, em `/app/conta`. Ninguém contava isso pra quem tinha acabado de sair.
 *
 * **E até 22/08/2026 ela contava sem deixar** · o caminho de volta era um link
 * pra `/app/conta`, ou seja, a porta fechada que ela existia pra abrir. Quem
 * clicou no botão do Gmail, no celular, sem sessão, chegava numa tela de entrar.
 * Hoje o botão religa **pelo mesmo token**, aqui mesmo · era a pendência 118.
 *
 * ## Ela NÃO desliga ao abrir, e isso é o desenho inteiro
 *
 * Cliente de e-mail e antivírus de e-mail **buscam os links da mensagem
 * sozinhos**, pra pré-visualizar e varrer · uma página que desligasse no
 * carregamento descadastraria quem só **recebeu** o e-mail, sem clicar em nada.
 * É a mesma razão de a RFC 8058 exigir `POST` no `List-Unsubscribe`.
 *
 * Aqui a visita **lê** o estado e não muda nada · quem desliga é o clique. A
 * leitura é o conserto do vaivém que o Eduardo achou em 21/08/2026: sem ela um
 * F5 oferecia descadastrar a quem já tinha descadastrado.
 *
 * ## O token no caminho é a autorização
 *
 * Não há `uid`, cookie nem vínculo · quem abre isto pode não ter sessão nenhuma,
 * e é justamente o caso comum. Por isso a página é pública e o `noindex` não é
 * zelo: a URL carrega um segredo, e ela não tem nada a indexar.
 *
 * **A tela não conta história**, pela mesma régua da rota: token desconhecido
 * dá o mesmo desfecho de token válido. Quem estivesse testando token não aprende
 * nada, e quem se descadastrou de verdade não fica na dúvida.
 */
export function UnsubscribePage() {
  const { t } = useTranslation();
  const { token = '' } = useParams();
  const [state, setState] = useState<
    'loading' | 'idle' | 'sending' | 'failed' | 'done' | 'resuming' | 'resumed' | 'resumeFailed'
  >('loading');

  /**
   * **Ela pergunta o estado antes de perguntar à pessoa** · achado pelo Eduardo
   * em 21/08/2026, testando pelo e-mail de verdade: ele descadastrou, deu F5, e
   * a página ofereceu descadastrar de novo · *"aí fica um fluxo infinito"*.
   *
   * O `GET` **só lê** (ver a rota), então isto não descadastra quem só recebeu ·
   * a proibição da RFC 8058 é o `GET` **mudar** alguma coisa, não existir.
   *
   * **Falha aqui cai em `idle`, e não em erro** · o pior desfecho seria alguém
   * que quer sair não conseguir. Mostrar o botão é sempre uma saída válida,
   * porque o `POST` é idempotente.
   */
  useEffect(() => {
    const ctrl = new AbortController();
    void (async () => {
      try {
        const { off } = await api.unsubscribeState(token, { signal: ctrl.signal });
        if (!ctrl.signal.aborted) setState(off ? 'done' : 'idle');
      } catch {
        if (!ctrl.signal.aborted) setState('idle');
      }
    })();
    return () => ctrl.abort();
  }, [token]);

  async function confirm() {
    // O `EmptyState` não desabilita a ação dele · a guarda mora aqui. A rota é
    // idempotente, então dois cliques não estragam nada · o que eles fariam é
    // duas requisições e um piscar de rótulo.
    if (state === 'sending') return;
    setState('sending');
    try {
      await api.unsubscribe(token);
      setState('done');
    } catch {
      // **Falha aqui é falha de rede, e só ela** · a rota responde 200 até pra
      // token que não existe. Oferecer "tentar de novo" é honesto porque
      // repetir **pode** mudar o resultado, que é a régua da casa pra isso.
      setState('failed');
    }
  }

  /**
   * **O caminho de volta, e ele acontece aqui mesmo** · era a pendência 118.
   *
   * A página contava que dá pra voltar e mandava pra `/app/conta`, **que exige
   * login** · ou seja, o convite apontava pra porta fechada que ela existia pra
   * abrir. Quem clicou no botão do Gmail, no celular, sem sessão, chegava numa
   * tela de entrar.
   *
   * **Religa pelo mesmo token**, e a simetria é o argumento: ele já autoriza
   * cortar tudo, então voltar não dá poder novo a quem tem o link.
   */
  async function resume() {
    if (state === 'resuming') return;
    setState('resuming');
    try {
      await api.resubscribe(token);
      setState('resumed');
    } catch {
      // Mesma régua do `confirm`: a rota responde 200 até pra token que não
      // existe, então falha aqui é de rede · e repetir pode mudar o resultado.
      setState('resumeFailed');
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SeoHead title={t('unsubscribe.title')} noindex />
      <SiteHeader actions={<PublicHeaderActions />} />
      <main className="container flex flex-1 items-center justify-center py-12">
        {/* A casca pinta antes do dado · a espera aqui é curta e sem forma
            conhecida, então é indicador e não silhueta. */}
        {state === 'loading' ? (
          <LoadingState />
        ) : state === 'resumed' ? (
          // **Ela não volta pra pergunta de descadastrar**, e isso é o desenho ·
          // religar e cair de novo em "parar de receber?" lê como se o clique
          // não tivesse pegado, que é o vaivém que o F5 já causou uma vez. Quem
          // recarregar **depois** vê a pergunta de novo, e aí está certo: o
          // link é de descadastro, e a visita nova começa por ele.
          <EmptyState
            icon={BellRing}
            size="lg"
            tone="brand"
            title={t('unsubscribe.resumedTitle')}
            description={t('unsubscribe.resumedBody')}
            action={{ label: t('unsubscribe.homeCta'), to: '/' }}
          />
        ) : state === 'done' || state === 'resuming' || state === 'resumeFailed' ? (
          <EmptyState
            icon={Check}
            size="lg"
            title={t('unsubscribe.doneTitle')}
            // **A saída principal é o caminho de volta**, e não o início · é a
            // pergunta que esta página existe pra responder, e até 22/08/2026 ela
            // era respondida com um link pra `/app/conta`, que exige login.
            description={
              state === 'resumeFailed'
                ? t('unsubscribe.resumeFailed')
                : t('unsubscribe.doneBody')
            }
            tone={state === 'resumeFailed' ? 'error' : 'default'}
            action={{
              label:
                state === 'resumeFailed' ? t('unsubscribe.retry') : t('unsubscribe.resumeCta'),
              onClick: () => void resume(),
            }}
            secondaryAction={{ label: t('unsubscribe.homeCta'), to: '/' }}
          />
        ) : (
          <EmptyState
            icon={BellOff}
            size="lg"
            title={t('unsubscribe.title')}
            description={state === 'failed' ? t('unsubscribe.failed') : t('unsubscribe.body')}
            tone={state === 'failed' ? 'error' : 'default'}
            action={{
              label: state === 'failed' ? t('unsubscribe.retry') : t('unsubscribe.confirm'),
              onClick: () => void confirm(),
            }}
            secondaryAction={{ label: t('unsubscribe.homeCta'), to: '/' }}
          />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
