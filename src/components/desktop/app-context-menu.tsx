import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { readClipboard, writeClipboard } from '@/lib/desktop';
import { isDesktop } from '@/lib/platform';
import { publicPlayerPath } from '@/lib/paths';
import { publicOrigin } from '@/lib/public-url';
import { resolveTarget, type ContextTarget } from './context-target';

/**
 * Menu de contexto do app desktop.
 *
 * Existe por dois motivos, nesta ordem. O primeiro é que o menu padrão do
 * WebView2 entrega "Salvar como", "Imprimir" e "Enviar a guia para seus
 * dispositivos" · a palavra *guia* denuncia que aquilo é uma aba de navegador, e
 * é o mesmo tipo de vazamento que a barra de título nativa era. O segundo é que
 * substituir sem repor seria pior: em campo de texto o menu é infraestrutura,
 * não enfeite · colar senha e selecionar tudo são expectativa básica.
 *
 * **Só no desktop.** No navegador o menu do próprio navegador é do usuário, não
 * nosso · site que sequestra botão direito é hostil e quebra acessibilidade.
 *
 * Quando não há ação nenhuma que faça sentido, o menu **não abre**. Caixa vazia
 * comunica defeito; ausência comunica "aqui não tem nada", que é a verdade.
 */
type Action = { key: string; label: string; shortcut?: string; run: () => void; disabled?: boolean };

