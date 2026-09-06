import { imageInputMessage } from '@/lib/image-input-message';
import { MESSAGE_MAX } from '@ggclubs/schemas';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { ShotButton } from '@/components/chat/chat-message';
import { closedText, timeOf } from '@/components/chat/chat-format';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { CharCount } from '@/components/ui/char-count';
import type { ImagePicker } from '@/lib/use-image-picker';

/**
 * O campo de escrever da sala · **e a frase que aparece no lugar dele quando
 * não dá pra escrever.**
 *
 * Saiu do `match-chat.tsx` em 01/09/2026, fechando a fase 2 do
 * [arquitetura.md](../../../../docs/arquitetura.md) pra este arquivo.
 *
 * **Ele só ficou extraível depois que o comportamento saiu** · enquanto digitar
 * uma letra precisava de um contador em `ref` e do cliente da API (o sinal de
 * "está digitando"), esta peça não era tela, era regra. O `use-typing-signal`
 * levou isso embora, e o que sobrou aqui recebe tudo por prop.
 *
 * **A interface é larga de propósito, e não por preguiça** · são catorze
 * entradas porque o compositor de verdade depende de catorze coisas: o
 * rascunho, o envio, o anexo, as tags pra mencionar, o papel de quem fala e a
 * janela da sala. Esconder isso atrás de um objeto `chat` inteiro deixaria a
 * peça dependendo de um formato em vez de dos valores que ela usa.
 */
