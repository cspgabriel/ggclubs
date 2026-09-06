import { MatchCorrectionsPanel } from '@/components/admin/match-corrections-panel';
import { ArrowLeft, ExternalLink, Shuffle, Swords, Trophy, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import {
  DisputesPanel,
  PaymentsPanel,
  PendingMatchesPanel,
  RegistrationsPanel,
} from '@/components/admin/tournament-ops';
import {
  ADMIN_REALTIME_TOPIC,
  TOURNAMENT_EVENT,
  tournamentTopic,
  capacityOf,
  CHAT_EVENT,
  displayStatusOf,
  matchAwaitsSomeone,
} from '@ggclubs/schemas';
import { TournamentView } from '@/components/tournament/tournament-view';
import { Button } from '@/components/ui/button';
import { Chamfer } from '@/components/ui/chamfer';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionTitle } from '@/components/ui/section-title';
import { api, type TournamentRecord } from '@/lib/api';
import { ChatDesk } from '@/components/admin/chat-desk';
import { useRealtimeRefresh } from '@/lib/realtime/use-realtime-refresh';
import { useLiveQuery } from '@/lib/realtime/use-live-query';
import { competitionProgress } from '@/lib/competition-progress';
import { apiErrorMessage } from '@/lib/api-error';
import { appClubPath, tournamentPath } from '@/lib/paths';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useResource } from '@/lib/use-resource';

/**
 * **A edição, do lado de quem organiza** · pendência 103, fechada em
 * 19/08/2026.
 *
 * Até aqui o painel tinha **as rotas todas** (sortear, gerar o mata-mata,
 * resolver disputa, encerrar partida travada) e **nenhuma visão da chave**:
 * quem organiza operava às cegas, com dois botões soltos dentro de um item de
 * lista, e três painéis empilhados dentro dele. Numa edição de 48 clubs são 88
 * partidas.
 *
 * ---
 *
 * **Ela renderiza o mesmo `TournamentView` das outras duas molduras**, e isso é
 * a regra da casa aplicada uma terceira vez (é o desenho do `ClubView`): a
 * chave que a organização olha **tem que ser** a chave que os clubs olham,
 * senão a divergência aparece justamente quando alguém reclama de um placar.
 *
 * **Sem `PageHeader`, e a ausência é conserto** · a capa da edição já é um
 * título, com o nome no maior corpo da tela. Um cabeçalho de página por cima
 * dela escrevia "Copa GGClubs 2026" duas vezes na mesma dobra · é o mesmo
 * defeito que o Eduardo apontou no "FASE DE GRUPOS" seguido de "GRUPOS".
 *
 * **A operação vem ANTES da leitura** · quem abre esta tela veio agir, e a
 * chave inteira na frente faria a organização rolar cinco mil pixels pra
 * apertar um botão.
 *
 * **As ações não conferem nada aqui** · quem recusa é a rota, e a mensagem sai
 * pelo `apiErrorMessage` como em todo o resto. Esconder botão seria a tela
 * fingindo que sabe o estado das 88 partidas.
 */
