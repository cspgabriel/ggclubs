/**
 * As linhas do campo · marca d'água do desenho, sem nada interativo.
 *
 * **Mora fora do `tactic-board` desde 07/08/2026**, porque a prévia da formação
 * passou a desenhar o mesmo campo dentro do seletor. Duas cópias divergiriam no
 * primeiro ajuste de proporção, e aí o campo da prévia deixaria de ser o campo
 * que a pessoa vai ver depois de escolher · que é a única coisa que a prévia
 * precisa prometer.
 */
export function PitchLines() {
  // Proporções de um campo de verdade, na escala da largura: a grande área tem
  // 40,3m de 68 (59%) e 16,5m de profundidade; a pequena, 18,3m (27%) e 5,5m.
  const box = { half: 89, depth: 60 };
  const goal = { half: 40, depth: 20 };

  return (
    <div
      aria-hidden
      className="absolute inset-2 rounded-[7px] border border-muted-foreground/25 text-muted-foreground/25"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 300 400"
        preserveAspectRatio="none"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <line x1="0" y1="200" x2="300" y2="200" />
        <circle cx="150" cy="200" r="38" />
        <circle cx="150" cy="200" r="2.5" fill="currentColor" stroke="none" />

        {/* Três lados, dos dois lados do campo · o quarto é a linha de fundo. */}
        <path d={`M ${150 - box.half} 0 V ${box.depth} H ${150 + box.half} V 0`} />
        <path d={`M ${150 - goal.half} 0 V ${goal.depth} H ${150 + goal.half} V 0`} />
        <path d={`M ${150 - box.half} 400 V ${400 - box.depth} H ${150 + box.half} V 400`} />
        <path d={`M ${150 - goal.half} 400 V ${400 - goal.depth} H ${150 + goal.half} V 400`} />
      </svg>
    </div>
  );
}
