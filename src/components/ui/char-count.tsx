import { cn } from '@/lib/utils';

/**
 * Contador de caracteres que **só aparece perto do fim**.
 *
 * Existe porque `maxLength` trava a digitação em silêncio: a pessoa continua
 * apertando tecla e nada acontece, o que lê como teclado travado e não como
 * limite. Foi a lacuna que sobrou quando os tetos desceram pros números reais
 * do EA FC e do Discord · o nome do club passou a ter 20, e "Zagueiros
 * Anônimos" tem 18.
 *
 * **Não aparece o tempo todo, de propósito.** Contador permanente em todo campo
 * é ruído e transforma escrever num exercício de orçamento; ele entra nos
 * últimos caracteres, que é quando a informação passa a valer alguma coisa.
 */
const APPEAR_WITHIN = 5;

export function CharCount({
  value,
  max,
  within = APPEAR_WITHIN,
}: {
  value: string | undefined;
  max: number;
  /**
   * A quantos caracteres do fim ele aparece.
   *
   * **O padrão de 5 é de campo curto** · num nome de club de 20, cinco é um
   * quarto do campo. Num teto de mil (a mensagem da conversa) seriam 0,5%, e o
   * contador chegaria tarde demais pra servir de aviso · por isso a janela é
   * do chamador, e não uma constante só.
   */
  within?: number;
}) {
  const used = value?.length ?? 0;
  if (used < max - within) return null;

  const full = used >= max;
  return (
    <span
      // `polite` e não `assertive`: a pessoa está digitando, e interromper o
      // leitor de tela a cada tecla seria pior que anunciar no intervalo.
      aria-live="polite"
      className={cn('shrink-0 text-xs tabular-nums', full ? 'text-foreground' : 'text-muted-foreground')}
    >
      {used}/{max}
    </span>
  );
}
