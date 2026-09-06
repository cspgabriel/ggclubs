import type { LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { apiErrorMessage } from '@/lib/api-error';
import { useTranslation } from 'react-i18next';

/**
 * A casca das **saídas do club** · o botão fantasma no cabeçalho, a janela de
 * confirmação e o erro que precisa aparecer dentro dela.
 *
 * **São duas saídas desde 03/09/2026, e é por isso que ela existe** · sair do
 * club (o vínculo acaba) e largar a gerência (só o poder acaba). A segunda
 * nasceu com a pendência 186, e as duas tinham o mesmo desenho: estado de
 * aberto, estado de erro, `Button` fantasma com ícone, `ConfirmDialog` com o
 * erro dentro. **Extraída na hora em que a segunda apareceu**, que é o que a
 * regra da casa manda · depois da terceira as cópias já teriam divergido, e
 * cada diferença viraria uma pergunta de "isto foi de propósito?".
 *
 * **O que NÃO mora aqui é o peso** · quem chama escolhe o `tone`, porque as
 * duas ações não pesam igual: sair não tem desfazer pela interface e largar o
 * cargo tem (o dono promove de volta). Uniformizar isso seria a casca decidindo
 * produto.
 *
 * **`ghost` é fixo, e é decisão de layout** · estas são as ações **menos**
 * prováveis da página do club, e botão vermelho ao lado do escudo desequilibra
 * a tela inteira. O vermelho entra na janela, que é onde a decisão acontece.
 *
 * > **A casca genérica de "botão que abre confirmação" moraria em
 * > `components/ui/`, e não aqui** · ela ficou no club porque hoje os dois
 * > únicos casos são saídas de club. O dia em que uma terceira tela quiser o
 * > mesmo desenho, ela sobe · e não se copia.
 */
export function ClubExitButton({
  icon: Icon,
  label,
  title,
  body,
  confirmLabel,
  tone = 'brand',
  onOpenChange,
  confirmDisabled,
  onConfirm,
}: {
  icon: LucideIcon;
  label: string;
  title: ReactNode;
  /** O corpo da janela · aceita nó porque o nome do club vai em verde, por `<Trans>`. */
  body: ReactNode;
  confirmLabel: string;
  tone?: 'brand' | 'destructive';
  /**
   * **Avisa quem chama que a janela abriu ou fechou.**
   *
   * Existe pra a busca cara ser **preguiçosa**: quem precisa mostrar o vínculo
   * com campeonato só quer perguntar isso quando a pessoa abre a janela · sem
   * isto seria uma requisição por gerente em toda carga da página do club, que
   * é o defeito que o `MyClubsProvider` existiu pra apagar.
   */
  onOpenChange?: (open: boolean) => void;
  /** Segura o confirmar enquanto um aviso da janela ainda não chegou. */
  confirmDisabled?: boolean;
  onConfirm: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(apiErrorMessage(err, t));
      // Relança pra janela não fechar · erro atrás de janela fechada é erro sem
      // dono, e a pessoa concluiria que a ação deu certo.
      throw err;
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen(true);
          onOpenChange?.(true);
        }}
      >
        <Icon className="mr-1.5 h-4 w-4" aria-hidden />
        {label}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          onOpenChange?.(v);
          if (!v) setError(null);
        }}
        title={title}
        description={
          <>
            {body}
            {error && <span className="mt-3 block text-destructive">{error}</span>}
          </>
        }
        confirmLabel={confirmLabel}
        confirmDisabled={confirmDisabled}
        tone={tone}
        onConfirm={run}
      />
    </>
  );
}
