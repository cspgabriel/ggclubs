import type { User } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { activeLanguage } from '@/i18n';
import { ApiError, api, type UserRecord } from './api.js';
import { AuthContext, type AuthContextValue, type UserRole } from './auth-context.js';
import { signInWithGoogle } from './google-signin.js';
import { rememberSession } from './session-hint.js';
import { needsSession } from './session-routes.js';

/**
 * **O SDK do Firebase entra por import dinâmico, e isso é o ponto deste
 * arquivo.**
 *
 * Ele são 161 kB (34 kB gzip) e, importado no topo, entrava no pacote de
 * **entrada** · ou seja, a landing baixava e analisava um SDK de autenticação
 * antes de pintar, sendo que ela não pergunta nada pra ele. Era 23% do peso
 * bruto da primeira visita, e a landing é a única tela que um desconhecido vê
 * antes de decidir se o produto interessa.
 *
 * Aqui o SDK sai do caminho crítico: ele é buscado **depois da primeira
 * pintura**, dentro do efeito. Quem precisa da sessão pra decidir o que
 * desenhar (`/login`, `/app`, `/admin`, o club público) tem o chunk **aquecido
 * no boot** pelo `prefetchShell` do router, então na prática ele já chegou
 * quando a guarda pergunta.
 *
 * **O que isto NÃO faz:** deixar de baixar o SDK na landing. Ele continua
 * sendo buscado, só que sem bloquear a pintura. Não baixar exigiria o provider
 * saber a rota, e ele mora **fora** do Router de propósito · a versão que
 * decide por rota some com o chunk pra quem nunca faz login, e fica pra quando
 * o número justificar.
 */
const loadFirebaseAuth = () => import('./firebase.js');
const loadAuthSdk = () => import('firebase/auth');