export function AdminTournamentPage() {
  const { t } = useTranslation();
  const { slug = '' } = useParams();

  const {
    data,
    error,
    loading: fetching,
    reload: load,
  } = useResource((signal) => api.getTournament(slug, { signal }), [slug]);
  const tournament = data?.tournament ?? null;

  /**
   * **A mesa do organizador era uma FOTO** · 05/09/2026, e este é o defeito que
   * o Eduardo relatou como *"não atualiza nem no /admin"*.
   *
   * Ela buscava uma vez e parava. O único ouvinte deste arquivo era o do chat,
   * lá embaixo, no `ADMIN_REALTIME_TOPIC` · **a edição em si não era assinada
   * por ninguém**. Medido: uma partida fechou e a tela não mudou em 30
   * segundos, com zero quadros no canal e zero requisições.
   *
   * **É a tela de quem RESOLVE**, e por isso ela dói mais que as outras: o
   * organizador olha a fila de disputas e as partidas esperando placar pra
   * decidir o que fazer agora, e estava decidindo sobre o estado de quando
   * abriu a página.
   *
   * A policy já autorizava · `subscribe-policy.ts` libera `tournament:{id}` pra
   * qualquer conta logada numa edição publicada. Faltava assinar.
   */
  useLiveQuery(
    tournament ? tournamentTopic(tournament._id) : null,
    [
      TOURNAMENT_EVENT.matches,
      TOURNAMENT_EVENT.status,
      TOURNAMENT_EVENT.registrations,
      TOURNAMENT_EVENT.payment,
    ],
    load,
  );
  const registrations = data?.registrations ?? [];
  /**
   * **Quantos JÁ PAGARAM** · é o que o sorteio conta, e não o `registeredCount`.
   *
   * O `status` vem no próprio card da inscrição, então isto não custa chamada
   * nenhuma · a lista já está aqui pro painel de inscritos.
   */
  const paidCount = registrations.filter((one) => one.status === 'confirmed').length;
  const matches = data?.matches ?? [];
  /** Os clubs da chave · e ele não é a grade. Ver `ClubDirectory`. */
  const clubs = data?.clubs ?? [];
  /**
   * **São duas falhas diferentes na mesma frase** · a da busca (rede caiu, e
   * "edição não existe" seria mentira) e a de uma ação do admin (sortear,
   * publicar, encerrar). A tela mostra uma linha só, então elas se juntam
   * **aqui** e não na origem · a da ação é a mais recente e ganha.
   */
  const [actionFailure, setActionFailure] = useState<string | null>(null);

  /**
   * **Dado novo apaga a falha da ação** · sem isto ela sobrevive a uma recarga
   * bem-sucedida vinda de outro lugar (o painel de inscritos chama `load()` ao
   * mudar algo), e a página fica com dado novo e uma linha vermelha velha.
   *
   * **Falha de ação NÃO recarrega** · o `run()` só chama o `load()` no caminho
   * do sucesso, então isto não apaga o vermelho que acabou de aparecer. Achado
   * por revisão em 01/09/2026.
   */
  useEffect(() => setActionFailure(null), [data]);
  const failure = actionFailure ?? (error ? apiErrorMessage(error, t) : null);
  /**
   * **A espera cobre a primeira pintura** · o `loading` do `useResource` nasce
   * `false` e só vira `true` dentro do efeito, que roda depois da pintura. Sem
   * o `data === null` junto, a tela desenharia um quadro de "edição não
   * encontrada" antes de perguntar.
   */
  // Background refresh must not unmount an open chat or erase its draft.
  const loading = data === null && (fetching || !error);
  const [busy, setBusy] = useState(false);
  /** A janela de encerrar · ação terminal não sai de um clique. */
  const [finishing, setFinishing] = useState(false);

  useDocumentTitle(tournament?.name ?? t('admin.tournaments.title'));

  /**
   * Uma ação de estado da edição · **e todas passam por aqui.**
   *
   * O `busy` é um só de propósito: são ações do **mesmo** documento, e deixar
   * duas dispararem juntas é pedir pra sortear uma edição que está sendo
   * cancelada. Depois de cada uma a página recarrega inteira, porque o desfecho
   * muda a chave, os inscritos e o que a fileira oferece.
   */
  async function run(action: () => Promise<unknown>): Promise<void> {
    setBusy(true);
    setActionFailure(null);
    try {
      await action();
      load();
    } catch (err) {
      setActionFailure(apiErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div role="status" aria-live="polite" aria-label={t('common.loading')}>
        <span className="block h-8 w-64 animate-pulse rounded bg-muted/50" />
        <span className="mt-6 block h-40 w-full animate-pulse rounded-xl bg-muted/30" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <EmptyState
        icon={Trophy}
        title={t('tournament.failureTitle')}
        description={failure ?? t('tournament.listFailureBody')}
        action={{ onClick: () => load(), label: t('tournament.retry') }}
      />
    );
  }

  const drawn = Boolean(tournament.drawnAt);
  /**
   * **Só cancelada é fim de linha aqui** · encerrada mantém a mesa, porque ela
   * carrega a saída do engano (ver `reopen`). Era `finished || cancelled`, e
   * era o que deixava quem encerrou sem botão nenhum.
   */
  const over = tournament.status === 'cancelled';

  /**
   * **As duas contagens saem do que a página já tem**, e não de uma consulta ·
   * `matches` chega inteiro na mesma resposta.
   *
   * Elas existem porque um painel que só diz "ver disputas" obriga a abrir pra
   * saber se há o que fazer · com o número no rótulo, a organização decide de
   * relance, que é a pergunta que ela traz pra esta tela.
   */
  /**
   * **A fase seguinte já existe** · é o que tira "gerar mata-mata" da fileira.
   *
   * Achado pelo Eduardo em 19/08/2026, olhando a Copa de 48 com o mata-mata
   * **já gerado** e o botão ainda ali. O comentário da versão antiga (na lista)
   * afirmava que ele *"some quando a fase já existe"* · e ele nunca soube disso,
   * porque a lista não carrega as partidas. **Documentação mentindo sobre o
   * comportamento**, no formato exato que este projeto persegue: alguém escreveu
   * a intenção e a condição ficou pela metade.
   *
   * Aqui a tela tem `matches` em mãos, então a promessa passou a ser cumprida.
   */
  const hasKnockout = matches.some((match) => match.phase === 'knockout');
  const progress = competitionProgress(matches);
  /** A edição cobra · é o que decide se existe painel de pagamentos. */
  const charges = tournament.priceCents > 0;
  /** Nada em aberto · é o que autoriza dizer que acabou. */
  const allSettled =
    matches.length > 0 &&
    matches.every((match) => match.status !== 'scheduled' && match.status !== 'disputed');
  const disputes = matches.filter((match) => match.status === 'disputed').length;
  /**
   * **O contador conta o que a mesa lista** · pendência 175.
   *
   * Ele contava só partida **com** declaração, e a mesa (`listPendingMatches`)
   * lista também a que ninguém declarou depois do horário · o rótulo dizia
   * **"Ninguém devendo placar"** com linhas de "ninguém declarou · Decidir a
   * partida" dentro do painel fechado.
   *
   * **E desde 03/09/2026 a regra não mora aqui** · ela é o `matchAwaitsSomeone`
   * do schema, e esta era a **terceira** escrita dela (pendência 181). O
   * docblock de lá guarda a diferença que importa: esta pergunta **não** é a do
   * painel geral do admin, que só conta depois do prazo.
   */
  const waiting = matches.filter((match) =>
    matchAwaitsSomeone({
      status: match.status,
      scheduledAt: match.scheduledAt,
      declared: match.homeClaim !== null || match.awayClaim !== null,
    }),
  ).length;

  /**
   * **O que a organização pode fazer agora** · uma lista, e não uma sequência de
   * condicionais no meio do JSX: assim a tela sabe **se há alguma**, e o caso
   * de nenhuma deixa de virar uma caixa vazia.
   */
  const actions = over
    ? []
    : /**
       * **Encerrada oferece uma coisa só: voltar** · qualquer outra ação ali é
       * mexer numa edição que a organização declarou terminada, e a primeira
       * delas (gerar o mata-mata) faria exatamente isso em silêncio.
       */
      tournament.status === 'finished'
      ? [
          <Button
            key="reopen"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void run(() => api.adminSetTournamentStatus(tournament._id, 'running'))}
          >
            <Undo2 className="mr-1.5 h-3.5 w-3.5" />
            {t('admin.tournaments.reopen')}
          </Button>,
        ]
      : [
          /* **Fechar as inscrições** · a edição segue `open` até alguém fechar,
           mesmo com as vagas cheias. */
          tournament.status === 'open' && !drawn ? (
            <Button
              key="close"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void run(() => api.adminSetTournamentStatus(tournament._id, 'closed'))}
            >
              {t('admin.tournaments.close')}
            </Button>
          ) : null,
          /* **Sortear é antecipar, e não o caminho normal** · a varredura faz
           sozinha quando chega o `drawAt`. Ele existe pros dois casos em que
           esperar não faz sentido: já lotou, ou a organização acabou de tirar
           quem sobrava. */
          (tournament.status === 'open' || tournament.status === 'closed') && !drawn ? (
            <Button
              key="draw"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void run(() => api.adminDrawTournament(tournament._id))}
            >
              <Shuffle className="mr-1.5 h-3.5 w-3.5" />
              {/**
               * **A conta vai no botão** · desde 22/08/2026 o sorteio é manual,
               * exceto quando lota · então este é o número que decide se vale
               * esperar mais ou sortear no degrau de baixo.
               *
               * **E ele é o de CONFIRMADOS, não o `registeredCount`** · 04/09/2026.
               * O contador conta **vaga** (reserva + pago) e o `drawTournament`
               * conta **dinheiro**: ele filtra `status: 'confirmed'` e recusa com
               * `leftovers` quando o número não fecha um degrau exato.
               *
               * O botão dizia `10 de 32` numa edição com **8 pagos**, e o
               * comentário aqui afirmava que este era o número que decide ·
               * não era. Quem apertasse ia levar `too-few` sem entender.
               */}
              {t('admin.tournaments.drawWithCount', {
                count: paidCount,
                slots: capacityOf(tournament),
              })}
            </Button>
          ) : null,
          /* A tela explica o progresso; o servidor revalida antes de gerar. */
          drawn &&
          !hasKnockout &&
          tournament.status !== 'cancelled' ? (
            <Button
              key="knockout"
              size="sm"
              variant="outline"
              disabled={busy || !progress.groupsReady}
              onClick={() => void run(() => api.adminGenerateKnockout(tournament._id))}
            >
              <Swords className="mr-1.5 h-3.5 w-3.5" />
              {t('admin.tournaments.knockout')}
            </Button>
          ) : null,
          /**
           * **Marcar que começou** · e ele **não** some mais quando já há placar
           * na chave, o que era a guarda posta em 19/08/2026.
           *
           * Aquela guarda criou um beco, achado em 22/08 rodando uma edição de
           * ponta a ponta: **nada obriga o admin a clicar antes dos clubs
           * jogarem**, e no instante em que o primeiro placar entra o botão some
           * · a edição fica em `drawn` pra sempre. E `running` não é enfeite:
           *
           * | o que depende dele | o que acontece sem |
           * |---|---|
           * | `settleAbandonedMatches` | a varredura de W.O. **não roda** · ela só olha edição `running` |
           * | `listPendingMatches` | a partida que **ninguém** declarou não aparece na mesa · é a porta da pendência 119, invisível |
           * | encerrar | exigia `running`, então a edição **não tinha como acabar** |
           *
           * **O acidente que a guarda evitava já é evitado por outro lado** ·
           * encerrar pede confirmação e só aparece com tudo fechado. Clicar
           * "começar" no meio da chave hoje apenas afirma o que é verdade.
           *
           * A lição de 19/08 continua valendo e é a raiz das duas: **`status` é
           * rótulo, não o que está acontecendo** · a edição segue `drawn` com
           * setenta e duas partidas jogadas dentro. O que mudou é a conclusão ·
           * o certo não era esconder o botão, era deixar o rótulo alcançável.
           */
          (drawn || tournament.status === 'closed') && tournament.status !== 'running' ? (
            <Button
              key="start"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run(() => api.adminSetTournamentStatus(tournament._id, 'running'))
              }
            >
              {t('admin.tournaments.start')}
            </Button>
          ) : null,
          /**
           * **Encerrar espera a última partida fechar, e pergunta antes.**
           *
           * Ele era um botão comum ao lado dos outros, e encerrar é **terminal**:
           * a edição sai da vida do produto num clique. Agora ele só aparece
           * quando não há mais nada em aberto (`allSettled`) · antes disso,
           * encerrar é sempre engano, e não existe motivo pra oferecer o engano.
           *
           * **Deixou de exigir `running` em 22/08/2026** · quem decide é não
           * haver nada em aberto, e uma edição inteira jogada em `drawn` (ver o
           * botão de começar) ficava sem saída nenhuma. `allSettled` já pede
           * partida existindo, então isto não aparece antes do sorteio, e
           * cancelada e encerrada já ficaram para trás nos dois ramos acima.
           */
          allSettled ? (
            <Button
              key="finish"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setFinishing(true)}
            >
              {t('admin.tournaments.finish')}
            </Button>
          ) : null,
        ].filter(Boolean);

  return (
    <div>
      {/* A barra de contexto · **saída primeiro**, que é a regra de toda tela
          daqui, e o link pra ver a edição como os clubs veem. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/campeonatos">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            {t('admin.tournaments.backToList')}
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <Link to={tournamentPath(tournament.slug)}>
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            {t('admin.tournaments.open')}
          </Link>
        </Button>
      </div>

      {failure && <p className="mb-4 text-sm text-destructive">{failure}</p>}

      {/**
       * **A mesa de operação** · tudo que esta tela tem de diferente das outras
       * duas molduras mora nesta caixa, e o resto é a edição como todo mundo a
       * vê.
       */}
      <Chamfer border="bg-border" innerClassName="bg-card" className="mb-8">
        <div className="p-4 sm:p-5">
          {/**
           * **A legenda pergunta ao relógio, e não ao status cru** · 22/08/2026.
           * Uma edição publicada é `open` no banco **antes** de abrir e
           * **depois** de fechar, e nas duas pontas o painel dizia "inscrições
           * abertas" enquanto a inscrição respondia `closed`.
           *
           * **Eu tinha consertado só a ponta de antes**, com o `nextStepOf` ·
           * o `revisor` mostrou que a de depois continuava, e que ela é a mais
           * comum das duas (fechar inscrição é ato manual, então toda edição
           * passa por essa janela). É a pergunta de "por quantos caminhos se
           * chega ali": são quatro selos, e agora os quatro vêm daqui.
           */}
          <SectionTitle
            meta={t(`admin.tournaments.state.${displayStatusOf(tournament)}`)}
            hint={t('admin.tournaments.opsHint')}
          >
            {t('admin.tournaments.ops')}
          </SectionTitle>
          {drawn && !hasKnockout && progress.groupTotal > 0 && !over && (
            <div className="mb-4 rounded-lg border bg-background/40 p-3">
              <p className="text-sm font-semibold">
                {t('competitionUx.groupProgress', {
                  settled: progress.groupConfirmed,
                  total: progress.groupTotal,
                })}
              </p>
              <progress
                className="mt-2 h-1.5 w-full accent-[hsl(var(--brand))]"
                value={progress.groupConfirmed}
                max={progress.groupTotal}
                aria-label={t('competitionUx.groupProgress', {
                  settled: progress.groupConfirmed,
                  total: progress.groupTotal,
                })}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {t(
                  progress.groupsReady ? 'competitionUx.groupReady' : 'competitionUx.groupPending',
                )}
              </p>
            </div>
          )}
          {progress.thirdPending && !over && (
            <p className="mb-4 text-sm text-amber-400">{t('competitionUx.thirdPending')}</p>
          )}

          {/**
           * **A fileira é curta de propósito** · o que aparece é o que a edição
           * pode virar **agora**, e cada botão tem a condição que o justifica.
           * Botão que já não pode agir é ruído, e a rota recusa de qualquer
           * forma.
           *
           * **Sem ação nenhuma ela não desenha uma fileira vazia** · ela diz de
           * quem é a vez, que é a pergunta que sobra quando não há botão.
           */}
          {actions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : (
            /* **Encerrada não é "a vez é dos clubs"** · a frase de espera diz
               que alguém ainda vai jogar, e numa edição terminada isso é a tela
               afirmando o que não é verdade. Achado escrevendo o teste. */
            <p className="text-sm text-muted-foreground">
              {t(over ? 'admin.tournaments.opsOver' : 'admin.tournaments.opsIdle')}
            </p>
          )}

          {/* **A lista de inscritos serve pra decidir, e só antes do sorteio** ·
              é onde a organização tira quem sobra pra a escada fechar. Depois
              da chave ela vira leitura, e a própria edição a mostra abaixo. */}
          {(tournament.status === 'open' || tournament.status === 'closed') && !drawn && (
            <RegistrationsPanel tournament={tournament} onChanged={() => load()} />
          )}

          {/* **Disputa e pendência só existem depois da chave**, porque só
              existe partida depois dela · antes do sorteio os dois painéis
              seriam portas pra um estado impossível. */}
          {drawn && <DisputesPanel tournament={tournament} count={disputes} matches={matches} />}
          {drawn && <PendingMatchesPanel tournament={tournament} count={waiting} />}
          {drawn && <MatchCorrectionsPanel matches={matches} reload={() => load()} />}
          {drawn && <ChatDeskPanel tournament={tournament} />}

          {/**
           * **O dinheiro só existe onde a edição cobra** · numa edição grátis o
           * painel seria uma porta pra uma lista que nunca terá linha.
           *
           * **E ele fica depois do sorteio também**, ao contrário dos inscritos:
           * devolver dinheiro é justamente o que se faz quando a edição
           * **acabou mal**, e essa é a hora em que a lista de inscritos já não
           * serve pra nada.
           */}
          {charges && <PaymentsPanel tournament={tournament} />}
        </div>
      </Chamfer>

      {/**
       * **Encerrar pergunta antes** · é a mesma régua do cancelar edição e do
       * encerrar club: o que não tem desfazer não sai de um clique. A volta
       * existe (`reopen`), e mesmo assim a pergunta se paga · ela é o que
       * impede o clique de acontecer, e não o que conserta depois.
       */}
      <ConfirmDialog
        open={finishing}
        onOpenChange={setFinishing}
        tone="destructive"
        title={t('admin.tournaments.finishTitle')}
        description={t('admin.tournaments.finishBody')}
        confirmLabel={t('admin.tournaments.finish')}
        onConfirm={async () => {
          await run(() => api.adminSetTournamentStatus(tournament._id, 'finished'));
          setFinishing(false);
        }}
      />

      {/**
       * **E então a leitura** · o mesmo componente das outras duas molduras.
       *
       * Sem `join` e sem `footer`: quem organiza não se inscreve na própria
       * edição, e não há o que vender pra quem já está do lado de dentro. Sem
       * `report` também · lançar placar é do dono do club, e a porta da
       * organização é o painel de disputa acima, que exige motivo escrito.
       */}
      <div className="min-w-0">
        <TournamentView
          tournament={tournament}
          registrations={registrations}
          matches={matches}
          clubs={clubs}
          clubHref={appClubPath}
        />
      </div>
    </div>
  );
}

