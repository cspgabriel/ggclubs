import { DEFAULT_PHONE_COUNTRY, type PhoneNumber, dialOf } from '@ggclubs/schemas';
import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { countryOptions } from '@/lib/phone-countries';
import {
  digitsOnly,
  flagSrc,
  formatAsTyped,
  isFull,
  isTooLong,
  phoneIsValid,
  readTyped,
} from '@/lib/phone-input';
import { cn } from '@/lib/utils';

/**
 * O telefone, com a bandeira ao lado · **a mesma peça no cadastro, na conta e
 * na inscrição**.
 *
 * Nasceu em 01/09/2026, e o pedido do Eduardo trazia o desenho: *"selecionar a
 * bandeira pra ter o controle de +55, +351 e coisas do tipo pra funcionar pra
 * qualquer tipo de número/país e não ser uma dor de cabeça no futuro"*.
 *
 * ## As quatro coisas que fazem ele não atrapalhar
 *
 * | | |
 * |---|---|
 * | **bandeira de verdade** | SVG servido de `public/flags` · o emoji de indicador regional **não desenha no Windows**, e mostrava as letras `BR` |
 * | **o `+` manda** | colar ou digitar `+351…` **troca o país** · sem isso o campo gravaria `+55351…` |
 * | **autopreencher entra inteiro** | `autoComplete="tel"` e o navegador enche com o internacional · a mesma função que trata o `+` absorve |
 * | **formata enquanto digita** | `(11) 98765-4321` · é assim que a pessoa confere que acertou |
 *
 * ## Ele BARRA número fora do padrão, e isso mudou em 01/09/2026
 *
 * A primeira versão avisava em cinza e salvava assim mesmo. O Eduardo recusou:
 * *"se conseguimos saber exatamente o padrão, vamos deixar aceitando apenas o
 * padrão"* · e o custo de um número quebrado não é aqui, é na hora de pagar a
 * premiação, quando já não há como corrigir. Ver o `phoneIsValid`, que só cobra
 * onde a biblioteca conhece o padrão.
 *
 * **Quem desliga o botão é quem chama** · o campo mostra o motivo, e o
 * formulário decide o que fazer com ele. Os três chamadores usam o
 * `phoneIsValid` pra isso.
 *
 * ## O layout é lado a lado, e só empilha abaixo de 360px
 *
 * **A 320px, lado a lado, o seletor comia a linha** e o campo do número
 * mostrava `11 9876` · o placeholder cortado no meio. Achado na captura antes de
 * a tela existir pra alguém, e **nenhum teste pega isso**.
 *
 * A resposta de então foi empilhar abaixo de `sm` (640px), e ela ficou grande
 * demais quando o seletor encolheu de 160 pra 112px em 01/09/2026 · aí os dois
 * cabem muito antes disso, e empilhar dentro de um diálogo é altura jogada
 * fora. **O corte em 360 é medido:** a 320px sobram 92px úteis pro número, e
 * nem o placeholder (107px) nem o valor completo `(11) 98765-4321` (~110px)
 * cabem ali.
 */
