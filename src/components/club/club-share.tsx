import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { clubUrl } from '@/lib/clubs';
import { publicOrigin } from '@/lib/public-url';
import { cn } from '@/lib/utils';

/**
 * O link público do club, tratado como o objeto principal que ele é.
 *
 * **Isto não é metadado da tela de editar.** É por este link que o produto se
 * espalha: ele é o que a pessoa cola no grupo do Discord, e cada visita que ele
 * traz é aquisição. A primeira versão o tratava como rodapé de formulário · um
 * rótulo miúdo, a URL num `code` monoespaçado e dois botões fantasmas soltos
 * num retângulo com metade da largura vazia. Lia como saída de debug, não como
 * a coisa que a tela quer que você faça.
 *
 * O que mudou, e cada um tem motivo:
 *
 * - **A tag aparece em verde, na fonte de display.** É o pedaço do endereço que
 *   é da pessoa · o resto do caminho é encanamento e fica apagado.
 * - **O protocolo some da tela e vai junto na cópia.** Ninguém dita `https://`
 *   ao falar de um link, mas colar sem ele quebra em metade dos aplicativos.
 * - **Uma ação principal, com o peso da marca.** Copiar é o que 90% das visitas
 *   a esta tela querem; abrir a página é apoio e vai de `ghost`.
 * - **O botão confirma em si mesmo.** A ação mantém o nome pela jornada inteira
 *   e o retorno aparece onde o dedo está, não numa mensagem em outro canto.
 */
export function ClubShare({ tag }: { tag: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  // `publicOrigin()` e não `window.location.origin`: no app instalado a origem
  // é `tauri://localhost`, e o link copiado não abriria em lugar nenhum.
  const href = `${publicOrigin()}${clubUrl(tag)}`;
  const withoutProtocol = href.replace(/^https?:\/\//, '');
  const prefix = withoutProtocol.slice(0, withoutProtocol.length - tag.length);

  function copy() {
    setFailed(false);
    // A área de transferência recusa quando a janela não tem foco ou a
    // permissão foi negada · sem o `catch` a tela nunca diz que não copiou e a
    // pessoa cola o link antigo achando que deu certo.
    navigator.clipboard.writeText(href).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => setFailed(true),
    );
  }

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="font-display text-lg uppercase tracking-tight">{t('club.shareTitle')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('club.shareBody')}</p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <p className="flex min-w-0 flex-1 items-center overflow-hidden rounded-lg border bg-background px-3 py-2.5 text-sm">
          <span className="truncate text-muted-foreground">{prefix}</span>
          <span className="font-display uppercase tracking-wide text-primary">{tag}</span>
        </p>
        <Button type="button" variant="cta" className="h-11 shrink-0 sm:px-6" onClick={copy}>
          {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
          {copied ? t('club.linkCopied') : t('club.copyLink')}
        </Button>
      </div>

      {/* **O atalho de abrir a página pública saiu daqui, e a ausência é a
          correção.** O
          botão existia e era um laço: `/club/:tag` manda quem está logado de
          volta pra dentro do app, então clicar nele voltava pro lugar de onde
          se clicou. Botão que promete uma tela e devolve a mesma é pior que
          botão nenhum.

          O que ele tentava entregar · **ver como visitante** · é ideia boa e
          está em docs/produto.md. Exige modo de prévia de verdade, não um
          link, e entra quando o perfil customizável entrar. */}
      {/* Sem altura reservada · o aviso de falha é raro, e guardar lugar pra
          ele deixava um vão no rodapé do cartão o tempo todo. `aria-live` num
          elemento vazio anuncia igual quando o texto entra. */}
      <p aria-live="polite" className={cn('text-xs text-destructive', failed && 'mt-3')}>
        {failed && t('club.copyFailed')}
      </p>
    </section>
  );
}
