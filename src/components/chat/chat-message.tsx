import { MESSAGE_REACTIONS, splitMentions, type ChatMessageView } from '@ggclubs/schemas';
import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, MoreHorizontal, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Uma mensagem da sala, desenhada · **texto, print, ações e reações.**
 *
 * Saiu do `match-chat.tsx` em 01/09/2026, na fase 2 do
 * [arquitetura.md](../../../../docs/arquitetura.md) · o arquivo tinha 2.157
 * linhas e **26 hooks num componente só**, e o item 156 chama isso de "arquivo
 * que ninguém lê antes de editar".
 *
 * **Estas seis peças não têm estado da sala** · elas recebem tudo por prop,
 * inclusive as frases já traduzidas. Por isso foram as primeiras a sair: mover
 * componente sem hook da sala **não pode** mudar a ordem dos hooks de quem
 * ficou, que é o único risco de verdade num corte de componente React.
 */
/**
 * **O corpo, com a menção acesa** · `@TAG` de um dos dois clubs vira destaque.
 *
 * **A quebra é `anywhere` e não `break-word`** · dentro de flex, `break-word`
 * ainda deixa a palavra ditar a largura mínima da caixa, e foi assim que uma
 * mensagem sem espaço nenhum empurrou o diálogo inteiro pro lado.
 */
export function MessageBody({
  body,
  tags,
  more,
  less,
}: {
  body: string;
  tags: string[];
  more: string;
  less: string;
}) {
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  const text = useRef<HTMLSpanElement>(null);

  /**
   * **Quem decide se tem "ver mais" é a medida, e não uma conta de caractere.**
   *
   * O corte é em **cinco linhas** (pedido do Eduardo em 27/08/2026), e linha
   * aqui é linha **na tela**: um parágrafo sem quebra nenhuma vira seis linhas
   * numa janela estreita e três numa larga. Contar quebra digitada responderia
   * zero nos dois casos, e um teto de caractere erraria nos dois sentidos.
   *
   * Por isso a pergunta é feita ao layout · `scrollHeight > clientHeight` com o
   * corte aplicado. O `ResizeObserver` refaz a conta quando a janela muda.
   */
  useEffect(() => {
    const el = text.current;
    if (!el || open) return;
    const measure = () => setLong(el.scrollHeight > el.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [body, open]);

  const parts = splitMentions(body, tags);

  return (
    <>
      {/**
       * **`pre-wrap` guarda a quebra que a pessoa digitou** · Shift+Enter
       * escreve uma quebra que o HTML colapsa em espaço, então uma mensagem em
       * duas linhas chegava do outro lado como uma linha só · apontado pelo
       * Eduardo em 27/08/2026, e é defeito diferente do vazamento lateral.
       */}
      <span
        ref={text}
        className={cn(
          'block whitespace-pre-wrap [overflow-wrap:anywhere]',
          !open && 'clamp-lines',
          !open && long && 'fade-bottom',
        )}
      >
        {parts.map((part, index) =>
          part.mention ? (
            <strong key={index} className="rounded bg-primary/15 px-1 font-semibold text-primary">
              {part.text}
            </strong>
          ) : (
            <span key={index}>{part.text}</span>
          ),
        )}
      </span>
      {long && (
        <button
          type="button"
          className="mt-0.5 text-[11px] uppercase tracking-widest text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? less : more}
        </button>
      )}
    </>
  );
}

/**
 * **A lápide, e o caminho até ela** · "apagando" enquanto o servidor não
 * respondeu, e só então quem apagou.
 */
export function Tombstone({
  deleted,
  deleting,
  labels,
}: {
  deleted: { byKind: string } | null;
  deleting: boolean;
  labels: { deleting: string; byAdmin: string; byAuthor: string };
}) {
  if (!deleting && !deleted) return null;
  return (
    <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
      {deleting && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
      {deleting ? labels.deleting : deleted?.byKind === 'admin' ? labels.byAdmin : labels.byAuthor}
    </span>
  );
}

/**
 * **O print dentro da bolha** · miniatura que abre no visualizador.
 *
 * **Altura fixa e `contain`** · o print de súmula vem em proporção
 * imprevisível (celular em pé, tela cheia do console), e deixar a imagem mandar
 * na altura faria a conversa pular a cada uma que chega.
 */
export function Shot({ url, label, onOpen }: { url: string; label: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      data-shot
      onClick={onOpen}
      aria-label={label}
      className="mb-1 block overflow-hidden rounded-md border border-border transition hover:border-primary/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/**
       * **`onError` porque a imagem vem de fora do bundle** · é a regra do
       * `CLAUDE.md` pra imagem de host que não é a página, e aqui o host é o
       * nosso CDN: arquivo apagado ou URL velha não pode virar o desenho de
       * imagem quebrada do navegador.
       */}
      <img
        src={url}
        alt=""
        loading="lazy"
        className="h-40 w-full max-w-64 bg-background object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    </button>
  );
}

/** O botão de anexar · abre o seletor de arquivo e some do caminho. */
export function ShotButton({
  label,
  disabled,
  onPick,
}: {
  label: string;
  disabled: boolean;
  onPick: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        title={label}
        onClick={() => input.current?.click()}
        className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <ImagePlus className="h-4 w-4" aria-hidden />
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          // **Zera o valor** · sem isso, escolher o mesmo arquivo duas vezes
          // seguidas não dispara `change` na segunda.
          e.target.value = '';
        }}
      />
    </>
  );
}

