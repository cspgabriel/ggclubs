import { CLUB_EVENT, clubTopic } from '@ggclubs/schemas';
import { Send, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PlayerSearchField } from '@/components/club/player-search-field';
import { SectionTitle } from '@/components/ui/section-title';
import { api } from '@/lib/api';
import type { PlayerSearchResult } from '@ggclubs/schemas';
import { apiErrorMessage } from '@/lib/api-error';
import { useResource } from '@/lib/use-resource';
import { useRealtimeRefresh } from '@/lib/realtime/use-realtime-refresh';

/**
 * Convidar por @nick, e a fila de quem já foi convidado · só pra quem gerencia.
 *
 * **Mora ao lado da fila de pedidos, e não numa tela de convite.** Pra quem
 * administra o club, "quem pediu" e "quem eu chamei" respondem a mesma pergunta
 * · *quem está entre nós e o elenco* · e separá-las em duas telas faria parecer
 * assuntos diferentes.
 *
 * **O convite tem como alvo uma pessoa escolhida, não um texto digitado.** Até
 * 04/08/2026 o campo aceitava o nick exato e o botão ficava aceso o tempo todo ·
 * dava pra convidar sem nunca ter olhado quem. Hoje a busca devolve uma pessoa,
 * ela vira uma ficha com rosto e @nick, e só então o botão acende.
 *
 * **Quem já sabe o nick não regrediu:** digitar ele inteiro e apertar Enter
 * escolhe a pessoa, sem mouse · era a razão de o campo ter nascido sem busca em
 * 31/07, e ela continua atendida.
 *
 * Quem busca é o `PlayerSearchField`, separado de propósito: é a peça que o
 * mercado de free agents reaproveita.
 */
export function ClubInvites({ clubId, onJoined }: { clubId: string; onJoined: () => void }) {
  const { t } = useTranslation();
  /**
   * **O `catch` que existia aqui virou o `error` ignorado do `useResource`** ·
   * quem não gerencia recebe 404, e a seção simplesmente não aparece. Falhar em
   * silêncio é a decisão, e ela continua escrita.
   */
  const {
    data: invites,
    reload,
    setData: setInvites,
  } = useResource((signal) => api.listClubInvites(clubId, { signal }).then((r) => r.invites), [
    clubId,
  ]);
  const [selected, setSelected] = useState<PlayerSearchResult | null>(null);
  const [sending, setSending] = useState(false);
  // A lista de sugestão flutua por cima do que vem abaixo · com ela aberta, a
  // dica embaixo do formulário aparecia cortada ao meio.
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * **Dois gerentes convidando ao mesmo tempo é o caso comum aqui**, e a fila
   * de um não sabia do convite do outro · dava pra chamar a mesma pessoa duas
   * vezes e levar "esse player já foi convidado" sem nunca ter visto o convite.
   *
   * Declara só o que é dela, como a fila de pedidos ao lado.
   */
  useRealtimeRefresh(clubTopic(clubId), [CLUB_EVENT.invites], () => reload());

  async function sendInvite() {
    if (!selected) return;

    setSending(true);
    setError(null);
    try {
      const r = await api.inviteToClub(clubId, selected.handle);
      setSelected(null);
      // `active` é o cruzamento: a pessoa já tinha pedido pra entrar, então o
      // convite aprovou o pedido dela e ela entrou agora. O elenco muda, e a
      // tela precisa refletir isso na hora.
      if (r.status === 'active') onJoined();
      // **Recarrega em vez de buscar à mão** · a lista tem que vir do servidor
      // porque o convite pode ter cruzado com um pedido, e o `reload` não
      // pisca (ele mantém o que está na tela enquanto a volta chega).
      else reload();
    } catch (err) {
      setError(apiErrorMessage(err, t));
    } finally {
      setSending(false);
    }
  }

  async function cancelInvite(userId: string) {
    setError(null);
    try {
      await api.cancelClubInvite(clubId, userId);
      setInvites((current) => (current ?? []).filter((i) => i.userId !== userId));
    } catch (err) {
      setError(apiErrorMessage(err, t));
    }
  }

  return (
    <section>
      <SectionTitle hint={t('club.inviteHint')}>{t('club.invite')}</SectionTitle>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void sendInvite();
        }}
      >
        <PlayerSearchField
          clubId={clubId}
          selected={selected}
          onSelect={setSelected}
          onOpenChange={setPicking}
          disabled={sending}
          className="flex-1"
        />
        {/* **Só acende com alguém escolhido**, e o motivo fica ao lado quando
            não acende · botão inerte sem explicação lê como tela quebrada.
            Antes ele ficava aceso o tempo todo e dava pra convidar sem nunca
            ter olhado quem. */}
        <Button
          type="submit"
          variant="ctaOutline"
          className="h-11 shrink-0"
          disabled={sending || !selected}
        >
          <Send className="mr-1.5 h-4 w-4" aria-hidden />
          {sending ? t('club.inviteSending') : t('club.inviteAction')}
        </Button>
      </form>
      {!selected && !sending && !picking && (
        <p className="mt-2 text-xs text-muted-foreground">{t('club.inviteNeedsPick')}</p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {(invites ?? []).length > 0 && (
        <ul className="mt-4 space-y-2">
          {(invites ?? []).map((invite) => (
            <li
              key={invite.userId}
              className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3"
            >
              <Avatar name={invite.displayName} src={invite.avatarUrl} className="h-9 w-9" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{invite.displayName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  @{invite.handle}
                </span>
              </span>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                {t('club.inviteWaiting')}
              </span>
              <Button variant="ghost" size="sm" onClick={() => void cancelInvite(invite.userId)}>
                <X className="mr-1.5 h-4 w-4" aria-hidden />
                {t('club.inviteCancel')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
