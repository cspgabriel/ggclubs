import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * **A coluna lateral que acompanha a rolagem** · a mesma peça em `/app/conta`,
 * em criar club, em editar club e, desde 06/09/2026, no histórico da página
 * legal · fora do `/app`, o `--app-sticky-top` vale pelo padrão do `:root`
 * (header mais 2rem), e a casca do app sobrescreve com a faixa do jogo somada.
 * Antes disso a página pública escrevia a quarta cópia à mão, com números
 * próprios e sem o `data-sticky-aside`.
 *
 * **Ela existe porque as três divergiram sem ninguém decidir nada** · o rótulo
 * da prévia tinha dois tamanhos, o vão tinha duas formas, e o `sticky` morava
 * em lugares diferentes: na conta no próprio `aside`, no formulário de club num
 * `div` **dentro** dele. É o mesmo padrão dos três tamanhos de título em quatro
 * páginas que o `design.md` registra.
 *
 * **E a divergência não era cosmética: ela produziu um defeito.** Na tela de
 * editar club o `aside` vivia dentro de um `flex flex-col` junto do
 * compartilhar e do encerrar · em coluna flex o item tem a altura do conteúdo,
 * e `sticky` sem espaço no pai **nunca desliza**. Era a pendência 113.
 *
 * ## Por que gruda a coluna inteira, e não só a prévia
 *
 * **Foi medido em 21/08/2026, e é o ponto do desenho.** Grudar só a prévia e
 * deixar o compartilhar e o encerrar rolando na mesma coluna produz colisão: a
 * prévia trava no topo, os dois de baixo continuam subindo e **passam por dentro
 * da caixa dela** · 4 de 5 posições de rolagem com sobreposição, com o card da
 * prévia escrito por cima do texto dos outros dois na captura.
 *
 * Grudando a coluna toda, **nada sobe sozinho** e a colisão deixa de existir na
 * origem, em vez de ser evitada tirando conteúdo da coluna.
 *
 * ## O teto de altura não é zelo, é o que torna isso seguro
 *
 * Coluna grudada mais alta que a janela deixa o fim dela **inalcançável** ·
 * quem precisa de "Encerrar club" nunca chega lá, porque a coluna não rola com
 * a página e não rola por dentro. O `max-h` + `overflow-y` fecham esse buraco:
 * cabendo, ela fica inteira à vista; não cabendo, ela ganha rolagem própria.
 *
 * O `overscroll-contain` evita que o fim da rolagem interna empurre a página
 * junto, que é o efeito que faz a tela parecer que "pulou".
 */
export function StickyAside({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <aside
      // O alvo do probe que mede se ela gruda · procurar por texto ("prévia")
      // acha o container e o filho ao mesmo tempo, e foi assim que a medição
      // deu falso positivo três vezes em 21/08/2026. Ver `design.md`.
      data-sticky-aside
      className={cn(
        'flex flex-col gap-6',
        // O `top` sai do token, e nunca de um número escrito na tela · quem
        // gruda acima dela é o header **e** a faixa do jogo, e a faixa aparece
        // sozinha quando a partida entra na janela. Com o número à mão ela
        // cobria 9px do rótulo da prévia em toda tela de 1024 pra cima. Ver
        // `index.css`.
        'lg:sticky lg:top-[var(--app-sticky-top)] lg:self-start',
        'lg:max-h-[calc(var(--app-viewport-h)-var(--app-sticky-top)-2rem)] lg:overflow-y-auto lg:overscroll-contain',
        className,
      )}
    >
      {children}
    </aside>
  );
}

/**
 * O bloco de prévia dentro da coluna · rótulo, o desenho, e a linha que explica
 * o que ele é.
 *
 * **Separado da coluna de propósito** · a coluna é estrutura (o que gruda) e
 * este é conteúdo. Com os dois no mesmo componente, a tela de editar club
 * precisaria de uma configuração pra dizer "também tem compartilhar e
 * encerrar" · e configuração é o que faz um componente crescer a cada tela. Em
 * slots, ela só põe mais um filho.
 */
export function PreviewBlock({
  title,
  hint,
  className,
  children,
}: {
  title: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-preview-block className={cn('space-y-3', className)}>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
