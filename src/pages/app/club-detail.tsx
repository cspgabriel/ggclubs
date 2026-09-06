import {
  CLUB_EVENT,
  clubTopic,
  USER_EVENT,
  userTopic,
  type SaveTacticInput,
} from '@ggclubs/schemas';
import { ArrowLeft, Settings, ShieldOff, X } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { ClubView } from '@/components/club/club-view';
import { ClubViewSkeleton } from '@/components/club/club-view-skeleton';
import { TacticBoard } from '@/components/club/tactic-board';
import type { TacticRecord } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import { leadsClub } from '@/lib/clubs';
import { JoinClubButton } from '@/components/club/join-club-button';
import { ClubInvites } from '@/components/club/club-invites';
import { FavoriteClubControl } from '@/components/club/favorite-club-control';
import { ManagerOfferNotice } from '@/components/club/manager-offer-notice';
import { OwnershipOfferNotice } from '@/components/club/ownership-offer-notice';
import { JoinRequests } from '@/components/club/join-requests';
import { LeaveClubButton } from '@/components/club/leave-club-button';
import { StepDownButton } from '@/components/club/step-down-button';
import { SquadMemberActions } from '@/components/club/squad-member-actions';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PAGE_STACK_GAP } from '@/components/ui/page-stack';
import { api } from '@/lib/api';
import { appPlayerPath } from '@/lib/paths';
import { useRealtimeRefresh } from '@/lib/realtime/use-realtime-refresh';
import { useAuth } from '@/lib/use-auth';
import { useMyClubs } from '@/lib/use-my-clubs';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useResource } from '@/lib/use-resource';

/**
 * O club visto **de dentro do app**, com a navegação em volta.
 *
 * Quem está logado e abre um link de club cai aqui em vez da página pública ·
 * a página pública é pra quem ainda não entrou. Sair do app pra ver um time do
 * próprio app é troca de contexto sem motivo.
 *
 * O conteúdo é o mesmo componente da página pública, de propósito.
 */
