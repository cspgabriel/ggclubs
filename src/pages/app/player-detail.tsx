import { CLUB_EVENT, clubTopic } from '@ggclubs/schemas';
import { ArrowLeft, BadgeCheck, Pencil, UserX, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { InvitePlayerButton } from '@/components/player/invite-player-button';
import { PlayerView } from '@/components/player/player-view';
import { PlayerViewSkeleton } from '@/components/player/player-view-skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { api } from '@/lib/api';
import { ApiError, apiErrorMessage } from '@/lib/api-error';
import { MAX_CLUBS_PER_PLAYER } from '@/lib/clubs';
import { appClubPath } from '@/lib/paths';
import { useRealtimeRefresh } from '@/lib/realtime/use-realtime-refresh';
import { useAuth } from '@/lib/use-auth';
import { useMyClubs } from '@/lib/use-my-clubs';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useResource } from '@/lib/use-resource';

/**
 * O player visto **de dentro do app**, com a navegação em volta.
 *
 * Mesmo desenho do club: quem está logado e abre um link de perfil cai aqui em
 * vez da página pública, e o conteúdo é o mesmo componente. Sair do app pra ver
 * alguém do próprio app é troca de contexto sem motivo.
 *
 * **Os clubs daqui apontam pra dentro** (`/app/clubs/:tag`) · mandar quem tem
 * sessão pra fora seria o caminho inverso do que a página pública já faz ao
 * trazê-la pra cá.
 *
 * A rota é **aberta a qualquer conta**, e não só a quem divide club: o perfil já
 * é público por endereço, então exigir vínculo aqui daria a quem tem conta menos
 * do que um visitante deslogado vê · foi exatamente o defeito da escalação,
 * achado em 06/08.
 */
export function PlayerDetailPage() {
  const { t } = useTranslation();
  const { handle = '' } = useParams<{ handle: string }>();
  const { account } = useAuth();

  const { data: profile, error, reload } = useResource(
    (signal) => api.getPublicProfile(handle, { signal }).then((r) => r.profile),
    [handle],
  );
  /**
   * **"Não existe" e "não deu pra carregar" são coisas diferentes** · derivado
   * do erro cru em vez de guardado, como na irmã pública desta tela.
   */
  const failure: 'notFound' | 'error' | null = !error
    ? null
    : error instanceof ApiError && error.code === 'PROFILE_NOT_FOUND'
      ? 'notFound'
      : 'error';
  const errorMessage = failure === 'error' ? apiErrorMessage(error, t) : null;

  /**
   * Os clubs de **quem está olhando**, pra marcar o que os dois dividem.
   *
   * **Aqui não dá pra derivar do que a tela já tem**, ao contrário da página do
   * club: lá o papel sai do elenco já buscado, cruzado com o handle da sessão ·
   * aqui a sessão carrega o documento do usuário, e vínculo mora noutra
   * collection.
   *
   * **E é a sessão que responde**, não esta tela: a lista é de quem olha, então
   * trocar de perfil não a muda · percorrer vinte perfis custa **zero**
   * requisições, e não uma por montagem como custava. Entrar ou sair de um club
   * continua movendo o selo, porque o provider ouve `user.membership`.
   *
   * **Falhar continua sendo silêncio** · é a mesma regra do convite: uma
   * consulta secundária não pinta erro no perfil de ninguém. Sem a lista o selo
   * simplesmente não aparece, que é o estado de ontem.
   */
  const { clubs: myClubs } = useMyClubs();

  useDocumentTitle(profile?.displayName);

  /**
   * **O perfil em si também envelhece, e só num caso alcançável:** quando a
   * pessoa entra ou sai de **um club seu**, a lista de clubs dela nesta tela
   * fica errada. O resto do que ela faz mora no `user:{id}` dela, que ninguém
   * mais assina · e é o mesmo limite escrito no painel de convite.
   */
  useRealtimeRefresh(
    (myClubs ?? []).map((club) => clubTopic(club._id)),
    [CLUB_EVENT.squad],
    () => reload(),
  );


  if (failure === 'notFound') {
    return (
      <EmptyState
        icon={UserX}
        title={t('player.notFoundTitle')}
        description={t('player.notFoundBody')}
        action={{ label: t('nav.clubs'), to: '/app/clubs' }}
      />
    );
  }

  // Repetir só onde repetir pode mudar o resultado · um 429 passa sozinho, um
  // @nick que não existe não.
  if (failure === 'error') {
    return (
      <EmptyState
        icon={WifiOff}
        tone="error"
        title={t('player.loadErrorTitle')}
        description={errorMessage ?? t('common.errorGeneric')}
        action={{ label: t('common.retry'), onClick: reload }}
        secondaryAction={{ label: t('nav.clubs'), to: '/app/clubs' }}
      />
    );
  }

  // A silhueta usa o mesmo `variant` do conteúdo que vem · com o outro, a capa
  // sangraria de borda a borda e a página saltaria ao carregar.
  if (!profile) return <PlayerViewSkeleton variant="embedded" />;

  const isMe = account?.handle === profile.handle;
  // Conjunto montado no render, e não em `useMemo`: são no máximo três tags, e
  // o hook teria que subir pra antes das saídas curtas acima pra ser legal.
  const sharedTags = myClubs ? new Set(myClubs.map((club) => club.tag)) : undefined;

  return (
    // `space-y-3` e o link colado no que ele volta · é o mesmo desenho da página
    // do club, que tinha saída e esta não tinha. Apontado pelo Eduardo.
    <div className="space-y-3">
      <Link
        to="/app/players"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('nav.players')}
      </Link>

      <PlayerView
        profile={profile}
        clubHref={appClubPath}
        variant="embedded"
        // **A plataforma de quem olha vem do contexto, nunca de um `GET`** ·
        // é ela que faz o selo de crossplay responder em vez de só informar.
        viewerPlatform={account?.platform ?? null}
        // **No próprio perfil não passa nada** · todo club seria "com você", e
        // selo que aparece em todo mundo ao mesmo tempo deixa de ser sinal.
        viewerClubTags={isMe ? undefined : sharedTags}
        // **Ver o próprio perfil precisa levar a algum lugar.** Sem isto a
        // pessoa reconhecia a própria página e não tinha como mudar nada dali ·
        // o caminho existia só pelo menu da conta, que é outro canto da tela.
        action={
          isMe ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/app/conta">
                <Pencil className="mr-2 h-4 w-4" aria-hidden />
                {t('player.editMine')}
              </Link>
            </Button>
          ) : (
            // **O verbo que faltava** · a página dizia que a pessoa procurava
            // club e não oferecia nada. Ele se esconde sozinho quando não há
            // club pra oferecer, então quem não gerencia nada não vê botão.
            // **Só na moldura de dentro** · a pública não tem quem chamar.
            <InvitePlayerButton handle={profile.handle} />
          )
        }
        identityNotice={
          isMe ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                {t('player.thisIsYou')}
              </span>
              {/* **O mesmo aviso da tela de conta, no lugar onde a consequência
                  aparece** · aqui é onde você vê o selo de "procurando club"
                  **não** estar, e sem a frase isso lê como defeito. Pendência
                  68, pedida pelo Eduardo em 08/08/2026. */}
              {profile.lookingForClub && profile.clubs.length >= MAX_CLUBS_PER_PLAYER && (
                <span className="text-xs text-amber-400">
                  {t('account.lookingForClubAtCap', { max: MAX_CLUBS_PER_PLAYER })}
                </span>
              )}
            </span>
          ) : undefined
        }
      />
    </div>
  );
}
