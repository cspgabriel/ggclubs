/**
 * Decide **o que** o clique direito acertou. Fica separado do componente porque
 * é a parte que erra em silêncio: o menu abre, só que com os itens errados ·
 * e isso é testável sem DOM de app inteiro.
 *
 * Tudo que depende do documento chega por `context`, de propósito · a função
 * não lê `window`, então o teste descreve a situação em vez de simulá-la.
 */
export type ContextTarget =
  | {
      kind: 'field';
      field: HTMLElement;
      hasSelection: boolean;
      isPassword: boolean;
      hasText: boolean;
    }
  | { kind: 'link'; href: string }
  | {
      kind: 'club';
      tag: string;
      link: HTMLAnchorElement;
      /** Botões da própria tela · o menu dispara o que já existe, não recria. */
      config: HTMLElement | null;
      favorite: HTMLElement | null;
    }
  | { kind: 'player'; handle: string }
  | { kind: 'selection'; text: string }
  | { kind: 'none' };

export type ContextInfo = {
  origin: string;
  /** Texto selecionado na página. */
  selectedText: string;
  /** O clique caiu dentro da seleção · menu nativo não oferece copiar fora dela. */
  selectionHitsPoint: boolean;
  /**
   * `document.queryCommandEnabled('copy')`. É a única forma confiável de saber
   * se há o que copiar num campo: `input[type=email]` e `[type=number]` devolvem
   * `selectionStart` nulo mesmo com texto selecionado, medido no WebView2.
   * De quebra, o próprio navegador responde `false` em campo de senha.
   */
  canCopy: boolean;
};

const EDITABLE = 'input:not([type=checkbox]):not([type=radio]), textarea, [contenteditable=true]';

export function resolveTarget(el: HTMLElement, context: ContextInfo): ContextTarget {
  const field = el.closest<HTMLElement>(EDITABLE);
  if (field) {
    const input = field instanceof HTMLInputElement ? field : null;
    const textarea = field instanceof HTMLTextAreaElement ? field : null;
    return {
      kind: 'field',
      field,
      isPassword: input?.type === 'password',
      hasSelection: context.canCopy,
      // "Selecionar tudo" num campo vazio não faz nada, e o menu do próprio
      // Windows desabilita nesse caso · oferecer ação que não age ensina que o
      // menu mente.
      hasText: ((input ?? textarea)?.value ?? field.textContent ?? '').length > 0,
    };
  }

  // Alvos do domínio, marcados no DOM com `data-*` pelo componente que os
  // desenha. A regra que decide se um item entra está em docs/auth-e-desktop.md:
  // **a ação precisa existir em outro lugar da tela** · menu de contexto é
  // atalho, não esconderijo, porque ninguém descobre item de menu por acaso.
  //
  // Vêm antes do link de propósito: card de club e linha de elenco são links
  // internos, e link interno não rende menu nenhum · sem esta ordem o clique
  // direito neles cairia em "nada aqui".
  const player = el.closest<HTMLElement>('[data-player-handle]');
  if (player?.dataset.playerHandle) {
    return { kind: 'player', handle: player.dataset.playerHandle };
  }

  // O alvo é a **própria âncora** do card, e o item de abrir dispara um clique
  // nela. Parece rodeio e não é: o menu vive acima do `<Router>` na árvore, e
  // `useNavigate` ali lança em tempo de execução. Clicando no link, quem navega
  // continua sendo o roteador, sem o menu precisar conhecê-lo.
  const club = el.closest<HTMLElement>('[data-club-tag]');
  // **A marca pode estar NA própria âncora**, e não só num contêiner que a
  // envolve · o card de club é uma caixa com um link dentro, mas o nome do club
  // na chave e na tabela do campeonato **é** o link, e um `<span>` a mais em
  // volta dele só pra pendurar o atributo entraria como item de flex e mudaria
  // o desenho de três telas. Sem esta linha o alvo só existiria onde a marca é
  // envelope, que é a forma que a primeira tela por acaso teve.
  const openable =
    club instanceof HTMLAnchorElement && club.hasAttribute('href')
      ? club
      : club?.querySelector<HTMLAnchorElement>('a[href]');
  if (club?.dataset.clubTag && openable) {
    return {
      kind: 'club',
      tag: club.dataset.clubTag,
      link: openable,
      // Só existe pra quem é dono · o menu não inventa uma ação que a tela não
      // oferece, que é a regra escrita em docs/auth-e-desktop.md.
      config: club.querySelector<HTMLElement>('[data-club-config]'),
      // Mesma regra do configurar: só existe onde o botão existe · no club que
      // já é favorito e na vitrine ele nem é renderizado, e o item some junto.
      favorite: club.querySelector<HTMLElement>('[data-club-favorite]'),
    };
  }

  // Externo é **outra origem**, não "começa com http". Rota interna também é
  // http em dev, e por isso o seletor de idioma oferecia "copiar link" · um
  // href de rota interna não serve colado em lugar nenhum.
  const link = el.closest<HTMLAnchorElement>('a[href]');
  if (link && link.origin && link.origin !== context.origin) {
    return { kind: 'link', href: link.href };
  }

  // Existir seleção não basta: ela precisa estar **sob o ponteiro**. Sem isto,
  // clicar na logo com uma frase selecionada do outro lado da tela oferecia
  // copiar, e o menu falava de um texto que não tinha nada a ver com o clique.
  if (context.selectedText.trim() && context.selectionHitsPoint) {
    return { kind: 'selection', text: context.selectedText };
  }
  return { kind: 'none' };
}
