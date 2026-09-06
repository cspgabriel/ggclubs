import { USER_EVENT, userTopic } from '@ggclubs/schemas';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api.js';
import { noteRealtimeReopened, noteServerReplaced } from '../app-version.js';
import { appVersion } from '../desktop.js';
import { useAuth } from '../use-auth.js';
import { RealtimeClient, realtimeUrl, type RealtimeState } from './client.js';
import { RealtimeContext } from './realtime-context.js';

/**
 * Liga o canal de tempo real à sessão · **uma conexão por aplicativo.**
 *
 * **A dependência é o `_id` da conta, e é ela que resolve o caso mais grave dos
 * quatro de sessão** (`docs/produto.md`): trocar de conta na mesma guia. Quando
 * a conta muda, o cleanup do efeito **fecha a conexão da que saiu antes** de a
 * nova abrir · sem isso a guia continuaria recebendo evento e notificação de
 * quem já não está logado ali, numa tela que já mostra outra pessoa. É
 * vazamento entre contas, e **nada quebra enquanto acontece**.
 *
 * **Sem sessão não conecta**, e isso também precisa estar escrito: sem conta não
 * há bilhete, e um cliente que tentasse assim mesmo ficaria num laço contra uma
 * rota que responde 401 · inclusive na landing e na página aberta do club, que
 * é a de aquisição.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { account, accountStatus, refreshAccount } = useAuth();
  const [state, setState] = useState<RealtimeState>('closed');
  const [client, setClient] = useState<RealtimeClient | null>(null);

  // O `_id` é a conta no nosso banco · o `uid` do Firebase existe antes dela, no
  // onboarding, e ali não há o que ouvir ainda.
  const accountId = accountStatus === 'ready' ? (account?._id ?? null) : null;

  useEffect(() => {
    if (!accountId) {
      setClient(null);
      setState('closed');
      return;
    }

    let cancelled = false;
    const instance = new RealtimeClient({
      url: realtimeUrl(import.meta.env.VITE_API_URL || 'http://localhost:3000'),
      requestTicket: async () => (await api.realtimeTicket()).ticket,
      clientVersion: appVersion,
      onState: (next) => {
        if (!cancelled) setState(next);
        /**
         * **O canal voltando é o gatilho da conferência de versão**, e não o
         * canal caindo · a web sobe **depois** da API, então perguntar no
         * fechamento seria perguntar cedo demais.
         *
         * Só conta quando a queda foi `1001` · reconexão de wi-fi e de notebook
         * que acordou não são notícia sobre versão, e conferir nelas seria uma
         * requisição por oscilação de rede. Quem guarda essa distinção é o
         * `lib/app-version.ts`.
         */
        if (next === 'open') noteRealtimeReopened();
      },
      onServerGoingAway: noteServerReplaced,
      /**
       * **A suspensão chega pelo canal antes de qualquer outra coisa**, e é a
       * única notícia que ele dá sobre a própria sessão.
       *
       * O aplicativo já sabe desenhar conta suspensa · o que faltava era o
       * gatilho: sem uma navegação ou um `PATCH`, ninguém perguntava, e a tela
       * seguia mostrando dado de uma conta que já não pode estar ali.
       * `refreshAccount` faz o `/me` falhar com o código certo, e a tela de
       * conta não carregada assume · ela tem saída.
       */
      onRevoked: () => {
        if (!cancelled) void refreshAccount();
      },
    });
    setClient(instance);
    instance.start();

    /**
     * **`user.membership` significa "seus direitos mudaram"**, e é o único
     * evento do produto que diz isso · por isso ele mora aqui e não numa tela.
     *
     * Ele é o gatilho do `retryDenied`, que é a metade que faltava do corte do
     * servidor: entrar num club com a página dele aberta dava uma tela com o
     * direito na mão e a inscrição recusada de quando a pessoa era visitante.
     *
     * **A conexão já assina `user:{id}` sozinha**, pela identidade do bilhete ·
     * isto não pede tópico novo, só escuta o que já chega.
     */
    const off = instance.subscribe(userTopic(accountId), (event) => {
      if (event.kind === 'resync' || event.type === USER_EVENT.membership) {
        instance.retryDenied();
      }
      /**
       * **O papel na plataforma mudou** · promovida a admin ou rebaixada, e a
       * conta precisa ser relida pra tela alcançar isso **sem um F5**.
       *
       * O papel morava só no claim do token, que dura uma hora: quem era
       * promovido não via o painel até deslogar · achado pelo Eduardo com o
       * @gow em 04/09/2026. Hoje o `GET /me` responde com o papel **do banco**,
       * então recarregar a conta é o bastante.
       *
       * **Esconder continua sendo UX** · quem recusa a rota é o servidor, que
       * também deixou de ler o claim.
       */
      if (event.kind === 'changed' && event.type === USER_EVENT.role) {
        void refreshAccount();
      }
    });

    /**
     * **Voltar não deve esperar a vez da espera crescente.** Quem fecha o
     * notebook e abre de novo tem uma conexão morta e um relógio de trinta
     * segundos rodando · os dois eventos abaixo cortam essa espera.
     */
    const retry = () => instance.retryNow();
    const onVisible = () => {
      if (document.visibilityState === 'visible') retry();
    };
    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      off();
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', onVisible);
      instance.stop();
      setClient(null);
    };
  }, [accountId, refreshAccount]);

  const value = useMemo(() => ({ client, state }), [client, state]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