export function PhoneField({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: PhoneNumber | null;
  onChange: (value: PhoneNumber | null) => void;
  disabled?: boolean;
}) {
  const { t, i18n } = useTranslation();

  /**
   * **O país escolhido é estado próprio, e não derivado do valor.**
   *
   * Ele era `value?.country ?? DEFAULT_PHONE_COUNTRY`, e o defeito só apareceu
   * quando o campo passou a nascer vazio dentro do diálogo da inscrição: **sem
   * número, escolher Portugal não trocava a bandeira**, porque não havia
   * `value` de onde tirar o país. Quem abrisse o modal, escolhesse Portugal e
   * digitasse um número português gravaria ele debaixo de `+55`.
   *
   * O valor de fora continua mandando quando ele muda por outro caminho · a
   * conta carregando, ou um `+351` colado no campo.
   */
  const [country, setCountry] = useState(value?.country ?? DEFAULT_PHONE_COUNTRY);

  /**
   * **O texto é estado próprio, e não derivado do valor.**
   *
   * Sem isso, formatar a cada tecla devolve o cursor pro fim e apagar um dígito
   * do meio vira briga com o campo. Aqui o que a pessoa vê é o que ela digitou,
   * passado pelo formatador · e o valor de fora só reescreve o texto quando ele
   * muda por outro caminho (a conta carregando, o país trocando).
   */
  const [text, setText] = useState(() => formatAsTyped(value));
  const lastValue = useRef(value?.e164 ?? null);

  useEffect(() => {
    if ((value?.e164 ?? null) !== lastValue.current) {
      lastValue.current = value?.e164 ?? null;
      setText(formatAsTyped(value));
      if (value) setCountry(value.country);
    }
  }, [value]);

  const apply = (next: PhoneNumber | null): void => {
    lastValue.current = next?.e164 ?? null;
    onChange(next);
  };

  /**
   * O texto na tela depois de uma tecla · e ele tem **duas exceções ao
   * formato**, as duas medidas no navegador.
   *
   * Formatar a cada tecla é o que faz `(11) 98765-4321` aparecer sozinho, e é
   * conferência: ninguém lê onze dígitos seguidos e sabe se acertou. Mas
   * reescrever o campo **move o cursor pro fim**, então:
   *
   * - **cursor no meio** · a pessoa está corrigindo um dígito lá atrás, e
   *   formatar a jogaria pro fim a cada tecla. Ali o texto passa cru.
   * - **apagou um separador** · o backspace sobre o espaço ou o traço não muda
   *   dígito nenhum, e o formatador poria o separador de volta na mesma hora ·
   *   pra quem digita, a tecla fica **travada**.
   */
  const onType = (typed: string, caretAtEnd: boolean): void => {
    const next = readTyped(typed, country);
    // **A tecla que estouraria o comprimento do país não entra** · o campo fica
    // como estava, sem mensagem. Ver o `isTooLong`.
    if (isTooLong(next)) return;
    apply(next);
    // **O `+` troca o país e some do campo** · ele passa a estar na bandeira,
    // que é onde a pessoa o procura depois.
    if (typed.trim().startsWith('+')) {
      if (next) setCountry(next.country);
      setText(formatAsTyped(next));
      return;
    }
    const erasedSeparator = digitsOnly(typed) === digitsOnly(text) && typed.length < text.length;
    setText(caretAtEnd && !erasedSeparator ? formatAsTyped(next) : typed);
  };

  const onPickCountry = (iso: string): void => {
    setCountry(iso);
    if (!value) {
      // **Trocar o país sem número não declara telefone nenhum** · a bandeira
      // muda (é ela que diz onde a pessoa vai digitar), e continua não havendo
      // telefone até alguém digitar um dígito.
      apply(null);
      return;
    }
    const digits = digitsOnly(text);
    const next = readTyped(digits, iso);
    apply(next);
    setText(formatAsTyped(next));
  };

  /**
   * **O erro não aparece enquanto a pessoa está no meio do número.**
   *
   * Pedido do Eduardo em 01/09/2026: acusar "não bate com o padrão" no terceiro
   * dígito é acusar alguém de estar escrevendo. Então ele só sai quando **o
   * campo encheu** (e mesmo assim o número não bate), ou quando a pessoa **tira
   * o foco** · aí ela terminou, e o silêncio viraria armadilha.
   */
  const [touched, setTouched] = useState(false);
  const invalid = value !== null && !phoneIsValid(value);
  const showInvalid = invalid && (touched || isFull(value));

  return (
    <div className="space-y-1.5">
      {/* **Lado a lado a partir de 360px**, e o corte mudou em 01/09/2026.
          Ele empilhava abaixo de `sm` (640px) porque o seletor tinha 160px e
          comia a linha · com o gatilho em 112px os dois cabem muito antes
          disso, e empilhar dentro de um diálogo era altura jogada fora.

          **Os 360 são medidos, não escolhidos:** a 320px sobram 92px úteis pro
          número, e nem o placeholder (107px) nem o valor completo
          `(11) 98765-4321` (~110px) cabem ali. É o mesmo defeito de antes com
          outro número. De 375px pra cima sobra folga. */}
        <div className="flex flex-col gap-2 min-[360px]:flex-row">
        <CountryPicker
          id={`${id}-country`}
          label={t('phone.countryLabel')}
          value={country}
          onChange={onPickCountry}
          locale={i18n.language}
          disabled={disabled}
        />
        <Input
          id={id}
          // `tel` abre o teclado numérico no celular · e `autoComplete="tel"` é
          // o que faz o gerenciador de senhas e o navegador oferecerem o número
          // guardado. Ele vem **internacional**, e o `readTyped` absorve.
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          disabled={disabled}
          className="h-11"
          placeholder={t('phone.placeholder')}
          value={text}
          onChange={(e) => {
            // Voltar a digitar cala o erro de novo · a pessoa está consertando,
            // e insistir na acusação enquanto ela conserta é ruído.
            setTouched(false);
            // `selectionStart` é `null` em campo que não suporta seleção · aqui
            // ele suporta (`tel` é de texto), e o `null` cai pro caso comum,
            // que é digitar no fim.
            const caret = e.target.selectionStart;
            onType(e.target.value, caret === null || caret === e.target.value.length);
          }}
          onBlur={() => {
            setTouched(true);
          }}
        />
      </div>
      {/* **Erro, e não aviso** · vermelho, e quem chama desliga o salvar. */}
      {showInvalid ? <p className="text-xs text-destructive">{t('phone.invalid')}</p> : null}
    </div>
  );
}

