import type { TournamentChatRow } from '@ggclubs/schemas';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MatchChatDialog } from '@/components/chat/match-chat-dialog';
import { MatchCorrectionDialog } from '@/components/admin/match-correction-dialog';
import { matchStateText } from '@/components/chat/chat-format';
import { OptionGroup } from '@/components/ui/option-group';
import { SearchField } from '@/components/ui/search-field';
import { SelectField } from '@/components/ui/select-field';
import { SectionTitle } from '@/components/ui/section-title';
import { useChatParam } from '@/lib/chat-link';
import { roundNamer } from '@/lib/round-name';
import { cn } from '@/lib/utils';

/**
 * **A mesa de conversas da organização** · uma peça, dois lugares.
 *
 * **Ela mora na página da edição, e não numa tela própria** · a tela existiu
 * por uma hora e ele derrubou: *"como já tem os chats em
 * /admin/campeonatos/copa-2026, realmente precisa ter o /admin/conversas?"*.
 * O que sobrou dela é **uma linha no painel** pra quem chamou · ver o
 * `chatsCallingAdmin`.
 *
 * **Ela lista o que recebe, e não filtra por conta própria** · o recorte é
 * decisão de quem consulta.
 */
export type ChatDeskFilter = 'needsYou' | 'withChat' | 'all';

