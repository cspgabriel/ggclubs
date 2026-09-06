import { cn } from '@/lib/utils';

/**
 * Escudo do club, com reserva de iniciais.
 *
 * **A reserva é o estado normal, não a exceção**: quase nenhum club vai subir
 * escudo no primeiro dia, e enquanto o bucket de assets estiver privado
 * (pendência 6) nem dá pra subir. Então ela precisa parecer peça desenhada e
 * não imagem que faltou · daí o chanfro da marca, a tag em caixa alta na fonte
 * de display e o fio verde.
 *
 * O chanfro corta o canto superior esquerdo e o inferior direito, que é a regra
 * que governa todas as formas do sistema · ver docs/design.md.
 *
 * A inicial sai da **tag**, não do nome: a tag é curta por definição e é o que
 * a pessoa reconhece no jogo.
 */
const CHAMFER = 'polygon(22% 0, 100% 0, 100% 78%, 78% 100%, 0 100%, 0 22%)';

export function ClubCrest({
  tag,
  crestUrl,
  className,
}: {
  tag: string;
  crestUrl?: string | null;
  className?: string;
}) {
  const base = cn('flex shrink-0 items-center justify-center overflow-hidden', className);

  if (crestUrl) {
    return (
      <img
        src={crestUrl}
        alt=""
        // O escudo pode vir de outro domínio · sem isto o servidor de origem
        // pode recusar pelo referenciador, que foi o que aconteceu com a foto
        // do Google no app desktop.
        referrerPolicy="no-referrer"
        style={{ clipPath: CHAMFER }}
        className={cn(base, 'bg-secondary object-cover')}
      />
    );
  }

  return (
    <span
      aria-hidden
      style={{ clipPath: CHAMFER }}
      className={cn(
        base,
        // Verde só no fio e na letra · fundo verde chapado aqui competiria com
        // o CTA, que é o único verde sólido da tela.
        'bg-gradient-to-br from-secondary to-card font-display uppercase leading-none tracking-tight text-primary',
      )}
    >
      {/**
       * **A sigla se centra sozinha, e não pelo `display` de fora.**
       *
       * O `base` centraliza com `flex`, e **quem chama pode desligar isso sem
       * perceber**: a sala do confronto passa `min-[360px]:block` pra o escudo
       * sumir no Fold, e `block` mata o `items-center` · a sigla escorregava
       * pro canto e o escudo lia como texto solto. Foi o que o Eduardo mandou
       * em 28/08/2026 · *"está quebrada a logo fallback"*.
       *
       * **A centralização vira responsabilidade DAQUI**, com um filho que se
       * estica · assim ela sobrevive a qualquer `display` que o chamador
       * escolha, e o próximo uso não precisa saber disso.
       */}
      <span className="flex h-full w-full items-center justify-center">{tag.slice(0, 3)}</span>
    </span>
  );
}