/**
 * O campo com **rótulo e dica**, que é como as três telas o usam.
 *
 * Existe porque a terceira cópia apareceu · o cadastro e a conta eram idênticos
 * e o diálogo da inscrição já nasceu divergindo em dois pontos. A regra da casa
 * é extrair quando a segunda cópia aparece, e aqui já era a hora.
 *
 * As duas chaves são presentação de verdade, e não configuração disfarçada:
 * dentro do diálogo o título já diz o que o campo é (então o rótulo fica
 * `sr-only`, presente pra leitor de tela) e o corpo do diálogo já explica pra
 * que serve (então a dica sairia repetida).
 */
export function PhoneFormField({
  id,
  value,
  onChange,
  disabled,
  labelHidden = false,
  hint = true,
}: {
  id: string;
  value: PhoneNumber | null;
  onChange: (value: PhoneNumber | null) => void;
  disabled?: boolean;
  labelHidden?: boolean;
  hint?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={cn(labelHidden && 'sr-only')}>
        {t('phone.label')}
      </Label>
      <PhoneField id={id} value={value} onChange={onChange} disabled={disabled} />
      {hint ? <p className="text-xs text-muted-foreground">{t('phone.hint')}</p> : null}
    </div>
  );
}

/**
 * O seletor de país · **com busca, porque são 136.**
 *
 * Brasil e Portugal ficam no topo e resolvem quase todo mundo · a busca existe
 * pro resto, e sem ela achar "Moçambique" é rolar uma lista. **Não é o
 * `SelectField` da casa** por isso: aquele é pra lista curta, e acrescentar
 * busca nele mudaria o componente que sete telas usam.
 *
 * ## Por que ele é `Popover` do Radix, e não uma lista escrita à mão
 *
 * Ele **era** escrita à mão: um `absolute` com ouvinte de clique-fora e de
 * `Escape` no documento. Funcionava enquanto o campo vivia só em página. Quando
 * ele passou a ser pedido **dentro do diálogo da inscrição** (01/09/2026),
 * quebrou em três, e as três foram medidas no navegador:
 *
 * | o que quebrou | por quê |
 * |---|---|
 * | a lista era **cortada** | o cartão do `DialogSurface` é `overflow-hidden` · ela terminava 184px abaixo da borda e sumia sem barra de rolagem |
 * | `Esc` fechava **a inscrição inteira** | o `DismissableLayer` do Radix escuta no mesmo `document` e registrou primeiro · `stopPropagation` não alcança ouvinte irmão |
 * | a **busca não recebia foco** | o `FocusScope` do diálogo puxa de volta tudo que está fora do cartão |
 *
 * **Portal resolvia o primeiro e piorava os outros dois.** Camada aninhada é o
 * problema que o `DismissableLayer` e o `FocusScope` existem pra resolver, e
 * eles só cooperam entre si · uma camada de fora nunca vira a de cima.
 *
 * O `@radix-ui/react-popover` entrou por isso, e é o décimo terceiro
 * `@radix-ui/*` daqui · mesma família, mesmo desenho. Ele traz portal,
 * empilhamento, detecção de borda, `Esc` fechando **só a camada de cima** e
 * foco que fica. O que sobra aqui é a busca e a lista.
 */
