import type { ManageSquadMember, MembershipRole } from '@ggclubs/schemas';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Crown,
  MapPin,
  MoreVertical,
  ShieldMinus,
  ShieldPlus,
  Star,
  StarOff,
  User,
  UserMinus,
} from 'lucide-react';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { PositionPicker } from '@/components/club/position-picker';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TournamentTieNote } from '@/components/club/tournament-tie-note';
import { api } from '@/lib/api';
import { useClubTournaments } from '@/lib/use-club-tournaments';
import { apiErrorMessage } from '@/lib/api-error';
import { appPlayerPath } from '@/lib/paths';
import { cn } from '@/lib/utils';

/**
 * As ações de gestão de uma linha do elenco.
 *
 * **Só renderiza o que quem está olhando pode fazer**, e o menu inteiro some
 * quando não sobra nada · menu vazio comunica defeito, ausência comunica "aqui
 * não tem nada pra você". A mesma regra do menu de contexto do desktop.
 *
 * Esconder é UX, não segurança: as rotas recusam de qualquer jeito, e é lá que
 * a matriz de poder está escrita de verdade. Aqui ela é repetida pra tela não
 * oferecer o que vai voltar como erro.
 */
export function SquadMemberActions({
  clubId,
  member,
  viewerRole,
  isViewer,
  pendingOwnerId,
  pendingManagerIds,
  onChanged,
}: {
  clubId: string;
  member: ManageSquadMember;
  /** O papel de quem está olhando **neste** club. */
  viewerRole: MembershipRole;
  /** A própria linha · ninguém se gerencia por aqui. */
  isViewer: boolean;
  /** Pra quem o club está oferecido agora, se estiver. */
  pendingOwnerId?: string | null;
  /**
   * Quem está esperando responder sobre a **gerência** · 03/09/2026.
   *
   * É lista e o da posse é um id só, e a diferença é a cardinalidade: o club
   * tem uma sucessão aberta ou nenhuma, e pode ter um convite de gerência
   * aberto por pessoa do elenco.
   */
  pendingManagerIds?: string[];
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [removing, setRemoving] = useState(false);
  const [offering, setOffering] = useState(false);
  const [pickingPosition, setPickingPosition] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /**
   * **Só busca com a janela aberta**, e não é economia: este componente
   * renderiza **uma vez por linha do elenco**, então buscar na montagem seria
   * uma requisição por pessoa do club · é o defeito que a página do jogador já
   * teve e que o `MyClubsProvider` existiu pra apagar.
   */
  const { ties, loading: tiesLoading } = useClubTournaments(offering ? clubId : null);

  const isOwner = viewerRole === 'owner';
  const isManager = viewerRole === 'manager';
  const targetIsOwner = member.role === 'owner';
  const targetIsManager = member.role === 'manager';

  // Espelha a matriz do servidor. Papel é só do dono; braçadeira e remoção são
  // de dono e gerente, com o gerente sem alcance sobre os pares e sobre o dono.
  const canChangeRole = isOwner && !isViewer && !targetIsOwner;
  /**
   * **O convite de gerência aberto na linha desta pessoa** · 03/09/2026,
   * pendência 185.
   *
   * Ele vira o próprio item de desistir, exatamente como a oferta de posse ao
   * lado · sem isso o dono ofereceria, a tela não mudaria nada, e o clique
   * leria como perdido. É também o único caminho de voltar atrás.
   */
  const offeredManagerRole = (pendingManagerIds ?? []).includes(member.userId);
  const canGiveCaptaincy = (isOwner || isManager) && !member.isCaptain;
  const canRemoveCaptaincy = (isOwner || isManager) && member.isCaptain;
  const canRemove = (isOwner || (isManager && !targetIsManager)) && !isViewer && !targetIsOwner;
  // Só o dono passa o club, e só pra outra pessoa · o servidor recusa os dois
  // casos de qualquer jeito, mas oferecer um botão que sempre falha é pior que
  // não ter botão.
  const canOfferOwnership = isOwner && !isViewer && !targetIsOwner;
  // A posição é do player, mas quem monta escalação é quem organiza o elenco ·
  // as duas coisas acontecem o tempo todo num club, e a rota aceita as duas.
  const canSetPosition = isViewer || isOwner || isManager;
  // A oferta aberta vira o próprio item de desistir, **na linha de quem
  // recebeu** · sem isso o dono ofereceria, a tela não mudaria nada, e o clique
  // leria como perdido. É também o único caminho de voltar atrás.
  const offeredToThisMember = isOwner && pendingOwnerId === member.userId;

  const items = [
    canChangeRole,
    canGiveCaptaincy,
    canRemoveCaptaincy,
    canRemove,
    canOfferOwnership,
    offeredToThisMember,
    canSetPosition,
  ];
  if (!items.some(Boolean)) return null;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          disabled={busy}
          aria-label={t('club.manageMember')}
          // Marca o gatilho pra a linha ser alcançável de fora · é como o card
          // de club expõe `data-club-tag` pro menu de contexto do desktop.
          data-member-menu={member.handle}
          className="touch-target grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MoreVertical className="h-4 w-4" aria-hidden />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="z-50 min-w-52 overflow-hidden rounded-xl border bg-popover p-1 shadow-2xl data-[state=open]:animate-fade-in motion-reduce:animate-none"
          >
            {/* **Ver o perfil abre o menu**, e é o primeiro item de propósito ·
                todas as outras ações mudam alguma coisa, e esta só leva pra
                onde a pessoa está. Quem gerencia abre este menu justamente pra
                decidir sobre alguém, e decidir sem poder olhar quem é era o
                buraco que o Eduardo apontou em 08/08/2026: o nome vira link no
                elenco, mas o menu não oferecia caminho nenhum. */}
            <Item
              icon={User}
              label={t('club.viewProfile')}
              onSelect={() => void navigate(appPlayerPath(member.handle))}
            />
            {canGiveCaptaincy && (
              <Item
                icon={Star}
                label={t('club.makeCaptain')}
                onSelect={() => void run(() => api.setClubCaptain(clubId, member.userId))}
              />
            )}
            {canRemoveCaptaincy && (
              <Item
                icon={StarOff}
                label={t('club.clearCaptain')}
                onSelect={() => void run(() => api.clearClubCaptain(clubId))}
              />
            )}
            {canChangeRole && (
              /**
               * **Três rótulos e não dois, desde 03/09/2026** · promover virou
               * convite, e o estado do meio ("já convidei, quero desistir")
               * precisava de nome próprio.
               *
               * **Desistir é o mesmo `role: 'member'` que rebaixa**, e é por
               * isso que os três cabem num item só: a rota resolve o pendente e
               * o efetivo de uma vez, e o que muda aqui é só o que a pessoa lê.
               */
              <Item
                icon={targetIsManager || offeredManagerRole ? ShieldMinus : ShieldPlus}
                label={
                  offeredManagerRole
                    ? t('club.managerOfferCancel')
                    : targetIsManager
                      ? t('club.demote')
                      : t('club.promote')
                }
                onSelect={() =>
                  void run(() =>
                    api.setClubRole(
                      clubId,
                      member.userId,
                      targetIsManager || offeredManagerRole ? 'member' : 'manager',
                    ),
                  )
                }
              />
            )}
            {/* Passar o club fica **na linha da pessoa**, e não num campo à
                parte na tela de configurar: quem decide sucessão está olhando o
                elenco e pensando em alguém, não procurando um seletor. É o
                mesmo raciocínio que pôs promover e braçadeira aqui. */}
            {canSetPosition && (
              <Item
                icon={MapPin}
                label={t('club.positionSet')}
                onSelect={() => setPickingPosition(true)}
              />
            )}
            {offeredToThisMember ? (
              <Item
                icon={Crown}
                label={t('club.ownershipCancel')}
                onSelect={() => void run(() => api.cancelOwnership(clubId))}
              />
            ) : (
              canOfferOwnership && (
                <Item
                  icon={Crown}
                  label={t('club.ownershipOffer')}
                  onSelect={() => setOffering(true)}
                />
              )
            )}
            {canRemove && (
              <Item
                icon={UserMinus}
                label={t('club.removeMember')}
                tone="destructive"
                onSelect={() => setRemoving(true)}
              />
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <ConfirmDialog
        open={removing}
        onOpenChange={(v) => {
          setRemoving(v);
          if (!v) setError(null);
        }}
        title={t('club.removeConfirmTitle')}
        description={
          <>
            <Trans
              i18nKey="club.removeConfirmBody"
              values={{ name: member.displayName }}
              components={[<span key="0" className="font-semibold text-primary" />]}
            />
            {error && <span className="mt-3 block text-destructive">{error}</span>}
          </>
        }
        confirmLabel={t('club.removeMember')}
        tone="destructive"
        onConfirm={async () => {
          await api.removeClubMember(clubId, member.userId);
          onChanged();
        }}
      />

      {/* Confirmação porque passar o club **não tem desfazer pelo seu lado**:
          depois que a pessoa aceita, voltar atrás depende de ela querer
          devolver. A janela diz o que acontece, em vez de perguntar "tem
          certeza?" · é a mesma forma da janela de sair do club. */}
      <ConfirmDialog
        open={offering}
        onOpenChange={(v) => {
          setOffering(v);
          if (!v) setError(null);
        }}
        title={
          <Trans
            i18nKey="club.ownershipOfferTitle"
            values={{ name: member.displayName }}
            components={[<span key="0" className="text-primary" />]}
          />
        }
        description={
          <>
            {t('club.ownershipOfferBody')}
            {/* **E a vaga de liderança da CONTA de quem passa** · 03/09/2026,
                pendência 186. Ele vira gerente do mesmo club, gerente é
                liderança, e a conta continua ocupada · sem esta linha a pessoa
                passava o club pra poder abrir outro e descobria no erro, um
                clique depois, que ainda não podia. */}
            <span className="mt-2 block text-muted-foreground">
              {t('club.ownershipOfferLeadNote')}
            </span>
            {/* **O campeonato vai junto**, e é o que a janela não dizia · quem
                passa o club perde inscrever, pagar, cancelar e lançar placar
                naquela edição, na hora em que o outro aceita. */}
            <TournamentTieNote ties={ties} side="giving" loading={tiesLoading} />
            {error && <span className="mt-3 block text-destructive">{error}</span>}
          </>
        }
        confirmLabel={t('club.ownershipOffer')}
        // **Confirmar espera o aviso** · a nota do que a posse leva junto chega
        // depois da janela abrir, e sem isto dava pra passar o club sem nunca
        // ler que a Copa ia junto.
        confirmDisabled={tiesLoading}
        onConfirm={async () => {
          await api.offerOwnership(clubId, member.userId);
          onChanged();
        }}
      />

      <PositionPicker
        open={pickingPosition}
        onOpenChange={setPickingPosition}
        title={
          isViewer ? (
            t('club.positionTitleSelf')
          ) : (
            <Trans
              i18nKey="club.positionTitle"
              values={{ name: member.displayName }}
              components={[<span key="0" className="text-primary" />]}
            />
          )
        }
        current={member.position ?? null}
        onPick={(position) => run(() => api.setMemberPosition(clubId, member.userId, position))}
      />

      {/* Falha fora da janela não tem onde aparecer · sem isto, promover alguém
          e receber recusa do servidor seria silêncio total. */}
      {error && !removing && !offering && (
        <p role="alert" className="mt-1 text-right text-xs text-destructive">
          {error}
        </p>
      )}
    </>
  );
}

function Item({
  icon: Icon,
  label,
  onSelect,
  tone,
}: {
  icon: typeof Star;
  label: string;
  onSelect: () => void;
  tone?: 'destructive';
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm outline-hidden',
        'data-[highlighted]:bg-secondary',
        tone === 'destructive' ? 'text-destructive' : 'text-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </DropdownMenu.Item>
  );
}
