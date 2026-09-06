import { Crown } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DecisionCallout } from '@/components/club/decision-callout';
import { TournamentTieNote } from '@/components/club/tournament-tie-note';
import { api } from '@/lib/api';
import { useMyClubs } from '@/lib/use-my-clubs';
import { useClubTournaments } from '@/lib/use-club-tournaments';
import { apiErrorMessage } from '@/lib/api-error';
import { useOfferForClub } from '@/lib/use-offer-for-club';

/**
 * "Este club quer te passar a liderança", **na página do club**.
 *
 * **É o mesmo defeito que o convite tinha até 05/08/2026**, achado pelo Eduardo
 * do mesmo jeito: a oferta aparecia só em `/app/clubs`, então quem abrisse a
 * página do club não via nada e a decisão mais importante daquele momento ficava
 * escondida numa outra tela. Aqui é onde a pessoa está quando pensa no club.
 *
 * **Quem recebe já é do elenco**, e é por isso que o `JoinClubButton` não cobre
 * este caso: ele só existe pra quem não tem vínculo nenhum.
 *
 * A busca mora aqui, e não na página, pela mesma razão do convite · o
 * `pendingOwnerId` que a página tem só é carregado pra quem **gerencia** o club,
 * e quem recebe a oferta normalmente não gerencia. Assim a consulta só acontece
 * pra quem pode ter oferta.
 */
export function OwnershipOfferNotice({
  clubId,
  onAccepted,
}: {
  clubId: string;
  onAccepted: () => void;
}) {
  const { t } = useTranslation();
  const { offered, setOffered } = useOfferForClub(
    (signal) => api.listOwnershipOffers({ signal }),
    clubId,
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // **Só pergunta quando há oferta** · `offered` nasce nulo e vira `true`
  // só pra quem tem uma esperando, então a consulta não roda pra todo mundo
  // que abre a página do club.
  const { ties, loading: tiesLoading } = useClubTournaments(offered === true ? clubId : null);
  /**
   * **Quem já é dono de um club não pode assumir outro**, desde 18/08/2026 · e
   * a oferta pode ter nascido válida: ela é conferida quando é feita, vive
   * dias, e nesse meio-tempo quem recebeu pode ter criado o próprio club.
   *
   * Sem isto a tela oferece "Assumir o club" e o servidor devolve
   * `OWNER_LIMIT_REACHED` no clique · esconder é UX, mas **oferecer o que não
   * funciona é a tela mentindo**. A oferta continua desenhada de propósito:
   * recusar continua valendo, e ela volta a ser aceitável no dia em que a
   * pessoa se livrar do club que tem.
   */
  const { ledClub } = useMyClubs();

  async function decide(decision: 'accept' | 'decline') {
    setSending(true);
    setError(null);
    try {
      await api.decideOwnership(clubId, decision);
      setOffered(false);
      // Aceitar troca o papel de quem está olhando · a página precisa recarregar
      // pra trocar o selo e liberar o que só dono faz. Recusar não muda nada.
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
      icon={Crown}
      title={t('club.ownershipHere')}
      hint={
        <>
          {t('club.ownershipOffersHint')}
          {/* **O que ele está assumindo além do club** · sem isto, quem aceita
              descobre a edição pelo primeiro aviso de partida. */}
          <TournamentTieNote ties={ties} side="taking" loading={tiesLoading} />
        </>
      }
      acceptLabel={t('club.ownershipAccept')}
      declineLabel={t('club.ownershipDecline')}
      // **Assumir espera o aviso**, pelo mesmo motivo da janela de quem passa.
      busy={sending || tiesLoading}
      /**
       * **A frase segue o papel** · a oferta nasce impossível pra quem já lidera
       * (a origem barra), mas o papel pode mudar **enquanto ela espera**, e ela
       * espera dias por desenho: basta o dono de outro club promover a pessoa a
       * gerente nesse meio tempo. Sem isto o botão ficava **ligado e sem
       * explicação**, e o clique levava 409.
       */
      blockedReason={
        ledClub
          ? t(ledClub.role === 'owner' ? 'errors.OWNER_LIMIT_REACHED' : 'errors.MANAGER_LIMIT_REACHED')
          : null
      }
      error={error}
      onAccept={() => void decide('accept')}
      onDecline={() => void decide('decline')}
    />
  );
}