// Só o provider mora aqui · hook e contexto ficam fora pra não quebrar o fast
// refresh do Vite, que exige arquivo exportando apenas componentes.
export function AuthProvider({ children }: { children: ReactNode }) {
  /**
   * **A sessão só é buscada em rota que decide por ela.**
   *
   * O provider mora **dentro** do Router desde 07/08/2026, e é isso que o
   * deixa perguntar em que tela a pessoa está. Antes ele envolvia o router
   * inteiro e bootava sempre · a landing, o texto legal e o 404 pediam `/me` e
   * o `accounts:lookup` do Firebase pra quem já tinha conta, duas requisições
   * que nenhuma das três usa.
   *
   * **A trava só anda pra frente**, e é ela que faz a navegação de dentro
   * funcionar: quem está na landing e clica em "Entrar" chega no `/login` sem
   * recarregar, e ali a sessão precisa bootar naquele instante. Ir da landing
   * pro login e voltar **não** derruba o que já subiu.
   */
  const location = useLocation();
  const [sessionWanted, setSessionWanted] = useState(() => needsSession(location.pathname));
  useEffect(() => {
    if (needsSession(location.pathname)) setSessionWanted(true);
  }, [location.pathname]);

  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<UserRecord | null>(null);
  const [accountStatus, setAccountStatus] = useState<AuthContextValue['accountStatus']>('idle');
  const [accountError, setAccountError] = useState<AuthContextValue['accountError']>(null);

  // O Firebase dispara `onAuthStateChanged` mais de uma vez no boot (cache e
  // depois revalidação), e em dev o StrictMode registra o listener duas vezes.
  // Sem isto, a mesma conta era buscada três vezes por carregamento.
  const loadedUid = useRef<string | null>(null);

  /**
   * **Recarga não é "não sei ainda", e a diferença entre as duas é uma tela.**
   *
   * O `loading` existe pra quem ainda não tem conta na mão · é ele que o
   * `ProtectedRoute` lê pra desenhar o `BootSplash`. Enquanto toda chamada de
   * `refreshAccount()` passava por ele, **gravar qualquer coisa trocava a página
   * inteira pela marca e a devolvia desmontada** · a tela remontava com o scroll
   * no topo, e quem salvava em `/app/conta` era jogado pro começo do formulário.
   * Achado pelo Eduardo em 08/08/2026.
   *
   * O conserto mora aqui e não na tela porque **toda tela que grava e recarrega
   * a sessão passa por este caminho** · consertar no `account.tsx` deixaria a
   * próxima com o mesmo pisca.
   */
  const hasAccount = useRef(false);

  const loadAccount = useCallback(async () => {
    if (!hasAccount.current) setAccountStatus('loading');
    setAccountError(null);
    try {
      const { user: record, role: fromServer } = await api.getMe();
      setAccount(record);
      /**
       * **O papel de verdade vem daqui, e não do claim do token** · 04/09/2026.
       *
       * O claim tem a idade do token (uma hora), então promover não liberava o
       * painel até a pessoa deslogar · foi o que o Eduardo viu com o @gow. O
       * `setRole` do claim continua acontecendo no boot **como dica**, porque
       * ele responde sem rede; esta linha é a correção dela, e ela chega junto
       * com a conta.
       *
       * **Esconder continua sendo UX** · quem decide é o servidor, que desde o
       * `requireAdminAccount` também lê o banco. As duas pontas passaram a
       * perguntar à mesma fonte, que é o que faltava.
       */
      setRole(fromServer);
      // Conta nula é quem tem sessão e ainda não passou pelo onboarding · a
      // próxima busca dela **é** primeira carga, e deve esperar mostrando.
      hasAccount.current = record !== null;
      setAccountStatus('ready');
    } catch (err) {
      /**
       * **Blip de rede numa RECARGA não derruba a sessão que já está na mão** ·
       * achado pelo `revisor` em 01/09/2026, no fluxo de salvar o telefone
       * dentro da inscrição.
       *
       * O desfecho era concreto e ruim: a pessoa confirmava, o `PATCH` gravava
       * **com sucesso**, o `GET /me` seguinte pegava um blip, e a tela inteira
       * virava *"algo deu errado do nosso lado"* · com o telefone salvo e a
       * inscrição possivelmente entrando contra um componente desmontado. Ela
       * só descobria no F5.
       *
       * É o irmão do `loading` logo acima, e pelo mesmo motivo: **recarga não é
       * "não sei ainda"**. Se já havia conta e a falha não veio da API dizendo
       * algo sobre ela, o certo é seguir com a que temos.
       *
       * **Resposta da API continua derrubando** · suspensão e token revogado
       * chegam como `ApiError` com código, e essas mudam mesmo o que a pessoa
       * pode fazer. O que não derruba é o que não sabe de nada: rede caindo,
       * DNS, aba voltando do sono.
       */
      if (hasAccount.current && !(err instanceof ApiError)) {
        setAccountStatus('ready');
        return;
      }
      // Não sabemos se a conta existe · só sabemos que não deu pra perguntar.
      // Zerar a marca deixa a próxima tentativa acontecer.
      loadedUid.current = null;
      hasAccount.current = false;
      setAccount(null);
      // **O código importa, e guardá-lo custou um beco sem saída pra
      // descobrir:** conta suspensa cai aqui igual a API fora do ar, e sem
      // distinguir as duas a tela mente pra quem foi suspenso e não oferece
      // nem sair.
      setAccountError(err instanceof ApiError ? err.code : null);
      setAccountStatus('error');
    }
  }, []);

  /**
   * **O idioma que a pessoa está lendo vira o idioma dos e-mails dela** · a
   * pendência 114.
   *
   * O `locale` da conta nascia no cadastro e **ninguém nunca o atualizava**:
   * quem criou conta em português e passou a usar o produto inteiro em espanhol
   * continuava recebendo e-mail em português, sem nada na tela explicando por
   * quê. O campo gravava certo, a regra estava certa, e faltava **o chamador** ·
   * o mesmo formato do `discoverable` antes de 08/08/2026.
   *
   * **Mora aqui, e não no seletor de idioma**, porque o seletor não é a causa ·
   * chega-se a *"esta pessoa lê em espanhol"* por quatro caminhos, e só um deles
   * passa por lá: o seletor, um link `/es/...` que circulou no Discord, a URL
   * digitada e o F5. Consertar no botão deixaria os outros três em silêncio, que
   * é o defeito que o `CLAUDE.md` descreve no pisca da tela de entrada.
   *
   * **Não recarrega a sessão**, e isso é deliberado: `refreshAccount()` aqui
   * viraria laço (grava → busca → compara → grava). O estado local é ajustado na
   * mão, e quem decide de verdade continua sendo o servidor na próxima leitura.
   *
   * **Falhar é silêncio de propósito** · a pessoa está tentando ler uma tela, e
   * um aviso sobre preferência de e-mail no meio disso não ajuda ninguém. A
   * marca é limpa no erro pra a próxima navegação tentar de novo.
   */
  const syncedLocale = useRef<string | null>(null);
  useEffect(() => {
    if (!account || account.locale === activeLanguage) return;

    // A marca leva a conta **e** o idioma · sem o segundo, quem trocasse de
    // idioma duas vezes na mesma sessão não gravaria a segunda.
    const attempt = `${account._id}:${activeLanguage}`;
    if (syncedLocale.current === attempt) return;
    syncedLocale.current = attempt;

    // **O `try` é em volta da chamada, e não só um `.catch`** · erro **síncrono**
    // (não uma promessa rejeitada) escapa do `.catch` e sobe pelo `useEffect`,
    // o que derruba a árvore inteira do React e não só esta gravação. Foi visto
    // acontecer, e o que a expôs foi um dublê de teste declarando menos que a
    // API de verdade.
    void (async () => {
      try {
        await api.updateMyProfile({ locale: activeLanguage });
        setAccount((prev) => (prev ? { ...prev, locale: activeLanguage } : prev));
      } catch {
        syncedLocale.current = null;
      }
    })();
  }, [account]);

  useEffect(() => {
    async function sync(u: User | null) {
      setUser(u);
      // Dica de boot pro próximo carregamento saber o que desenhar antes de o
      // Firebase responder. Não é credencial · ver lib/session-hint.ts.
      rememberSession(Boolean(u));
      if (u) {
        try {
          const tokenResult = await u.getIdTokenResult();
          /**
           * **Isto é a DICA de boot, e não a decisão** · o claim responde sem
           * rede, então ele desenha a casca antes de o `GET /me` voltar. O
           * papel que vale é o que o `loadAccount` traz do banco, logo abaixo ·
           * ver o comentário lá.
           */
          setRole(tokenResult.claims.role === 'admin' ? 'admin' : 'player');
        } catch {
          // Token ilegível não pode virar admin nem travar a tela.
          setRole('player');
        }
        if (loadedUid.current !== u.uid) {
          loadedUid.current = u.uid;
          await loadAccount();
        }
      } else {
        loadedUid.current = null;
        // Sessão que acabou não deixa conta na mão · a próxima é primeira carga
        // de novo, e tem que esperar mostrando.
        hasAccount.current = false;
        setRole(null);
        setAccount(null);
        // **Zerar o status ao sair não é enfeite.** Sem isto ele fica com o
        // valor da sessão anterior · quem saiu de uma sessão carregada
        // continuava com `ready`, e quem saiu de uma conta suspensa continuava
        // com `error`. Estado velho de uma sessão que acabou é o tipo de coisa
        // que faz a guarda decidir por um dado que não vale mais.
        setAccountStatus('idle');
        setAccountError(null);
      }
      setLoading(false);
    }

    // **O `loading` continua sendo desligado só pelo `sync`**, e não pela
    // chegada do módulo · quem espera aqui espera a resposta do Firebase, que é
    // o que a guarda de rota precisa saber. O import só adiantou de onde ela vem.
    if (!sessionWanted) return;

    let unsubscribe: (() => void) | undefined;
    let desmontou = false;

    void (async () => {
      const [{ firebaseAuth }, { onAuthStateChanged }] = await Promise.all([
        loadFirebaseAuth(),
        loadAuthSdk(),
      ]);
      // Desmontou enquanto o chunk vinha · registrar o ouvinte agora deixaria
      // um vazamento que ninguém cancela.
      if (desmontou) return;
      // O Firebase espera um callback síncrono · sem o void o erro viraria
      // unhandled rejection e a tela ficaria presa em "Carregando".
      unsubscribe = onAuthStateChanged(firebaseAuth, (u) => void sync(u));
    })();

    return () => {
      desmontou = true;
      unsubscribe?.();
    };
  }, [sessionWanted, loadAccount]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      loading,
      account,
      accountStatus,
      accountError,
      // As quatro carregam o SDK na hora de usar · quando alguém aperta um
      // destes botões, ele já veio há muito tempo (o efeito acima o busca no
      // primeiro render), então o `import` resolve do registro de módulos.
      signIn: async (email, password) => {
        const [{ firebaseAuth }, { signInWithEmailAndPassword }] = await Promise.all([
          loadFirebaseAuth(),
          loadAuthSdk(),
        ]);
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      },
      signUp: async (email, password) => {
        const [{ firebaseAuth }, { createUserWithEmailAndPassword }] = await Promise.all([
          loadFirebaseAuth(),
          loadAuthSdk(),
        ]);
        await createUserWithEmailAndPassword(firebaseAuth, email, password);
      },
      /**
       * **Import estático, e a dinâmica que estava aqui não comprava nada.**
       *
       * O comentário anterior dizia que o módulo do Google importava o SDK no
       * topo, e que deixá-lo estático traria 161 kB de volta pro pacote de
       * entrada · **isso deixou de ser verdade**: o `google-signin.ts` só
       * importa `pkce` e `platform`, e busca o SDK sob demanda lá dentro.
       *
       * E a dinâmica **já não separava chunk nenhum**, porque o `main.tsx` e o
       * `sign-in-form.tsx` importam o mesmo módulo **estaticamente** · era
       * exatamente a armadilha que o `CLAUDE.md` descreve, com o Vite avisando
       * no build e ninguém lendo. Medido no `dist`: o entry não caiu 1 byte ao
       * trocar, e o chunk do `firebase` continua fora dele.
       */
      signInWithGoogle,
      signOut: async () => {
        const [{ firebaseAuth }, { signOut: fbSignOut }] = await Promise.all([
          loadFirebaseAuth(),
          loadAuthSdk(),
        ]);
        await fbSignOut(firebaseAuth);
      },
      refreshAccount: loadAccount,
    }),
    [user, role, loading, account, accountStatus, accountError, loadAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