export function ClubDetailPage() {
  const { t } = useTranslation();
  const { tag = '' } = useParams<{ tag: string }>();
  // Depois de sair, ficar na página do club mostraria um elenco de que a pessoa
  // não faz mais parte, com o botão de entrar no lugar do de sair · a lista é
  // pra onde ela ia de qualquer jeito.
  const navigate = useNavigate();

  const { account } = useAuth();
  const accountId = account?._id ?? null;
  /**
   * **As três coisas vêm de uma resposta só** · club, elenco e tática chegam
   * juntos ou não chegam.
   */
  /**
   * **Zera só quando o `tag` muda, não a cada recarga** · é comportamento do
   * `useResource`, e era um `useEffect` à parte antes de 01/09/2026. Sem essa
   * distinção, a página inteira voltava pro esqueleto toda vez que o dono
   * aprovasse alguém · o elenco é o que muda, não o club.
   */
  const {
    data: clubData,
    error: clubError,
    reload: refreshClub,
    setData: setClubData,
  } = useResource((signal) => api.getPublicClub(tag, { signal }), [tag]);
  const club = clubData?.club ?? null;
  const squad = clubData?.squad ?? [];
  const tactic = clubData?.tactic ?? null;
  const notFound = Boolean(clubError);

  /**
   * **Troca só a escalação do que está na mão** · a tática vem dentro da mesma
   * resposta do club, e recarregar a página inteira por causa dela foi
   * justamente o que o Eduardo apontou em 07/08/2026 olhando a aba de rede.
   */
  const setTactic = (next: TacticRecord | null) =>
    setClubData((current) => (current ? { ...current, tactic: next } : current));
  /**
   * **Três gatilhos, um por coisa que a página busca** · e não um contador só.
   *
   * Esta tela faz três buscas independentes: o club (com elenco e escalação), o
   * elenco **com id** de quem gerencia, e o vínculo de quem olha (o favorito).
   * Enquanto havia um contador único, **toda** gravação recarregava as três, e o
   * número real era pior do que parecia · medido em 07/08/2026, favoritar
   * custava **5 GET**, e favoritar não muda nem o club nem o elenco.
   *
   * **A metade escondida do desperdício era uma cascata**, e ela dobrava duas
   * das buscas: o efeito do club faz `setClub`, e os outros dois **dependiam do
   * objeto `club`** · como ele nasce novo a cada resposta, eles rodavam uma vez
   * pelo contador e outra pela identidade do objeto. Hoje eles dependem de
   * `club._id` e `club.tag`, que são valores · recarregar o club deixou de
   * arrastar os outros dois atrás.
   *
   * **Recarregar tudo continua sendo legítimo onde a gravação tem efeito em
   * cascata de verdade** (assumir o club muda papel, elenco e o próprio club) ·
   * é o `refreshAll`, e a regra é declarar o que muda, não o que é cômodo.
   */

  /**
   * **O favorito não tem contador próprio desde 12/08/2026** · ele mora na lista
   * de clubs da sessão, então quem recarrega é o dono do dado. A tabela acima
   * continua valendo: favoritar recarrega **só** o vínculo, e isso hoje é uma
   * releitura do `/me/clubs` em vez de uma busca desta tela.
   */
  const { clubs: myClubs, reload: refreshFavorite } = useMyClubs();

  /** Entrou, saiu ou trocou de dono · aí muda tudo, e recarregar tudo é o certo. */
  const refreshAll = () => {
    refreshClub();
    refreshRoster();
    refreshFavorite();
  };

  useDocumentTitle(club?.name);

  const myRole = squad.find((m) => m.handle === account?.handle)?.role;
  /**
   * **Gerência é uma coisa só nesta tela desde 12/08/2026** · a fila de pedidos
   * era a exceção, e ela caiu com a pendência 81. O que sobra de exclusivo do
   * dono (passar e encerrar o club) é sobre o **club**, não sobre o elenco, e
   * cada rota dessas confere pelo `ownerId` no filtro da própria escrita.
   *
   * **Onde a tela e a rota discordarem, quem manda é a rota** · discordar não dá
   * erro visível, dá requisição perdida e ruído no console. Foi assim que um 404
   * por carga viveu despercebido.
   */
  const canManage = leadsClub(myRole);
  const noCaptain = squad.length > 0 && !squad.some((m) => m.isCaptain);

  // O elenco **com id**, só pra quem gerencia · a página pública já trouxe o
  // elenco pra mostrar, e o que falta lá é o identificador estável que as ações
  // precisam. Duas buscas só no caso de quem manda no club; pra visitante e
  // membro comum não custa nada.
  // Quem está esperando resposta pra assumir o club · vem na mesma resposta
  // porque é estado do elenco, e é na linha da pessoa que ele aparece.
  // **Depende do `_id`, não do objeto `club`.** Com o objeto, toda resposta do
  // club redisparava esta busca de graça, porque a identidade muda a cada
  // `setClub` · era metade do desperdício que a pendência 56 mediu.
  const clubId = club?._id ?? null;

  const {
    data: manageableData,
    reload: refreshRoster,
  } = useResource(
    (signal) => api.listManageableSquad(clubId ?? '', { signal }),
    [clubId],
    // Quem não gerencia recebe 404 aqui · a tela só perde as ações, e nem
    // pergunta.
    { skip: !clubId || !canManage },
  );
  const manageable = manageableData?.squad ?? [];
  const pendingOwnerId = manageableData?.pendingOwnerId ?? null;
  /**
   * **Quem está esperando responder sobre a gerência** · 03/09/2026, pendência
   * 185.
   *
   * `?? []` e não `?? null` porque a ausência e a lista vazia significam a mesma
   * coisa aqui ("ninguém"), ao contrário do `pendingOwnerId` · e porque a
   * resposta é recente: club com resposta anterior a hoje não traz o campo, e
   * `undefined.includes` quebraria a linha do elenco inteira.
   */
  const pendingManagerIds = manageableData?.pendingManagerIds ?? [];

  /**
   * **O canal, e cada busca declara o que é com ela.**
   *
   * É a mesma divisão dos três gatilhos acima, vista do outro lado: em vez de
   * um "algo mudou no club" que recarregaria as três, o evento diz **o que**
   * mudou e cada uma se pergunta se aquilo a afeta. Sem isso, o bloco de 07/08
   * que derrubou favoritar de 5 GET pra 1 seria desfeito pelo tempo real.
   *
   * **Quem não é do elenco não recebe nada aqui**, e isso não é descuido: a
   * inscrição em `club:{id}` exige vínculo ativo, conferido no banco. Pra
   * visitante a página é um retrato · **até ela deixar de ser visitante**, e aí
   * a inscrição é pedida de novo (ver o gatilho de `user.membership` abaixo).
   *
   * O `club.deleted` entra no gatilho do club de propósito · a busca devolve
   * não-encontrado e a tela vira a de club que não existe, **com saída**, em vez
   * de ficar mostrando um club que acabou.
   */
  const topic = clubId ? clubTopic(clubId) : null;
  useRealtimeRefresh(topic, [CLUB_EVENT.squad, CLUB_EVENT.identity, CLUB_EVENT.deleted], refreshClub);
  useRealtimeRefresh(topic, [CLUB_EVENT.squad, CLUB_EVENT.ownership], refreshRoster);

  /**
   * **O SEU vínculo com este club, que é a coisa que o tópico dele não pode
   * contar.**
   *
   * É o buraco que o Eduardo achou em 12/08/2026, e ele tem dois lados que
   * parecem casos diferentes e são o mesmo:
   *
   * - **ser tirado do elenco com a página aberta** · o servidor corta o
   *   `club:{id}` no mesmo instante (é obrigação escrita), então o evento do
   *   elenco **não chega mais** · e a página continuava mostrando você no elenco,
   *   com os botões de gerenciar, até um F5;
   * - **entrar no club com a página aberta** · você era visitante, a inscrição
   *   tinha sido **recusada**, e nada nunca mais pedia. Quem devolve a inscrição
   *   é o `retryDenied` do provider; quem devolve o **conteúdo** é esta linha.
   *
   * Em ambos, o único canal que sobra é o `user:{id}` · ele é seu e não depende
   * de vínculo nenhum. **Recarrega tudo de propósito**: o que mudou aqui não é
   * um pedaço do club, é o seu papel dentro dele, e ele decide o que a página
   * inteira mostra.
   */
  useRealtimeRefresh(accountId ? userTopic(accountId) : null, [USER_EVENT.membership], () => {
    refreshClub();
    refreshRoster();
    // O favorito não entra aqui: o `MyClubsProvider` ouve o mesmo evento e a
    // lista se refaz sozinha · pedir de novo daqui daria duas buscas iguais.
  });

  /**
   * Desistir de passar o club, **da faixa e não só do menu**.
   *
   * A ação já existia dentro do `⋮`, e continua lá · o que faltava era ela
   * estar à vista, como o "Desistir" do convite pendente. Quem acabou de
   * oferecer é quem mais provavelmente vai voltar atrás.
   */
  const [cancellingOwnership, setCancellingOwnership] = useState(false);
  const [ownershipError, setOwnershipError] = useState<string | null>(null);
  async function cancelOwnership() {
    if (!club || cancellingOwnership) return;
    setCancellingOwnership(true);
    setOwnershipError(null);
    try {
      await api.cancelOwnership(club._id);
      // Desistir de passar o club mexe **só** no `pendingOwnerId`, que vem com
      // o elenco gerenciável · o club continua o mesmo e o favorito também.
      refreshRoster();
    } catch (err) {
      setOwnershipError(apiErrorMessage(err, t));
    } finally {
      setCancellingOwnership(false);
    }
  }


  // O papel sai do elenco que a tela **já buscou**, cruzado com o handle que já
  // está na sessão · a primeira versão pedia `/me/clubs` só pra decidir se
  // mostrava um botão, o que é uma consulta ao banco por visita a club.
  // Quem já está no elenco não pede pra entrar · o selo da identidade é quem
  // diz isso, e o botão sobraria. Sai do mesmo elenco, sem consulta a mais.
  const isMember = squad.some((m) => m.handle === account?.handle);

  /**
   * O favorito, que é do **vínculo** e não do club.
   *
   * A rota pública não traz `isPrimary` de propósito · ele é preferência de uma
   * conta sobre um club, e não um dado do club.
   *
   * **Ele sai do `MyClubsProvider`, e não de uma busca desta tela** · é o mesmo
   * `GET /me/clubs` que a lista de clubs, o teto e o selo "em comum" já usavam,
   * cada um por conta. Continua **condicionado ao vínculo**, no mesmo padrão do
   * elenco gerenciável logo acima: quem visita club de outra pessoa não desenha
   * a linha · a diferença é que agora isso não custa requisição a ninguém.
   *
   * O `hasOtherFavorite` sai da mesma lista porque a janela de confirmação muda
   * de texto quando já existe um favorito · sem ele, ela prometeria não desfazer
   * nada enquanto desfaz.
   *
   * **Lista ausente é linha ausente**, e é o que a falha já fazia: `null` aqui
   * significa "não sei", e nada mais da página depende dela.
   */
  // Mesmo motivo do elenco gerenciável: **valor, não objeto** · com `club` nas
  // dependências, isto recalculava a cada resposta do club.
  const clubTag = club?.tag ?? null;
  const myMembership = useMemo(() => {
    if (!clubTag || !isMember || !myClubs) return null;
    const mine = myClubs.find((c) => c.tag === clubTag);
    return {
      isPrimary: mine?.isPrimary ?? false,
      hasOtherFavorite: myClubs.some((c) => c.isPrimary),
    };
  }, [clubTag, isMember, myClubs]);

  /**
   * A escalação **vem junto do club**, e não numa busca própria.
   *
   * As duas rotas leem o mesmo `getClubTactic` e devolvem a mesma forma (por
   * `@handle`, nunca por id) · a busca separada que existia aqui era uma
   * consulta a mais por visita pra trazer o que já estava na resposta.
   *
   * E ela trazia junto um defeito de produto: por ser autenticada e só rodar
   * pra quem é do elenco, **quem tinha conta e não era do club via menos que um
   * estranho deslogado**. Como o logado é levado da página pública pro app, ele
   * não tinha nem como ver o que qualquer visitante vê. Achado pelo Eduardo em
   * 06/08/2026, e é o oposto da decisão de 03/08 que pôs a escalação na pública
   * justamente por ser a peça mais compartilhável do produto.
   */
  const [savingTactic, setSavingTactic] = useState(false);
  // A escalação passou a confirmar que gravou · pendência 64.
  const [tacticSaved, setTacticSaved] = useState(false);

  /**
   * **A escalação mudou no servidor enquanto esta tela estava aberta.**
   *
   * Dois gerentes montam o time ao mesmo tempo mais do que parece · e até
   * 11/08/2026 o segundo a gravar **apagava o trabalho do primeiro sem nenhum
   * dos dois saber**, porque a gravação é um `$set` e o "Não salvo" é derivado
   * do estado local: a tela do outro continuava parecendo em dia.
   *
   * **O que se faz com a escalação nova depende de haver alteração pendente**, e
   * é aí que mora a decisão:
   *
   * - **prancheta limpa** · aplica direto. A pessoa não perde nada, e ver o time
   *   novo aparecer é exatamente o que ela esperaria.
   * - **prancheta suja** · **não aplica**, e avisa. Trocar o campo embaixo da
   *   mão de quem está arrastando player seria o mesmo apagão, agora feito por
   *   nós · quem decide se joga fora o próprio trabalho é ela.
   */
  // **Ref e não estado** · ninguém pinta por causa dele. Ele é lido **no
  // instante em que o evento chega**, e como estado ele custaria um render a
  // cada player arrastado, que é o gesto mais repetido desta tela.
  const boardDirty = useRef(false);
  const [freshTactic, setFreshTactic] = useState<TacticRecord | null>(null);

  const reloadTactic = useCallback(
    async (signal?: AbortSignal) => {
      if (!clubId) return null;
      try {
        const { tactic: next } = await api.getClubTactic(clubId, { signal });
        return next;
      } catch {
        // Quem não é do elenco não lê a escalação · e quem é, tenta de novo no
        // próximo evento. Falhar aqui não pode virar tela de erro.
        return null;
      }
    },
    [clubId],
  );

  useRealtimeRefresh(topic, [CLUB_EVENT.tactic], () => {
    void reloadTactic().then((next) => {
      if (!next) return;
      if (boardDirty.current) setFreshTactic(next);
      else setTactic(next);
    });
  });

  /** A pessoa aceitou perder o que estava montando · é escolha dela. */
  function applyFreshTactic() {
    if (!freshTactic) return;
    setTactic(freshTactic);
    setFreshTactic(null);
  }

  const [tacticError, setTacticError] = useState<string | null>(null);
  async function saveTactic(input: SaveTacticInput) {
    if (!club) return;
    setSavingTactic(true);
    setTacticError(null);
    setTacticSaved(false);
    try {
      await api.saveClubTactic(club._id, input);
      // Recarrega em vez de confiar no que a tela tem: a gravação é conferida
      // contra o elenco no servidor, e é ele que sabe o que ficou de pé.
      //
      // **Só a escalação, e não a página.** Isto era `setReload`, que é o
      // gatilho de **três** efeitos · o club inteiro, o elenco gerenciável e o
      // vínculo de quem olha. Salvar custava 1 PUT e 3 GET, e nenhum dos outros
      // dois muda por causa de uma escalação. Apontado pelo Eduardo em
      // 07/08/2026, olhando a aba de rede.
      const fresh = await api.getClubTactic(club._id);
      setTactic(fresh.tactic);
      // Gravou por cima do que tinha chegado · o aviso perdeu o assunto.
      setFreshTactic(null);
      setTacticSaved(true);
    } catch (err) {
      // O caso que chega aqui é alguém ter saído do club com a tela aberta ·
      // `PLAYER_NOT_IN_SQUAD`, que já diz pra recarregar a escalação.
      setTacticError(
        apiErrorMessage(err, t),
      );
    } finally {
      setSavingTactic(false);
    }
  }

  if (notFound) {
    return (
      <EmptyState
        icon={ShieldOff}
        title={t('club.notFoundTitle')}
        description={t('club.notFoundBody')}
        action={{ label: t('nav.clubs'), to: '/app/clubs' }}
      />
    );
  }
  // A silhueta usa o mesmo `variant` do conteúdo que vem · com o outro, a capa
  // sangraria de borda a borda e a página saltaria ao carregar.
  if (!club) return <ClubViewSkeleton variant="embedded" />;

  return (
    // `space-y-3` e não `space-y-5` · o link de volta é a saída desta tela e
    // fica colado no que ele volta, com vão menor que o de dentro do conteúdo.
    <div className="space-y-3">
      <Link
        to="/app/clubs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('nav.clubs')}
      </Link>

      <ClubView
        club={club}
        squad={squad}
        variant="embedded"
        playerHref={appPlayerPath}
        viewerHandle={account?.handle}
        viewerPlatform={account?.platform}
        identityNotice={
          myMembership ? (
            <div className="flex flex-col gap-3">
              <FavoriteClubControl
                club={{ _id: club._id, name: club.name, isPrimary: myMembership.isPrimary }}
                hasOtherFavorite={myMembership.hasOtherFavorite}
                // Favoritar mexe **só no vínculo de quem clicou** · o club e o
                // elenco não sabem que isso aconteceu.
                onChanged={refreshFavorite}
              />
              {/* Quem **já é dono** não recebe oferta do próprio club · sem esta
                  guarda seria uma requisição à toa em toda visita de quem
                  gerencia. */}
              {myRole !== 'owner' && (
                <OwnershipOfferNotice
                  clubId={club._id}
                  // Assumir o club é a cascata de verdade: muda o dono, muda o
                  // papel de quem aceitou, e muda o que ele pode fazer na tela.
                  onAccepted={refreshAll}
                />
              )}
              {/* **O convite de gerência precisa da mesma caixa** · o e-mail e
                  o sininho dele apontam pra ESTA página, e sem ela a pessoa
                  clicava no link e não achava onde responder · o único lugar
                  era a lista em `/app/clubs`. É a terceira vez que este defeito
                  aparece (o convite em 05/08, a posse depois), e desta vez quem
                  pegou foi o `revisor`, antes do usuário.

                  **Só pra quem ainda não manda** · dono e gerente não recebem
                  convite pro cargo que já têm, e a guarda evita uma requisição à
                  toa em toda visita de quem gerencia. */}
              {!canManage && (
                <ManagerOfferNotice
                  clubId={club._id}
                  // Vira gerente: muda o papel de quem aceitou e o que a tela
                  // inteira oferece a ele.
                  onAccepted={refreshAll}
                />
              )}
            </div>
          ) : undefined
        }
        squadNotice={
          // Todo club nasce sem capitão · o estado que mais aparece convida em
          // vez de ficar em silêncio, que é a regra de reserva ser design.
          canManage && noCaptain ? (
            <p className="mb-3 rounded-lg border border-dashed border-primary/40 px-3 py-2 text-xs text-muted-foreground">
              {t('club.noCaptainHint')}
            </p>
          ) : undefined
        }
        renderMemberActions={(handle) => {
          if (!canManage || !myRole) return null;
          const target = manageable.find((m) => m.handle === handle);
          if (!target) return null;
          return (
            <SquadMemberActions
              clubId={club._id}
              member={target}
              viewerRole={myRole}
              isViewer={handle === account?.handle}
              pendingOwnerId={pendingOwnerId}
              pendingManagerIds={pendingManagerIds}
              // Convidar a gerente, dar a braçadeira e tirar do elenco mudam o
              // elenco (que vem com o club) e os ids de gestão · o favorito de
              // quem olha, não.
              onChanged={() => {
                refreshClub();
                refreshRoster();
              }}
            />
          );
        }}
        /**
         * **A oferta aberta precisa se ver com o menu fechado.** Sem isto o
         * dono oferece o club, volta na página e não há sinal nenhum · ele
         * teria que abrir o menu de cada pessoa pra descobrir o que ele mesmo
         * fez. É a mesma regra que pôs a fila de pedidos na página.
         *
         * **Era uma coroa até 07/08/2026, e ela apontava pra pessoa errada.**
         * Coroa é dono; o dono de verdade está no card ao lado, escrito DONO e
         * sem coroa nenhuma. O único elemento coroado da tela era um membro.
         * Some a isso que o `title` não existe no toque, e o celular é onde o
         * elenco é conferido: sobrava um glifo mudo carregando o estado mais
         * consequente da tela.
         *
         * O desenho agora é o **mesmo do convite pendente**, que fica algumas
         * linhas acima e resolve o mesmo tipo de estado com palavra e com a
         * saída à vista. Duas coisas iguais liam de dois jeitos porque nasceram
         * em lugares diferentes, e ninguém decidiu isso.
         */
        renderMemberNotice={(handle) => {
          /**
           * **Só o DONO**, e não quem gerencia · achado pelo Eduardo em
           * 12/08/2026. Com `canManage`, o gerente que **recebeu** a oferta via
           * na própria linha o rótulo "Convidado a assumir" **e o botão de
           * desistir**, que é a ação de quem ofereceu · o servidor recusava (a
           * autorização está no filtro da escrita, por `ownerId`), então o
           * clique não fazia nada e nada explicava por quê.
           *
           * E havia um segundo estrago, de leitura: quem foi convidado já tem a
           * caixa de decidir nesta mesma página (`OwnershipOfferNotice`, com
           * aceitar e recusar). **Duas peças contando o mesmo fato de dois
           * jeitos**, e a errada oferecia o verbo do outro lado.
           *
           * É a mesma condição que o menu do elenco já usava
           * (`SquadMemberActions`, `isOwner && pendingOwnerId === …`) · as duas
           * nasceram em lugares diferentes e só uma tinha acertado.
           */
          if (myRole !== 'owner') return null;
          const target = manageable.find((m) => m.handle === handle);
          if (!target) return null;
          /**
           * **O convite de gerência aberto lê como a oferta de posse, um degrau
           * abaixo** · 03/09/2026, pendência 185.
           *
           * Só a faixa, **sem botão de desistir** · desistir é o item
           * "Desistir do convite" no menu `⋮` da mesma linha, e ele é o mesmo
           * `role: 'member'` que rebaixa. Repetir a ação aqui daria dois botões
           * pra a mesma coisa na mesma linha, que é o que a coroa muda de
           * 07/08/2026 já ensinou a não fazer.
           *
           * **A posse ganha quando os dois existem** · nada impede o dono de
           * oferecer as duas coisas pra a mesma pessoa, e aí a faixa mostra a
           * que pesa mais. Esta linha já afirmou que eles "nunca coincidem", o
           * que era palpite: eu não tinha conferido, e não conferem.
           */
          if (pendingOwnerId !== target.userId) {
            if (!pendingManagerIds.includes(target.userId)) return null;
            return (
              <div className="border-t px-3 py-2">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {t('club.managerWaiting')}
                </span>
              </div>
            );
          }
          return (
            <div className="border-t px-3 py-2">
              {/* **Cabe numa linha a 320px, e cada peça aqui foi medida.**
                  O card oferece 246px. O caminho errado foi tirar o ícone do
                  botão pra ganhar 22px: sem ele o controle **deixa de parecer
                  botão** e o rótulo fica desalinhado do texto à esquerda ·
                  apontado pelo Eduardo, e ele está certo. O ícone voltou.

                  Os pixels vieram do **rótulo**, que é onde havia gordura:
                  `tracking-widest` custa 0,1em por caractere e em 19 caracteres
                  isso são ~21px gastos em ar. Com `tracking-wide` o rótulo
                  continua lendo como rótulo e a linha fecha. */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {t('club.ownershipWaiting')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-8 px-2"
                  disabled={cancellingOwnership}
                  onClick={() => void cancelOwnership()}
                >
                  <X className="mr-1.5 h-4 w-4" aria-hidden />
                  {t('club.ownershipCancelShort')}
                </Button>
              </div>
              {ownershipError && (
                <p role="alert" className="mt-1 text-xs text-destructive">
                  {ownershipError}
                </p>
              )}
            </div>
          );
        }}
        beforeSquad={
          canManage ? (
            <div className={PAGE_STACK_GAP}>
              {/* Entrou gente no elenco · muda o club (o elenco vem com ele) e
                  os ids de gestão. O vínculo de quem aprovou continua igual.

                  **A fila é de quem gerencia, e a rota concorda** · foi a
                  pendência 81, decidida em 12/08/2026: quem **chama** alguém pro
                  elenco também **responde** a quem se ofereceu.
                  `GET /me/clubs/:id/requests` e o `PATCH` dela conferem papel de
                  gestão, então esta condição e a autorização de lá dizem a mesma
                  coisa.

                  **Elas já discordaram**, e o preço não apareceu na tela: com a
                  rota só de dono e esta condição em `canManage`, o gerente
                  montava o componente, levava 404, e o `catch` engolia · a fila
                  some quando está vazia, então **na tela dava no mesmo**, e o
                  custo era uma requisição perdida por carga e um 404 no console
                  de toda página de club que um gerente abrisse. O caso negativo
                  disso está em `club-join-queue.test.tsx`, hoje com o membro
                  comum no lugar do gerente. */}
              <JoinRequests
                clubId={club._id}
                onApproved={() => {
                  refreshClub();
                  refreshRoster();
                }}
              />
              <ClubInvites
                clubId={club._id}
                onJoined={() => {
                  refreshClub();
                  refreshRoster();
                }}
              />
            </div>
          ) : undefined
        }
        action={
          // Gerente configura o club desde 31/07/2026 · a decisão e a
          // comparação com o GM do EA FC 26 estão em docs/historico.md. O que
          // continua só do dono é a `tag` (imutável) e, quando existir,
          // transferir e excluir.
          canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="ctaOutline" size="sm">
                <Link to={`/app/clubs/${club.tag}/editar`}>
                  <Settings className="mr-1.5 h-4 w-4" />
                  {t('club.configure')}
                </Link>
              </Button>
              {/**
               * **O gerente também precisa da porta de saída** · 03/09/2026.
               *
               * O servidor deixa gerente sair desde sempre (só o dono é barrado),
               * e a tela nunca ofereceu: o ramo do "sair" ficava atrás do
               * `canManage`, então era **inalcançável** pra ele.
               *
               * **E isso fechava justamente o beco que a transferência de posse
               * existe pra abrir** · o dono antigo vira gerente, e o comentário
               * do `club-ownership.ts` diz com todas as letras que "como gerente
               * ele pode sair". Podia no servidor e não na tela: quem passava o
               * club ficava preso nele.
               */}
              {myRole === 'manager' && (
                <>
                  {/**
                   * **E a saída MENOR, que é a que faltava** · 03/09/2026,
                   * pendência 186.
                   *
                   * Gerente ocupa a vaga de liderança da conta, então quem
                   * passou a posse e quer abrir outro club precisava largar o
                   * cargo · e a única porta era **sair do club inteiro**,
                   * perdendo elenco, posição e braçadeira por causa de um
                   * título. As duas ficam lado a lado de propósito: a pergunta
                   * é *"largo o cargo ou largo o time?"*, e ela só existe se as
                   * duas respostas estiverem à vista.
                   */}
                  <StepDownButton
                    clubId={club._id}
                    clubName={club.name}
                    // **Fica na página**, ao contrário de sair · o vínculo
                    // continua, e mandar a pessoa embora do club onde ela
                    // acabou de escolher ficar seria o oposto do que ela pediu.
                    onStepDown={refreshAll}
                  />
                  <LeaveClubButton
                    clubId={club._id}
                    clubName={club.name}
                    onLeft={() => void navigate('/app/clubs')}
                  />
                </>
              )}
            </div>
          ) : isMember ? (
            // Sair fica onde a pessoa está quando percebe que não joga mais
            // ali · esconder na tela de configurar seria pedir que ela procure.
            <LeaveClubButton
              clubId={club._id}
              clubName={club.name}
              onLeft={() => void navigate('/app/clubs')}
            />
          ) : (
            // **Aqui é `refreshAll` de propósito**, e é o caso mais fácil de
            // errar: quem clica ainda **não é membro**, então entrar muda o
            // elenco, o vínculo dele e o que a tela inteira oferece. Recarregar
            // só o club funcionaria por acidente (o `isMember` mudaria e
            // dispararia o resto), e depender de efeito colateral é o que faz a
            // próxima mudança quebrar sem ninguém entender.
            <JoinClubButton clubId={club._id} onJoined={refreshAll} />
          )
        }
      />

      {/* **A escalação é do elenco, não da gestão** · quem joga ali precisa ver
          o time combinado, e é por isso que a condição é `isMember` e não
          `canManage`. Quem está de fora não vê: é o plano do club, e expor de
          graça como o time joga é decisão da fatia de tática pública. */}
      {/* **Quem está no elenco sempre vê o campo**, mesmo vazio · é ele que
          permite montar a primeira escalação. Quem está de fora só vê se
          houver uma, que é a mesma regra da página pública: onze buracos não
          informam nada e fazem o club parecer abandonado. */}
      {(isMember || tactic) && (
        <>
          <TacticBoard
            key={`${club._id}:${tactic?.updatedAt ?? 'nova'}`}
            squad={squad}
            manageable={manageable}
            tactic={tactic}
            canEdit={canManage}
            saving={savingTactic}
            saved={tacticSaved}
            onDirtyChange={(dirty) => {
              boardDirty.current = dirty;
            }}
            onSave={(input) => {
              void saveTactic(input);
            }}
          />
          {/* **O aviso só existe com alteração pendente na prancheta** · sem
              nada pra perder, a escalação nova já foi aplicada e não há o que
              perguntar. Ele fica **abaixo** do campo, junto do botão de gravar,
              porque é ali que a decisão de descartar acontece. */}
          {freshTactic && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-amber-400/40 bg-amber-400/5 px-3 py-2">
              <p className="text-sm text-amber-400">{t('tactic.changedElsewhere')}</p>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={applyFreshTactic}>
                {t('tactic.loadChanged')}
              </Button>
            </div>
          )}
          {tacticError && <p className="text-sm text-destructive">{tacticError}</p>}
        </>
      )}
    </div>
  );
}
