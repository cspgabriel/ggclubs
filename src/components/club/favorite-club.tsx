import { useState, type ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { api } from '@/lib/api';

type FavoriteTarget = { _id: string; name: string };

/**
 * Trocar o club favorito, com confirmação, **num lugar só**.
 *
 * A ação existe na lista e na tela de configurar, e as duas precisam da mesma
 * pergunta, da mesma chamada e do mesmo tratamento de erro · duas cópias é
 * como uma delas ganha o `catch` e a outra não. Quem chama renderiza o
 * `dialogo` e usa `pedir(club)` no gatilho.
 *
 * **Por que confirmar uma troca que é reversível:** ela desmarca o favorito
 * anterior em silêncio, e o favorito é o club que conta na premiação de fim de
 * temporada do EA FC 26. Ação que muda outra coisa sem mostrar merece a
 * pergunta · a janela diz exatamente qual passa a ser, e o texto muda quando
 * ainda não existe favorito, porque aí não há nada sendo desfeito.
 */
export function useFavoriteClub(aoTrocar: () => void) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<FavoriteTarget | null>(null);
  const [hadFavorite, setHadFavorite] = useState(false);
  const [error, setError] = useState(false);

  function ask(club: FavoriteTarget, hasFavorite: boolean) {
    setError(false);
    setHadFavorite(hasFavorite);
    setTarget(club);
  }

  const dialog: ReactNode = (
    <ConfirmDialog
      open={target !== null}
      onOpenChange={(v) => !v && setTarget(null)}
      title={t('club.favoriteConfirmTitle')}
      description={
        <>
          {/* O nome do club em verde · é a regra de "uma palavra em destaque
              numa frase branca", e aqui ela vale mais que estética: a pessoa
              precisa conferir **qual** club vai virar o principal antes de
              confirmar, e a frase inteira em cinza esconde justo esse dado.

              A tag no catálogo é a de índice zero, porque o Trans numera os
              filhos a partir de zero e errar o índice **falha calado** · ele
              descarta a marcação e mantém o texto. Conferido no DOM, não na
              leitura. Ver docs/i18n.md. */}
          {hadFavorite ? (
            <Trans
              i18nKey="club.favoriteConfirmBody"
              values={{ club: target?.name ?? '' }}
              components={[<strong key="club" className="font-semibold text-primary" />]}
            />
          ) : (
            <Trans
              i18nKey="club.favoriteConfirmFirstBody"
              values={{ club: target?.name ?? '' }}
              components={[<strong key="club" className="font-semibold text-primary" />]}
            />
          )}
          {error && <span className="mt-2 block text-destructive">{t('common.errorGeneric')}</span>}
        </>
      }
      confirmLabel={t('club.setFavorite')}
      onConfirm={async () => {
        if (!target) return;
        try {
          await api.setPrimaryClub(target._id);
          aoTrocar();
        } catch {
          // O erro fica **dentro** da janela e ela continua aberta · fechar e
          // deixar o aviso atrás dela é como a pessoa acha que deu certo.
          setError(true);
          throw new Error('favorite-failed');
        }
      }}
    />
  );

  return { ask, dialog };
}
