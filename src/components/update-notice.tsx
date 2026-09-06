import { X, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from '@/components/ui/external-link';

/**
 * **A faixa de "saiu versão nova", pros dois lados da plataforma** · a do site
 * (recarregar) e a do app instalado (atualizar e reiniciar). Superfície
 * neutra, título curto, o link pras novidades, um botão outline e a saída de
 * 44px. O que difere entre as duas é texto e o que o botão faz · e é só isso
 * que o chamador entrega.
 *
 * **O responsivo mora aqui, inteiro.** Até 06/09/2026 a moldura era daqui e o
 * link e o botão eram dos chamadores, byte a byte iguais nos dois · e como o
 * título some abaixo de `sm`, cada um contrabandeava uma segunda cópia do
 * título dentro do link. Requisito não escrito é o que o terceiro chamador
 * esquece.
 *
 * **O corpo aparece a partir de `sm`, e não de `xl`.** É o corpo que carrega o
 * número da versão e a promessa de que nada se perde até recarregar · e a
 * janela do app nasce em 1280 lógicos, que num Windows a 150% são ~853px de
 * viewport. `xl` nunca casava no app instalado: a faixa nunca dizia qual
 * versão estava oferecendo, enquanto o balão da bandeja dizia.
 *
 * No celular, título e novidades formam um único alvo de leitura à esquerda,
 * com a ação e o fechar ao lado.
 */
export function UpdateNotice({
  icon: Icon,
  title,
  children,
  changelogHref,
  changelogLabel,
  action,
  actionDisabled = false,
  onAction,
  alert,
  dismissLabel,
  onDismiss,
}: {
  icon: LucideIcon;
  title: string;
  /** A explicação · visível a partir de `sm`. */
  children: ReactNode;
  changelogHref: string;
  changelogLabel: string;
  /** O rótulo do botão · texto, ou o que ele vira enquanto trabalha. */
  action: ReactNode;
  actionDisabled?: boolean;
  onAction: () => void;
  /** Uma linha própria abaixo da faixa, em qualquer largura · a falha da ação. */
  alert?: ReactNode;
  dismissLabel: string;
  onDismiss: () => void;
}) {
  return (
    <div data-update-notice className="shrink-0 border-b border-border bg-background">
      <div className="container flex items-center gap-2 px-4 py-1 sm:gap-3 sm:px-6">
        <Icon className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden />
        <p className="hidden min-w-0 flex-1 text-xs leading-relaxed sm:block">
          <span className="mr-1 font-semibold">{title}</span>
          <span className="text-muted-foreground">{children}</span>
        </p>
        <div className="min-w-0 flex-1 text-xs sm:flex-none">
          {/* Novidades abre fora desta tela de propósito · navegar aqui seria
              perder o que a pessoa está preenchendo, que é a promessa do corpo. */}
          <ExternalLink
            href={changelogHref}
            className="flex min-h-11 flex-col justify-center gap-0.5 font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:flex-row sm:items-center sm:gap-0"
          >
            <span className="font-semibold text-foreground sm:hidden">{title}</span>
            <span>{changelogLabel}</span>
          </ExternalLink>
        </div>
        <div className="shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-11 max-w-28 whitespace-normal text-xs sm:h-9 sm:max-w-none sm:whitespace-nowrap"
            disabled={actionDisabled}
            onClick={onAction}
          >
            {action}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={dismissLabel}
          title={dismissLabel}
          onClick={onDismiss}
          className="h-11 w-11 shrink-0 text-muted-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      {alert && (
        <p role="alert" className="container px-4 pb-2 text-xs text-destructive sm:px-6">
          {alert}
        </p>
      )}
    </div>
  );
}
