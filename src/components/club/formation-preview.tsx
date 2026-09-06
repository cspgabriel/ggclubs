import { slotsOf, type FormationId } from '@ggclubs/schemas';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PitchLines } from '@/components/club/pitch-lines';
import { positionKey } from '@/lib/position';

/**
 * O campo da formação, sem elenco · é o que o seletor mostra enquanto a pessoa
 * percorre a lista.
 *
 * **Ela existe porque o problema do seletor nunca foi a estética da lista.**
 * Até 06/08/2026 a lista **substituía** o campo desenhado, então a pessoa
 * perdia a referência exatamente no instante em que comparava · é escolher
 * tinta com a parede coberta. O Eduardo pediu que os dois convivessem, e é essa
 * a única coisa que esta peça entrega.
 *
 * **Sem jogador, e de propósito.** O que distingue `4-1-2-1-2 Aberto` de
 * `Fechado` é onde as onze posições ficam, não quem está nelas · pôr avatar
 * aqui traria de volta a miniatura que ele tirou em 04/08, agora maior.
 *
 * O desenho é o **mesmo** do campo de verdade (mesmo `PitchLines`, mesmas
 * coordenadas do schema), então o que a prévia promete é o que aparece depois
 * de escolher.
 */
export function FormationPreview({ formation }: { formation: FormationId }) {
  const { t } = useTranslation();
  const slots = useMemo(() => slotsOf(formation), [formation]);

  return (
    <div
      aria-hidden
      className="relative aspect-[3/4] w-full [container-type:inline-size] overflow-hidden rounded-xl border bg-card"
    >
      <PitchLines />
      {slots.map((slot) => (
        <span
          key={slot.index}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${slot.x * 100}%`, top: `${(1 - slot.y) * 100}%` }}
        >
          {/* A sigla é o dado · o ponto sozinho não diferencia um volante de um
              meia, e é justamente essa diferença que separa formações vizinhas. */}
          <span className="inline-flex min-w-[clamp(1.25rem,18cqw,2rem)] items-center justify-center rounded border border-primary/40 bg-primary/10 px-0.5 py-0.5 text-[clamp(8px,6cqw,10px)] font-semibold uppercase tracking-wide text-primary">
            {t(positionKey(slot.position))}
          </span>
        </span>
      ))}
    </div>
  );
}