export function ChatDesk({
  rows,
  reload,
  emptyLabel,
}: {
  rows: TournamentChatRow[];
  /** A mesa reflete o que a organização acabou de fazer · trancar muda a linha. */
  reload: () => void;
  emptyLabel: string;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<ChatDeskFilter>('needsYou');
  /**
   * **Tres eixos, e nao um menu de sete opcoes** · pedido dele em 27/08/2026
   * (*"filtrar por rodada, partida encerrada ou nao, fase de grupos,
   * mata-mata"*), e a decisao de produto e que essas coisas **se cruzam**: uma
   * partida encerrada da semifinal que ainda espera decisao e as tres de uma
   * vez. Empilhar tudo num filtro so obrigaria a escolher qual pergunta fazer.
   *
   * - **situacao** e o que a organizacao precisa fazer
   * - **rodada** e onde ela esta olhando
   * - **estado** separa o que ainda vai acontecer do que virou arquivo
   */
  const [round, setRound] = useState('');
  const [state, setState] = useState('');
  const [term, setTerm] = useState('');
  const [reviewing, setReviewing] = useState<string | null>(null);
  const { openMatchId, openChat, closeChat } = useChatParam();
  const open = rows.find((row) => row.matchId === openMatchId) ?? null;
  const reviewingRow = rows.find((row) => row.matchId === reviewing);

  /**
   * **O padrão é "precisam de você"**, e o resto é um clique · quem abre a mesa
   * está procurando o que travou, e não navegando um arquivo de 72 linhas.
   */
  const needsYou = (row: TournamentChatRow) =>
    row.adminCalled || row.unread > 0 || row.locked || row.matchStatus === 'disputed';

  /**
   * **O nome da rodada, e ele depende da fase.**
   *
   * A lista dizia *"2ª rodada"* pra fase de grupos **e** pro mata-mata · duas
   * coisas diferentes com o mesmo nome, apontado por ele em 27/08/2026. Na
   * chave, quem nomeia a rodada é **quantos times estão nela**: quatro é
   * semifinal em qualquer campeonato do mundo, e a conta não envelhece quando a
   * chave mudar de tamanho. É a mesma regra do `knockout-bracket`.
   *
   * O tamanho da rodada sai das **próprias linhas** · a mesa recebe a edição
   * inteira, então contar os confrontos daquela rodada responde sem consulta
   * nova.
   */
  /**
   * **Grupos leva o nome da fase junto** · na mesa as duas convivem na mesma
   * lista, então "2ª rodada" sozinho não diz de qual delas é. Na chave o nome
   * já é único (semifinal, final), e repetir "mata-mata" seria ruído.
   */
  const roundName = useMemo(() => roundNamer(rows, t), [rows, t]);
  const nameOf = useCallback(
    (row: TournamentChatRow) =>
      row.phase === 'knockout'
        ? roundName(row)
        : `${t('admin.tournaments.chatPhaseGroups')} · ${roundName(row)}`,
    [roundName, t],
  );

  /**
   * **As rodadas saem das linhas, e nao de uma lista escrita a mao** · a edicao
   * de 48 clubs tem 3 rodadas de grupo e 5 de chave; a de 8 tem outras. Lista
   * fixa ofereceria rodada que nao existe naquela edicao.
   */
  const rounds = useMemo(() => {
    const seen = new Map<string, { value: string; label: string; order: number }>();
    for (const row of rows) {
      const value = roundKeyOf(row);
      if (seen.has(value)) continue;
      seen.set(value, {
        value,
        label: nameOf(row),
        order: (row.phase === 'knockout' ? 1000 : 0) + row.round,
      });
    }
    return [...seen.values()].sort((one, other) => one.order - other.order);
  }, [rows, nameOf]);

  const shown = useMemo(() => {
    const wanted = term.trim().toLowerCase();
    return rows.filter((row) => {
      if (wanted && !`${row.homeTag} ${row.awayTag}`.toLowerCase().includes(wanted)) return false;
      if (round && roundKeyOf(row) !== round) return false;
      if (state === 'open' && row.matchStatus !== 'scheduled') return false;
      if (state === 'disputed' && row.matchStatus !== 'disputed') return false;
      if (state === 'closed' && row.matchStatus !== 'played' && row.matchStatus !== 'walkover')
        return false;
      if (state === 'cancelled' && row.matchStatus !== 'cancelled') return false;
      if (filter === 'needsYou') return needsYou(row);
      if (filter === 'withChat') return row.messages > 0;
      return true;
    });
  }, [rows, filter, round, state, term]);

  const called = rows.filter((row) => row.adminCalled).length;

  return (
    <section className="mt-6">
      <SectionTitle
        meta={
          called > 0
            ? t('admin.tournaments.chatsCalled', { count: called })
            : t('admin.tournaments.chatsMeta', { count: rows.length })
        }
      >
        {t('admin.tournaments.chatsTitle')}
      </SectionTitle>

      <div className="mt-3 space-y-2">
        <OptionGroup
          name="chat-desk-filter"
          value={filter}
          onChange={(next) => setFilter(next ?? 'needsYou')}
          columns={3}
          options={[
            { value: 'needsYou', label: t('admin.tournaments.chatFilterNeedsYou') },
            { value: 'withChat', label: t('admin.tournaments.chatFilterWithChat') },
            { value: 'all', label: t('admin.tournaments.chatFilterAll') },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <SelectField
            label={t('admin.tournaments.chatRound')}
            value={round}
            onChange={setRound}
            allLabel={t('admin.tournaments.chatRoundAll')}
            options={rounds.map(({ value, label }) => ({ value, label }))}
            className="sm:flex-1"
          />
          <SelectField
            label={t('admin.tournaments.chatState')}
            value={state}
            onChange={setState}
            allLabel={t('admin.tournaments.chatStateAll')}
            options={[
              { value: 'open', label: t('admin.tournaments.chatStateOpen') },
              { value: 'disputed', label: t('chat.disputed') },
              { value: 'closed', label: t('admin.tournaments.chatStateClosed') },
              { value: 'cancelled', label: t('chat.cancelledMatch') },
            ]}
            className="sm:w-52"
          />
          <SearchField
            value={term}
            onChange={setTerm}
            label={t('admin.tournaments.chatSearch')}
            placeholder={t('admin.tournaments.chatSearch')}
            className="sm:w-56"
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="mt-3 rounded-xl border bg-card px-3 py-8 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {shown.map((row) => (
            <li key={row.matchId}>
              <button
                type="button"
                data-admin-chat={row.matchId}
                onClick={() => openChat(row.matchId)}
                className={cn(
                  'flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/50',
                  // **Quem chamou acende** · é a linha que a organização abriu a
                  // tela pra encontrar.
                  row.adminCalled && 'border-primary/50',
                )}
              >
                {row.adminCalled && (
                  <span className="text-[11px] uppercase tracking-widest text-primary">
                    {t('admin.tournaments.chatCalled')}
                  </span>
                )}
                {row.unread > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold leading-4 text-primary-foreground">
                    {row.unread > 9 ? '9+' : row.unread}
                  </span>
                )}
                {row.locked && (
                  <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    {t('admin.tournaments.chatLocked')}
                  </span>
                )}
                <span className="font-semibold uppercase">
                  {row.homeTag} × {row.awayTag}
                </span>
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  {nameOf(row)}
                </span>
                {/* **O estado da partida só aparece quando ela saiu do ar** ·
                    "agendada" em 69 linhas é ruído; "jogada" numa é informação. */}
                {row.matchStatus !== 'scheduled' && (
                  <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    {matchStateText(t, row.matchStatus)}
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {t('admin.tournaments.chatMessages', { count: row.messages })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <MatchChatDialog
          matchId={open.matchId}
          /**
           * **Esta mesa é da organização, então a sala abre por ela** · decisão
           * do Eduardo em 28/08/2026, e é o único lugar do produto que declara
           * este papel.
           *
           * Quem tem club na partida e abre daqui **age como organização e fica
           * marcado** · pelo `/app` a mesma conta entra como o club dela. Quem
           * confere que ela é da organização é o servidor.
           */
          as="admin"
          resultAction={open.matchStatus !== 'cancelled' ? { label: open.matchStatus === 'disputed' ? t('competitionUx.reviewResult') : t('correction.action'), onClick: () => setReviewing(open.matchId) } : undefined}
          home={{ tag: open.homeTag, crestUrl: null }}
          away={{ tag: open.awayTag, crestUrl: null }}
          about={{
            round: nameOf(open),
            scheduledAt: open.scheduledAt,
            status: open.matchStatus,
            result: open.result,
            claims: open.claims,
          }}
          open
          onOpenChange={(next) => {
            if (!next) {
              closeChat();
              reload();
            }
          }}
        />
      )}
      {reviewing && (
        <MatchCorrectionDialog
          matchId={reviewing}
          roundLabel={reviewingRow ? nameOf(reviewingRow) : ''}
          onClose={() => setReviewing(null)}
          onResolved={reload}
        />
      )}
    </section>
  );
}

/**
 * A chave da rodada no filtro · **e a disputa de terceiro é uma opção própria.**
 *
 * Ela mora na **mesma rodada da final**, então `fase:número` juntava as duas
 * numa entrada só, com o rótulo da primeira linha que aparecesse · quem filtra
 * está procurando **aquele** jogo, e não "os dois jogos do fim".
 *
 * Achado com a Copa de Estreia na tela, em 05/09/2026, junto do defeito que
 * fazia a final se chamar semifinal (ver o `roundNamer`).
 */
function roundKeyOf(row: { phase: string; round: number; thirdPlace?: boolean }): string {
  return row.thirdPlace ? `${row.phase}:${row.round}:third` : `${row.phase}:${row.round}`;
}
