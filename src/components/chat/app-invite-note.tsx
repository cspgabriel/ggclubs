import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

/**
 * A nota que convida pro app, **dentro da conversa**, logo abaixo da última
 * mensagem que a pessoa perdeu · quem decide se ela existe é o
 * `lib/app-invite.ts`, e a sala só a desenha enquanto aquela mensagem continua
 * sendo a última: chegou outra, a conversa está viva e o momento passou.
 *
 * **Ela é baixa de propósito** · a primeira versão tinha título, parágrafo e
 * botão, e media 177 a 235px: numa sala de 60dvh com a ficha do resultado no
 * cabeçalho ela ocupava a lista inteira e **cortava a própria primeira linha**
 * (visto na captura a 1280x720 e a 320x780). Aqui é um parágrafo corrido com
 * o link no fim · o que a pessoa veio ler continua visível acima.
 *
 * **O download abre em outra guia**, de propósito · a pessoa acabou de abrir a
 * sala pra ler o que perdeu, e a `/download` dispara o arquivo e termina na
 * landing. Tirar ela da conversa pra vender o app é exatamente o atrito que a
 * proposta recusou. É um `Link` com `target`, então o router não intercepta e
 * o `href` sai com o prefixo do idioma.
 *
 * **Qualquer clique encerra o convite** · baixar ou fechar. Sem clique, quem
 * para é o teto de exibições, na decisão.
 */
export function AppInviteNote({
  count,
  onDownload,
  onDismiss,
}: {
  /** Quantas mensagens chegaram enquanto ela estava fora · sempre maior que zero. */
  count: number;
  onDownload: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      data-app-invite
      className="relative mx-auto w-full max-w-sm rounded-lg border border-primary/30 bg-card py-2 pl-3 pr-9 text-xs leading-relaxed text-muted-foreground"
    >
      <p>
        <span className="font-semibold text-foreground">
          {t('desktop.inviteMissed', { count })}
        </span>{' '}
        {t('desktop.inviteBody')}{' '}
        <Link
          to="/download"
          target="_blank"
          rel="noopener"
          onClick={onDownload}
          className="whitespace-nowrap font-semibold text-primary underline-offset-4 hover:underline"
        >
          {t('desktop.downloadLink')}
        </Link>
      </p>
      {/* `touch-target` · 44px no toque sem inflar o botão dentro do card. */}
      <Button
        variant="ghost"
        size="icon"
        className="touch-target absolute right-0.5 top-0.5 h-7 w-7"
        aria-label={t('common.close')}
        onClick={onDismiss}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </Button>
    </div>
  );
}
