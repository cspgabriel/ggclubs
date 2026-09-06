import { canDeclareMatch } from '@/lib/match-declaration';
import type { MatchCard } from '@ggclubs/schemas';
import { ledClubTags } from '@/lib/clubs';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { MatchChatDialog } from '@/components/chat/match-chat-dialog';
import { MatchReportDialog } from '@/components/tournament/match-report-dialog';
import { TournamentJoinPanel } from '@/components/tournament/tournament-join-panel';
import { TournamentView } from '@/components/tournament/tournament-view';
import { EmptyState } from '@/components/ui/empty-state';
import { api, type RegistrationCard } from '@/lib/api';
import { appClubPath } from '@/lib/paths';
import { useChatParam } from '@/lib/chat-link';
import { roundNamer } from '@/lib/round-name';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useMyChats } from '@/lib/use-my-chats';
import { useMyClubs } from '@/lib/use-my-clubs';
import { useTournament } from '@/lib/use-tournament';
import { useResource } from '@/lib/use-resource';
import { TournamentSkeleton } from '@/pages/public/tournament';

/**
 * A edição vista **de dentro do app**, com a navegação em volta.
 *
 * Quem está logado e abre um link de campeonato cai aqui em vez da página
 * aberta · sair do app pra ver uma edição do próprio app é troca de contexto sem
 * motivo. É o mesmo par do club e do player.
 *
 * **O conteúdo é o mesmo componente da aberta**, de propósito. O que muda são os
 * slots: lá a porta de criar conta, aqui o painel que põe o club na chave · e
 * ele **também vende**, porque estar logado não é estar convertido.
 */
