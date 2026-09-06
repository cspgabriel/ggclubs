import type { ClubTournamentTie } from '@ggclubs/schemas';
import { api } from '@/lib/api';
import { useResource } from '@/lib/use-resource';

/**
 * As edições em que um club está metido agora · **o que passa junto com a
 * posse.**
 *
 * Existe como hook porque os **dois lados** da transferência fazem a mesma
 * pergunta: quem oferece, na janela de confirmação, e quem recebe, no aviso da
 * página do club. Escrever a busca duas vezes é a segunda cópia que a regra da
 * casa manda extrair na hora em que ela aparece.
 *
 * **Falhar aqui é silêncio, e é decisão** · o que se perde é um aviso, não a
 * operação. A transferência não depende dele: ela é conferida no servidor, e
 * bloquear passar o club porque uma consulta secundária caiu prenderia o dono
 * pelo único caminho de saída que ele tem. Por isso o `error` do
 * `useResource` é **ignorado de propósito** aqui, e a lista cai pra vazia.
 *
 * `clubId` nulo não busca · é o que deixa chamar sem furar a regra dos hooks
 * enquanto a página ainda não sabe de qual club se trata.
 */
export function useClubTournaments(clubId: string | null): {
  ties: ClubTournamentTie[];
  /**
   * **Ainda não dá pra dizer o que a posse leva junto.**
   *
   * Ele existe porque a resposta chega **depois** da janela abrir, e sem ele o
   * dono podia confirmar antes de ler o aviso · que é a única razão de a peça
   * existir. Pior: a nota aparecia de repente **acima** dos botões e empurrava
   * o "passar o club" pra baixo do cursor.
   *
   * Quem consome segura a ação enquanto isto for `true`. **`null` no `clubId`
   * não é espera** · ali não há pergunta nenhuma sendo feita, e é o
   * `skip` do `useResource` que garante isso.
   */
  loading: boolean;
} {
  const { data, loading } = useResource(
    (signal) => api.clubTournaments(clubId ?? '', { signal }),
    [clubId],
    { skip: !clubId },
  );

  return { ties: data?.tournaments ?? [], loading };
}
