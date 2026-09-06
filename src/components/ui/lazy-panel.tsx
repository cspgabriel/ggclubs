import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { SkeletonBar } from '@/components/ui/skeleton';
import { apiErrorMessage } from '@/lib/api-error';
import { useResource } from '@/lib/use-resource';
import { useLiveQuery } from '@/lib/realtime/use-live-query';

/**
 * **Um painel que só busca quando alguém abre.**
 *
 * A lista do admin mostra várias edições, e buscar o conteúdo de todas na carga
 * da tela seria uma consulta por edição pra desenhar coisa que quase nunca é
 * aberta. **Abrir é a intenção**, e é ela que paga a busca.
 *
 * ---
 *
 * **Ele existe porque a segunda cópia apareceu, e é a pendência 98.** O painel
 * de inscritos e o de disputas compartilhavam o casco inteiro · o estado
 * `open`/`rows`/`failure`, o `load` com `catch`, o efeito que busca ao abrir, o
 * botão que troca de rótulo e a silhueta enquanto o dado não chega.
 *
 * **Elas divergiram no mesmo bloco em que a segunda nasceu**, que é justamente
 * o que o `CLAUDE.md` manda evitar extraindo na hora: a de disputa ganhou
 * `AbortController` e mensagem de erro, e a de inscritos ficou com falha de
 * rede virando **lista vazia**. Juntar não foi refatoração mecânica · foi
 * escolher o comportamento melhor pras duas, e a de inscritos ganhou o que só a
 * outra tinha. É a prova de que extrair valia.
 *
 * **O `AbortController` não é só pra calar o `StrictMode`** · agir duas vezes
 * em seguida dispara duas buscas, e a resposta antiga chegando depois traz de
 * volta uma linha **já resolvida**.
 */
export function LazyPanel<T>({
  openLabel,
  closedLabel,
  icon,
  load,
  hint,
  empty,
  footer,
  children,
  live,
}: {
  /** O rótulo do botão quando o painel está aberto · ele fecha. */
  openLabel: string;
  closedLabel: string;
  icon?: ReactNode;
  /** A busca · recebe o `signal` e devolve as linhas. */
  load: (signal: AbortSignal) => Promise<T[]>;
  /** Uma linha de contexto acima da lista, quando ela existe. */
  hint?: ReactNode;
  /**
   * O que dizer quando a busca respondeu **e não veio nada**.
   *
   * **Só aparece quando não houve falha**, e essa condição é o ponto: painel
   * vazio sem texto lê como tela que não carregou, e painel vazio **depois de
   * um erro** mente. É a mensagem de erro que separa uma lista genuinamente
   * vazia de uma pergunta que não foi respondida.
   */
  empty?: ReactNode;
  /**
   * O que fica **abaixo** da lista · e ele aparece com ela vazia também.
   *
   * Existe porque a lista de inscritos ganhou um formulário (dar vaga de
   * cortesia, pendência 191) e ele **não pode depender de já haver inscrito**:
   * o `children` só é chamado com linha, e a primeira vaga dada numa edição
   * vazia é justamente o caso em que o formulário sumiria.
   *
   * **Recebe o `reload`** porque quem escreve daqui muda a lista de cima.
   */
  footer?: (reload: () => void) => ReactNode;
  children: (rows: T[], reload: () => void) => ReactNode;
  live?: { topic: string; events: readonly string[] };
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data, error, reload } = useResource((signal) => load(signal), [load], { skip: !open });
  useLiveQuery(open ? (live?.topic ?? null) : null, live?.events ?? [], reload);
  /**
   * **Falhar não é "não tem nada"**, e engolir o erro aqui era o defeito mais
   * caro possível nesta tela: o painel desenharia a mensagem de vazio e o admin
   * fecharia a aba com duas partidas em disputa esperando decisão · ou com a
   * lista de inscritos que ele precisava pra tirar quem sobra.
   *
   * Por isso a lista cai pra **vazia** e a frase aparece · são dois desfechos,
   * e a tela desenha os dois.
   */
  const failure = error ? apiErrorMessage(error, t) : null;
  const rows = error ? [] : data;

  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      <Button size="sm" variant="ghost" onClick={() => setOpen((was) => !was)}>
        {icon}
        {open ? openLabel : closedLabel}
      </Button>

      {open && (
        <>
          {hint}
          {failure && <p className="mt-2 text-sm text-destructive">{failure}</p>}

          {rows === null ? (
            <SkeletonBar className="mt-2 h-8 w-full rounded-lg" />
          ) : rows.length === 0 ? (
            !failure && empty
          ) : (
            children(rows, reload)
          )}

          {/* Depois da lista, e mesmo sem lista · ver o `footer`. */}
          {rows !== null && footer?.(reload)}
        </>
      )}
    </div>
  );
}
