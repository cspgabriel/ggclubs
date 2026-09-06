import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A pilha vertical de uma tela de dentro · cabeçalho e seções, com o vão entre
 * elas.
 *
 * **Ele existe porque o vão era escolha de cada tela, e por isso divergiu:** o
 * feed usava `space-y-6`, o painel do admin, o texto legal e o detalhe do club
 * usavam `8`, e a de clubs `10`. Ninguém decidiu nenhum dos três · cada tela
 * nasceu copiando a que estava por perto, que é o mesmo caminho que produziu
 * três tamanhos de título em quatro páginas antes do `PageHeader`.
 *
 * **A medida é 24px, e ela foi escolhida olhando as três lado a lado.** O
 * argumento contra apertar era que o vão precisa separar seção de seção; a
 * comparação mostrou que **quem separa não é o vão** · o `SectionTitle` tem a
 * barra verde, caixa alta e fonte display, e a hierarquia sai daí. O que o vão
 * maior fazia era custar conteúdo: na tela de clubs, 4 cards da vitrine cabem
 * acima da dobra com 24px contra 2 com 40px, numa tela que existe pra a pessoa
 * achar club.
 *
 * Tela nova não escolhe espaçamento · usa isto.
 */
/**
 * A medida, exportada à parte.
 *
 * Existe porque nem toda pilha do produto pode ser um `<div>` a mais: o
 * `ClubView` já tem a própria estrutura (capa que sangra na pública e vira
 * cartão no app), e envolvê-la mudaria o layout de uma das duas telas. O que
 * não pode é a medida voltar a ser escolha de quem desenha · quem precisa do
 * vão sem poder receber o componente usa **esta constante**, nunca um
 * `space-y-*` digitado na mão.
 */
export const PAGE_STACK_GAP = 'space-y-6';

export function PageStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(PAGE_STACK_GAP, className)}>{children}</div>;
}
