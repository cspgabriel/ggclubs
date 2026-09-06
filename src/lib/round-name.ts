import { knockoutRoundKey } from '@ggclubs/schemas';
import type { TFunction } from 'i18next';

/** O mínimo que o nome da rodada precisa saber da partida. */
export type RoundOf = {
  phase: string;
  round: number;
  /**
   * **A disputa de terceiro** · ela mora na **mesma rodada da final**, e sem
   * esta marca ela envenena a conta abaixo. Opcional porque quem chama nem
   * sempre tem o campo · ver a armadilha no corpo.
   */
  thirdPlace?: boolean;
};

/**
 * **O nome da rodada, e ele depende da fase.**
 *
 * A lista de conversas dizia *"2ª rodada"* pra fase de grupos **e** pro
 * mata-mata · duas coisas diferentes com o mesmo nome, apontado pelo Eduardo em
 * 27/08/2026.
 *
 * Na chave quem nomeia a rodada é **quantos times estão nela**: quatro é
 * semifinal em qualquer campeonato do mundo, e a conta não envelhece quando a
 * chave mudar de tamanho. É a mesma regra que o `knockout-bracket` já usava ·
 * isto aqui é ela virando peça, na segunda cópia, antes de a terceira aparecer.
 *
 * **O tamanho da rodada sai da própria lista** · quem chama já tem os
 * confrontos da edição na mão, então contar responde sem consulta nova.
 *
 * ## A disputa de terceiro envenenava a conta · 05/09/2026
 *
 * **Ela vive na MESMA rodada da final**, então a rodada final tem **duas**
 * partidas, a conta dava `2 * 2 = 4` times e a função chamava a final de
 * **semifinal** · a final da Copa de Estreia (DOCPE × SÓ GOGÓ FC) apareceu assim
 * na sala e no filtro da mesa, que passou a listar **"Semifinal" duas vezes**.
 *
 * O `knockout-bracket` e o `advanceKnockout` do servidor **já filtravam** ela
 * antes de contar · esta peça nasceu da segunda cópia e não trouxe o filtro
 * junto. **É o mesmo defeito que a extração existia pra evitar**, uma camada
 * abaixo.
 *
 * **Quem não manda o `thirdPlace` continua funcionando e volta a errar** · a
 * marca é opcional porque nem todo chamador tem o campo, e por isso ela é o
 * primeiro degrau de qualquer conserto aqui: **sem o dado, não há regra que
 * salve**.
 */
export function roundNamer<T extends RoundOf>(
  all: readonly T[],
  t: TFunction,
): (one: RoundOf) => string {
  const size = new Map<string, number>();
  for (const item of all) {
    // **A disputa de terceiro não conta como degrau da árvore** · ela não muda
    // quantos times disputam a rodada, porque quem está nela já foi eliminado.
    if (item.thirdPlace) continue;
    const key = `${item.phase}:${item.round}`;
    size.set(key, (size.get(key) ?? 0) + 1);
  }

  return (one) => {
    if (one.thirdPlace) return t('tournament.round.thirdPlace');
    if (one.phase !== 'knockout') return t('tournament.roundName', { round: one.round });
    const inRound = size.get(`knockout:${one.round}`) ?? 1;
    return t(`tournament.round.${knockoutRoundKey(inRound * 2)}`);
  };
}