/**
 * **A mesa de conversas da edição.**
 *
 * Pedido do Eduardo em 27/08: *"não é pro admin ver o chat só quando é chamado;
 * ele precisa conseguir ver todos os chats do campeonato, abertos e fechados"*.
 *
 * **A ordem é a da urgência, e vem do servidor** · quem chamou primeiro, depois
 * o que está trancado, e então o mais recente. É a mesma lógica das outras
 * mesas desta página: o que espera decisão sobe.
 *
 * **Só aparece conversa que existe** · numa edição de 72 confrontos, listar as
 * salas vazias esconderia as três que importam.
 */
function ChatDeskPanel({ tournament }: { tournament: TournamentRecord }) {
  const { t } = useTranslation();
  /** Falhar é silêncio · a página continua servindo sem a mesa. */
  const { data: rows, reload: load } = useResource(
    (signal) => api.adminTournamentChats(tournament._id, { signal }).then(({ chats }) => chats),
    [tournament._id],
  );

  /**
   * **A mesa ouve a edição** · 29/08/2026, achado do Eduardo · *"a parte de
   * 'precisam de você' em 'conversas dos confrontos' no admin não atualiza com
   * websocket"*.
   *
   * Ela carregava **só na montagem**, então a organização olhava uma lista que
   * envelhecia enquanto ela olhava · e o *"precisam de você"* é justamente a
   * coluna que muda sem ela fazer nada.
   *
   * **Pelo tópico da EDIÇÃO, e não pelos das salas** · são 24 confrontos numa
   * rodada contra um teto de 20 tópicos por conexão, e a mesa quer saber de
   * todos. É a mesma escolha que o não lido da chave fez.
   */
  useRealtimeRefresh(ADMIN_REALTIME_TOPIC, [CHAT_EVENT.adminCalled, CHAT_EVENT.message], () =>
    load(),
  );
  useLiveQuery(
    tournamentTopic(tournament._id),
    [TOURNAMENT_EVENT.matches, TOURNAMENT_EVENT.status],
    load,
  );

  if (!rows || rows.length === 0) return null;

  return (
    <ChatDesk rows={rows} reload={() => load()} emptyLabel={t('admin.tournaments.chatsEmpty')} />
  );
}
