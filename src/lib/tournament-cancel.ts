/**
 * **O freio de cancelar uma edição, proporcional ao que ela tem dentro.**
 *
 * Rascunho sem ninguém inscrito cancela no "sim"; edição com club exige
 * **digitar o apelido dela**. Exigir digitação sempre ensina a copiar sem ler,
 * e aí o freio deixa de existir justamente onde ele importa.
 *
 * **Existe como função porque a condição decide duas coisas** · o corpo da
 * frase e a exigência de digitar. Escritas soltas no JSX elas são duas
 * condições que ninguém garante iguais · foi assim que `col-span-2` e
 * `featured` divergiram no cartão público, desenhando um card esticado sem o
 * desenho de destaque.
 *
 * **A confirmação não é controle de segurança**, e vale dizer com todas as
 * letras: o apelido é público, e quem chama a API direto já o conhece · a rota
 * ainda aceita `cancelled` sem confirmação nenhuma (pendência 102). É freio pra
 * humano, e o humano em questão é o admin novo que o painel vai ter.
 */
export function cancelBrakeFor(tournament: { slug: string; registeredCount: number } | null) {
  const hasClubs = tournament !== null && tournament.registeredCount > 0;
  return {
    hasClubs,
    bodyKey: hasClubs
      ? ('admin.tournaments.cancelBodyWithClubs' as const)
      : ('admin.tournaments.cancelBody' as const),
    /** `undefined` libera o botão sem digitação · ver `ConfirmDialog`. */
    phrase: hasClubs ? tournament.slug : undefined,
    count: tournament?.registeredCount ?? 0,
  };
}
