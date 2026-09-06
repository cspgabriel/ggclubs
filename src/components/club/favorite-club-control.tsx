import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFavoriteClub } from '@/components/club/favorite-club';
import { Button } from '@/components/ui/button';
import { InfoTip } from '@/components/ui/tooltip';

/**
 * A linha do favorito · estrela quando já é, botão quando ainda não é.
 *
 * **Ela nasceu na tela de configurar e mudou de casa em 06/08/2026**, por
 * pedido do Eduardo: favoritar não é configuração **do club**, é preferência
 * **da conta** sobre ele. Morando lá, quem é só membro não conseguia nem
 * alcançar a ação, porque aquela tela é de dono e de gerente · e a página do
 * club é onde a pessoa está quando decide que aquele é o time dela.
 *
 * **Uma linha e não um cartão**: quando o club já é o favorito não há ação
 * nenhuma ali, só um estado, e estado cabe numa linha.
 *
 * Ela **não** aparece na página pública, e a pergunta foi feita: favoritar é
 * ação de quem tem conta, então lá não entra nem como sinal.
 */
export function FavoriteClubControl({
  club,
  hasOtherFavorite,
  onChanged,
}: {
  club: { _id: string; name: string; isPrimary: boolean };
  hasOtherFavorite: boolean;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const favorite = useFavoriteClub(onChanged);

  return (
    <span className="flex items-center gap-1.5 text-sm">
      {club.isPrimary ? (
        <>
          <Star className="h-4 w-4 shrink-0 fill-current text-primary" aria-hidden />
          <span className="text-primary">{t('club.favorite')}</span>
        </>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => favorite.ask(club, hasOtherFavorite)}
        >
          <Star className="mr-1.5 h-4 w-4" />
          {t('club.setFavorite')}
        </Button>
      )}
      <InfoTip label={t('club.favoriteHint')} />
      {favorite.dialog}
    </span>
  );
}
