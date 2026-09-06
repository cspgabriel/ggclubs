import { ShieldPlus } from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ClubOfferList } from '@/components/club/club-offer-list';
import { api } from '@/lib/api';
import { useMyClubs } from '@/lib/use-my-clubs';

/**
 * Os convites pra ser **gerente** esperando resposta · 03/09/2026, pendência
 * 185.
 *
 * **Ele existe porque promover passou a exigir aceite**, e o motivo é a trava
 * de liderança: o cargo gasta a **única vaga de liderança da conta**, além de
 * passar a inscrever, pagar, cancelar e declarar placar. Promover sem perguntar
 * gastava a vaga de outra pessoa por ela.
 *
 * Fica ao lado da oferta de posse, com a mesma forma e outro ícone · a diferença
 * entre as duas é o que se aceita, e é a dica da seção que a diz.
 */
export function ManagerOffers({ onAccepted }: { onAccepted: () => void }) {
  const { t } = useTranslation();
  const { ledClub } = useMyClubs();

  return (
    <ClubOfferList
      icon={ShieldPlus}
      title={(count) => t('club.managerOffers', { count })}
      hint={t('club.managerOffersHint')}
      acceptLabel={t('club.managerAccept')}
      declineLabel={t('club.managerDecline')}
      /**
       * **O papel pode ter mudado enquanto o convite esperava** · ele vale sete
       * dias, e nesse tempo a pessoa pode ter aberto o próprio club ou aceitado
       * outra liderança. A frase segue o papel, como no aviso de posse: dono e
       * gerente têm saídas diferentes, e mandar a errada faz a pessoa procurar
       * um botão que a tela dela não tem.
       */
      blockedReason={
        ledClub
          ? t(
              ledClub.role === 'owner'
                ? 'errors.OWNER_LIMIT_REACHED'
                : 'errors.MANAGER_LIMIT_REACHED',
            )
          : null
      }
      load={useCallback(
        (signal: AbortSignal) => api.listManagerOffers({ signal }).then((r) => r.offers),
        [],
      )}
      respond={useCallback(
        (clubId: string, decision: 'accept' | 'decline') =>
          api.decideManagerOffer(clubId, decision),
        [],
      )}
      onAccepted={onAccepted}
    />
  );
}
