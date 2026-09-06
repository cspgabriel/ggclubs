import {
  CLOSE_REASON_MAX,
  CLOSE_REASON_MIN,
  MAX_GOALS,
  WALKOVER_GOALS,
  needsShootout,
} from '@ggclubs/schemas';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/select-field';
import { ImageViewer, useImageViewer } from '@/components/ui/image-viewer';
import { TournamentScore } from '@/components/tournament/tournament-score';
import { GoalsInput, PenaltiesFields } from '@/components/admin/match-decision-fields';
import { api, type DisputedMatchRecord } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import { isGoals, shootoutDecided } from '@/lib/goals';
import { formatMatchTime } from '@/lib/tournament-format';

export function DisputeCard({
  match,
  onResolved,
  onFailure,
  roundLabel,
  correction,
}: {
  match: Omit<DisputedMatchRecord, 'homeClaim' | 'awayClaim'> & {
    homeClaim: DisputedMatchRecord['homeClaim'] | null;
    awayClaim: DisputedMatchRecord['awayClaim'] | null;
  };
  correction?: { version: string; disabled: boolean };
  onResolved: () => void;
  onFailure: (message: string | null) => void;
  roundLabel?: string;
}) {
  const { t } = useTranslation();
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [homePens, setHomePens] = useState('');
  const [awayPens, setAwayPens] = useState('');
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState('');
  const [walkover, setWalkover] = useState('');
  const viewer = useImageViewer();
  const [confirming, setConfirming] = useState(false);
  useEffect(
    () => setConfirming(false),
    [home, away, homePens, awayPens, walkover, reason, correction?.version],
  );

  /**
   * **A mesma pergunta que o servidor faz** · `needsShootout`, do schema.
   * O botão não promete o que a rota recusa · pendência 173.
   */
  const needsPens =
    !walkover &&
    isGoals(home) &&
    isGoals(away) &&
    needsShootout(match.phase, Number(home), Number(away));
  const pensOk = !needsPens || shootoutDecided(homePens, awayPens);
  const ready =
    (Boolean(walkover) || (isGoals(home) && isGoals(away) && pensOk)) &&
    reason.trim().length >= CLOSE_REASON_MIN;

  /**
   * **As provas que existem**, e não uma por lado.
   *
   * Desde o W.O. (22/08/2026) uma declaração pode não ter print · *não se
   * fotografa a ausência de alguém*. Montar a lista com dois itens fixos punha
   * uma imagem vazia no visualizador e, pior, **desalinhava o índice**: com a do
   * mandante ausente, clicar na do visitante abria a errada.
   */
  const shots = (
    [
      ['home', match.homeClaim, match.home.name] as const,
      ['away', match.awayClaim, match.away.name] as const,
    ] as const
  ).flatMap(([, claim, club]) =>
    claim?.shotUrl
      ? [
          {
            url: claim.shotUrl,
            caption: t('admin.tournaments.claimOf', { club }),
            detail: t('tournament.shotScore', {
              home: claim.homeGoals,
              away: claim.awayGoals,
              homeClub: match.home.name,
              awayClub: match.away.name,
            }),
          },
        ]
      : [],
  );
  /** Onde a prova daquele lado caiu na lista · `0` quando ela não existe. */
  const shotIndex = (side: 'home' | 'away') =>
    side === 'home' ? 0 : match.homeClaim?.shotUrl ? 1 : 0;
  /** Quem faltou, segundo aquela declaração · a frase que substitui a prova. */
  const walkoverLabel = (noShow: 'home' | 'away' | null) =>
    noShow
      ? t('admin.tournaments.claimWalkover', {
          club: noShow === 'home' ? match.home.name : match.away.name,
        })
      : '';

  async function resolve() {
    onFailure(null);
    setSaving(true);
    try {
      const input = {
        homeGoals: walkover ? (walkover === 'home' ? 0 : WALKOVER_GOALS) : Number(home),
        awayGoals: walkover ? (walkover === 'away' ? 0 : WALKOVER_GOALS) : Number(away),
        reason: reason.trim(),
        ...(walkover ? { walkoverAgainst: walkover as 'home' | 'away' } : {}),
        ...(needsPens ? { homePenalties: Number(homePens), awayPenalties: Number(awayPens) } : {}),
      };
      if (correction)
        await api.adminCorrectMatch(match._id, { ...input, version: correction.version });
      else await api.adminResolveMatch(match._id, input);
      onResolved();
    } catch (err) {
      onFailure(apiErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  }

  // **`amber-400` cru, e não um token `warning`** · ele não existe no Tailwind
  // daqui, e `border-warning/40` foi escrito, compilou, passou nos cinco checks
  // e **pintou zero pixel**. O padrão da casa pro aviso âmbar é este, e já
  // estava no aviso de tática mudada e no da tela de EA.
  return (
    <section className="rounded-lg border bg-card p-3 sm:p-4" onChange={() => setConfirming(false)}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="font-display text-sm uppercase text-foreground">
          {match.home.name} <span className="text-muted-foreground">×</span> {match.away.name}
        </p>
        {/* **A rodada e o horário juntos** · quem organiza precisa achar o jogo
            no calendário pra cruzar com o que os dois contaram, e o número da
            rodada sozinho não localiza nada numa edição de 18 partidas. */}
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {roundLabel ?? t('tournament.roundName', { round: match.round })} ·{' '}
          {formatMatchTime(match.scheduledAt)}
        </p>
      </div>

      {/* **As duas versões na mesma perspectiva** (mandante × visitante), que é a
          dos dois formulários · converter aqui seria a chance de o admin decidir
          um placar invertido. */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Claim
          who={t('admin.tournaments.claimOf', { club: match.home.name })}
          label={t('admin.tournaments.openShotOf', { club: match.home.name })}
          walkoverLabel={walkoverLabel(match.homeClaim?.noShow ?? null)}
          claim={match.homeClaim}
          onOpen={() => viewer.open(shotIndex('home'))}
        />
        <Claim
          who={t('admin.tournaments.claimOf', { club: match.away.name })}
          label={t('admin.tournaments.openShotOf', { club: match.away.name })}
          walkoverLabel={walkoverLabel(match.awayClaim?.noShow ?? null)}
          claim={match.awayClaim}
          onOpen={() => viewer.open(shotIndex('away'))}
        />
      </div>

      {/* **As duas provas no mesmo visualizador** · com a seta andando entre
          elas, que é o caso que mais pede: comparar as duas versões é
          literalmente o trabalho desta mesa. */}
      <ImageViewer
        images={shots}
        index={viewer.index}
        onIndexChange={viewer.move}
        onClose={viewer.close}
      />

      {/* **O bloco de baixo precisa se anunciar** · sem rótulo, dois campos de
          gols embaixo de duas declarações leem como uma terceira declaração. */}
      <p className="mt-3 border-t border-border/60 pt-3 text-[11px] uppercase tracking-wide text-muted-foreground">
        {correction ? t('correction.replacement') : t('admin.tournaments.resolveLabel')}
      </p>
      <SelectField
        className="mt-3"
        label={t('competitionUx.decisionType')}
        value={walkover}
        onChange={setWalkover}
        allLabel={t('competitionUx.playedResult')}
        options={[
          { value: 'home', label: t('competitionUx.absentClub', { club: match.home.name }) },
          { value: 'away', label: t('competitionUx.absentClub', { club: match.away.name }) },
        ]}
      />
      {walkover && (
        <p className="mt-2 text-sm text-primary">
          {t('competitionUx.walkoverResult', {
            home: walkover === 'home' ? 0 : WALKOVER_GOALS,
            away: walkover === 'away' ? 0 : WALKOVER_GOALS,
          })}
        </p>
      )}
      {!walkover && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <GoalsInput
            id={`resolve-home-${match._id}`}
            label={match.home.name}
            value={home}
            onChange={setHome}
            disabled={saving}
          />
          <GoalsInput
            id={`resolve-away-${match._id}`}
            label={match.away.name}
            value={away}
            onChange={setAway}
            disabled={saving}
          />

          {needsPens && (
            <PenaltiesFields
              idPrefix={`resolve-${match._id}`}
              home={match.home.name}
              away={match.away.name}
              homePens={homePens}
              awayPens={awayPens}
              onHome={setHomePens}
              onAway={setAwayPens}
              disabled={saving}
            />
          )}
        </div>
      )}
      <label
        className="mt-4 block text-xs text-muted-foreground"
        htmlFor={`decision-reason-${match._id}`}
      >
        {t('competitionUx.decisionReason')}
      </label>
      <textarea
        id={`decision-reason-${match._id}`}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={CLOSE_REASON_MAX}
        disabled={saving}
        rows={2}
        className="mt-1 w-full resize-y rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      />
      <p className="mt-1 text-xs text-muted-foreground">
        {correction ? t('correction.reasonHelp') : t('competitionUx.reasonHelp')}
      </p>
      {correction && confirming && (
        <p
          role="alert"
          className="mt-3 rounded-md border border-primary/40 bg-primary/5 p-3 text-xs"
        >
          {t('correction.confirmBody')}
        </p>
      )}
      <Button
        className="mt-4"
        size="sm"
        variant="cta"
        disabled={saving || !ready || correction?.disabled}
        onClick={() => (correction && !confirming ? setConfirming(true) : void resolve())}
      >
        {saving
          ? t('admin.tournaments.resolving')
          : correction
            ? confirming
              ? t('correction.confirm')
              : t('correction.save')
            : t('admin.tournaments.resolve')}
      </Button>

      {/* **Por que o botão está desligado, em texto que aparece.**
          A primeira versão punha isso num `title`, e ele **nunca é lido**: a base
          do `buttonVariants` carrega `disabled:pointer-events-none`, então o
          botão desabilitado não recebe `hover` nenhum. Medido com o Edge, não
          suposto · o `elementFromPoint` no centro dele devolve o `body`.

          E a frase precisa saber **qual** dos três motivos é o dela · "preencha
          os dois" seria mentira pra quem digitou 25, que é recusado pelo teto, e
          o teto seria mentira pra quem empatou o mata-mata e não disse os
          pênaltis. **Eram dois ramos até 02/09**, e o terceiro motivo nasceu com
          a trava dos pênaltis: quem digitava 2 e 2 numa partida de mata-mata via
          o botão morto sob a frase que fala do teto de gols. */}
      {!ready && !saving && (
        <p className="mt-2 text-[11px] text-amber-400">
          {reason.trim().length < CLOSE_REASON_MIN
            ? t('competitionUx.reasonRequired')
            : home === '' || away === ''
              ? t('admin.tournaments.resolveHint')
              : !isGoals(home) || !isGoals(away)
                ? t('admin.tournaments.resolveTooBig', { max: MAX_GOALS })
                : t('admin.tournaments.resolvePenaltiesHint')}
        </p>
      )}

      {/* **O que o botão faz, antes de ele ser apertado** · a decisão fecha a
          partida e avisa os dois clubs, e não tem desfazer nesta tela. */}
      <p className="mt-2 text-[11px] text-muted-foreground">
        {t('admin.tournaments.resolveWarning')}
      </p>
    </section>
  );
}

/** Uma das duas versões, com o print · **a prova abre em tamanho cheio.** */
function Claim({
  who,
  label,
  walkoverLabel,
  claim,
  onOpen,
}: {
  who: string;
  /** O nome do link da prova, pra quem não vê a imagem. */
  label: string;
  /** O que aparece no lugar da prova quando a declaração é de ausência. */
  walkoverLabel: string;
  claim: DisputedMatchRecord['homeClaim'] | null;
  /** Abre no visualizador da casa · desde 19/08/2026 a prova não tira ninguém do site. */
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  if (!claim)
    return (
      <div className="min-w-0">
        <p className="min-h-8 text-[10px] uppercase text-muted-foreground">{who}</p>
        <p className="text-xs text-muted-foreground">{t('correction.notReported')}</p>
      </div>
    );
  return (
    <div className="min-w-0">
      <p className="min-h-8 break-words text-[10px] uppercase tracking-wide text-muted-foreground">
        {who}
      </p>
      <p className="flex items-center font-display text-lg text-foreground">
        <TournamentScore goals={claim.homeGoals} penalties={claim.penalties?.home} compact />
        <span className="mx-1 text-xs text-muted-foreground">×</span>
        <TournamentScore goals={claim.awayGoals} penalties={claim.penalties?.away} compact />
      </p>
      {/* **`object-contain` numa caixa 16:9, e nunca `object-cover`** · o alvo do
          print é 1024x576, e recortar pra preencher uma faixa larga come o miolo
          da imagem, que é exatamente onde o placar fica. A primeira versão desta
          tela cortava, e a captura mostrou dois escudos gigantes sem número
          nenhum visível.

          A largura é limitada de propósito: a prova aqui é **reconhecimento**, e
          quem precisa ler o número clica e abre a imagem inteira. */}
      {/* **O `aria-label` não é enfeite** · o botão só tem uma imagem decorativa
          dentro, e sem nome ele é anunciado como "botão" e mais nada · dois por
          card, e são os únicos alvos de tabulação entre as duas declarações. É a
          regra do `docs/design.md` sobre ícone sozinho. */}
      {/**
       * **A declaração de W.O. não tem print** · e é justamente aqui que a
       * ausência dele informa: se um lado declarou ausência e o outro declarou
       * placar com foto, a mesa mostra os dois lado a lado e a decisão fica
       * legível. Desenhar uma caixa de imagem vazia diria "a prova sumiu".
       */}
      {claim.shotUrl ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={label}
          className="mt-1 block aspect-video w-full max-w-[280px] overflow-hidden rounded-md border border-border/60 bg-background/60 transition-colors hover:border-primary"
        >
          <img src={claim.shotUrl} alt="" className="h-full w-full object-contain" />
        </button>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          {claim.noShow ? walkoverLabel : t('correction.noImage')}
        </p>
      )}
    </div>
  );
}
