import { canDeclareMatch } from '@/lib/match-declaration';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import {
  needsShootout,
  REPORT_DEADLINE_MINUTES,
  WALKOVER_GOALS,
  type MatchCard,
} from '@ggclubs/schemas';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buttonVariants } from '@/components/ui/button-variants';
import { DialogSurface } from '@/components/ui/dialog-surface';
import { ImageUpload } from '@/components/ui/image-upload';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import { isGoals, onlyGoals, shootoutDecided } from '@/lib/goals';
import { useImagePicker } from '@/lib/use-image-picker';
import { cn } from '@/lib/utils';

/**
 * Lançar o placar de uma partida · **as duas pontas usam este mesmo diálogo.**
 *
 * **Os dois campos são mandante e visitante, e não "meus gols"**: é a mesma
 * perspectiva dos dois lados, e é ela que permite comparar as duas declarações
 * sem converter nada. Converter na leitura seria a chance de inverter um placar
 * sem ninguém ver.
 *
 * **O print é obrigatório** · é a prova que o admin lê quando os dois discordam,
 * e sem ela a disputa vira a palavra de um contra a do outro, que é exatamente
 * o que a operação por foto no grupo do Discord já é hoje.
 */
export function MatchReportDialog({
  match,
  clubId,
  myTag,
  homeName,
  awayName,
  open,
  onOpenChange,
  onSent,
}: {
  match: MatchCard;
  /** O club por quem esta pessoa declara · **quem manda é o dono**. */
  clubId: string;
  /**
   * A tag do club por quem se declara · é ela que diz **de que lado** ele está.
   *
   * O `clubId` não responde isso: o `matchCard` fala por `@tag` e nunca por id
   * interno, que é a mesma regra da escalação pública. E o lado importa no W.O.,
   * onde a frase precisa dizer de quem é o 3-0.
   */
  myTag: string;
  homeName: string;
  awayName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
}) {
  const { t } = useTranslation();
  const picker = useImagePicker('match_shot');
  const [homeGoals, setHomeGoals] = useState('');
  const [awayGoals, setAwayGoals] = useState('');
  const [homePens, setHomePens] = useState('');
  const [awayPens, setAwayPens] = useState('');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  /**
   * **Os dois modos do mesmo ato** · declarar o que aconteceu.
   *
   * O W.O. mora **dentro** deste diálogo e não num segundo botão da linha da
   * partida, e a razão é medida: a coluna de ação tem 128px, e em 21/08/2026 um
   * botão só já saía por cima do nome do adversário em espanhol. Um segundo
   * botão custaria largura em **toda** linha da chave por causa do caso raro.
   */
  const [mode, setMode] = useState<'score' | 'walkover'>('score');

  /** De que lado eu estou · o W.O. é sempre a favor de quem declara. */
  const myName = match.homeTag === myTag ? homeName : awayName;
  const rivalName = match.homeTag === myTag ? awayName : homeName;

  /**
   * **A disputa de pênaltis só aparece quando ela existe** · mata-mata **e**
   * gols empatados.
   *
   * Ela nasce dos dois campos de cima, enquanto a pessoa digita · pedir os
   * pênaltis antes de saber que houve empate seria dois campos vazios em toda
   * declaração, e a fase de grupos não os tem em caso nenhum (lá o empate **é**
   * o resultado).
   */

  /**
   * **Os dois `isGoals` são a guarda que impede o formulário em branco de pedir
   * pênaltis** · `Number('')` é 0, e dois zeros "empatam".
   */
  const needsPenalties =
    mode === 'score' &&
    isGoals(homeGoals) &&
    isGoals(awayGoals) &&
    needsShootout(match.phase, Number(homeGoals), Number(awayGoals));
  // Empate na disputa também não decide nada · a API recusa junto.
  const penaltiesOk = !needsPenalties || shootoutDecided(homePens, awayPens);

  const available = canDeclareMatch(match, myTag);
  async function send() {
    if (!available || picker.reading || sending) return;
    setFailure(null);
    setSending(true);
    try {
      // O print sobe primeiro porque a rota recusa declaração sem ele · subir
      // depois deixaria a partida declarada e a prova pra trás se o S3 falhasse.
      const shotUrl = await picker.commit(null);

      /**
       * **No W.O. o print é opcional, e é a única diferença de exigência.**
       *
       * *"Não se fotografa a ausência de alguém"* · exigir prova de um
       * não-evento faz a pessoa mandar qualquer captura pra passar pelo campo
       * obrigatório, e aí o print perde significado **em todas** as partidas.
       * **O que sustenta esta declaração é o silêncio do outro lado** · e
       * quem o interpreta é a organização, não um prazo. Esta linha dizia
       * *"por 24h"*, e o prazo caiu em 22/08/2026 · pendência 180.
       */
      if (mode === 'walkover') {
        await api.reportWalkover(match._id, { clubId, ...(shotUrl ? { shotUrl } : {}) });
        onSent();
        onOpenChange(false);
        return;
      }

      if (!shotUrl) {
        setFailure(t('tournament.reportNeedsShot'));
        return;
      }

      await api.reportMatch(match._id, {
        clubId,
        homeGoals: Number(homeGoals),
        awayGoals: Number(awayGoals),
        shotUrl,
        // Os dois juntos ou nenhum · meia disputa de pênaltis não é dado.
        ...(needsPenalties
          ? { homePenalties: Number(homePens), awayPenalties: Number(awayPens) }
          : {}),
      });
      onSent();
      onOpenChange(false);
    } catch (err) {
      setFailure(apiErrorMessage(err, t));
    } finally {
      setSending(false);
    }
  }

  // No W.O. não há nada a preencher · o placar é fixo e o print é opcional.
  const ready =
    mode === 'walkover' ||
    (isGoals(homeGoals) && isGoals(awayGoals) && picker.picked !== null && penaltiesOk);

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        // Fechar esquece o que foi preenchido · reabrir com o placar da tentativa
        // anterior é o caminho pra declarar o jogo errado no automático.
        if (!next) {
          setHomeGoals('');
          setAwayGoals('');
          setHomePens('');
          setAwayPens('');
          setFailure(null);
          // O modo volta junto · reabrir direto em "W.O." é o caminho pra
          // declarar ausência de um jogo que aconteceu.
          setMode('score');
          picker.clear();
        }
        onOpenChange(next);
      }}
    >
      <DialogSurface>
        <AlertDialog.Title className="font-display text-xl/[0.95] uppercase tracking-tight sm:text-2xl/[0.95]">
          {mode === 'walkover' ? t('tournament.walkoverTitle') : t('tournament.reportTitle')}
        </AlertDialog.Title>
        <AlertDialog.Description className="mt-3 text-sm text-muted-foreground">
          {mode === 'walkover' ? (
            /* **O que vai ser gravado, escrito antes do clique** · o placar é
               fixo e a pessoa não o digita, então ela precisa ler o número de
               algum lugar. O `WALKOVER_GOALS` sai da constante, como o prazo. */
            <>
              {t('tournament.walkoverBody', { goals: WALKOVER_GOALS, club: myName })}{' '}
              <span className="text-foreground">
                {t('tournament.reportDeadlineHint', { minutes: REPORT_DEADLINE_MINUTES })}
              </span>
            </>
          ) : (
            <>
              {t('tournament.reportBody')}{' '}
              {/* **A regra do prazo vai aqui, e não só na notificação** · é ela que
                  decide o que acontece se o outro lado sumir, e quem declara precisa
                  saber disso **antes** de declarar. O número sai da constante. */}
              <span className="text-foreground">
                {t('tournament.reportDeadlineHint', { minutes: REPORT_DEADLINE_MINUTES })}
              </span>
            </>
          )}
        </AlertDialog.Description>

        {/**
         * **No mata-mata a regra vem ANTES dos campos** · 05/09/2026, e ela
         * nasceu de um erro que aconteceu em **2 de 2** partidas decididas nos
         * pênaltis na Copa de Estreia.
         *
         * O bloco de pênaltis só aparece **depois** que os dois números ficam
         * iguais · quem terminou 1x1 e ganhou nos pênaltis nunca lia a palavra
         * "pênalti" antes de decidir o que digitar, e escrevia **o placar da
         * disputa no campo de gols** (7-8, 10-11), que na cabeça dele é *o
         * resultado*. Os dois lados da semifinal erraram igual, então a partida
         * fechou por **acordo** e nada denunciou.
         *
         * **Campo que aparece sozinho explica por que apareceu; o que ainda não
         * apareceu precisa ser prometido.** É a mesma régua do aviso de prazo
         * logo acima: quem declara tem de saber a regra **antes** de declarar.
         */}
        {mode === 'score' && match.phase === 'knockout' && (
          <p className="mt-4 text-xs text-amber-400">{t('tournament.reportKnockoutHint')}</p>
        )}

        <div className={cn('mt-5 grid grid-cols-2 gap-3', mode === 'walkover' && 'hidden')}>
          <GoalsField
            id="report-home"
            label={t('tournament.reportHomeGoals')}
            club={homeName}
            value={homeGoals}
            onChange={setHomeGoals}
            disabled={sending}
          />
          <GoalsField
            id="report-away"
            label={t('tournament.reportAwayGoals')}
            club={awayName}
            value={awayGoals}
            onChange={setAwayGoals}
            disabled={sending}
          />
        </div>

        {/**
         * **Os pênaltis, e só quando eles existem** · mata-mata empatado.
         *
         * O bloco aparece **enquanto a pessoa digita**, no instante em que os
         * dois campos de cima ficam iguais · é o mesmo momento em que ela
         * lembra que a partida foi decidida na disputa. A frase acima diz por
         * que os campos apareceram, porque campo que surge sozinho sem
         * explicação lê como tela quebrada.
         */}
        {needsPenalties && (
          <div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="mb-2 text-xs text-foreground">{t('tournament.reportPenaltiesHint')}</p>
            <div className="grid grid-cols-2 gap-3">
              <GoalsField
                id="report-home-pens"
                label={t('tournament.reportHomePenalties')}
                club={homeName}
                value={homePens}
                onChange={setHomePens}
                disabled={sending}
              />
              <GoalsField
                id="report-away-pens"
                label={t('tournament.reportAwayPenalties')}
                club={awayName}
                value={awayPens}
                onChange={setAwayPens}
                disabled={sending}
              />
            </div>
            {/* **Empate na disputa não decide nada** · e a tela diz isso antes
                de o servidor recusar, porque aqui a pessoa consegue consertar. */}
            {isGoals(homePens) && isGoals(awayPens) && !shootoutDecided(homePens, awayPens) && (
              <p className="mt-2 text-xs text-amber-400">{t('tournament.reportPenaltiesTied')}</p>
            )}
          </div>
        )}

        <div className="mt-5">
          <p className="mb-2 text-xs text-muted-foreground">
            {mode === 'walkover' ? t('tournament.walkoverShot') : t('tournament.reportShot')}
          </p>
          <ImageUpload
            picker={picker}
            value={null}
            onChange={() => {
              /* Não há imagem gravada aqui · o print vive só nesta declaração. */
            }}
            disabled={sending}
            preview={
              picker.previewUrl ? (
                /**
                 * **`contain`, e não `cover`** · a prévia tem que ser o que vai
                 * ficar gravado, e desde 19/08/2026 o print **não é recortado**
                 * (ele é prova). Com `cover` aqui, a pessoa aprovava um recorte
                 * que não ia acontecer · a prévia mentia na direção contrária à
                 * do defeito que o corte causava.
                 */
                <img
                  src={picker.previewUrl}
                  alt=""
                  className="h-16 w-28 shrink-0 rounded-lg border bg-background object-contain"
                />
              ) : (
                <div className="h-16 w-28 shrink-0 rounded-lg border border-dashed border-border" />
              )
            }
          />
        </div>

        {!available && <p role="status" className="mt-3 text-xs text-muted-foreground">{t('correction.reportUnavailable')}</p>}
        {failure && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {failure}
          </p>
        )}

        {/* **O que falta pro botão acender** · placar preenchido e botão morto
            sem explicação lê como tela quebrada, e o print é a exigência que
            ninguém adivinha depois de digitar dois números. */}
        {mode === 'score' &&
          !failure &&
          isGoals(homeGoals) &&
          isGoals(awayGoals) &&
          !picker.picked && (
            <p className="mt-4 text-sm text-muted-foreground">{t('tournament.reportNeedsShot')}</p>
          )}

        {/**
         * **A troca de modo é texto, e não um segundo botão de ação** · o W.O. é
         * o caminho raro, e dar a ele o mesmo peso do placar faria as duas
         * escolhas competerem numa tela onde uma delas é quase sempre a certa.
         * É a escada de botões do `design.md`: uma ação principal por tela.
         */}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'score' ? 'walkover' : 'score');
            setFailure(null);
          }}
          disabled={sending}
          className="touch-target mt-4 text-left text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {mode === 'walkover'
            ? t('tournament.walkoverBackToScore')
            : t('tournament.walkoverSwitch', { club: rivalName })}
        </button>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialog.Cancel
            className={cn(buttonVariants({ variant: 'ghost' }), 'sm:min-w-24')}
            disabled={sending}
          >
            {t('common.cancel')}
          </AlertDialog.Cancel>
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || picker.reading || !available || !ready}
            className={cn(buttonVariants({ variant: 'cta' }), 'sm:min-w-32')}
          >
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {sending
              ? t('tournament.reportSending')
              : mode === 'walkover'
                ? t('tournament.walkoverSend')
                : t('tournament.reportSend')}
          </button>
        </div>
      </DialogSurface>
    </AlertDialog.Root>
  );
}

function GoalsField({
  id,
  label,
  club,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  club: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-muted-foreground">
        {label}
      </label>
      <p className="mb-1.5 truncate text-sm font-medium" title={club}>
        {club}
      </p>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(onlyGoals(e.target.value))}
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-center font-display text-xl ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}
