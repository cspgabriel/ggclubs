import { ShieldMinus } from 'lucide-react';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ClubExitButton } from '@/components/club/club-exit-button';
import { TournamentTieNote } from '@/components/club/tournament-tie-note';
import { api } from '@/lib/api';
import { useClubTournaments } from '@/lib/use-club-tournaments';

/**
 * Largar a gerência **sem sair do club** · 03/09/2026, pendência 186.
 *
 * **Ela é a saída que a trava de liderança mandava usar e que não existia.** Uma
 * conta lidera um club só, e quem passa a posse vira **gerente do mesmo club** ·
 * pra abrir outro club depois, a pessoa precisava **abandonar o elenco**, que é
 * perder a posição, a braçadeira e o time inteiro pra resolver um cargo.
 *
 * **Tom `brand` e não `destructive`, ao contrário da irmã ao lado.** Sair do
 * club não tem desfazer pela interface; largar o cargo tem, e ele é barato: o
 * dono promove de volta. Pintar as duas de vermelho ensinaria que pesam igual, e
 * é justamente a diferença entre elas que faz esta existir.
 *
 * **Só pra gerente.** O dono recebe `OWNER_CANNOT_STEP_DOWN` do servidor, e a saída
 * dele continua sendo passar a posse · oferecer o botão pra ele seria oferecer
 * ação que só sabe dar erro, que é a mesma regra do `LeaveClubButton`.
 */
export function StepDownButton({
  clubId,
  clubName,
  onStepDown,
}: {
  clubId: string;
  clubName: string;
  onStepDown: () => void;
}) {
  const { t } = useTranslation();
  /**
   * **Só busca com a janela aberta** · este botão fica no cabeçalho de todo
   * club que a pessoa gerencia, e perguntar na montagem seria uma requisição
   * por carga de página. É a mesma razão do menu do elenco.
   */
  const [open, setOpen] = useState(false);
  const { ties, loading: tiesLoading } = useClubTournaments(open ? clubId : null);

  return (
    <ClubExitButton
      icon={ShieldMinus}
      label={t('club.stepDownAction')}
      title={t('club.stepDownConfirmTitle')}
      body={
        <>
          <Trans
            i18nKey="club.stepDownConfirmBody"
            values={{ name: clubName }}
            components={[<span key="0" className="font-semibold text-primary" />]}
          />
          {/* **O campeonato vai junto**, como na janela de passar o club ·
              largar a gerência tira inscrever, pagar, cancelar e lançar placar
              **na edição em curso**, e sem esta linha o gerente que reservou uma
              vaga paga descobre isso ao não conseguir mais pagar. */}
          <TournamentTieNote ties={ties} side="stepping" loading={tiesLoading} />
        </>
      }
      confirmLabel={t('club.stepDownAction')}
      onOpenChange={setOpen}
      // **Confirmar espera o aviso**, pelo mesmo motivo da janela de posse ·
      // sem isto dava pra largar o cargo sem nunca ler que a edição ia junto.
      confirmDisabled={tiesLoading}
      onConfirm={async () => {
        await api.stepDownFromLead(clubId);
        onStepDown();
      }}
    />
  );
}
