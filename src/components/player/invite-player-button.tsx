import { CLUB_EVENT, clubTopic, USER_EVENT, userTopic } from '@ggclubs/schemas';
import { Check, Clock, Loader2, Send, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { ApiError, apiErrorMessage } from '@/lib/api-error';
import { useRealtimeRefresh } from '@/lib/realtime/use-realtime-refresh';
import { useAuth } from '@/lib/use-auth';
import { useResource } from '@/lib/use-resource';

/**
 * Chamar um player pro seu club, **da página dele** · e desistir do convite por
 * ali também.
 *
 * **A página afirmava que a pessoa procurava club e não oferecia verbo nenhum**
 * · quem quisesse chamar tinha que decorar o @nick, sair dali, abrir o próprio
 * club e achar o campo de convite. Era a ponta solta do ciclo vitrine → perfil →
 * convite, e é a pendência 60.
 *
 * **O convite pendente aparece aqui desde 08/08/2026**, e ele fecha o buraco que
 * o Eduardo apontou ao validar: sem mostrar o que já foi mandado, a mesma pessoa
 * era convidável **de novo** pelo mesmo club, e desistir exigia ir até a fila
 * dentro do club. **Quem já é do elenco também aparece**, dito e sem ação · a
 * lista precisa explicar por que aquele club não está entre os convidáveis.
 *
 * **Ele se esconde sozinho quando não há nada a dizer** · sem clubs
 * gerenciados, sem componente. Esconder é UX · quem recusa de verdade continua
 * sendo a rota de convite, com a faixa `reaching`.
 *
 * **Com um club é botão; com mais de um é escolha.** Um botão que não diz
 * **pra qual** club está chamando é o tipo de controle que a pessoa aperta e se
 * arrepende.
 */
export function InvitePlayerButton({ handle }: { handle: string }) {
  const { t } = useTranslation();
  const { account } = useAuth();
  const accountId = account?._id ?? null;
  /**
   * **Falha aqui é silêncio, não erro na tela** · o convite é um extra da
   * página, e um aviso vermelho no perfil de alguém por causa de uma consulta
   * secundária conta uma história errada sobre a página inteira. Por isso o
   * `error` do `useResource` é ignorado, e o componente some (`!targets`).
   */
  /**
   * **O `loading` entra no travamento junto com o `busy`** · a ação termina
   * antes de a lista voltar, porque o `reload()` do `useResource` agenda em vez
   * de devolver promessa.
   *
   * Sem isto o selo "convidado" continuava desenhado com o X habilitado por uma
   * fração de segundo depois de o convite ser retirado · um segundo clique
   * impaciente mandava cancelar um convite que já não existe, e o erro aparecia
   * no perfil de outra pessoa. Achado por revisão em 01/09/2026.
   */
  const { data: targets, reload, loading: refreshing } = useResource(
    (signal) => api.inviteTargets(handle, { signal }),
    [handle],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  /**
   * **Esta peça fala de um vínculo que TEM dois lados**, e é isso que a põe no
   * tempo real enquanto a vitrine de jogadores fica de fora: aqui o que muda não
   * é ordem de lista, é o **estado de uma coisa que você mandou** · o convite
   * que a pessoa aceitou, o que outro gerente retirou, o pedido que alguém
   * aprovou. Sem ouvir, o selo "convidado" continua oferecendo o X de desistir
   * de um convite que já não existe, e o clique cai em erro.
   *
   * **São até três tópicos, um por club que você gerencia** · o teto de clubs
   * por pessoa é o teto da lista.
   *
   * **O que continua NÃO chegando aqui, e é limite do desenho, não esquecimento:**
   * o `targetHasRoom` é do outro lado · se a pessoa lotar os clubs dela noutro
   * lugar, isso mora no `user:{id}` **dela**, que ninguém mais assina. O convite
   * segue sendo recusado pelo servidor, que é onde a regra mora.
   */
  useRealtimeRefresh(
    (targets?.clubs ?? []).map((club) => clubTopic(club.id)),
    [CLUB_EVENT.invites, CLUB_EVENT.squad, CLUB_EVENT.requests],
    () => reload(),
  );

  /**
   * **E o seu próprio vínculo**, que é o que decide **quais clubs** aparecem
   * aqui · ser tirado de um club, ou virar gerente de outro, muda a lista
   * inteira. Sem isto o painel continuaria oferecendo chamar alguém pra um club
   * que já não é seu, e o servidor recusaria o clique.
   */
  useRealtimeRefresh(accountId ? userTopic(accountId) : null, [USER_EVENT.membership], () =>
    reload(),
  );

  if (!targets) return null;

  const invitable = targets.clubs.filter((club) => club.relation === 'none');
  const invited = targets.clubs.filter((club) => club.relation === 'invited');
  const member = targets.clubs.filter((club) => club.relation === 'member');
  const pending = targets.clubs.filter((club) => club.relation === 'pending');

  // Nada a dizer · quem não gerencia club nenhum.
  if (targets.clubs.length === 0) return null;

  async function act(key: string, run: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await run();
      // **Recarrega em vez de mexer na lista local** · a relação é do servidor,
      // e adivinhá-la aqui é o começo de duas verdades sobre o mesmo vínculo.
      //
      // **A janela fecha sem esperar a volta**, e isso é de propósito: o
      // `reload()` do `useResource` agenda a busca em vez de devolver promessa,
      // e segurar a janela aberta durante uma consulta que ninguém está olhando
      // só atrasa o fechamento. A lista está por baixo, e ela se atualiza.
      reload();
      setOpen(false);
    } catch (err) {
      setError(apiErrorMessage(err instanceof ApiError ? err : new Error(''), t));
    } finally {
      setBusy(null);
    }
  }

  const only = invitable.length === 1 ? invitable[0] : null;
  const canInvite = targets.targetHasRoom && invitable.length > 0;

  return (
    /* **`items-end` no desktop e largura total no celular** · encostado à
       direita numa tela estreita, cada selo comecava numa coluna diferente e a
       pilha lia como desalinhada. */
    <div className="flex w-full flex-col items-start gap-1.5 sm:w-auto sm:items-end">
      {canInvite && (
        /* **O wrapper alinha igual à pilha de fora** · sem isto o botão
           **andava ao abrir**: a lista cresce pra 16rem no desktop, o wrapper
           cresce junto e o botão, encostado à esquerda dele, escorregava. Visto
           pelo Eduardo em 09/08/2026. */
        <div className="flex w-full flex-col items-start sm:w-auto sm:items-end">
          <Button
            variant="outline"
            size="sm"
            disabled={busy !== null || refreshing}
            onClick={() => (only ? void act(only.id, () => api.inviteToClub(only.id, handle)) : setOpen((v) => !v))}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" aria-hidden />
            )}
            {only ? t('player.inviteTo', { club: only.name }) : t('player.invite')}
          </Button>

          {open && !only && (
            /* **A lista abre NO FLUXO, e não flutuando** · e a razão é medida,
               não gosto: a `<section>` da identidade tem `overflow-hidden` (ela
               é dona da capa e da marca d'água), então um menu absoluto era
               **cortado por ela** · com dois clubs passava, com três o terceiro
               ficava invisível. Achado com probe em 09/08/2026, depois de o
               Eduardo pedir pra testar com três.
               As saídas eram portal, abrir pra cima, ou sair do flutuante · e
               **a lista tem no máximo três itens**, porque o teto de clubs por
               pessoa é três. Flutuar não paga o risco pra uma lista desse
               tamanho. */
            <ul className="mt-2 w-full space-y-1 rounded-xl border bg-popover p-1 sm:w-64">
              {invitable.map((club) => (
                <li key={club.id}>
                  <button
                    type="button"
                    onClick={() => void act(club.id, () => api.inviteToClub(club.id, handle))}
                    disabled={busy !== null || refreshing}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
                  >
                    <span className="truncate">{club.name}</span>
                    <span className="ml-auto shrink-0 text-xs uppercase text-muted-foreground">
                      {club.tag}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* **O teto do outro lado desliga o convite dizendo por quê** · controle
          inerte sem explicação lê como tela quebrada, e aqui a razão é do
          player, não sua. */}
      {!targets.targetHasRoom && invitable.length > 0 && (
        <span className="text-xs text-muted-foreground">{t('player.inviteNoRoomHint')}</span>
      )}

      {/* **Os três estados são selos, e não frases soltas** · eles eram texto
          cru com um botão de link do lado, fora da identidade do produto e
          quebrando o alinhamento no celular, onde a linha não cabia. Apontado
          pelo Eduardo em 09/08/2026.

          **A saída continua sendo um botão de verdade** · ela some dentro do
          selo, mas o alvo é o botão, com rótulo acessível próprio.

          **O ícone não se explica sozinho, e por isso a frase inteira vai no
          `title`** · avião de papel, visto e relógio são convenção fraca, e num
          card de estranhos ninguém para pra decifrar desenho. É a mesma regra do
          `Badge`: o ícone encurta o rótulo, não substitui. */}
      {invited.map((club) => (
        <Badge
          key={club.id}
          variant="success"
          size="md"
          icon={Send}
          className="max-w-full"
          title={t('player.inviteSentTo', { club: club.name })}
        >
          <span className="truncate">{club.name}</span>
          <button
            type="button"
            onClick={() => void act(club.id, () => api.cancelClubInvite(club.id, targets.targetId))}
            disabled={busy !== null || refreshing}
            aria-label={t('club.inviteCancel')}
            title={t('club.inviteCancel')}
            className="-mr-1 ml-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors hover:bg-primary/20 disabled:opacity-50"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </Badge>
      ))}

      {member.map((club) => (
        <Badge
          key={club.id}
          size="md"
          icon={Check}
          className="max-w-full"
          title={t('player.alreadyMemberOf', { club: club.name })}
        >
          <span className="truncate">{club.name}</span>
        </Badge>
      ))}

      {pending.map((club) => (
        <Badge
          key={club.id}
          size="md"
          icon={Clock}
          className="max-w-full"
          title={t('player.askedToJoin', { club: club.name })}
        >
          <span className="truncate">{club.name}</span>
        </Badge>
      ))}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
