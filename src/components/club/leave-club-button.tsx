import { LogOut } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { ClubExitButton } from '@/components/club/club-exit-button';
import { api } from '@/lib/api';

/**
 * Sair de um club de que a pessoa faz parte.
 *
 * **Com confirmação, e o tom é destrutivo**, porque não há desfazer pela
 * interface: voltar exige pedir de novo e alguém aprovar. É a mesma régua do
 * `ConfirmDialog` de trocar favorito, com um degrau a mais de peso · e é
 * exatamente o que a separa da irmã (`StepDownButton`), que **tem** desfazer.
 *
 * **Não aparece pro dono, e aparece pro resto do elenco · gerente incluído.**
 * O servidor barra só o dono (`club-squad.ts`), e mostrar o botão pra ele seria
 * oferecer uma ação que só sabe dar erro.
 *
 * **O gerente ficou de fora até 03/09/2026, por acidente de composição** · o
 * ramo do "sair" estava atrás do `canManage` na página do club, então era
 * inalcançável pra ele. E este docblock dizia que o dono não sai *"enquanto não
 * existir transferir club"* · a transferência existe desde `club-ownership.ts`,
 * e é exatamente ela que produz o caso: o dono antigo vira **gerente**, e o
 * comentário de lá promete que "como gerente ele pode sair".
 *
 * > **A casca (botão fantasma + janela + erro) saiu daqui pro
 * > [club-exit-button](club-exit-button.tsx) em 03/09/2026**, quando a segunda
 * > saída do club nasceu · ver o docblock de lá.
 */
export function LeaveClubButton({
  clubId,
  clubName,
  onLeft,
}: {
  clubId: string;
  clubName: string;
  onLeft: () => void;
}) {
  const { t } = useTranslation();

  return (
    <ClubExitButton
      icon={LogOut}
      label={t('club.leaveAction')}
      title={t('club.leaveConfirmTitle')}
      body={
        <Trans
          i18nKey="club.leaveConfirmBody"
          values={{ name: clubName }}
          components={[<span key="0" className="font-semibold text-primary" />]}
        />
      }
      confirmLabel={t('club.leaveAction')}
      tone="destructive"
      onConfirm={async () => {
        await api.leaveClub(clubId);
        onLeft();
      }}
    />
  );
}
