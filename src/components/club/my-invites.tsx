import { Check, X } from 'lucide-react';
import { USER_EVENT, userTopic } from '@ggclubs/schemas';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClubCrest } from '@/components/club/club-crest';
import { PlatformMark } from '@/components/club/platform-mark';
import { Button } from '@/components/ui/button';
import { SectionTitle } from '@/components/ui/section-title';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import { useResource } from '@/lib/use-resource';
import { useRealtimeRefresh } from '@/lib/realtime/use-realtime-refresh';
import { useAuth } from '@/lib/use-auth';

/**
 * Os convites que a pessoa recebeu · na tela de Clubs, onde ela gerencia os
 * vínculos dela.
 *
 * **É aqui que o convite deixa de ser invisível.** Enquanto não existir aviso
 * (a arquitetura de tempo real está adiada, ver notas), todo fluxo que dependeria
 * de notificação precisa de um lugar fixo onde a pessoa esbarre · convite que só
 * existisse num aviso seria convite morto até o aviso existir.
 *
 * **Some quando não há nenhum**, como a fila do dono: seção vazia numa tela
 * aberta toda hora é ruído permanente.
 *
 * Traz o club inteiro porque quem foi convidada **não estava olhando nada** ·
 * escudo, nome, plataforma e tamanho do elenco são o que ela precisa pra decidir
 * sem sair da tela.
 */
export function MyInvites({ onAccepted }: { onAccepted: () => void }) {
  const { t } = useTranslation();
  const accountId = useAuth().account?._id ?? null;
  const { data, reload, setData: setInvites } = useResource(
    (signal) => api.listMyInvites({ signal }).then((r) => r.invites),
    [],
  );
  /**
   * **`null` é "ainda não voltou" e `[]` é "voltou vazio"** · o `useResource`
   * mantém os dois separados de propósito, e juntá-los aqui é o que a tela
   * quer: enquanto não voltou, ela não desenha nada mesmo.
   */
  const invites = data ?? [];
  const [responding, setResponding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * **Isto é o que chega sem a pessoa fazer nada**, e por isso é a peça desta
   * tela que mais precisava ouvir · quem foi chamado não estava esperando, e sem
   * o canal só descobria recarregando a página por acaso.
   *
   * O tópico é a **caixa da conta**, que toda conexão já assina sozinha.
   */
  useRealtimeRefresh(accountId ? userTopic(accountId) : null, [USER_EVENT.membership], () =>
    reload(),
  );

  async function respond(clubId: string, decision: 'accept' | 'decline') {
    setResponding(clubId);
    setError(null);
    try {
      await api.decideInvite(clubId, decision);
      setInvites((current) => (current ?? []).filter((i) => i.clubId !== clubId));
      // Só aceitar muda a lista de clubs · recusar não mexe em nada que a tela
      // já tenha em mãos.
      if (decision === 'accept') onAccepted();
    } catch (err) {
      setError(apiErrorMessage(err, t));
    } finally {
      setResponding(null);
    }
  }

  if (invites.length === 0) return null;

  return (
    <section>
      <SectionTitle hint={t('club.myInvitesHint')}>
        {t('club.myInvites', { count: invites.length })}
      </SectionTitle>
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {invites.map((invite) => (
          <li
            key={invite.clubId}
            className="flex h-full flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4"
          >
            <span className="flex items-center gap-3">
              <ClubCrest tag={invite.tag} crestUrl={invite.crestUrl} className="h-12 w-12 text-lg" />
              <span className="min-w-0">
                <span className="block truncate font-display uppercase tracking-tight">
                  {invite.name}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <PlatformMark platform={invite.platform} withLabel />
                  <span>{t('club.squadMany', { count: invite.memberCount })}</span>
                </span>
              </span>
            </span>
            <span className="mt-auto flex items-center gap-2">
              <Button
                variant="ctaOutline"
                size="sm"
                disabled={responding === invite.clubId}
                onClick={() => void respond(invite.clubId, 'accept')}
              >
                <Check className="mr-1.5 h-4 w-4" aria-hidden />
                {t('club.inviteAccept')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={responding === invite.clubId}
                onClick={() => void respond(invite.clubId, 'decline')}
              >
                <X className="mr-1.5 h-4 w-4" aria-hidden />
                {t('club.inviteDecline')}
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