export function TournamentDetailPage() {
  const { t } = useTranslation();
  const { slug = '' } = useParams<{ slug: string }>();
  const {
    tournament,
    registrations,
    matches,
    // **`bracketClubs`, e não `clubs`** · nesta tela `clubs` já são **os meus**,
    // que saem do provider logo abaixo. Dois dicionários com o mesmo nome é a
    // colisão que o bundler pegou na hora.
    clubs: bracketClubs,
    loading,
    failure,
    errorMessage,
    reload,
  } = useTournament(slug);
  /**
   * **Os clubs de quem olha, pra chave saber o que destacar** · saem do
   * provider, que já os tem desde 12/08 · buscar aqui seria a sexta tela a pedir
   * o mesmo `GET /me/clubs`.
   *
   * A gêmea aberta **não passa nada**, e é por isso que o destaque é a única
   * diferença entre as duas: a chave é a mesma pra todo mundo.
   */
  const { clubs } = useMyClubs();
  const myClubTags = (clubs ?? []).map((club) => club.tag);
  /**
   * **Quem lança placar é o dono**, e a lista é feita aqui porque é aqui que o
   * papel existe · a chave só recebe as tags, e nunca decide papel. É a mesma
   * regra do servidor, que revalida no envio.
   *
   * **O gerente saiu em 18/08/2026**, junto com o resto do campeonato: ele
   * administra o elenco, e quem responde pelo club numa edição é uma pessoa só
   * · a mesma que inscreveu e pagou.
   *
   * **O gerente entrou em 03/09/2026**, com o resto do campeonato (ver o
   * `CLUB_LEAD_ROLES` na API). Ele já combinava o resultado na sala do
   * confronto e não podia registrar o que acabara de combinar · e com o dono
   * ausente às 22h a partida ficava parada. O que sustenta isso é a trava do
   * mesmo dia: **uma conta lidera um club só**, então "quem responde por esta
   * vaga" continua tendo resposta única.
   *
   * **Por isso a lista continua tendo no máximo um item** · o que mudou não foi
   * o tamanho dela, foi quem entra.
   */
  const reportableTags = ledClubTags(clubs);

  const [reporting, setReporting] = useState<{ match: MatchCard; clubTag: string } | null>(null);
  const reportingClub = clubs?.find((club) => club.tag === reporting?.clubTag);

  /**
   * **Qual conversa está aberta é a URL que diz** · ver o `useChatParam`. O
   * `matches` é a fonte de qual partida é essa, então um id que não existe na
   * edição simplesmente não abre nada.
   */
  const { openMatchId, openChat, closeChat } = useChatParam();
  const roundName = roundNamer(matches ?? [], t);
  const chatting = (matches ?? []).find((match) => match._id === openMatchId) ?? null;
  const chatReportTag =
    chatting?.status === 'scheduled'
      ? [chatting.homeTag, chatting.awayTag].find(
          (tag) => reportableTags.includes(tag) && canDeclareMatch(chatting, tag),
        )
      : undefined;
  const unread = useChatUnread(tournament?._id ?? null);

  useDocumentTitle(tournament?.name ?? t('tournament.listTitle'));

  return (
    <div>
      {/* **Só a saída, sem título** · a capa da edição já traz o nome em display,
          e o `PageHeader` repetia ele logo acima · dois títulos iguais colados,
          visto na captura de 12/08/2026. O que a moldura precisa acrescentar é a
          volta pra lista, que toda tela de detalhe deve ter. */}
      <Link
        to="/app/campeonatos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('tournament.backToList')}
      </Link>

      {loading && <TournamentSkeleton />}

      {!loading && failure === 'notFound' && (
        <EmptyState
          icon={Trophy}
          title={t('tournament.notFoundTitle')}
          description={t('tournament.notFoundBody')}
          action={{ to: '/app/campeonatos', label: t('tournament.listTitle') }}
        />
      )}

      {/* **A falha só toma a tela quando não há o que mostrar** · pendência 176.
          Com a edição já carregada, um blip na revalidação apagava a chave
          inteira embaixo de quem estava lendo. */}
      {!loading && failure === 'error' && !tournament && (
        <EmptyState
          icon={Trophy}
          title={t('tournament.failureTitle')}
          description={errorMessage ?? ''}
          action={{ onClick: reload, label: t('tournament.retry') }}
        />
      )}

      {/* **Uma coluna só, desde 18/08/2026** · a `aside` de 20rem levava as
          datas e deixava ~5.000px de coluna vazia a 1280, com a chave espremida
          em ~670px de largura. Elas subiram pra capa.

          **O comentário mora FORA da condicional**, e isso é a armadilha do
          `CLAUDE.md`: dentro dela ele seria um segundo filho onde só cabe um, e
          o build quebra. */}
      {/* `notFound` continua escondendo · ali não há edição nenhuma. */}
      {!loading && tournament && failure !== 'notFound' && (
        <div className="min-w-0">
          <TournamentView
            tournament={tournament}
            registrations={registrations}
            matches={matches}
            clubs={bracketClubs}
            myClubTags={myClubTags}
            // Dentro do app o escudo de um inscrito leva pra moldura de
            // dentro · é a única diferença de conteúdo entre as duas telas.
            clubHref={appClubPath}
            join={
              <TournamentJoinPanel
                tournament={tournament}
                onChanged={reload}
                // Quem está dentro · o painel cruza com os meus clubs pra
                // reconhecer aqueles em que eu jogo sem responder.
                registrations={registrations}
              />
            }
            report={{
              tags: reportableTags,
              open: (match, clubTag) => setReporting({ match, clubTag }),
            }}
            chat={{
              unread,
              // **Dono e gerente falam** · a mesma lista do servidor.
              //
              // **E aqui o conjunto fica escrito à mão de propósito** · quem
              // manda nesta pergunta é o `SPEAKING_ROLES` do chat, que a API
              // mantém separado do `CLUB_LEAD_ROLES` justamente pra a primeira
              // lista que mudar não arrastar a outra. Trocar por `leadsClub`
              // aqui faria o front juntar o que o servidor separou.
              tags: (clubs ?? [])
                .filter((club) => club.role === 'owner' || club.role === 'manager')
                .map((club) => club.tag),
              open: (match) => openChat(match._id),
            }}
          />
        </div>
      )}

      {chatting && (
        <MatchChatDialog
          matchId={chatting._id}
          resultAction={
            chatReportTag
              ? {
                  label: t('tournament.reportTitle'),
                  onClick: () => setReporting({ match: chatting, clubTag: chatReportTag }),
                }
              : undefined
          }
          home={clubSide(registrations, chatting.homeTag)}
          away={clubSide(registrations, chatting.awayTag)}
          // A ficha do confronto no cabeçalho · a mesma peça da mesa.
          about={{
            round: roundName(chatting),
            scheduledAt: chatting.scheduledAt,
            status: chatting.status,
            result: chatting,
            // **A súmula na sala** · o mesmo dado que a linha do confronto já
            // mostra atrás do diálogo · pendência 145.
            claims: [
              chatting.homeClaim && { tag: chatting.homeTag, ...chatting.homeClaim },
              chatting.awayClaim && { tag: chatting.awayTag, ...chatting.awayClaim },
            ].flatMap((one) => (one ? [one] : [])),
          }}
          open
          onOpenChange={(next) => {
            if (!next) closeChat();
          }}
        />
      )}

      {reporting && reportingClub && (
        <MatchReportDialog
          match={matches?.find(match => match._id === reporting.match._id) ?? reporting.match}
          clubId={reportingClub._id}
          myTag={reporting.clubTag}
          homeName={clubName(registrations, reporting.match.homeTag)}
          awayName={clubName(registrations, reporting.match.awayTag)}
          open
          onOpenChange={(next) => {
            if (!next) setReporting(null);
          }}
          // Recarregar em vez de remendar a partida na mão: o desfecho da
          // segunda declaração muda status, placar e a tabela do grupo de uma
          // vez, e adivinhar qual deles aqui seria a tela inventando resultado.
          onSent={reload}
        />
      )}
    </div>
  );
}

