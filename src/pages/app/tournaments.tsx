import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TournamentGroups } from '@/components/tournament/tournament-groups';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { MyTournament } from '@/components/tournament/my-tournament';
import { appTournamentPath } from '@/lib/paths';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useTournamentList } from '@/lib/use-tournament';
import { ListSkeleton } from '@/pages/public/tournaments';

/**
 * A lista de edições **dentro do app**.
 *
 * Mesma busca e mesmo card da aberta · o que muda é a moldura e o destino dos
 * links. **A conversa também muda**: aqui a pessoa já tem conta e club, então o
 * subtítulo fala de pôr o time na chave, e não de criar conta.
 */
export function TournamentsPage() {
  const { t } = useTranslation();
  const { tournaments, failed, refresh, hasMore, loadingMore, loadMore } = useTournamentList();

  useDocumentTitle(t('tournament.listTitle'));

  return (
    <div>
      <PageHeader title={t('tournament.listTitle')} subtitle={t('tournament.listSubtitle')} />

      {/**
       * **A sua partida vem antes da lista** · pedido do Eduardo em 19/08/2026,
       * e a razão é a mesma da tela inicial: quem abre esta aba durante um
       * campeonato não veio procurar um catálogo, veio ver o próprio jogo.
       *
       * **Ela só existe quando existe** · sem club na chave, ou sem edição
       * sorteada, a aba volta a ser a lista e nada muda.
       */}
      <MyTournament className="mb-6" />

      {tournaments === null && !failed && <ListSkeleton />}

      {/* Ver o comentário gêmeo na lista aberta · falha não é ausência. */}
      {/**
       * **A falha só toma a tela quando não há lista** · pendência 176.
       *
       * Com a lista carregada, um refresh falho punha a mensagem de erro
       * **acima** dos campeonatos desenhados logo abaixo · a tela afirmando
       * duas coisas opostas ao mesmo tempo.
       */}
      {failed && tournaments === null && (
        <EmptyState
          icon={Trophy}
          title={t('tournament.failureTitle')}
          description={t('tournament.listFailureBody')}
          action={{ onClick: refresh, label: t('tournament.retry') }}
        />
      )}

      {!failed && tournaments?.length === 0 && (
        <EmptyState
          icon={Trophy}
          title={t('tournament.emptyTitle')}
          description={t('tournament.emptyBody')}
        />
      )}

      {tournaments && tournaments.length > 0 && (
        <TournamentGroups hasMore={hasMore} loadingMore={loadingMore} loadMore={loadMore} failed={failed} tournaments={tournaments} href={appTournamentPath} />
      )}
    </div>
  );
}
