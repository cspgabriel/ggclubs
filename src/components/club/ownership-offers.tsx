import { Crown } from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ClubOfferList } from '@/components/club/club-offer-list';
import { api } from '@/lib/api';

/**
 * As ofertas de **posse** esperando resposta · na tela de Clubs, ao lado dos
 * convites.
 *
 * Mesmo lugar e mesma forma dos convites de propósito: as duas respondem "um
 * club está esperando você", e esse é o lugar fixo onde a pessoa esbarra no que
 * a espera. Forma diferente ensinaria que são coisas distintas quando a
 * diferença está no **que se aceita**, não em como se vê.
 *
 * O que muda é o peso: aceitar um convite entra num elenco, aceitar isto **põe
 * o club no seu nome**. Por isso a coroa e o aviso de consequência · o botão
 * não pode parecer o mesmo botão.
 *
 * > **A casca saiu daqui pro [club-offer-list](club-offer-list.tsx) em
 * > 03/09/2026**, quando a oferta de gerência nasceu com o mesmo desenho ·
 * > ver o docblock de lá.
 */
export function OwnershipOffers({ onAccepted }: { onAccepted: () => void }) {
  const { t } = useTranslation();

  return (
    <ClubOfferList
      icon={Crown}
      title={(count) => t('club.ownershipOffers', { count })}
      hint={t('club.ownershipOffersHint')}
      acceptLabel={t('club.ownershipAccept')}
      declineLabel={t('club.ownershipDecline')}
      // `useCallback` porque o `useResource` guarda a busca no array de
      // dependências · uma função nova a cada render refaria a requisição em
      // laço.
      load={useCallback(
        (signal: AbortSignal) => api.listOwnershipOffers({ signal }).then((r) => r.offers),
        [],
      )}
      respond={useCallback(
        (clubId: string, decision: 'accept' | 'decline') => api.decideOwnership(clubId, decision),
        [],
      )}
      onAccepted={onAccepted}
    />
  );
}