/** O nome do club inscrito, com a tag como reserva · a lista já veio na resposta. */
/** O lado do confronto como o título da sala precisa · tag e escudo. */
function clubSide(
  registrations: RegistrationCard[],
  tag: string,
): { tag: string; crestUrl: string | null } {
  const club = registrations.find((row) => row.club.tag === tag)?.club;
  return { tag, crestUrl: club?.crestUrl ?? null };
}

function clubName(registrations: RegistrationCard[], tag: string): string {
  return registrations.find((row) => row.club.tag === tag)?.club.name ?? tag.toUpperCase();
}

/**
 * **Onde há conversa nova** · e **quem dá o relógio é a bandeja**, desde
 * 29/08/2026.
 *
 * **O que era:** um `setInterval` de 10s, sem olhar o canal e sem parar com a
 * aba escondida · **6 requisições por minuto** por página de edição aberta,
 * pra sempre. O comentário aqui dizia *"enquanto o tempo real não existe"*, e
 * isso deixou de ser verdade quando a bandeja passou a andar pelo canal (fatia
 * 3, 28/08/2026) · **ninguém voltou nesta linha**, que é o defeito que esta casa
 * mais persegue.
 *
 * **A saída não é assinar tópico aqui**, e isso é orçamento: uma rodada tem 24
 * confrontos e o teto é de **20 tópicos por conexão**. A bandeja **já** ouve as
 * salas de quem está olhando, então basta seguir o retrato dela · ela troca de
 * objeto a cada carga, e cada carga dela é uma mensagem, uma leitura ou a rede.
 *
 * O que isso compra, de graça: **cadeia com o canal** (~1/min com ele de pé,
 * 10s quando ele cai) e **pausa com a aba escondida**, porque a bandeja pausa.
 *
 * **Sem isto o botão da conversa só acenderia depois de alguém abrir a sala**,
 * que é o contrário do que ele serve.
 *
 * Falha em silêncio de propósito · a chave inteira não pode sumir porque a
 * contagem de mensagem não respondeu.
 */
function useChatUnread(tournamentId: string | null): Record<string, number> {
  const { chats } = useMyChats();

  /**
   * **`chats` é gatilho, e não identidade** · ele muda a cada mensagem que
   * chega, e é por isso que o `keepPrevious` está aqui: sem ele os contadores
   * apagariam e voltariam o tempo todo. A chave continua servindo sem o número,
   * então falhar é silêncio.
   */
  const { data } = useResource(
    (signal) => api.tournamentChatUnread(tournamentId ?? '', { signal }).then((r) => r.unread),
    // `chats` entra como gatilho, e não como dado lido aqui · o lint está certo
    // em dizer que ele é "desnecessário", porque o `fetcher` não o usa. É
    // exatamente a intenção: quando a bandeja anda, os números são perguntados
    // de novo.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gatilho declarado de propósito
    [tournamentId, chats],
    { skip: !tournamentId, keepPrevious: true },
  );

  return data ?? {};
}