export function ChatComposer({
  canWrite,
  viewerIsOrganizer,
  closedReason,
  opensAt,
  draft,
  setDraft,
  sending,
  send,
  composer,
  picker,
  uploading,
  roomTags,
  mine,
  mention,
  speakingAsAdmin,
  setFailure,
  onLocalTyping,
}: {
  canWrite: boolean;
  viewerIsOrganizer: boolean;
  closedReason: string | null;
  opensAt: Date;
  draft: string;
  setDraft: (value: string) => void;
  sending: boolean;
  send: () => Promise<void> | void;
  composer: RefObject<HTMLTextAreaElement | null>;
  picker: ImagePicker;
  uploading: boolean;
  /** As tags dos dois clubs · pra oferecer a menção. */
  roomTags: string[];
  /** Os clubs de quem está escrevendo · não se menciona o próprio. */
  mine: Set<string>;
  mention: (tag: string) => void;
  speakingAsAdmin: boolean;
  setFailure: (value: string | null) => void;
  /** A pessoa digitou · o hook decide se manda sinal. */
  onLocalTyping: (hasText: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <>
  {canWrite || viewerIsOrganizer ? (
    <form
      className="mt-3"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      {picker.reading && <p role="status" className="mb-2 text-xs text-muted-foreground">{t('upload.reading')}</p>}
      {/**
        * **Uma caixa só, com o botão DENTRO** · e isto é troca de
        * abordagem, não o terceiro ajuste.
        *
        * O campo e o botão eram irmãos numa linha `items-end`, e manter
        * dois números iguais falhou duas vezes: primeiro 8px a 390, e
        * depois **44 contra 40** com o `h-11` que devia resolver (medido
        * em 27/08/2026, com o Eduardo apontando de novo). Peça que
        * precisa combinar de altura com a vizinha não tem altura certa ·
        * a que está dentro não tem o que combinar.
        *
        * De quebra é onde as ações da mensagem cabem · a menção hoje, o
        * anexo depois.
        */}
      <div
        className={cn(
          'rounded-md border border-input bg-background transition',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
        )}
      >
        {/**
          * **A prévia fica DENTRO da caixa, acima do texto** · ela é
          * parte da mensagem que ainda não foi mandada, e fora da caixa
          * pareceria uma mensagem já enviada.
          *
          * **`contain` e não `cover`** · o print é prova, e a prévia tem
          * que ser o que vai ser gravado · é a mesma regra da súmula,
          * escrita lá em 19/08/2026.
          */}
        {picker.previewUrl && (
          <div className="flex items-center gap-2 border-b border-input p-2">
            <img
              src={picker.previewUrl}
              alt=""
              className="h-16 w-28 shrink-0 rounded-md border bg-background object-contain"
            />
            <button
              type="button"
              className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t('chat.shotRemove')}
              title={t('chat.shotRemove')}
              onClick={() => picker.clear()}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            {uploading && (
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                {t('chat.shotSending')}
              </span>
            )}
          </div>
        )}
        <Textarea
          ref={composer}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            /**
             * **Voltar a digitar apaga a recusa da tentativa anterior** ·
             * 29/08/2026, e o Eduardo viu o estrago em forma de tela
             * contraditória: um *"a conversa não está aberta"* em vermelho
             * **acima** de um *"a conversa segue aberta"*.
             *
             * O erro era verdadeiro quando aconteceu e tinha deixado de
             * ser · só que ele **só some num `load()` bem-sucedido**, e
             * com o canal vivo o polling está desligado. Numa sala parada
             * ele ficava na tela pra sempre, falando de um envio que
             * ninguém lembra mais.
             */
            setFailure(null);
            // **Um sinal a cada três segundos** · digitar é evento por
            // tecla, e mandar um por tecla seria a definição de flood.
            onLocalTyping(Boolean(e.target.value));
          }}
          maxLength={MESSAGE_MAX}
          rows={1}
          /**
           * **O teto da caixa é menor que o do componente, e a razão é
           * medida** · com o `max-h-64` herdado ela chegava a **256px numa
           * janela de 550**, quase metade da sala, e a conversa que a
           * pessoa está respondendo saía de vista enquanto ela digitava.
           */
          className="max-h-32 min-h-0 resize-none rounded-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          /**
           * **"Falando como organização" é o placeholder, e não um rótulo
           * acima** · como rótulo ele entrava na coluna do campo e
           * empurrava a caixa pra cima do botão de enviar, desalinhando a
           * linha · apontado pelo Eduardo em 27/08/2026.
           */
          placeholder={speakingAsAdmin ? t('chat.speakAsAdmin') : t('chat.placeholder')}
          onKeyDown={(e) => {
            // **Enter manda; Shift+Enter quebra linha** · é o que este
            // público já faz no Discord, e num campo que combina horário
            // a mensagem quase sempre tem uma linha.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />

        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          {/**
            * **Marcar é um botão, e não uma sintaxe pra decorar** ·
            * pedido do Eduardo em 27/08/2026 pensando na organização
            * chamando um dos lados. Autocompletar com `@` seria o
            * caminho de um chat com muita gente; aqui os destinatários
            * possíveis são **dois**, então eles cabem na tela.
            */}
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {/**
              * **Anexar mora com a menção, no rodapé da caixa** · foi pra
              * isso que a caixa virou uma peça só; o botão de enviar
              * dentro dela abriu o lugar de onde as ações da mensagem
              * saem.
              */}
            <ShotButton
              label={t('chat.shotAdd')}
              disabled={sending || Boolean(picker.reading)}
              onPick={(file) => { setFailure(null); void picker.pick(file).catch(error => setFailure(imageInputMessage(error, t))); }}
            />
            {roomTags
              .filter((tag) => tag && !mine.has(tag))
              .map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="rounded px-1.5 py-0.5 text-[11px] uppercase tracking-widest text-muted-foreground transition hover:bg-primary/10 hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => mention(tag)}
                >
                  {'@' + tag}
                </button>
              ))}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* **Aparece nos últimos trinta** · o `maxLength` trava a
                digitação em silêncio, e a janela padrão de cinco
                chegaria tarde demais mesmo num teto de duzentos. */}
            <CharCount value={draft} max={MESSAGE_MAX} within={30} />
            <Button
              type="submit"
              size="sm"
              disabled={sending || picker.reading || (draft.trim().length === 0 && !picker.picked)}
            >
              {t('chat.send')}
            </Button>
          </div>
        </div>
      </div>
    </form>
  ) : (
    <p className="mt-3 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      {/* **A sala que ainda não abriu diz A QUE HORAS** · controle inerte
          sem explicação lê como tela quebrada, e aqui a informação
          existe. */}
      {closedReason === 'tooEarly'
        ? t('chat.opensAt', { when: timeOf(opensAt) })
        : closedText(t, closedReason)}
    </p>
  )}
    </>
  );
}
