import { Bold, Eye, Heading2, Italic, Link2, List, ListOrdered, Pencil, Quote } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LegalDocument } from './legal-document';
import { Button } from './ui/button';
import { CharCount } from './ui/char-count';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { applyMarkdownFormat, type MarkdownFormat } from '@/lib/markdown-format';
import { cn } from '@/lib/utils';

const FORMATS = [
  ['heading', Heading2],
  ['bold', Bold],
  ['italic', Italic],
  ['list', List],
  ['ordered', ListOrdered],
  ['quote', Quote],
  ['link', Link2],
] as const satisfies readonly (readonly [MarkdownFormat, unknown])[];

/**
 * O campo de Markdown com barra de formato e prévia · o regulamento da edição e
 * os documentos legais escrevem por aqui.
 *
 * **A prévia usa o mesmo renderizador das páginas públicas** · prévia que
 * desenha diferente do que vai ao ar não é prévia. E o campo **não sai do DOM**
 * enquanto ela está aberta: desmontar o textarea a cada troca recriava o campo
 * com o cursor no início, a rolagem no topo e **a pilha de desfazer do
 * navegador descartada**, num documento legal inteiro.
 *
 * **Compõe o `Textarea` da casa em vez de escrever um `<textarea>`** · este
 * componente substituiu dois campos escritos à mão e nasceu como o terceiro
 * estilo, sem o `overscroll-contain` (o compositor do chat já foi flagrado
 * rolando a página atrás de um diálogo por falta dele) e sem o `field-sizing`.
 * O que a moldura muda no campo está no `className`, com o motivo.
 */
export function MarkdownEditor({
  id,
  label,
  value,
  onChange,
  rows = 8,
  maxLength,
  placeholder,
  previewLabel,
}: {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  previewLabel?: ReactNode;
}) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  /**
   * A seleção que o próximo render precisa devolver. Quando o valor chega pelo
   * `onChange`, o React reescreve `value` no nó e o cursor vai pro fim · a
   * seleção só pode ser posta **depois** do commit, e é o que o efeito abaixo faz.
   */
  const pendingSelection = useRef<[number, number] | null>(null);

  useLayoutEffect(() => {
    const pending = pendingSelection.current;
    if (!pending || !input.current) return;
    pendingSelection.current = null;
    input.current.setSelectionRange(pending[0], pending[1]);
  }, [value]);

  function format(kind: MarkdownFormat) {
    const field = input.current;
    if (!field) return;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const result = applyMarkdownFormat(value, start, end, kind, t('markdown.sampleText'));
    if (maxLength !== undefined && result.text.length > maxLength) {
      setLimitReached(true);
      return;
    }
    setLimitReached(false);
    field.focus();
    field.setSelectionRange(start, end);

    /**
     * **Pela pilha de desfazer do navegador, onde ela existe.** `insertText`
     * edita como se a pessoa tivesse digitado, então Ctrl+Z desfaz o clique da
     * barra · trocar o valor inteiro por `onChange` apaga a pilha, e a barra
     * tem sete botões e nenhum de desfazer. O `input` que o comando dispara já
     * passa pelo `onChange` do campo. O jsdom não tem o comando, e é por isso
     * que o caminho de baixo continua existindo · e a conferência de que a
     * edição pegou é a regra da casa: comando que retorna `true` sem escrever
     * não pode deixar o campo com metade do formato.
     */
    const inserted =
      typeof document.execCommand === 'function' &&
      document.execCommand('insertText', false, result.insert) &&
      field.value === result.text;
    if (inserted) {
      field.setSelectionRange(result.selectionStart, result.selectionEnd);
      return;
    }
    pendingSelection.current = [result.selectionStart, result.selectionEnd];
    onChange(result.text);
  }

  return (
    <div className="min-w-0 space-y-2" data-markdown-editor>
      <Label htmlFor={id}>{label}</Label>
      <div className="min-w-0 overflow-hidden rounded-xl border border-input bg-background focus-within:border-primary/50">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card/60 p-2">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              aria-pressed={!preview}
              onClick={() => setPreview(false)}
              className={cn('gap-2', !preview && 'bg-secondary text-foreground')}
            >
              <Pencil className="size-3.5" aria-hidden />
              {t('markdown.write')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-pressed={preview}
              onClick={() => setPreview(true)}
              className={cn('gap-2', preview && 'bg-secondary text-foreground')}
            >
              <Eye className="size-3.5" aria-hidden />
              {t('markdown.preview')}
            </Button>
          </div>
          {/* Sempre à vista, e não só perto do fim como nos campos curtos · num
              teto de milhares o "perto do fim" chegaria tarde, e é o contador
              que diz por que o `maxLength` parou de aceitar tecla. */}
          {maxLength !== undefined && (
            <span className="px-2">
              <CharCount value={value} max={maxLength} within={maxLength} />
            </span>
          )}
        </div>
        {preview && (
          <div className="min-h-40 p-4 sm:p-5" role="region" aria-label={t('markdown.preview')}>
            {previewLabel && <p className="mb-4 text-xs text-muted-foreground">{previewLabel}</p>}
            {value.trim() ? (
              <LegalDocument body={value} />
            ) : (
              <p className="text-sm text-muted-foreground">{t('markdown.emptyPreview')}</p>
            )}
          </div>
        )}
        <div hidden={preview}>
          <div
            className="flex flex-wrap gap-1 border-b border-border/60 px-2 py-1.5"
            role="group"
            aria-label={t('markdown.formatting')}
          >
            {FORMATS.map(([kind, Icon]) => (
              <Button
                key={kind}
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title={t(`markdown.${kind}`)}
                aria-label={t(`markdown.${kind}`)}
                // O clique não rouba o foco do campo · é a seleção dele que a
                // barra lê, e o `format` devolve o foco de todo jeito.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => format(kind)}
              >
                <Icon className="size-4" aria-hidden />
              </Button>
            ))}
          </div>
          <Textarea
            ref={input}
            id={id}
            value={value}
            rows={rows}
            maxLength={maxLength}
            placeholder={placeholder}
            spellCheck
            aria-describedby={`${id}-hint`}
            onChange={(event) => {
              setLimitReached(false);
              onChange(event.target.value);
            }}
            onKeyDown={(event) => {
              if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
              const key = event.key.toLowerCase();
              if (key === 'b' || key === 'i') {
                event.preventDefault();
                format(key === 'b' ? 'bold' : 'italic');
              }
            }}
            // O `field-sizing: content` ignora o `rows`, então o piso é altura ·
            // em linhas do próprio campo (`lh`), mais o respiro. O `rows` fica
            // pra quem não suporta a propriedade.
            style={{ minHeight: `calc(${rows} * 1lh + 2rem)` }}
            className={cn(
              // A moldura já tem borda, canto e o foco (`focus-within`) · o
              // campo dentro dela não repete nenhum dos três.
              'rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0',
              'resize-y p-4 font-mono leading-relaxed placeholder:text-muted-foreground/70 sm:p-5',
              // Teto maior que o do campo de formulário: aqui o texto É a tela,
              // e 256px mostrariam um terço de um regulamento. Passando disso
              // ele rola por dentro, com o `overscroll-contain` que o `Textarea`
              // já carrega.
              'max-h-[calc(var(--app-viewport-h)*0.7)]',
            )}
          />
        </div>
      </div>
      <p id={`${id}-hint`} className="text-xs leading-relaxed text-muted-foreground">
        {t('markdown.hint')}
      </p>
      {limitReached && (
        <p role="status" className="text-xs text-destructive">
          {t('markdown.limitReached')}
        </p>
      )}
    </div>
  );
}