function CountryPicker({
  id,
  label,
  value,
  onChange,
  locale,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (iso: string) => void;
  locale: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const search = useRef<HTMLInputElement>(null);

  /**
   * **Fechar limpa a busca, e passa por aqui SEMPRE.**
   *
   * Isto já esteve dentro do `onOpenChange`, e escolher um país escapava: o
   * `Popover` é controlado, então `setOpen(false)` direto **não chama** aquele
   * handler. O desfecho, medido em 01/09/2026: quem buscava "portu", escolhia
   * Portugal e reabria a lista encontrava **um país só** e nada pra rolar ·
   * parecia lista quebrada, e a busca ainda estava preenchida lá em cima.
   */
  const close = (): void => {
    setOpen(false);
    setQuery('');
  };
  const options = useMemo(() => countryOptions(locale), [locale]);

  const shown = query
    ? options.filter((o) => o.search.includes(query.trim().toLowerCase()))
    : options;

  return (
    <Popover.Root
      /**
       * **`modal` é o que faz a lista ROLAR dentro do diálogo**, e sem ele a
       * roda do mouse morre em silêncio.
       *
       * O `AlertDialog` monta um `react-remove-scroll` que **impede rolagem em
       * tudo que não está dentro do cartão dele** · a lista vai pro portal,
       * fica fora, e a roda simplesmente não faz nada. Medido em 01/09/2026:
       * na página da conta a lista rolava (`scrollTop 0 → 300`), e dentro do
       * modal ficava em `0`.
       *
       * Com `modal`, o `Popover` monta o **seu** bloqueio por cima, e o de cima
       * é quem decide onde a rolagem vale · aí a lista passa a ser a área
       * permitida. É a mesma pilha que o `Select` do Radix usa pra funcionar
       * dentro de diálogo.
       */
      modal
      open={open}
      onOpenChange={(next) => {
        if (next) setOpen(true);
        else close();
      }}
    >
      <Popover.Trigger asChild>
        <button
          id={id}
          type="button"
          aria-label={label}
          disabled={disabled}
          // `w-28` cabe o maior caso da lista · são 4 dígitos com o `+`
          // (`+351`), e nenhum código de país aqui passa de três.
          className="flex h-11 w-28 shrink-0 items-center gap-2 rounded-xl border bg-background px-3 text-sm disabled:opacity-50"
        >
          <img src={flagSrc(value)} alt="" className="h-4 w-6 shrink-0 rounded-xs object-cover" />
          <span className="flex-1 text-left tabular-nums">+{dialOf(value) ?? ''}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          // `z-[60]` porque o véu e o cartão do diálogo são `z-50`.
          // `--radix-popover-content-available-height` é o que o Radix mede até
          // a borda da janela · sem ele a lista passa por baixo do rodapé no
          // celular.
          className="z-[60] w-[var(--radix-popover-trigger-width)] min-w-64 rounded-xl border bg-popover p-1 shadow-lg"
          style={{ maxHeight: 'var(--radix-popover-content-available-height)' }}
          // Sem isto o Radix devolve o foco pro gatilho e a busca nunca o recebe.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            search.current?.focus();
          }}
        >
          <div className="relative mb-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={search}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
              placeholder={t('phone.searchCountry')}
              aria-label={t('phone.searchCountry')}
              className="h-9 w-full rounded-lg border bg-background pl-8 pr-2 text-sm outline-none"
            />
          </div>
          {/* `scroll-thin` é a barra da casa pra lista dentro de painel · ver o
              `index.css`. Sem ela o Chrome desenha 15px encostando na borda.
              O `pr-2` afasta a linha da barra · é o que a sala de conversa já
              fazia com `pr-3`, e sem ele o nome do país encosta nela. */}
          <ul role="listbox" className="scroll-thin max-h-56 overflow-auto overscroll-contain pr-2">
            {shown.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  onClick={() => {
                    onChange(o.value);
                    close();
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-secondary',
                    o.value === value && 'bg-secondary',
                  )}
                >
                  <img
                    src={flagSrc(o.value)}
                    alt=""
                    loading="lazy"
                    className="h-4 w-6 shrink-0 rounded-xs object-cover"
                  />
                  <span className="flex-1 truncate">{o.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    +{o.dial}
                  </span>
                  {o.value === value ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                </button>
              </li>
            ))}
            {shown.length === 0 ? (
              <li className="px-2 py-3 text-center text-xs text-muted-foreground">
                {t('phone.noCountry')}
              </li>
            ) : null}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