export function AppContextMenu({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [actions, setActions] = useState<Action[]>([]);
  const [open, setOpen] = useState(false);
  // O alvo do clique, guardado porque o Radix move o foco pro menu · sem a
  // referência não há como devolver o cursor ao campo certo depois.
  const focusBack = useRef<HTMLElement | null>(null);
  // Segurar o foco no campo mantém a marcação da seleção visível: o Chromium
  // apaga por completo a seleção de um input que perdeu o foco · não existe
  // "seleção inativa" em campo de texto, medido no WebView2. Em texto comum da
  // página a seleção sobrevive, então só o campo precisa disso.
  const holdFocus = useRef(false);
  // Fechou por clique fora? Aí o foco **não** volta pro campo. Sair clicando em
  // outro lugar é abandonar o campo, e devolver o foco ali deixaria o texto
  // marcado num campo que a pessoa acabou de largar. Fechar por ação ou por Esc
  // é outra coisa: aí o foco volta e a seleção continua, igual ao nativo.
  const dismissedOutside = useRef(false);

  const build = useCallback(
    (target: ContextTarget): Action[] => {
      switch (target.kind) {
        case 'field':
          return fieldActions(target, {
            cut: t('desktop.menuCut'),
            copy: t('desktop.menuCopy'),
            paste: t('desktop.menuPaste'),
            selectAll: t('desktop.menuSelectAll'),
          });
        case 'link':
          return [
            {
              key: 'copy-link',
              label: t('desktop.menuCopyLink'),
              run: () => void writeClipboard(target.href),
            },
          ];
        // Domínio · previstos em docs/auth-e-desktop.md desde que o menu
        // nasceu, e destravados quando `clubs` e `memberships` passaram a
        // existir. Os dois itens de cada alvo têm equivalente visível na tela
        // (o card é link, o link público tem botão na tela de configurar), que
        // é a condição pra entrar aqui.
        case 'club':
          return [
            {
              key: 'open-club',
              label: t('desktop.menuOpenClub'),
              run: () => target.link.click(),
            },
            {
              key: 'copy-club-link',
              label: t('desktop.menuCopyClubLink'),
              // Este menu **só existe no desktop**, então aqui a origem nunca é
              // um endereço público · `window.location.origin` daria
              // `tauri://localhost` em toda cópia. Ver `lib/public-url.ts`.
              run: () => void writeClipboard(`${publicOrigin()}/club/${target.tag}`),
            },
            // Favoritar e configurar entram **disparando o botão da tela**, não
            // refazendo a ação: o menu vive acima do `<Router>` e não conhece o
            // diálogo de confirmação nem o estado do favorito. De quebra, o
            // item aparece exatamente onde o botão aparece · some no club que
            // já é favorito e na vitrine, sem o menu precisar saber por quê.
            ...(target.favorite
              ? [
                  {
                    key: 'favorite-club',
                    label: t('desktop.menuFavoriteClub'),
                    run: () => target.favorite?.click(),
                  },
                ]
              : []),
            ...(target.config
              ? [
                  {
                    key: 'configure-club',
                    label: t('desktop.menuConfigureClub'),
                    run: () => target.config?.click(),
                  },
                ]
              : []),
          ];
        case 'player':
          return [
            {
              key: 'copy-handle',
              label: t('desktop.menuCopyHandle'),
              run: () => void writeClipboard(`@${target.handle}`),
            },
            {
              key: 'copy-player-link',
              label: t('desktop.menuCopyPlayerLink'),
              // **O espelho do link do club**, e ele passou a fazer sentido em
              // 08/08/2026, quando o player ganhou página aberta · até ali o
              // @nick era a única coisa copiável de uma pessoa.
              //
              // Mesma regra da origem: `publicOrigin()`, nunca
              // `window.location.origin` · este menu **só existe no desktop**,
              // onde a origem é `tauri://localhost` e não abre em lugar nenhum.
              run: () =>
                void writeClipboard(`${publicOrigin()}${publicPlayerPath(target.handle)}`),
            },
          ];
        case 'selection':
          return [
            {
              key: 'copy',
              label: t('desktop.menuCopy'),
              shortcut: 'Ctrl+C',
              run: () => void writeClipboard(target.text),
            },
          ];
        default:
          return [];
      }
    },
    [t],
  );

  useEffect(() => {
    if (!isDesktop()) return;

    // Fase de captura: roda antes do gatilho do Radix. Sem ação pra oferecer,
    // `stopPropagation` impede o Radix de abrir e `preventDefault` mata o menu
    // do WebView2 · os dois são necessários, um não substitui o outro.
    const onContextMenu = (e: MouseEvent) => {
      const el = e.target instanceof HTMLElement ? e.target : null;
      const target = el
        ? resolveTarget(el, {
            // scan-security: ok · a pergunta aqui é "de onde esta página veio",
            // e não "que endereço eu entrego pra pessoa colar em outro lugar" ·
            // é o que decide se um link é externo. Quem sai daqui usa
            // `publicOrigin()`, e é o que os dois itens de copiar link fazem.
            origin: window.location.origin,
            selectedText: window.getSelection()?.toString() ?? '',
            selectionHitsPoint: selectionHitsPoint(e.clientX, e.clientY),
            canCopy: document.queryCommandEnabled('copy'),
          })
        : ({ kind: 'none' } as const);

      const next = build(target);
      if (next.length === 0) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      focusBack.current = target.kind === 'field' ? target.field : null;
      // `button === 2` é clique de mouse; teclado (Shift+F10, tecla de menu)
      // reporta 0. Aberto por teclado, o foco **precisa** ir pro menu, senão
      // seta e Enter não navegam e o menu fica inalcançável.
      holdFocus.current = target.kind === 'field' && e.button === 2;
      dismissedOutside.current = false;
      setActions(next);
    };

    document.addEventListener('contextmenu', onContextMenu, true);
    return () => document.removeEventListener('contextmenu', onContextMenu, true);
  }, [build]);

  // Rolar com o menu aberto o deixaria flutuando longe de onde foi aberto: ele
  // é ancorado no ponto do clique, não no elemento. O modal impedia a rolagem;
  // sem ele, fechar é o comportamento certo, e é o que o navegador faz.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', close, { capture: true });
  }, [open]);

  if (!isDesktop()) return <>{children}</>;

  return (
    <ContextMenu
      // Não-modal porque o modal prende o foco no menu, e campo de texto sem
      // foco perde a marcação da seleção · ver `holdFocus`. O preço vem em duas
      // partes que o modal resolvia de graça, e as duas estão repostas: o clique
      // que fecha não aciona o que está embaixo, e rolar fecha o menu.
      modal={false}
      // Estado controlado porque precisamos fechar por conta própria · sem ele
      // não há como reagir à rolagem.
      open={open}
      onOpenChange={setOpen}
    >
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent
        // Devolve o foco ao campo toda vez que ele tenta entrar no menu. Não
        // basta fazer isso uma vez na abertura: o Radix dá foco ao item sob o
        // ponteiro pra destacá-lo, então a cada movimento do mouse o foco sairia
        // do campo de novo e a marcação piscaria. O destaque do item passou a
        // ser por `hover` justamente pra não depender do foco.
        onFocusCapture={() => {
          if (holdFocus.current) focusBack.current?.focus({ preventScroll: true });
        }}
        // O foco voltou pro campo de propósito · sem isto o Radix entende que
        // saiu do menu e fecha sozinho.
        onFocusOutside={(e) => {
          if (holdFocus.current) e.preventDefault();
        }}
        onPointerDownOutside={() => {
          dismissedOutside.current = true;
          swallowNextClick();
          // Fecha aqui, no `pointerdown`, em vez de deixar o Radix fechar.
          // Ele adia o fechamento pro evento de `click`, e é justamente esse
          // clique que `swallowNextClick` precisa engolir · deixando com ele, o
          // menu deixava de fechar. Dá pra fechar direto porque o estado de
          // aberto é nosso.
          setOpen(false);
        }}
        // O foco volta pro campo, não pro gatilho · caso contrário quem colou
        // perde o cursor e precisa clicar de novo pra continuar digitando.
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          if (!dismissedOutside.current) focusBack.current?.focus({ preventScroll: true });
        }}
      >
        {actions.map((action) => (
          <ContextMenuItem key={action.key} disabled={action.disabled} onSelect={action.run}>
            {action.label}
            {action.shortcut && <ContextMenuShortcut>{action.shortcut}</ContextMenuShortcut>}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}

type FieldLabels = { cut: string; copy: string; paste: string; selectAll: string };

function fieldActions(
  target: Extract<ContextTarget, { kind: 'field' }>,
  labels: FieldLabels,
): Action[] {
  const { field, hasSelection, isPassword, hasText } = target;

  const selectAll: Action = {
    key: 'select-all',
    label: labels.selectAll,
    shortcut: 'Ctrl+A',
    // Campo vazio não tem o que selecionar · é o que o menu do Windows faz.
    disabled: !hasText,
    run: () => {
      field.focus();
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) field.select();
      else document.execCommand('selectAll');
    },
  };

  /**
   * **Colar fica sempre ativo, de propósito.** Menu nativo desabilita quando a
   * área de transferência está vazia porque o app consegue perguntar de graça;
   * aqui a leitura é assíncrona e passa pela permissão do navegador, então
   * decidir antes obrigaria a **pedir acesso ao conteúdo antes de a pessoa
   * escolher colar** · e uma negativa deixaria o item cinza mesmo com texto
   * copiado, que é pior que um clique sem efeito. Se não houver nada, o `run`
   * simplesmente não faz nada.
   */
  const paste: Action = {
    key: 'paste',
    label: labels.paste,
    shortcut: 'Ctrl+V',
    run: () => {
      void readClipboard().then((text) => {
        if (!text) return;
        field.focus();
        // `insertText` mantém o histórico de desfazer do campo e dispara o
        // evento que o React escuta · escrever em `field.value` faria o texto
        // aparecer na tela com o estado do formulário vazio, e o envio mandaria
        // o valor antigo. O que o navegador bloqueia é `paste`, não `insertText`.
        document.execCommand('insertText', false, text);
      });
    },
  };

  // Senha não sai do campo. Ela já é escondida na tela · deixar copiar mandaria
  // o texto puro pra área de transferência, que qualquer app do sistema lê.
  if (isPassword) return [paste, selectAll];

  return [
    {
      key: 'cut',
      label: labels.cut,
      shortcut: 'Ctrl+X',
      disabled: !hasSelection,
      // `execCommand` em vez de ler a seleção e escrever no clipboard: em
      // `input[type=email]` e `[type=number]` o `selectionStart` vem nulo mesmo
      // com texto selecionado, e o comando age sobre a seleção do campo seja
      // qual for o tipo.
      run: () => runOnField(field, 'cut'),
    },
    {
      key: 'copy',
      label: labels.copy,
      shortcut: 'Ctrl+C',
      disabled: !hasSelection,
      run: () => runOnField(field, 'copy'),
    },
    paste,
    selectAll,
  ];
}

function runOnField(field: HTMLElement, command: 'cut' | 'copy'): void {
  field.focus();
  document.execCommand(command);
}

/**
 * Come o clique que fechou o menu, pra ele não acionar o que estava embaixo.
 *
 * Menu de contexto nativo funciona assim: o primeiro clique fora só fecha. O
 * modo modal do Radix dava isso de graça bloqueando o ponteiro fora do menu,
 * mas o modal prende o foco e apaga a marcação da seleção · trocamos uma coisa
 * pela outra e repomos esta aqui. Sem isso, fechar o menu clicando no botão de
 * entrar enviava o formulário junto.
 *
 * O `setTimeout` existe pro caso de o clique nunca chegar (a pessoa aperta,
 * arrasta pra fora e solta): sem ele o ouvinte sobreviveria e comeria um clique
 * legítimo qualquer, muito depois.
 */
function swallowNextClick(): void {
  const swallow = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    cleanup();
  };
  const cleanup = () => {
    document.removeEventListener('click', swallow, true);
    clearTimeout(timer);
  };
  const timer = setTimeout(cleanup, 400);
  document.addEventListener('click', swallow, true);
}

/**
 * O ponteiro está sobre a seleção? Comparação por retângulo, não por elemento:
 * seleção que atravessa parágrafos rende vários retângulos, e clicar no mesmo
 * elemento mas fora das palavras selecionadas não é clicar na seleção.
 */
function selectionHitsPoint(x: number, y: number): boolean {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return false;

  for (let i = 0; i < selection.rangeCount; i++) {
    for (const rect of selection.getRangeAt(i).getClientRects()) {
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return true;
    }
  }
  return false;
}