/**
 * **Um gatilho só, e o resto mora dentro dele.**
 *
 * A mensagem mostrava **a lixeira e os três emojis** direto na linha, e no
 * celular eles ficavam **sempre visíveis** (não há hover ali) · o Eduardo
 * cortou os dois em 28/08/2026: *"não acho legal o deletar e os emojis
 * aparecerem por padrão assim no mobile, e nem dessa forma de só ter esses
 * emojis aparecendo literalmente"*.
 *
 * Ele está certo por duas razões que se somam: **emoji cru na linha é
 * decoração**, e **ação destrutiva a um toque de distância é acidente
 * esperando**. Num menu, os dois viram o que são · escolha deliberada.
 *
 * **E é aqui que "quem reagiu" fica legível no toque**, onde o `title` da
 * pílula não aparece.
 */
export function MessageActions({
  canDelete,
  canReact,
  reactions,
  labels,
  myHandle,
  onReact,
  onRemove,
}: {
  canDelete: boolean;
  canReact: boolean;
  reactions: ChatMessageView['reactions'];
  labels: { open: string; react: string; remove: string };
  /** O meu `@handle` · sai da lista de quem reagiu. Ver o `named`. */
  myHandle: string | null;
  onReact: (emoji: string) => void;
  onRemove: () => void;
}) {
  /**
   * **A lista nomeia OS OUTROS, e não eu** · a grade acima já acende o que é
   * meu, e repetir o meu `@handle` em três linhas era a redundância que fazia o
   * menu parecer confuso com várias reações · apontado por ele em 28/08/2026.
   *
   * Some inteira quando só eu reagi · aí não há o que a grade não tenha dito.
   */
  const named = reactions
    .map((one) => ({
      emoji: one.emoji,
      names: one.who.filter((handle) => handle !== myHandle).map((handle) => '@' + handle),
    }))
    .filter((one) => one.names.length > 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={labels.open}
        className={cn(
          // **`touch-target` de novo** · o gatilho é pequeno de propósito.
          'touch-target shrink-0 rounded-md p-1 text-muted-foreground transition',
          // No ponteiro ele espera o hover; no toque ele fica, porque lá não há
          // hover **e** o menu é a única porta pras duas ações.
          'opacity-0 group-hover/message:opacity-100 data-[state=open]:opacity-100',
          'focus-visible:opacity-100 pointer-coarse:opacity-60',
          'hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 p-1">
        {canReact && (
          <div className="px-1 pb-1">
            <p className="px-1 pb-1 text-[11px] uppercase tracking-widest text-muted-foreground">
              {labels.react}
            </p>
            {/**
              * **Grade de quatro, e não uma linha** · com oito emojis a linha
              * única espremeria cada um a menos de 30px no celular, que é
              * menos que o dedo. Duas fileiras de quatro dão 9mm de alvo em
              * qualquer largura de menu.
              */}
            <div className="grid grid-cols-4 gap-1">
              {MESSAGE_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={`${labels.react} ${emoji}`}
                  onClick={() => onReact(emoji)}
                  className={cn(
                    'flex h-9 items-center justify-center rounded-md text-base transition',
                    'hover:bg-secondary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                    // **A minha fica acesa aqui** · é o que diz que o próximo
                    // clique **tira** em vez de pôr, sem precisar de segunda
                    // lista pra contar isso.
                    reactions.some((one) => one.emoji === emoji && one.mine) &&
                      'bg-primary/15 ring-1 ring-primary/40',
                  )}
                >
                  <span aria-hidden>{emoji}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/**
         * **Quem reagiu, escrito** · é a metade que faltava, e a única que
         * funciona no toque.
         */}
        {/**
         * **Uma linha por reação que EXISTE, e nunca uma sem nome.**
         *
         * Ela mostrava `✅` e `⏰` sozinhos, sem ninguém do lado · são as
         * reações otimistas, que a tela pinta antes de o servidor responder e
         * que por isso ainda não têm `@handle` nenhum. *"Quando reagiu a
         * múltiplos emojis fica confuso"* (Eduardo, 28/08/2026), e ele está
         * certo: uma lista com buracos é pior que nenhuma.
         *
         * Enquanto o servidor não volta, quem está ali sou **eu** · e é isso
         * que a linha passa a dizer.
         */}
        {named.length > 0 && (
          <div className="border-t px-2 py-1.5">
            {named.map((one) => (
              <p key={one.emoji} className="truncate text-xs text-muted-foreground">
                <span aria-hidden>{one.emoji}</span> {one.names.join(', ')}
              </p>
            ))}
          </div>
        )}

        {canDelete && (
          <DropdownMenuItem
            className="border-t text-destructive focus:bg-destructive/10 focus:text-destructive"
            onSelect={onRemove}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            {labels.remove}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


/**
 * **A fila de reações, debaixo da mensagem** · contagem, e nunca quem.
 *
 * Ela é a peça que o Eduardo pediu (*"isso do `BubbleReactions` é bem legal"*),
 * com o conjunto fechado do `MESSAGE_REACTIONS` · o porquê de ser fechado está
 * lá.
 *
 * **A minha reação fica acesa** · sem isso o botão não diz se o próximo clique
 * põe ou tira.
 */
export function Reactions({
  list,
  onPick,
}: {
  list: ChatMessageView['reactions'];
  onPick?: (emoji: string) => void;
}) {
  if (list.length === 0) return null;
  /**
   * **Colada na mensagem de cima** · com o vão de sempre ela ficava no meio do
   * caminho entre duas bolhas, e não dava pra saber de quem era.
   */
  return (
    <span className="-mt-0.5 flex flex-wrap gap-1">
      {list.map((one) => (
        <button
          key={one.emoji}
          type="button"
          disabled={!onPick}
          onClick={() => onPick?.(one.emoji)}
          /**
           * **Quem reagiu vai no rótulo** · pedido dele em 28/08/2026. No
           * ponteiro isso aparece ao parar em cima; no toque, quem quer a lista
           * abre o menu da mensagem, que também a traz.
           */
          title={one.who.length > 0 ? one.who.map((h) => '@' + h).join(', ') : undefined}
          aria-label={`${one.emoji} ${one.count}${one.who.length ? ' · ' + one.who.map((h) => '@' + h).join(', ') : ''}`}
          className={cn(
            /**
             * **`touch-target`, e não altura de verdade** · sem ele a regra de
             * 44px pra ponteiro grosso estica a pílula e ela vira uma bola no
             * celular · apontado por ele em 28/08/2026, e é a pendência 73 de
             * novo. A classe dá a área de toque **por fora**.
             */
            'touch-target flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition',
            one.mine
              ? 'border-primary/50 bg-primary/15 text-foreground'
              : 'border-border bg-secondary text-muted-foreground',
            onPick && 'hover:border-primary/50',
            !onPick && 'cursor-default',
          )}
        >
          <span aria-hidden>{one.emoji}</span>
          <span className="font-semibold">{one.count}</span>
        </button>
      ))}
    </span>
  );
}





