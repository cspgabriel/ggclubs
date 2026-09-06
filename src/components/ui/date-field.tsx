import { CalendarDays } from 'lucide-react';
import { useId, useRef } from 'react';
import { activeLanguage } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * Campo de data com a identidade da casa · o par do `SelectField`.
 *
 * **O `<input type="date">` cru é o único controle do produto que o navegador
 * desenha por conta**, e ele desenha errado pra este tema: o texto sai com a
 * fonte do sistema, o ícone de calendário vem no cinza do Chromium, e no dark o
 * conjunto lê como campo desabilitado. Era o mesmo motivo que fez o `<select>`
 * nativo sair do produto inteiro em 08/08/2026.
 *
 * **Ele continua sendo um `input type="date"` por dentro, e isso é decisão:** o
 * calendário nativo é acessível, sabe teclado, sabe idioma e é o que a pessoa já
 * conhece no celular. Escrever um datepicker próprio seria trocar tudo isso por
 * aparência · o que a gente troca aqui é só a **casca**.
 *
 * As três coisas que a casca faz:
 *
 * 1. **o valor é mostrado por nós**, formatado no idioma ativo · o `input` fica
 *    transparente por cima, então o texto é o nosso e o calendário é o dele;
 * 2. **o ícone é o nosso**, e clicar nele abre o calendário (`showPicker`);
 * 3. **o foco desenha o mesmo anel** do resto dos campos.
 */
export function DateField({
  id,
  label,
  value,
  onChange,
  min,
  withTime,
  disabled,
  className,
}: {
  id?: string;
  /** Rótulo acessível · a tela desenha o `<Label>` visível por fora. */
  label: string;
  /** `yyyy-mm-dd`, ou `yyyy-mm-ddThh:mm` com `withTime` · como o `input` nativo. */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  /**
   * O campo pede **hora junto**, e não só o dia.
   *
   * Existe porque data de campeonato **é um instante combinado** · "começa 24 de
   * agosto" não organiza a noite de ninguém. Até 22/08/2026 o formulário só
   * tinha dia e o servidor cravava **meio-dia**, o que dava rodadas ao meio-dia
   * pra um campeonato que acontece às 21h.
   */
  withTime?: boolean;
  /** Desligado · quem desliga precisa dizer por que, ao lado. */
  disabled?: boolean;
  className?: string;
}) {
  const generated = useId();
  const inputId = id ?? generated;
  const input = useRef<HTMLInputElement | null>(null);

  return (
    <div className={cn('relative', className)}>
      <input
        ref={input}
        id={inputId}
        type={withTime ? 'datetime-local' : 'date'}
        aria-label={label}
        value={value}
        min={min}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        /**
         * **Transparente, e não escondido.** Um `input` com `sr-only` perderia o
         * calendário nativo e o teclado junto · aqui ele continua sendo o
         * controle de verdade, ocupando a caixa inteira, só que sem pintar nada.
         * O `color-scheme: dark` é o que faz o calendário do navegador abrir no
         * tema certo, e ele não tem equivalente em classe.
         */
        className={cn(
          'peer h-11 w-full rounded-lg border border-input bg-background px-3 text-transparent',
          'outline-hidden transition-colors focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/25',
          // O indicador nativo some · quem abre o calendário é o nosso ícone.
          '[&::-webkit-calendar-picker-indicator]:opacity-0',
          disabled && 'cursor-not-allowed opacity-50',
        )}
        style={{ colorScheme: 'dark' }}
      />

      {/* O valor, desenhado por nós · `pointer-events-none` pra o clique cair no
          `input` que está por baixo em toda a área. */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm',
          disabled ? 'text-muted-foreground/60' : value ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {value ? formatDisplay(value) : '--'}
      </span>

      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={() => {
          // `showPicker` é o caminho suportado; onde ele não existe, o clique
          // no `input` transparente já abre o calendário sozinho.
          input.current?.showPicker?.();
        }}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground peer-focus-visible:text-primary"
      >
        <CalendarDays className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * `yyyy-mm-dd` no formato do idioma ativo.
 *
 * **Monta a data pelas partes, e não com `new Date(value)`** · a string curta é
 * lida como UTC, então em fuso negativo ela vira o dia anterior na tela. É o
 * defeito clássico de campo de data, e aqui ele apareceria como "o prazo mudou
 * sozinho".
 */
function formatDisplay(value: string): string {
  const [date, time] = value.split('T');
  const [y, m, d] = (date ?? '').split('-').map(Number);
  if (!y || !m || !d) return value;
  const [hh, mm] = (time ?? '').split(':').map(Number);
  // **Montada pelas partes nos dois casos** · com hora junto o valor já é local
  // por definição do `datetime-local`, e passar por `new Date(string)` seria
  // convidar o mesmo deslocamento de fuso que a versão só-data sofria.
  const when = new Date(y, m - 1, d, hh ?? 0, mm ?? 0);
  return when.toLocaleString(activeLanguage, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(time ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}
