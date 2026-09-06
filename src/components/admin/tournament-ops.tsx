import { OpsBrowse } from '@/components/admin/ops-browse';
import { roundNamer } from '@/lib/round-name';
import type { MatchCard } from '@ggclubs/schemas';
import { ImageViewer, useImageViewer } from '@/components/ui/image-viewer';
import { TOURNAMENT_EVENT, tournamentTopic } from '@ggclubs/schemas';
import { useLiveQuery } from '@/lib/realtime/use-live-query';
import { DisputeCard } from '@/components/admin/match-decision';
import { GoalsInput, PenaltiesFields } from '@/components/admin/match-decision-fields';
import {
  CLOSE_REASON_MAX,
  CLOSE_REASON_MIN,
  CLUB_TAG_MAX,
  COURTESY_REASON_MAX,
  COURTESY_REASON_MIN,
  capacityOf,
  needsShootout,
  paymentsOverCapacity,
} from '@ggclubs/schemas';
import { Banknote, Gift, Hourglass, Scale, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LazyPanel } from '@/components/ui/lazy-panel';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  api,
  type AdminCourtesyRecord,
  type AdminPaymentRecord,
  type DisputedMatchRecord,
  type PendingMatchRecord,
  type RegistrationCard,
  type TournamentRecord,
} from '@/lib/api';
import { WarningNote } from '@/components/ui/warning-note';
import { apiErrorMessage } from '@/lib/api-error';
import { formatPrice } from '@/lib/format';
import { isGoals, shootoutDecided } from '@/lib/goals';
import { useResource } from '@/lib/use-resource';
import { relativeTime } from '@/lib/relative-time';

/**
 * **Os painéis com que a organização OPERA uma edição.**
 *
 * Eles moravam dentro do cartão da lista de campeonatos, e saíram de lá em
 * 19/08/2026 com a tela da edição (pendência 103): a lista responde *"qual
 * edição?"*, e operar é outra pergunta · três painéis empilhados dentro de um
 * item de lista faziam a lista deixar de ser lista.
 *
 * Eles continuam sendo **peças**, e não uma tela: quem compõe é
 * `pages/admin/tournament-detail.tsx`.
 */

/**
 * Os inscritos de uma edição, com a porta de tirar · **e ela carrega sob
 * demanda.**
 *
 * A lista do admin mostra várias edições, e buscar os inscritos de todas na
 * carga da tela seria uma consulta por edição pra desenhar uma lista que quase
 * nunca é aberta. **Abrir é a intenção**, e é ela que paga a busca.
 *
 * **Tirar um club é a ferramenta da escada rígida** · com 41 confirmados num
 * degrau de 32, o sorteio recusa e é aqui que o admin resolve. O dinheiro **não
 * volta sozinho** · o aviso na tela diz isso, porque quem aperta precisa saber
 * antes e não depois.
 */
