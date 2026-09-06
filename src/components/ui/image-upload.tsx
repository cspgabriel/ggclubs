import { MAX_UPLOAD_BYTES } from '@ggclubs/schemas';
import { ImageUp, Loader2, Trash2 } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { type ImagePicker } from '@/lib/use-image-picker';

/**
 * Escolher uma imagem, com prévia · **sem tocar na rede**.
 *
 * **Componente, e não markup na tela de club**, porque escudo é o primeiro dos
 * três: banner e avatar usam exatamente o mesmo fluxo, mudando só o `purpose`
 * do seletor. Markup copiado é o que diverge no segundo uso · é a regra que
 * criou o `OptionGroup` e o `PageHeader`.
 *
 * Quem fala com o S3 é o `useImagePicker`, e só no salvar. Aqui ficam a
 * escolha, a conferência do arquivo e o desenho · o que sobe, quando sobe e o
 * que fazer se falhar são do formulário.
 */
export function ImageUpload({
  picker,
  value,
  onChange,
  preview,
  disabled,
}: {
  picker: ImagePicker;
  /** A URL já gravada · a escolha pendente aparece por cima dela. */
  value: string | null;
  onChange: (url: string | null) => void;
  /** A peça que mostra o resultado · quem chama decide a forma (escudo, banner). */
  preview: ReactNode;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const hasImage = Boolean(picker.previewUrl ?? value);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);

    // **Qualquer imagem entra, e quem julga é o decodificador.**
    //
    // A lista fechada de três tipos recusava **foto de iPhone**: o padrão do
    // iOS é HEIC, e nem sempre o seletor converte pra JPEG na hora de escolher.
    // A pessoa via "Só JPG, PNG ou WebP" olhando uma foto que o próprio Safari
    // abre sem esforço · recusar pelo rótulo é recusar pelo que o sistema
    // *declarou*, não pelo que o arquivo *é*. O que sai daqui é sempre WebP ou
    // PNG, então o tipo de entrada não decide nada a jusante.
    if (!file.type.startsWith('image/')) {
      setError(t('upload.badType'));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(t('upload.tooBig', { mb: Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024) }));
      return;
    }

    // A redução acontece aqui, e é trabalho local · num arquivo grande em
    // celular modesto ela demora o bastante pra o botão precisar dizer algo.
    setReading(true);
    try {
      await picker.pick(file);
    } catch {
      // O tipo declarado pelo sistema pode não ser o conteúdo · arquivo
      // renomeado ou truncado chega aqui com `image/png` e não decodifica.
      setError(t('upload.badImage'));
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="space-y-2">
      {/* **`flex-wrap` porque a 320 isto vazava pra fora do container** · a
          prévia mais a coluna de botões pede ~266px, e dentro de um diálogo
          (`w-[calc(100vw-2rem)]` com `p-6`) sobram 240. O botão "Escolher
          imagem" é `whitespace-nowrap`, então sem quebra ele empurra a dica pra
          fora da tela em vez de encolher · visto na captura do diálogo de placar
          em 15/08/2026, e o mesmo valia pro escudo em container estreito.

          **`min-w-0` é o que faz a quebra valer** · filho de flex não encolhe
          abaixo do próprio conteúdo sem ele. */}
      <div className="flex flex-wrap items-center gap-4">
        {preview}

        <div className="flex min-w-0 flex-col gap-2">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={disabled || reading}
            onChange={(e) => {
              void pick(e.target.files?.[0]);
              // Sem isto, escolher o **mesmo** arquivo de novo depois de
              // remover não dispara `change` · o input guarda o valor anterior
              // e o evento não vem.
              if (inputRef.current) inputRef.current.value = '';
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || reading}
              onClick={() => inputRef.current?.click()}
            >
              {reading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('upload.reading')}
                </>
              ) : (
                <>
                  <ImageUp className="mr-2 h-4 w-4" />
                  {hasImage ? t('upload.replace') : t('upload.choose')}
                </>
              )}
            </Button>

            {/* Campo opcional precisa poder voltar ao vazio · a regra que fez o
                seletor de plataforma desmarcar no segundo clique. Remover é
                remover: limpa a escolha pendente **e** a imagem já gravada,
                senão o botão seria um "cancelar" disfarçado. */}
            {hasImage && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  setError(null);
                  picker.clear();
                  onChange(null);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('upload.remove')}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t('upload.hint', { mb: Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024) })}
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
