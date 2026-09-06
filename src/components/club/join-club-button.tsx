import { USER_EVENT, userTopic } from '@ggclubs/schemas';
import { Check, LogIn, MailCheck, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DecisionCallout } from '@/components/club/decision-callout';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import { useResource } from '@/lib/use-resource';
import { useRealtimeRefresh } from '@/lib/realtime/use-realtime-refresh';
import { useAuth } from '@/lib/use-auth';

/**
 * O caminho pra dentro de um club de outra pessoa.
 *
 * **Só aparece pra quem não tem vínculo nenhum com o club** · quem já está no
 * elenco vê o selo, e o dono vê o botão de configurar. Quem decide isso é a
 * página, que já sabe pelo elenco que buscou.
 *
 * Três estados, e o do meio é o que costuma faltar: sem pedido, **pedido na
 * fila** (com como desfazer) e erro. Botão que some depois do clique deixa a
 * pessoa sem saber se funcionou, e pedir de novo é o que ela faria.
 */
export function JoinClubButton({ clubId, onJoined }: { clubId: string; onJoined: () => void }) {
  const { t } = useTranslation();
  const { account } = useAuth();
  const accountId = account?._id ?? null;
  /**
   * **Falhar vale `false` nas duas** · não conseguir perguntar não é razão pra
   * dizer que existe pedido ou convite. O `error` é lido, e não ignorado.
   */
  const {
    data: pendingOrNull,
    error: pendingError,
    setData: setPending,
    reload: reloadPending,
  } = useResource(
    (signal) => api.listMyJoinRequests({ signal }).then((r) => r.requests.some((p) => p.clubId === clubId)),
    [clubId],
  );
  const pending = pendingError ? false : pendingOrNull;
  /**
   * **Quem foi convidado via "Pedir pra entrar", e não via o convite.**
   *
   * Achado pelo Eduardo em 05/08/2026. Não estava quebrado · pedir tendo
   * convite resolve e a pessoa entra. O que faltava era a tela **contar**: o
   * convite é a coisa mais importante daquela página no momento em que existe,
   * e a pessoa só descobria indo pra `/app/clubs`.
   *
   * `null` enquanto não se sabe, pelo mesmo motivo do `pending` logo acima.
   */
  const {
    data: invitedOrNull,
    error: invitedError,
    setData: setInvited,
    reload: reloadInvited,
  } = useResource(
    (signal) => api.listMyInvites({ signal }).then((r) => r.invites.some((i) => i.clubId === clubId)),
    [clubId],
  );
  const invited = invitedError ? false : invitedOrNull;
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * O estado do pedido é a única coisa que a tela não tem em mãos: o elenco veio
   * do servidor, mas pedido pendente não está nele de propósito · ele não é
   * elenco. Por isso a busca acontece **aqui**, e não na página · assim ela só
   * existe quando o botão existe, e visitar o próprio club não custa consulta
   * nenhuma.
   */

  /**
   * **Quem está de fora do club só tem a própria caixa pra ouvir.** Este botão
   * vive na página de um club que não é seu, então `club:{id}` está fora de
   * alcance · a inscrição é conferida contra o vínculo, e vínculo é justamente
   * o que falta. O que sobra é `user:{id}`, e ele basta: convite recebido,
   * convite retirado, pedido aprovado e pedido recusado publicam ali.
   *
   * Sem isto o botão fica dizendo "Pedido enviado" pra um pedido já respondido,
   * e o convite que acabou de chegar não aparece na página onde ele importa.
   */
  useRealtimeRefresh(accountId ? userTopic(accountId) : null, [USER_EVENT.membership], () => {
    reloadPending();
    reloadInvited();
  });

  async function requestJoin() {
    setSending(true);
    setError(null);
    try {
      // **A posição do perfil viaja com o pedido.** Ela é o que o dono usa pra
      // decidir · num club com três goleiros, é a informação que responde. O
      // campo existia no input desde o primeiro dia e a tela nunca mandava
      // nada, então todo vínculo criado pelo produto nascia sem posição.
      //
      // Sem posição no perfil vai `null`, e a pessoa define depois no próprio
      // club · perguntar aqui seria um formulário no meio de um botão.
      await api.joinClub(clubId, { position: account?.position ?? null });
      setPending(true);
    } catch (err) {
      // O teto de 3 e os pedidos parados chegam como código traduzido. **A tela
      // não pré-checa nenhum dos dois**: saber se cabe exigiria buscar os
      // vínculos da pessoa em toda visita a um club alheio, pra evitar um erro
      // que o servidor já explica em uma frase.
      setError(apiErrorMessage(err, t));
    } finally {
      setSending(false);
    }
  }

  async function decide(decision: 'accept' | 'decline') {
    setSending(true);
    setError(null);
    try {
      await api.decideInvite(clubId, decision);
      setInvited(false);
      // Aceitar põe a pessoa no elenco · a página inteira muda de estado, e
      // quem sabe disso é ela, não este botão.
      if (decision === 'accept') onJoined();
    } catch (err) {
      setError(apiErrorMessage(err, t));
    } finally {
      setSending(false);
    }
  }

  async function withdraw() {
    setSending(true);
    setError(null);
    try {
      await api.cancelJoinRequest(clubId);
      setPending(false);
    } catch (err) {
      setError(apiErrorMessage(err, t));
    } finally {
      setSending(false);
    }
  }

  // Enquanto não se sabe, não se desenha: mostrar "Entrar" e trocar pra "Pedido
  // enviado" um instante depois é o pisca que este projeto persegue desde a
  // tela de entrada. **As duas respostas são esperadas**, senão o convite
  // apareceria um instante depois do botão de pedir.
  if (pending === null || invited === null) return null;

  return (
    <div className="flex flex-col items-end gap-1.5">
      {invited ? (
        // **O convite ganha da opção de pedir**, e é o ponto desta tela: quem
        // já foi chamado não precisa pedir nada, precisa responder. O desenho
        // da caixa mora no `DecisionCallout` desde 07/08/2026 · era escrito à
        // mão aqui e de novo no aviso de oferta de posse.
        <DecisionCallout
          icon={MailCheck}
          title={t('club.inviteHere')}
          acceptLabel={t('club.inviteAccept')}
          declineLabel={t('club.inviteDecline')}
          busy={sending}
          onAccept={() => void decide('accept')}
          onDecline={() => void decide('decline')}
        />
      ) : pending ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t('club.joinPending')}
          </span>
          <Button variant="ghost" size="sm" onClick={() => void withdraw()} disabled={sending}>
            <X className="mr-1.5 h-4 w-4" aria-hidden />
            {t('club.joinCancel')}
          </Button>
        </div>
      ) : (
        <Button variant="cta" size="sm" onClick={() => void requestJoin()} disabled={sending}>
          <LogIn className="mr-1.5 h-4 w-4" aria-hidden />
          {sending ? t('club.joinSending') : t('club.joinAction')}
        </Button>
      )}
      {error && <p className="max-w-xs text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}
