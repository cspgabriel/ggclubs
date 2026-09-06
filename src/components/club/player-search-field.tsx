import { PLAYER_SEARCH_MIN, type PlayerSearchResult } from '@ggclubs/schemas';
import { Info, Loader2, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/avatar';
import { Hint } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { PlatformMark } from '@/components/club/platform-mark';
import { api } from '@/lib/api';
import { positionKey } from '@/lib/position';
import { cn } from '@/lib/utils';
import { useDebounced } from '@/lib/use-debounced';
import { useResource } from '@/lib/use-resource';

/**
 * Campo de busca de player · a peça que a fatia 3 (mercado de free agents)
 * reaproveita, e por isso ela não sabe o que é convite.
 *
 * **Ela devolve uma pessoa escolhida, não um texto digitado.** A primeira
 * versão era um campo de texto com uma lista de sugestão ao lado, e o botão de
 * convidar ficava aceso o tempo todo · dava pra convidar sem nunca ter olhado
 * quem. O Eduardo apontou que o botão parecia solto, e ele estava certo pelo
 * motivo de fundo: **convite tem como alvo uma pessoa, não uma string**.
 *
 * Escolher alguém troca o campo por uma ficha com rosto, nome e @nick · quem
 * confirma vê **quem** está convidando. E quem já sabe o nick continua servido:
 * digitar ele inteiro e apertar Enter escolhe a pessoa, sem precisar do mouse.
 */

/**
 * Espera antes de perguntar ao servidor.
 *
 * **É o mesmo número da checagem de tag e do @nick do cadastro**, e a igualdade
 * é o ponto: são três campos que consultam enquanto a pessoa digita, e três
 * ritmos diferentes se sentem como três campos diferentes.
 */
const DEBOUNCE_MS = 400;

type BlockedReasonKey =
  | 'club.playerSearchMember'
  | 'club.playerSearchInvited'
  | 'club.playerSearchRequested'
  | 'club.playerSearchNoRoom';

/**
 * Por que este player não pode ser convidado agora, ou `null` se pode.
 *
 * O retorno é o **tipo literal das chaves**, e não `string`: é o que faz o
 * catálogo continuar cobrando tradução dos dois idiomas.
 */
function blockedReasonKey(player: PlayerSearchResult): BlockedReasonKey | null {
  switch (player.relationToClub) {
    case 'member':
      return 'club.playerSearchMember';
    case 'invited':
      return 'club.playerSearchInvited';
    case 'pending':
      return 'club.playerSearchRequested';
    default:
      // Sem vaga não impede convidar de verdade · quem confere o teto é a
      // aceitação, de propósito. Mas convidar quem está em três clubs é
      // convite jogado fora, então a tela desencoraja.
      return player.hasRoom ? null : 'club.playerSearchNoRoom';
  }
}

export function PlayerSearchField({
  clubId,
  selected,
  onSelect,
  onOpenChange,
  disabled,
  className,
}: {
  clubId: string;
  selected: PlayerSearchResult | null;
  onSelect: (player: PlayerSearchResult | null) => void;
  /**
   * Avisa quando a lista abre e fecha.
   *
   * Existe por um motivo de layout, e ele apareceu na captura: a lista é
   * flutuante, então ela **passa por cima do que vem abaixo do formulário** ·
   * a dica de "escolha alguém" ficava cortada ao meio atrás dela. Enquanto a
   * lista está aberta a dica não tem função (a pessoa está justamente
   * escolhendo), então quem chama a esconde.
   */
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const listId = useId();
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  const prefix = term.trim().replace(/^@/, '').toLowerCase();
  const tooShort = prefix.length < PLAYER_SEARCH_MIN;
  const debounced = useDebounced(prefix, DEBOUNCE_MS);

  /**
   * **A espera só acende depois do debounce**, e nunca antes: a regra do
   * `design.md` é que indicador abaixo de ~300ms piora o que deveria melhorar.
   * O `useDebounced` só troca o valor passados os {@link DEBOUNCE_MS}, e é a
   * troca dele que liga o `loading` · o comportamento é o mesmo do timer que
   * morava aqui, com o cancelamento saindo de graça.
   *
   * **Falha de busca não é assunto de quem está digitando** · erro de verdade
   * aparece no envio, então o `error` é ignorado e a lista fica nula.
   */
  const {
    data: found,
    loading: searching,
    setData: setFound,
  } = useResource(
    (signal) => api.searchPlayers(debounced, clubId, { signal }),
    [debounced, clubId],
    /**
     * **O `debounced` também precisa ser longo o bastante**, e não só o
     * `prefix` · eles trocam em instantes diferentes.
     *
     * Achado por revisão em 01/09/2026: digitando a segunda letra dentro dos
     * 400ms, o `tooShort` virava `false` **na hora** e o `skip` caía, mas o
     * `debounced` ainda era o valor curto · a busca saía com o prefixo antigo,
     * a rota recusava por schema (mínimo de {@link PLAYER_SEARCH_MIN}), e o
     * balde do rate limit era consumido por uma requisição que nunca ia
     * responder nada. De quebra a lista de sugestões **fechava e reabria**.
     *
     * O `tooShort` continua no `skip` porque é ele que **limpa na hora** quando
     * a pessoa apaga · os dois juntos são a condição inteira.
     */
    { skip: tooShort || Boolean(selected) || debounced.length < PLAYER_SEARCH_MIN },
  );
  const results = found?.players ?? null;
  const hasMore = found?.hasMore ?? false;

  /** Resposta nova recomeça a navegação por teclado. */
  useEffect(() => {
    setActive(-1);
  }, [found]);

  // Clicar fora fecha · a lista é flutuante e ficaria pendurada sobre o resto
  // do formulário.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // **Calculado antes do retorno antecipado da ficha**, porque o efeito abaixo
  // é hook: hook depois de um `return` condicional muda de ordem entre renders
  // e o React não aceita. Com alguém escolhido a lista não existe.
  const visible = !selected && open && !tooShort && (searching || results !== null);

  useEffect(() => {
    onOpenChange?.(visible);
  }, [visible, onOpenChange]);

  function choose(player: PlayerSearchResult) {
    if (blockedReasonKey(player)) return;
    onSelect(player);
    setTerm('');
    setFound(null);
    setOpen(false);
  }

  function clear() {
    onSelect(null);
    setTerm('');
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!results || results.length === 0) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => (current + step + results.length) % results.length);
      return;
    }
    if (e.key === 'Enter') {
      // **Enter escolhe, e nunca envia.** Com item destacado, escolhe ele;
      // sem destaque, escolhe quem tem o nick exatamente igual ao digitado ·
      // é o caminho de quem veio do Discord já sabendo, e ele não pode
      // depender do mouse.
      const target = active >= 0 ? results[active] : results.find((p) => p.handle === prefix);
      if (target) {
        e.preventDefault();
        choose(target);
      }
    }
  }

  if (selected) {
    // A ficha de quem foi escolhido · substitui o campo, porque a pergunta
    // "quem?" já foi respondida e um campo aberto ao lado convidaria a
    // responder de novo.
    return (
      <div
        /**
         * **Altura fixa de 44px, igual à do botão ao lado.**
         *
         * Com `min-h-11` ela crescia: são duas linhas de texto, e nome mais
         * @nick passam dos 44 · a ficha ficava mais alta que o "Convidar" e a
         * linha inteira lia torta. O botão tem `h-11` cravado, então quem
         * precisa se ajustar é a ficha.
         *
         * `leading-tight` nas duas linhas é o que faz o texto caber sem cortar
         * · sem ele a altura fixa esconderia o @nick em vez de alinhar.
         */
        className={cn(
          'flex h-11 items-center gap-3 rounded-lg border bg-card px-3',
          className,
        )}
      >
        <Avatar name={selected.displayName} src={selected.avatarUrl} className="h-8 w-8 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold leading-tight">
            {selected.displayName}
          </span>
          <span className="block truncate text-xs leading-tight text-muted-foreground">
            @{selected.handle}
          </span>
        </span>
        <button
          type="button"
          onClick={clear}
          disabled={disabled ?? false}
          aria-label={t('club.playerSearchClear')}
          className="touch-target grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    );
  }


  return (
    <div ref={boxRef} className={cn('relative', className)}>
      <span className="relative block">
        {/* O @ some do campo desde que ele também busca por nome · com ele ali,
            o afixo prometia que só nick era aceito. O `replace` no valor
            continua aceitando quem digitar o @ por hábito. */}
        <Input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t('club.invitePlaceholder')}
          aria-label={t('club.invite')}
          className="h-11"
          autoComplete="off"
          role="combobox"
          aria-expanded={visible}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled ?? false}
        />
      </span>

      {visible && (
        <ul
          id={listId}
          role="listbox"
          // 8px de vão, que é a medida das outras superfícies flutuantes daqui
          // (o `sideOffset` do `dropdown-menu`).
          //
          // **`scroll-thin` e `pr-2` são o par da casa pra lista dentro de
          // painel** · sem o primeiro o Chrome desenha 15px encostando na borda
          // arredondada, e sem o segundo o nome do jogador toca a barra. Medido
          // aqui em 01/09/2026 com nove resultados · a lista rola de verdade.
          // O mesmo par está no seletor de país e na sala de conversa.
          className="scroll-thin absolute z-20 mt-2 max-h-80 w-full overflow-y-auto overscroll-contain rounded-xl border bg-popover p-1 pr-2 shadow-lg"
        >
          {searching && (
            <li className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
              {t('club.playerSearchLoading')}
            </li>
          )}

          {!searching && results?.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">
              {t('club.playerSearchEmpty')}
            </li>
          )}

          {!searching &&
            results?.map((player, index) => {
              const blocked = blockedReasonKey(player);
              return (
                <li key={player.handle}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    aria-disabled={blocked !== null}
                    onClick={() => choose(player)}
                    onMouseEnter={() => setActive(index)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left',
                      blocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                      index === active && !blocked && 'bg-secondary',
                    )}
                  >
                    <Avatar name={player.displayName} src={player.avatarUrl} className="h-8 w-8" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {player.displayName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        @{player.handle}
                      </span>
                    </span>
                    {player.position && (
                      <span className="shrink-0 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {t(positionKey(player.position))}
                      </span>
                    )}
                    {player.platform && (
                      <PlatformMark platform={player.platform} subject="player" />
                    )}
                    {blocked && (
                      <>
                        {/* **Ícone só onde o texto não cabe, texto só onde
                            cabe.** Mostrar os dois a partir de `sm` fazia a
                            dica repetir palavra por palavra a frase do lado ·
                            dica que repete o que já se lê não informa. */}
                        <Hint label={t(blocked)}>
                          <span className="flex shrink-0 items-center text-muted-foreground sm:hidden">
                            <Info className="h-4 w-4 shrink-0" aria-hidden />
                          </span>
                        </Hint>
                        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                          {t(blocked)}
                        </span>
                      </>
                    )}
                  </button>
                </li>
              );
            })}

          {/* **O corte se declara.** Sem esta linha a lista mostra oito como se
              fossem todos, e quem procurou um nome comum conclui que a pessoa
              não está aqui. Paginar dentro de um menu suspenso seria pior · a
              lista navegável é a fatia 3, não este campo. */}
          {!searching && hasMore && (
            <li className="border-t px-3 py-2 text-xs text-muted-foreground">
              {t('club.playerSearchMore')}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
