import { CLUB_EVENT, clubTopic } from '@ggclubs/schemas';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SectionTitle } from '@/components/ui/section-title';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import { useResource } from '@/lib/use-resource';
import { positionKey } from '@/lib/position';
import { useRealtimeRefresh } from '@/lib/realtime/use-realtime-refresh';

/**
 * A fila de quem pediu pra entrar · só o dono vê.
 *
 * **Mora na página do club, acima do elenco, e não na tela de configurar.** A
 * decisão é sobre o elenco e o resultado aparece nele, então separar as duas
 * telas obrigaria o dono a navegar pra descobrir que existe alguém esperando ·
 * fila que ninguém vê é pedido que morre parado, e quem pediu fica sem resposta
 * sem entender por quê.
 *
 * **Some quando não há pedido.** Seção vazia com "nenhum pedido" é ruído
 * permanente numa página que a pessoa abre toda hora · o estado vazio aqui é a
 * ausência.
 */
export function JoinRequests({ clubId, onApproved }: { clubId: string; onApproved: () => void }) {
  const { t, i18n } = useTranslation();
  const { data, reload, setData: setRequests } = useResource(
    (signal) => api.listJoinRequests(clubId, { signal }).then((r) => r.requests),
    [clubId],
  );
  /**
   * **`null` é "ainda não voltou" e `[]` é "voltou vazio"** · o `useResource`
   * mantém os dois separados de propósito, e juntá-los aqui é o que a tela
   * quer: enquanto não voltou, ela não desenha nada mesmo.
   */
  const requests = data ?? [];
  const [deciding, setDeciding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * **A fila anda sozinha**, e ela é a tela onde alguém fica parado esperando ·
   * quem gerencia deixava a página aberta e só via o pedido depois de recarregar.
   * Pior: chegava a aprovar um pedido **já retirado** e levar 404 num clique que
   * parecia normal.
   *
   * Ela declara **só o que é dela** · elenco, identidade e escalação mudam sem
   * mexer na fila, e recarregar aqui por causa deles seria a consulta que a
   * divisão de gatilhos da página existe pra não fazer.
   */
  useRealtimeRefresh(clubTopic(clubId), [CLUB_EVENT.requests], () => reload());

  async function decide(userId: string, decision: 'approve' | 'reject') {
    setDeciding(userId);
    setError(null);
    try {
      await api.decideJoinRequest(clubId, userId, decision);
      // Sai da lista na hora · esperar uma nova busca deixaria a linha respondida
      // ainda na tela, e o dono clicaria de novo.
      setRequests((current) => (current ?? []).filter((p) => p.userId !== userId));
      // O elenco só muda quando alguém entra · recarregar na recusa seria uma
      // consulta que devolve exatamente o que já está na tela.
      if (decision === 'approve') onApproved();
    } catch (err) {
      setError(apiErrorMessage(err, t));
    } finally {
      setDeciding(null);
    }
  }

  if (requests.length === 0) return null;

  return (
    <section>
      <SectionTitle hint={t('club.requestsHint')}>
        {t('club.requests', { count: requests.length })}
      </SectionTitle>
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
      <ul className="space-y-2">
        {requests.map((request) => (
          <li
            key={request.userId}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3"
          >
            <Avatar name={request.displayName} src={request.avatarUrl} className="h-10 w-10" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{request.displayName}</span>
              <span className="block truncate text-xs text-muted-foreground">
                @{request.handle}
                {request.position && (
                  <span className="ml-1.5 font-semibold text-primary">
                    · {t(positionKey(request.position))}
                  </span>
                )}
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(request.requestedAt).toLocaleDateString(i18n.language, {
                day: '2-digit',
                month: '2-digit',
              })}
            </span>
            <span className="flex items-center gap-2">
              {/* `ctaOutline`, não `cta`: numa fila de três pedidos seriam três
                  blocos verdes chapados na mesma tela, e a regra da escada de
                  botões é **um CTA por tela** · verde em tudo mata o destaque.
                  Aqui o contorno já separa a ação principal da linha, e o hover
                  preenche. */}
              <Button
                variant="ctaOutline"
                size="sm"
                disabled={deciding === request.userId}
                onClick={() => void decide(request.userId, 'approve')}
              >
                <Check className="mr-1.5 h-4 w-4" aria-hidden />
                {t('club.requestApprove')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={deciding === request.userId}
                onClick={() => void decide(request.userId, 'reject')}
              >
                <X className="mr-1.5 h-4 w-4" aria-hidden />
                {t('club.requestReject')}
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
