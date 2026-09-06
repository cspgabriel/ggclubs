import { ShieldPlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DecisionCallout } from '@/components/club/decision-callout';
import { api } from '@/lib/api';
import { useMyClubs } from '@/lib/use-my-clubs';
import { apiErrorMessage } from '@/lib/api-error';
import { useOfferForClub } from '@/lib/use-offer-for-club';

/**
 * "Este club quer você como gerente", **na página do club**.
 *
 * **Ele existe porque o aviso e o e-mail apontam pra cá** · o link do
 * `club.managerOffered` é `/app/clubs/{tag}`, e sem esta caixa a pessoa clicava
 * no e-mail, caía na página do club e **não achava nada** · o único lugar de
 * responder era a lista em `/app/clubs`, que ela não tinha motivo pra abrir.
 *
 * **É o mesmo defeito que o convite teve em 05/08/2026 e a oferta de posse
 * depois dele**, pela terceira vez: a decisão mais importante daquele momento
 * morando numa tela que não é a que o link abre. Achado pelo `revisor` em
 * 03/09/2026, antes de chegar num usuário.
 *
 * A busca mora aqui e não na página pela mesma razão do irmão de posse · o
 * `pendingManagerIds` que a página carrega é só pra quem **gerencia** o club, e
 * quem recebe o convite é justamente quem ainda não gerencia.
 */
export function ManagerOfferNotice({
  clubId,
  onAccepted,
}: {
  clubId: string;
  onAccepted: () => void;
}) {
  const { t } = useTranslation();
  const { offered, setOffered } = useOfferForClub(
    (signal) => api.listManagerOffers({ signal }),
    clubId,
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * **O papel pode ter mudado enquanto o convite esperava** · ele vale sete
   * dias, e nesse tempo a pessoa pode ter aberto o próprio club ou aceitado
   * outra liderança. A frase segue o papel: dono e gerente têm saídas
   * diferentes, e a errada manda procurar um botão que a tela não tem.
   *
   * O convite continua desenhado de propósito · **recusar continua valendo**, e
   * ele volta a ser aceitável no dia em que a pessoa largar o outro cargo.
   */
  const { ledClub } = useMyClubs();

  async function decide(decision: 'accept' | 'decline') {
    setSending(true);
    setError(null);
    try {
      await api.decideManagerOffer(clubId, decision);
      setOffered(false);
      // Aceitar troca o papel de quem está olhando · a página precisa recarregar
      // pra liberar o que só quem gerencia faz. Recusar não muda nada.
      if (decision === 'accept') onAccepted();
    } catch (err) {
      setError(apiErrorMessage(err, t));
    } finally {
      setSending(false);
    }
  }

  // Enquanto não se sabe, não se desenha · aparecer um instante depois é o
  // pisca que este projeto persegue.
  if (offered !== true) return null;

  return (
    <DecisionCallout
      icon={ShieldPlus}
      title={t('club.managerHere')}
      hint={t('club.managerOffersHint')}
      acceptLabel={t('club.managerAccept')}
      declineLabel={t('club.managerDecline')}
      busy={sending}
      blockedReason={
        ledClub
          ? t(
              ledClub.role === 'owner'
                ? 'errors.OWNER_LIMIT_REACHED'
                : 'errors.MANAGER_LIMIT_REACHED',
            )
          : null
      }
      error={error}
      onAccept={() => void decide('accept')}
      onDecline={() => void decide('decline')}
    />
  );
}