export function RegistrationsPanel({
  tournament,
  onChanged,
}: {
  tournament: TournamentRecord;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  /** O club que a confirmação está perguntando sobre · `null` é diálogo fechado. */
  const [asking, setAsking] = useState<RegistrationCard | null>(null);
  const [alsoRefund, setAlsoRefund] = useState(false);
  /**
   * **O formulário de dar vaga** · pendência 191.
   *
   * Ele mora aqui, e não no painel do dinheiro, porque cortesia é **vaga**: o
   * que ela muda é quem está dentro, e não quanto entrou.
   */
  const [grantTag, setGrantTag] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [granting, setGranting] = useState(false);
  const [grantFailure, setGrantFailure] = useState<string | null>(null);

  /**
   * **O dinheiro de cada club, pra oferecer a devolução ao remover** ·
   * pendência 169.
   *
   * O painel só conhecia as inscrições, e por isso a única resposta que ele
   * sabia dar sobre um club pago era um aviso em prosa (*"o reembolso é feito
   * por você"*) apontando pra outro painel. Com esta busca, remover **oferece**
   * devolver, e é a mesma rota que o painel irmão já usa.
   *
   * **Falhar aqui é silêncio** · sem a lista, o diálogo simplesmente não oferece
   * a devolução, e remover continua funcionando. Oferta a menos é pior que
   * painel quebrado.
   */
  const { data: money, reload: reloadPayments } = useResource(
    (signal) => api.adminListPayments(tournament._id, { signal }),
    [tournament._id],
  );
  useLiveQuery(
    tournamentTopic(tournament._id),
    [TOURNAMENT_EVENT.registrations, TOURNAMENT_EVENT.payment],
    reloadPayments,
  );
  const payments = money?.payments ?? [];
  /** As vagas dadas · vieram na mesma resposta dos pagamentos, e o porquê está na rota. */
  const courtesies = money?.courtesies ?? [];
  const paidOf = (tag: string) =>
    payments.find((row) => row.clubTag === tag && row.status === 'approved') ?? null;
  const courtesyOf = (tag: string) => courtesies.find((row) => row.clubTag === tag) ?? null;
  /**
   * **Quem passou do teto** · a mesma conta do painel irmão, e ela decide o
   * motivo do estorno. A regra mora no schema, com teste.
   *
   * **A cortesia entra na conta** · pendência 191. Ela ocupa degrau sem
   * aparecer entre os pagamentos, então sem ela aqui o excedente seria contado
   * contra um teto que já tem vaga dada dentro.
   */
  const overCapacity = new Set(
    paymentsOverCapacity(payments, capacityOf(tournament), courtesies.length),
  );

  const load = useCallback(
    async (signal: AbortSignal) =>
      (await api.getTournament(tournament.slug, { signal })).registrations,
    [tournament.slug],
  );

  async function remove(tag: string, reload: () => void) {
    setBusy(tag);
    setFailure(null);
    try {
      /**
       * **Uma chamada só, como o painel irmão** · pendência 182, e este lado
       * ficou pra trás por algumas horas.
       *
       * Encadear as duas rotas no cliente tem dois defeitos que só aparecem
       * quando a segunda falha: o admin fica com o dinheiro devolvido e **sem
       * conseguir remover** (o segundo clique refaz o estorno, que responde
       * `PAYMENT_NOT_REFUNDABLE` antes de chegar na remoção), e o aviso de
       * reembolso sai **antes** da remoção, sem poder dizer se o club saiu.
       * Quem é dono da ordem é o servidor.
       *
       * **E o motivo do estorno vem do mesmo cálculo do painel irmão** · sem
       * isso, tirar um club **excedente do degrau** por aqui mandava `admin`, e
       * a pessoa lia *"o valor foi devolvido"* em vez da frase que explica que
       * a edição encheu antes de o pagamento dela confirmar · a mesma operação
       * com duas explicações, e faltando justamente a que a justifica.
       */
      const paid = paidOf(tag);
      if (alsoRefund && paid) {
        await api.adminRefundPayment(paid.paymentId, {
          reason: overCapacity.has(paid.paymentId)
            ? 'over-capacity'
            : tournament.status === 'cancelled'
              ? 'tournament-cancelled'
              : 'admin',
          alsoRemove: true,
        });
      } else {
        await api.adminRemoveRegistration(tournament._id, tag);
      }
      reload();
      /**
       * **A lista de pagamentos também**, e sem isto ela nunca recarregava.
       *
       * Ela depende só do id da edição, então o painel montado desde a abertura
       * da tela mostrava para sempre o retrato do primeiro carregamento · um
       * reembolso feito no painel irmão deixava aqui um pagamento `approved`
       * que já tinha voltado, o diálogo oferecia devolver **de novo**, e a rota
       * respondia `PAYMENT_NOT_REFUNDABLE` antes de o club ser removido.
       */
      reloadPayments();
      // O contador da edição mudou · quem redesenha o cabeçalho é a lista de
      // cima, e ela não sabe disso sozinha.
      onChanged();
    } catch (err) {
      setFailure(apiErrorMessage(err, t));
    } finally {
      setBusy(null);
      setAsking(null);
      setAlsoRefund(false);
    }
  }

  async function grant(reload: () => void): Promise<void> {
    setGranting(true);
    setGrantFailure(null);
    try {
      await api.adminGrantCourtesy(tournament._id, {
        clubTag: grantTag.trim().toLowerCase(),
        reason: grantReason.trim(),
      });
      setGrantTag('');
      setGrantReason('');
      reload();
      // A lista de cortesias vive na resposta dos pagamentos · sem isto o selo
      // só apareceria na próxima montagem da tela.
      reloadPayments();
      // O contador da edição mudou · quem redesenha o cabeçalho é a página.
      onChanged();
    } catch (err) {
      setGrantFailure(apiErrorMessage(err, t));
    } finally {
      setGranting(false);
    }
  }

  return (
    <LazyPanel<RegistrationCard>
      openLabel={t('admin.tournaments.hideEntries')}
      closedLabel={t('admin.tournaments.showEntries')}
      load={load}
      live={{
        topic: tournamentTopic(tournament._id),
        events: [
          TOURNAMENT_EVENT.registrations,
          TOURNAMENT_EVENT.payment,
          TOURNAMENT_EVENT.matches,
          TOURNAMENT_EVENT.status,
        ],
      }}
      hint={
        <p className="mt-2 text-xs text-muted-foreground">{t('admin.tournaments.removeHint')}</p>
      }
      footer={(reload) => (
        <div className="mt-3 rounded-lg border border-border bg-card/60 p-3">
          <p className="text-sm font-medium text-foreground">
            {t('admin.tournaments.grantCourtesy')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('admin.tournaments.grantCourtesyHint', {
              min: COURTESY_REASON_MIN,
              max: COURTESY_REASON_MAX,
            })}
          </p>
          {grantFailure && <p className="mt-2 text-sm text-destructive">{grantFailure}</p>}
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div className="min-w-0">
              <label
                htmlFor="courtesy-tag"
                className="mb-1 block text-[11px] text-muted-foreground"
              >
                {t('admin.tournaments.courtesyTagLabel')}
              </label>
              <Input
                id="courtesy-tag"
                value={grantTag}
                disabled={granting}
                autoComplete="off"
                maxLength={CLUB_TAG_MAX}
                className="h-10 w-40"
                onChange={(e) => setGrantTag(e.target.value)}
              />
            </div>
            <div className="min-w-0 flex-1">
              <label
                htmlFor="courtesy-reason"
                className="mb-1 block text-[11px] text-muted-foreground"
              >
                {t('admin.tournaments.courtesyReasonLabel')}
              </label>
              <Input
                id="courtesy-reason"
                value={grantReason}
                disabled={granting}
                autoComplete="off"
                // O teto sai da constante do schema · número escrito aqui é
                // número que diverge do que a API aceita.
                maxLength={COURTESY_REASON_MAX}
                placeholder={t('admin.tournaments.courtesyReasonPlaceholder')}
                className="h-10 w-full"
                onChange={(e) => setGrantReason(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={
                granting ||
                grantTag.trim().length === 0 ||
                grantReason.trim().length < COURTESY_REASON_MIN
              }
              onClick={() => void grant(reload)}
            >
              <Gift className="mr-1.5 h-3.5 w-3.5" />
              {granting
                ? t('admin.tournaments.grantingCourtesy')
                : t('admin.tournaments.grantCourtesyAction')}
            </Button>
          </div>
        </div>
      )}
    >
      {(rows, reload) => (
        <>
          {/* A falha de **remover** é desta tela, e não da busca · a do painel
              mora no `LazyPanel`. São duas coisas que falham por motivos
              diferentes, e juntá-las faria um erro apagar o outro. */}
          {failure && <p className="mt-2 text-sm text-destructive">{failure}</p>}
          <OpsBrowse
            rows={rows}
            nameOf={(row) => `${row.club.name} ${row.club.tag}`}
            stateOf={(row) => row.status}
            allLabel={t('competitionUx.allEntries')}
            options={[
              { value: 'confirmed', label: t('competitionUx.confirmed') },
              { value: 'reserved', label: t('competitionUx.reserved') },
            ]}
            totals={[
              {
                label: t('competitionUx.confirmed'),
                value: rows.filter((row) => row.status === 'confirmed').length,
              },
              {
                label: t('competitionUx.reserved'),
                value: rows.filter((row) => row.status === 'reserved').length,
              },
              {
                label: t('competitionUx.free'),
                value: Math.max(0, capacityOf(tournament) - rows.length),
              },
            ]}
          >
            {(visible) => (
              <ul className="mt-2 space-y-1.5">
                {visible.map((row) => {
                  /**
                   * **A marca de cortesia, com o motivo junto** · é o ponto inteiro
                   * da pendência 191: quem abrir esta lista daqui a um mês precisa
                   * ler *por que* aquele club está dentro sem ter pago, em vez de
                   * contar vagas contra pagamentos e concluir que há um defeito.
                   */
                  const given = courtesyOf(row.club.tag);
                  return (
                    <li
                      key={row._id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                        {row.club.name}
                      </span>
                      {row.status === 'reserved' && (
                        <Badge variant="warning" size="sm">
                          {t('tournament.registrationReserved')}
                        </Badge>
                      )}
                      {given && (
                        <Badge variant="brand" size="sm">
                          {t('admin.tournaments.courtesyBadge')}
                        </Badge>
                      )}
                      {/**
                       * **Com dinheiro no meio, a remoção passa por uma pergunta** ·
                       * pendência 169. Sem dinheiro ela segue direto, como sempre
                       * seguiu: confirmar o que não tem consequência é cerimônia.
                       */}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === row.club.tag}
                        onClick={() => {
                          if (paidOf(row.club.tag)) setAsking(row);
                          else void remove(row.club.tag, reload);
                        }}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        {t('admin.tournaments.removeEntry')}
                      </Button>
                      {/* **O motivo em linha própria** · ele é frase, e espremê-lo
                      entre selo e botão o truncaria justamente onde ele explica. */}
                      {given && (
                        <p className="w-full text-xs text-muted-foreground">
                          {t('admin.tournaments.courtesyNote', { reason: given.reason })}
                          {given.grantedByHandle
                            ? ` · ${t('admin.tournaments.courtesyBy', { handle: given.grantedByHandle })}`
                            : ''}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </OpsBrowse>

          <ConfirmDialog
            open={asking !== null}
            onOpenChange={(next) => {
              if (!next) {
                setAsking(null);
                setAlsoRefund(false);
              }
            }}
            tone="destructive"
            title={t('admin.tournaments.removeTitle', { club: asking?.club.name ?? '' })}
            description={t('admin.tournaments.removeBody')}
            body={
              <CrossOffer
                id="remove-also-refund"
                checked={alsoRefund}
                onChange={setAlsoRefund}
                label={t('admin.tournaments.removeAlsoRefund', {
                  value: formatPrice((asking && paidOf(asking.club.tag)?.amountCents) || 0),
                })}
                hint={t('admin.tournaments.removeAlsoRefundHint')}
                disabled={busy !== null}
              />
            }
            confirmLabel={t('admin.tournaments.removeEntry')}
            confirmDisabled={busy !== null}
            onConfirm={async () => {
              if (asking) await remove(asking.club.tag, reload);
            }}
          />
        </>
      )}
    </LazyPanel>
  );
}

/**
 * As partidas em disputa · **a única saída desse estado, e ela é do admin.**
 *
 * Quando as duas declarações não batem, a partida para: o placar continua nulo,
 * as duas versões ficam gravadas com os dois prints, e os dois clubs recebem
 * aviso de que a organização decide. **Este painel é essa decisão.**
 *
 * **Os dois prints aparecem lado a lado, e é o ponto da tela** · decidir sem ver
 * as duas provas é adivinhar, e adivinhar num campeonato com premiação é o que a
 * operação por foto no grupo já faz. É a única tela do produto que mostra o
 * placar declarado por um lado só · em todas as outras ele fica escondido pra o
 * adversário não copiar o número.
 *
 * **Carrega sob demanda**, como a lista de inscritos: a tela mostra várias
 * edições e quase nenhuma tem disputa aberta.
 */
/**
 * **O dinheiro da edição, e a porta de devolver** · pendência 88, 19/08/2026.
 *
 * Até aqui o produto **tratava o dinheiro que voltava e não sabia pedir que ele
 * voltasse**: devolver era ir ao painel do Mercado Pago, achar a cobrança e
 * estornar na mão, uma por club. Numa edição cancelada com gente que pagou, isso
 * é trabalho manual proporcional ao sucesso da edição.
 *
 * **O motivo é obrigatório**, e é o que separa este estorno do que chega do
 * painel deles · lá ninguém nos diz nada, e o documento fica com o motivo em
 * branco de propósito. Aqui alguém decidiu, e a decisão tem autor.
 *
 * **A confirmação não é cerimônia** · devolver dinheiro não tem desfazer, e a
 * linha já não pode ser pedida duas vezes (o segundo pedido bate em
 * `PAYMENT_NOT_REFUNDABLE`), mas o primeiro é irreversível.
 */
export function PaymentsPanel({
  tournament,
  count,
}: {
  tournament: TournamentRecord;
  /** Quantas linhas de dinheiro · vem de fora, como nos irmãos. */
  count?: number;
}) {
  const { t } = useTranslation();
  /** A falha de **devolver** · a da busca mora no `LazyPanel`. */
  const [failure, setFailure] = useState<string | null>(null);
  const [asking, setAsking] = useState<AdminPaymentRecord | null>(null);
  /**
   * **A oferta da outra ação** · pendência 169, decisão do Eduardo em
   * 02/09/2026: *"se for remover direto e tiver pago, pergunta se vai reembolsar
   * (opcional), e vice-versa"*.
   *
   * Ela nasce **desmarcada** de propósito · devolver o dinheiro deixou de tirar
   * o club sozinho, e o padrão de uma caixa que remove alguém de um campeonato
   * não pode ser "sim".
   *
   * **Menos num caso, e ele é o motivo de o reembolso existir aqui:** o
   * excedente do degrau. Com 33 confirmados num degrau de 32 o sorteio recusa
   * (`leftovers: 33/32`), e era o reembolso que trazia a conta de volta ·
   * desacoplar as duas ações deixou a edição travada até alguém remover na mão,
   * enquanto o e-mail já tinha dito ao club que a vaga era de quem confirma
   * primeiro. Aí ela **nasce marcada**, e desmarcar continua sendo do admin.
   */
  const [alsoRemove, setAlsoRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  /**
   * **Depois do sorteio não dá pra tirar ninguém** · o `removeRegistration`
   * recusa com `already-drawn`, porque um club fora de um grupo já montado deixa
   * partida apontando pra quem não está mais na edição. Oferecer a caixa ali era
   * a tela prometendo o que a rota recusa.
   */
  const canRemove = tournament.status !== 'drawn' && !tournament.drawnAt;

  /**
   * **As vagas dadas, da mesma resposta dos pagamentos** · pendência 191.
   *
   * Elas ficam em estado à parte porque o `LazyPanel` desenha **uma** lista, e
   * a lista desta mesa é a do dinheiro · cortesia não é linha de dinheiro, e
   * pôr as duas juntas seria a mesa afirmando que uma vaga dada é receita.
   *
   * **Vem da mesma chamada, e é isso que importa** · a conta do excedente
   * precisa das duas no mesmo instante, e uma segunda busca daria duas fotos.
   */
  const [courtesies, setCourtesies] = useState<AdminCourtesyRecord[]>([]);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const money = await api.adminListPayments(tournament._id, { signal });
      // **`?? []` porque a lista é nova** · durante um deploy, a web já
      // atualizada conversa com a API anterior por alguns minutos, e ali a
      // chave não vem. Uma mesa sem a linha de cortesia é bem melhor que uma
      // mesa que não desenha.
      setCourtesies(money.courtesies ?? []);
      return money.payments;
    },
    [tournament._id],
  );

  return (
    <LazyPanel<AdminPaymentRecord>
      openLabel={t('admin.tournaments.hidePayments')}
      closedLabel={
        count === undefined
          ? t('admin.tournaments.showPayments')
          : t('admin.tournaments.showPaymentsCount', { count })
      }
      icon={<Banknote className="mr-1.5 h-3.5 w-3.5" />}
      load={load}
      live={{
        topic: tournamentTopic(tournament._id),
        events: [
          TOURNAMENT_EVENT.registrations,
          TOURNAMENT_EVENT.payment,
          TOURNAMENT_EVENT.matches,
          TOURNAMENT_EVENT.status,
        ],
      }}
      empty={
        <p className="mt-2 text-xs text-muted-foreground">{t('admin.tournaments.noPayments')}</p>
      }
    >
      {(rows, reload) => {
        // A regra mora no schema, com teste · aqui só a ordem de desenho.
        // **A cortesia ocupa degrau sem aparecer aqui**, e por isso ela entra
        // na conta · ver o `paymentsOverCapacity`.
        const overCapacity = new Set(
          paymentsOverCapacity(rows, capacityOf(tournament), courtesies.length),
        );
        const inLine = rows
          .filter((row) => row.status === 'approved')
          .sort((left, right) => (left.paidAt ?? '').localeCompare(right.paidAt ?? ''));
        const ordered = [...inLine, ...rows.filter((row) => row.status !== 'approved')];

        return (
          <>
            {failure && <p className="mt-2 text-sm text-destructive">{failure}</p>}
            {/**
             * **A linha que responde "17 vagas contra 16 pagamentos"** ·
             * pendência 191. Foi essa diferença que virou leitura de defeito no
             * dia da estreia, e a mesa do dinheiro é onde ela aparece.
             */}
            {courtesies.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t('admin.tournaments.courtesyInMoney', { count: courtesies.length })}
              </p>
            )}
            {overCapacity.size > 0 && (
              <WarningNote icon={null} className="mt-2 px-3 py-2">
                {t('admin.tournaments.overCapacityHint', { count: overCapacity.size })}
              </WarningNote>
            )}
            <OpsBrowse
              rows={ordered}
              nameOf={(row) => `${row.clubName} ${row.clubTag}`}
              stateOf={(row) => row.status}
              allLabel={t('competitionUx.allPayments')}
              options={[
                { value: 'approved', label: t('competitionUx.approved') },
                { value: 'refunded', label: t('competitionUx.refunded') },
              ]}
              totals={[
                {
                  label: t('competitionUx.receivedTotal'),
                  value: formatPrice(rows.reduce((sum, row) => sum + row.amountCents, 0)),
                },
                {
                  label: t('competitionUx.refundedTotal'),
                  value: formatPrice(
                    rows
                      .filter((row) => row.status === 'refunded')
                      .reduce((sum, row) => sum + row.amountCents, 0),
                  ),
                },
                {
                  label: t('competitionUx.balance'),
                  value: formatPrice(
                    rows
                      .filter((row) => row.status === 'approved')
                      .reduce((sum, row) => sum + row.amountCents, 0),
                  ),
                },
              ]}
              note={t('competitionUx.balanceHelp')}
              stackTotals
            >
              {(visible) => (
                <ul className="mt-2 space-y-1.5">
                  {visible.map((row) => (
                    <li
                      key={row.paymentId}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5"
                    >
                      <span className="w-full min-w-0 break-words text-sm sm:w-auto sm:flex-1">
                        {row.clubName}
                      </span>
                      {overCapacity.has(row.paymentId) && (
                        <Badge variant="warning" size="sm">
                          {t('admin.tournaments.overCapacity')}
                        </Badge>
                      )}
                      <span className="font-display text-sm tabular-nums">
                        {formatPrice(row.amountCents)}
                      </span>
                      {/* **A chave é literal, e não montada** · o catálogo é tipado,
                    e `payment.method.${...}` uniria os parâmetros de todas as
                    chaves do i18next · é a mesma armadilha que a prévia do
                    documento legal registra. */}
                      <Badge variant={row.status === 'refunded' ? 'warning' : 'default'} size="sm">
                        {row.status === 'refunded'
                          ? t('admin.tournaments.paymentBack')
                          : t(
                              row.method === 'pix'
                                ? 'admin.tournaments.methodPix'
                                : 'admin.tournaments.methodCard',
                            )}
                      </Badge>
                      {/* **Só o que ainda é dinheiro nosso tem botão** · pedir de novo
                    bate em `PAYMENT_NOT_REFUNDABLE`, e oferecer a ação que vai
                    ser recusada é a tela mentindo sobre o que dá pra fazer. */}
                      {row.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-auto text-destructive hover:text-destructive"
                          onClick={() => {
                            setFailure(null);
                            // **Marcada só no excedente** · ver o `alsoRemove`.
                            setAlsoRemove(canRemove && overCapacity.has(row.paymentId));
                            setAsking(row);
                          }}
                        >
                          {t('admin.tournaments.refund')}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </OpsBrowse>

            <ConfirmDialog
              open={asking !== null}
              onOpenChange={(next) => {
                if (!next) setAsking(null);
              }}
              tone="destructive"
              title={t('admin.tournaments.refundTitle')}
              description={t('admin.tournaments.refundBody', {
                club: asking?.clubName ?? '',
                value: formatPrice(asking?.amountCents ?? 0),
              })}
              body={
                canRemove ? (
                  <CrossOffer
                    id="refund-also-remove"
                    checked={alsoRemove}
                    onChange={setAlsoRemove}
                    label={t('admin.tournaments.refundAlsoRemove', {
                      club: asking?.clubName ?? '',
                    })}
                    hint={t('admin.tournaments.refundAlsoRemoveHint')}
                    disabled={busy}
                  />
                ) : null
              }
              confirmLabel={t('admin.tournaments.refund')}
              confirmDisabled={busy}
              onConfirm={async () => {
                if (!asking) return;
                setBusy(true);
                try {
                  /**
                   * **`tournament-cancelled` quando a edição caiu, `admin` no
                   * resto** · os quatro motivos do schema existem pra a política,
                   * e este é o único que a tela sabe deduzir sozinha. Os outros
                   * dois (degrau que não fechou, club que não nasceu) são
                   * caminhos que o produto ainda não percorre.
                   */
                  /**
                   * **Uma chamada só, e a ordem é do servidor** · pendência 182.
                   *
                   * O cliente encadeava as duas rotas, e isso tinha dois
                   * defeitos que só apareciam quando a segunda falhava: o admin
                   * ficava com o dinheiro devolvido e **sem conseguir remover**
                   * (clicar de novo refazia o estorno, que aí responde
                   * `PAYMENT_NOT_REFUNDABLE` antes de chegar na remoção), e o
                   * aviso de reembolso saía **antes** da remoção, então ele não
                   * podia dizer se o club continuava na edição.
                   */
                  await api.adminRefundPayment(asking.paymentId, {
                    reason: overCapacity.has(asking.paymentId)
                      ? 'over-capacity'
                      : tournament.status === 'cancelled'
                        ? 'tournament-cancelled'
                        : 'admin',
                    ...(alsoRemove ? { alsoRemove: true } : {}),
                  });
                  setAsking(null);
                  setAlsoRemove(false);
                  reload();
                } catch (err) {
                  setFailure(apiErrorMessage(err, t));
                  throw err;
                } finally {
                  setBusy(false);
                }
              }}
            />
          </>
        );
      }}
    </LazyPanel>
  );
}

export function DisputesPanel({
  tournament,
  count,
  matches = [],
}: {
  tournament: TournamentRecord;
  matches?: MatchCard[];
  /**
   * **Quantas esperam ação** · vem de fora, do que a tela já tem em mãos.
   *
   * Sem o número no rótulo, saber se há o que fazer custa um clique e uma
   * consulta · e a resposta é *"nenhuma"* na maioria das vezes, que é justamente
   * quando o clique não deveria ter sido preciso. `undefined` mantém o rótulo
   * antigo, pra quem não sabe contar.
   */
  count?: number;
}) {
  const { t } = useTranslation();
  /** A falha de **decidir** · a da busca mora no `LazyPanel`. */
  const [failure, setFailure] = useState<string | null>(null);

  const load = useCallback(
    async (signal: AbortSignal) =>
      (await api.adminListDisputes(tournament._id, { signal })).matches,
    [tournament._id],
  );

  return (
    <LazyPanel<DisputedMatchRecord>
      openLabel={t('admin.tournaments.hideDisputes')}
      closedLabel={
        count === undefined
          ? t('admin.tournaments.showDisputes')
          : t('admin.tournaments.showDisputesCount', { count })
      }
      icon={<Scale className="mr-1.5 h-3.5 w-3.5" />}
      load={load}
      live={{
        topic: tournamentTopic(tournament._id),
        events: [
          TOURNAMENT_EVENT.registrations,
          TOURNAMENT_EVENT.payment,
          TOURNAMENT_EVENT.matches,
          TOURNAMENT_EVENT.status,
        ],
      }}
      /* **Vazio aqui é boa notícia** · e quem garante que ele não seja dito
         depois de uma falha é o `LazyPanel`. */
      empty={
        <p className="mt-2 text-xs text-muted-foreground">{t('admin.tournaments.noDisputes')}</p>
      }
    >
      {(rows, reload) => (
        <>
          {failure && <p className="mt-2 text-sm text-destructive">{failure}</p>}
          <div className="mt-2 space-y-3">
            {rows.map((match) => (
              <DisputeCard
                key={match._id}
                match={match}
                roundLabel={
                  matches.length
                    ? roundNamer(matches, t)(matches.find((one) => one._id === match._id) ?? match)
                    : undefined
                }
                onResolved={reload}
                onFailure={setFailure}
              />
            ))}
          </div>
        </>
      )}
    </LazyPanel>
  );
}

/**
 * Uma disputa · as duas versões, as duas provas, e o campo da decisão.
 *
 * **O placar decidido nasce vazio, e não pré-preenchido com uma das versões** ·
 * formulário que já vem com a versão do mandante é a tela sugerindo um lado, e o
 * admin apertando o botão sem ler. Aqui os dois números são um ato.
 */
/**
 * As partidas esperando a segunda declaração · **e o admin só olha.**
 *
 * Irmã do painel de disputa, com a diferença que importa: lá os dois clubs
 * falaram e discordaram, e a organização **decide**; aqui um falou e o outro
 * sumiu.
 *
 * **E nada fecha isso sozinho desde 22/08/2026** · esta linha dizia que a
 * varredura fechava em 24h, e as duas varreduras caíram naquele dia. A frase
 * sobreviveu à remoção, que é o defeito que o `CLAUDE.md` chama de mais caro
 * desta casa · pendência 180.
 *
 * **Sem botão, por decisão do Eduardo em 19/08/2026** · antecipar o fechamento
 * tiraria do club calado o direito de contestar dentro do prazo que ele tem. O
 * que faltava era **transparência**: uma partida parada não aparecia em tela
 * nenhuma, e quem organiza não tinha o que responder a *"declarei e não
 * fechou"*.
 */
export function PendingMatchesPanel({
  tournament,
  count,
}: {
  tournament: TournamentRecord;
  /** Ver `DisputesPanel` · a mesma leitura, do outro lado da mesa. */
  count?: number;
}) {
  const { t } = useTranslation();
  /** A falha de **encerrar** · a da busca mora no `LazyPanel`. */
  const [failure, setFailure] = useState<string | null>(null);

  const load = useCallback(
    async (signal: AbortSignal) =>
      (await api.adminListPendingMatches(tournament._id, { signal })).matches,
    [tournament._id],
  );

  return (
    <LazyPanel<PendingMatchRecord>
      openLabel={t('admin.tournaments.hidePending')}
      closedLabel={
        count === undefined
          ? t('admin.tournaments.showPending')
          : t('admin.tournaments.showPendingCount', { count })
      }
      icon={<Hourglass className="mr-1.5 h-3.5 w-3.5" />}
      load={load}
      live={{
        topic: tournamentTopic(tournament._id),
        events: [
          TOURNAMENT_EVENT.registrations,
          TOURNAMENT_EVENT.payment,
          TOURNAMENT_EVENT.matches,
          TOURNAMENT_EVENT.status,
        ],
      }}
      empty={
        <p className="mt-2 text-xs text-muted-foreground">{t('admin.tournaments.noPending')}</p>
      }
    >
      {(rows, reload) => (
        <>
          {failure && <p className="mt-2 text-sm text-destructive">{failure}</p>}
          <ul className="mt-2 space-y-2">
            {rows.map((match) => (
              <PendingMatchRow
                key={match._id}
                match={match}
                onClosed={reload}
                onFailure={setFailure}
              />
            ))}
          </ul>
        </>
      )}
    </LazyPanel>
  );
}

/**
 * Uma partida travada · **a prova, o relógio, e a porta de encerrar.**
 *
 * O que o admin faz aqui é **antecipar o prazo**, e não cravar placar · vale o
 * que o lado que falou declarou. Cravar número é da mesa de disputa, que tem as
 * **duas** versões · decidir com uma só é o que aquela mesa existe pra impedir.
 *
 * **O motivo é obrigatório**, e é a condição que o Eduardo pôs junto da decisão
 * (19/08/2026): quem ficou calado recebe um placar que não declarou, e a
 * pergunta seguinte é sempre *por quê*. Ele vai pro documento, pra linha da
 * chave e pra caixa de avisos dos dois clubs.
 */
function PendingMatchRow({
  match,
  onClosed,
  onFailure,
}: {
  match: PendingMatchRecord;
  onClosed: () => void;
  onFailure: (message: string | null) => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [closing, setClosing] = useState(false);
  /** Só a linha parada usa · lá o admin crava o placar, não valida um. */
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [homePens, setHomePens] = useState('');
  const [awayPens, setAwayPens] = useState('');
  const viewer = useImageViewer();

  /**
   * **Ninguém declarou** · o caso que trava uma edição, e que esta mesa não
   * enxergava até 22/08/2026.
   *
   * Ele muda o que a linha oferece: sem declaração não há o que **validar**, e o
   * que existe é **decidir** · placar e motivo, os dois de quem aperta.
   */
  const stuck = match.claim === null;
  const who = match.reportedBy === 'away' ? match.away : match.home;
  const owing = match.reportedBy === 'away' ? match.home : match.away;
  // O mesmo piso do schema · o botão não promete o que a rota recusa. Na linha
  // parada o placar entra na conta, porque ele também é obrigatório lá.
  /**
   * **A mesma pergunta que o servidor faz** · `needsShootout`, do schema. Esta
   * mesa gravava `penalties: null` fixo, então era a porta mais fácil de travar
   * a chave com um empate · pendência 173.
   */
  const needsPens =
    stuck &&
    isGoals(home) &&
    isGoals(away) &&
    needsShootout(match.phase, Number(home), Number(away));
  const pensOk = !needsPens || shootoutDecided(homePens, awayPens);
  const ready =
    reason.trim().length >= CLOSE_REASON_MIN &&
    (!stuck || (isGoals(home) && isGoals(away))) &&
    pensOk;

  async function close() {
    setClosing(true);
    onFailure(null);
    try {
      if (stuck) {
        await api.adminDecideMatch(match._id, {
          homeGoals: Number(home),
          awayGoals: Number(away),
          ...(needsPens
            ? { homePenalties: Number(homePens), awayPenalties: Number(awayPens) }
            : {}),
          reason: reason.trim(),
        });
      } else {
        await api.adminCloseMatch(match._id, { reason: reason.trim() });
      }
      onClosed();
    } catch (err) {
      onFailure(apiErrorMessage(err, t));
    } finally {
      setClosing(false);
    }
  }

  return (
    <li className="rounded-lg border border-border/60 p-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
          {t('tournament.roundName', { round: match.round })}
          {match.groupIndex !== null &&
            ` · ${t('tournament.groupName', { name: groupLetterOf(match.groupIndex) })}`}
        </span>
        <span className="min-w-0 flex-1 truncate text-foreground">
          {match.claim
            ? t('admin.tournaments.pendingLine', {
                club: who.name,
                home: match.claim.homeGoals,
                away: match.claim.awayGoals,
                rival: owing.name,
              })
            : t('admin.tournaments.stuckLine', {
                home: match.home.name,
                away: match.away.name,
              })}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {/* **Duas chaves porque as duas linhas contam coisas diferentes** ·
              uma tem placar esperando resposta, a outra não tem placar nenhum.
              Nenhuma das duas fecha sozinha desde 22/08/2026 · o prazo só diz
              quando a partida chegou nesta mesa. */}
          {stuck
            ? /**
               * **A linha parada conta do HORÁRIO, e não do prazo** · pendência
               * 175. O `deadline` da linha sem declaração é kickoff mais 30
               * minutos, então entre o horário e o prazo a frase dizia *parada
               * em 20 minutos* · futuro descrito como passado.
               *
               * A partida está parada desde o horário marcado, e é isso que o
               * organizador precisa ler.
               */
              t('admin.tournaments.stuckSince', { when: relativeTime(match.scheduledAt) })
            : t('admin.tournaments.pendingDeadline', { when: relativeTime(match.deadline) })}
        </span>
      </div>

      {/* **A prova, e no visualizador da casa** · quem valida um placar antes do
          prazo precisa ver o que está validando, e desde 19/08/2026 isso abre
          **dentro do site** em vez de numa aba nova · pedido do Eduardo, e vale
          igual aqui e na chave. `object-contain` porque o print deixou de ser
          recortado no upload: ele pode ser uma faixa. */}
      {/**
       * **A declaração de W.O. não tem print, e a mesa diz isso em vez de
       * desenhar uma imagem quebrada** · *não se fotografa a ausência de
       * alguém*. O que o admin precisa ler ali é **o que foi declarado**, e é
       * essa frase que substitui a prova.
       */}
      {!match.claim ? (
        /**
         * **Ninguém declarou nada** · e a mesa diz isso em vez de desenhar uma
         * caixa vazia. É a linha que trava uma edição: no mata-mata ela não
         * fecha sozinha, porque de um 0-0 sem vencedor não há quem avance.
         */
        <WarningNote icon={null} className="mt-2 px-3 py-2">
          {t('admin.tournaments.stuckHint')}
        </WarningNote>
      ) : match.claim.shotUrl ? (
        <>
          <button
            type="button"
            onClick={() => viewer.open(0)}
            className="mt-2 block w-full max-w-sm overflow-hidden rounded-md border border-border/60 transition-colors hover:border-primary/40"
          >
            <img
              src={match.claim.shotUrl}
              alt={t('admin.tournaments.pendingShotAlt', { club: who.name })}
              className="aspect-video w-full bg-background object-contain"
              loading="lazy"
            />
          </button>

          <ImageViewer
            images={[
              {
                url: match.claim.shotUrl,
                caption: t('admin.tournaments.pendingShotAlt', { club: who.name }),
                detail: t('tournament.shotScore', {
                  home: match.claim.homeGoals,
                  away: match.claim.awayGoals,
                  homeClub: match.home.name,
                  awayClub: match.away.name,
                }),
              },
            ]}
            index={viewer.index}
            onIndexChange={viewer.move}
            onClose={viewer.close}
          />
        </>
      ) : (
        <WarningNote icon={null} className="mt-2 max-w-sm px-3 py-2">
          {match.claim.noShow
            ? t('admin.tournaments.pendingWalkover', {
                club: match.claim.noShow === 'home' ? match.home.name : match.away.name,
              })
            : t('admin.tournaments.pendingNoShot')}
        </WarningNote>
      )}

      {/**
       * **O placar só existe na linha parada** · nas outras vale o que foi
       * declarado, e cravar número ali seria o admin decidindo com uma versão
       * só · é o que a mesa de disputa existe pra impedir.
       */}
      {stuck && (
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <GoalsInput
            id={`stuck-home-${match._id}`}
            label={match.home.name}
            value={home}
            onChange={setHome}
            disabled={closing}
          />
          <GoalsInput
            id={`stuck-away-${match._id}`}
            label={match.away.name}
            value={away}
            onChange={setAway}
            disabled={closing}
          />
          {needsPens && (
            <PenaltiesFields
              idPrefix={`stuck-${match._id}`}
              home={match.home.name}
              away={match.away.name}
              homePens={homePens}
              awayPens={awayPens}
              onHome={setHomePens}
              onAway={setAwayPens}
              disabled={closing}
            />
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={CLOSE_REASON_MAX}
          placeholder={t(
            stuck
              ? 'admin.tournaments.stuckReasonPlaceholder'
              : 'admin.tournaments.pendingReasonPlaceholder',
          )}
          className="h-9 min-w-0 flex-1"
        />
        {/* **Desligado diz por quê** · é a regra do `design.md`, e aqui ela
            evita o clique que a rota recusaria. */}
        <Button
          size="sm"
          variant="outline"
          disabled={!ready || closing}
          onClick={() => void close()}
        >
          {closing
            ? t('admin.tournaments.pendingClosing')
            : stuck
              ? t('admin.tournaments.stuckDecide')
              : t('admin.tournaments.pendingClose')}
        </Button>
      </div>

      {/* **A frase saiu do `title` em 02/09/2026**, e o motivo está medido no
          `DisputeCard`: a base do `buttonVariants` carrega
          `disabled:pointer-events-none`, então botão desligado não recebe
          `hover` e o `title` **nunca é lido**. A mesa irmã já tinha aprendido
          isso; esta ficou pra trás, e com a trava dos pênaltis o aviso passou a
          ter três motivos em vez de um. */}
      {!ready && !closing && (
        <p className="mt-2 text-[11px] text-amber-400">
          {reason.trim().length < CLOSE_REASON_MIN
            ? t('admin.tournaments.pendingReasonHint')
            : stuck && (!isGoals(home) || !isGoals(away))
              ? t('admin.tournaments.resolveHint')
              : t('admin.tournaments.resolvePenaltiesHint')}
        </p>
      )}
    </li>
  );
}

/** A letra do grupo · o índice é o que o banco guarda, e a letra é rótulo. */
function groupLetterOf(index: number): string {
  return String.fromCharCode(65 + index);
}

/**
 * A disputa de pênaltis nas mesas do organizador · **a metade de tela da
 * pendência 173.**
 *
 * As duas mesas gravavam placar e **não tinham por onde dizer os pênaltis**,
 * então a organização cravava empate num mata-mata e a chave travava pra sempre.
 * O servidor passou a recusar; sem estes campos, ele recusaria e o admin ficaria
 * sem porta nenhuma.
 *
 * **Uma peça, dois chamadores** · o `design.md` manda extrair quando a segunda
 * cópia aparece, e aqui as duas nasceriam no mesmo commit.
 */
/**
 * A oferta da outra ação · **a peça da pendência 169.**
 *
 * Reembolsar e remover viraram duas ações independentes em 02/09/2026, e cada
 * uma oferece a outra **sem fazer sozinha**. Uma peça só porque são dois
 * chamadores nascendo no mesmo commit, e porque a diferença entre elas é só o
 * texto.
 */
function CrossOffer({
  id,
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint: string;
  disabled: boolean;
}) {
  return (
    <div className="mt-3 rounded-lg border border-border bg-card/60 p-3">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--brand))]"
        />
        <span className="text-sm text-foreground">{label}</span>
      </label>
      <p className="mt-1.5 pl-[26px] text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
