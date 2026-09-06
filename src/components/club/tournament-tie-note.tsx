import type { ClubTournamentTie } from '@ggclubs/schemas';
import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/**
 * **O que a transferência de posse leva junto** · pedido do Eduardo em
 * 18/08/2026.
 *
 * Passar o club passa junto o mando do campeonato, porque inscrever, pagar,
 * cancelar e lançar placar são todos do dono. Sem este aviso as duas pontas
 * descobrem depois · quem deu, ao não conseguir mais lançar o placar do jogo
 * que acabou de jogar; quem recebeu, ao receber um aviso de partida de uma
 * edição que ele não sabia que existia.
 *
 * **Na transferência ele não bloqueia nada, e isso é decisão.** Trancar a
 * transferência enquanto o club joga prenderia o dono por semanas, e passar o
 * club é a única saída que ele tem. O que o produto deve aqui é não deixar
 * ninguém ser pego de surpresa, e pra isso basta a edição ter **nome**.
 *
 * **No encerramento ele bloqueia, e essa é a diferença do terceiro lado**
 * (`closing`, 19/08/2026) · lá a saída **quebra o campeonato dos outros**, e
 * quem recusa de verdade é o servidor. A peça diz o mesmo antes do clique,
 * porque descobrir a recusa depois de digitar a tag é a pior ordem possível.
 *
 * **Sem edição nenhuma ele não desenha nada**, que é o caso da maioria dos
 * clubs · caixa dizendo "nenhum campeonato" é ruído no lugar de mais destaque
 * de uma janela de confirmação.
 */
export function TournamentTieNote({
  ties,
  side,
  loading,
}: {
  ties: ClubTournamentTie[];
  /**
   * De que lado está quem lê · **é o que muda a frase, e não o layout.**
   *
   * `giving` é o dono na janela de confirmação (o que ele entrega); `taking` é
   * quem recebe a oferta (o que ele assume); `closing` é o dono encerrando o
   * club (o que ele perde, ou por que não dá); **`stepping` é o gerente
   * largando o cargo** (o que ele deixa de poder fazer). Mesma informação,
   * sujeito trocado · escrever as quatro como uma frase neutra deixaria as
   * quatro vagas.
   *
   * **O `stepping` não fala em sucessor, e é o que o separa do `giving`** ·
   * largar o cargo não entrega o club a ninguém, então "quem assumir passa a
   * responder por ele" seria falso ali.
   */
  side: 'giving' | 'taking' | 'closing' | 'stepping';
  /**
   * A resposta ainda não chegou · **e aqui isso não desenha nada.**
   *
   * Já desenhou: era uma silhueta de 68px, com o argumento de "esperar sem
   * mentir sobre o formato" e de segurar a altura pra a janela não pular. **O
   * argumento estava de cabeça pra baixo, e o Eduardo viu na tela em
   * 01/09/2026** · *"ele aparece carregando algo grande e depois diminuiu"*.
   *
   * O motivo é o caso comum: **quase todo club não tem vínculo com campeonato
   * nenhum**, e aí a resposta é `null`. Ou seja, a silhueta não estava
   * reservando o espaço do que vem · ela estava reservando espaço pro **nada**,
   * e produzindo exatamente o pulo que existia pra evitar, em toda janela de
   * todo club sem campeonato.
   *
   * Esperar sem mentir sobre o formato continua valendo · o que muda é qual é o
   * formato mais provável. Quando ele é a ausência, a espera honesta é a
   * ausência.
   *
   * **E ninguém perde segurança com isso** · os três chamadores já seguram a
   * ação enquanto a resposta não chega (`confirmDisabled`/`busy` com o
   * `tiesLoading`), que é o que impede a pessoa de confirmar antes de a recusa
   * do servidor ser conhecida. A silhueta nunca fez esse trabalho.
   */
  loading?: boolean;
}) {
  const { t } = useTranslation();
  if (loading) return null;
  if (ties.length === 0) return null;

  const names = ties.map((tie) => tie.name).join(' · ');
  const waiting = ties.some((tie) => tie.awaitingPayment);

  /**
   * **As duas recusas do encerramento, na ordem do servidor** · a sorteada vem
   * primeiro porque ela é a que não tem contorno; a paga tem, e a frase dela
   * diz qual é.
   */
  const drawn = ties.filter((tie) => tie.status === 'drawn' || tie.status === 'running');
  const paid = ties.filter((tie) => tie.paid);
  const blocking = side === 'closing' && (drawn.length > 0 || paid.length > 0);

  const message =
    side === 'giving'
      ? t('club.tieGiving', { count: ties.length, names })
      : side === 'taking'
        ? t('club.tieTaking', { count: ties.length, names })
        : side === 'stepping'
        ? t('club.tieStepping', { count: ties.length, names })
        : drawn.length > 0
          ? t('club.tieClosingDrawn', {
              count: drawn.length,
              names: drawn.map((tie) => tie.name).join(' · '),
            })
          : paid.length > 0
            ? t('club.tieClosingPaid', { names: paid.map((tie) => tie.name).join(' · ') })
            : t('club.tieClosing', { count: ties.length, names });

  return (
    // **`amber-400` e não um token `warning`** · ele não existe no Tailwind
    // daqui, e `border-warning/40` já viveu um bloco inteiro sem pintar nada,
    // com os cinco checks verdes. O `Badge variant="warning"` usa exatamente
    // estas cores · é a mesma família, escrita do jeito que existe.
    <span
      className={cn(
        'mt-3 flex items-start gap-2 rounded-lg border p-2.5 text-xs text-foreground',
        // **Vermelho quando é recusa, âmbar quando é aviso** · a mesma caixa
        // dizendo "isto não vai acontecer" e "isto vai acontecer" na mesma cor
        // faz a primeira ler como a segunda.
        blocking
          ? 'border-destructive/30 bg-destructive/10'
          : 'border-amber-400/25 bg-amber-400/10',
      )}
    >
      <Trophy
        className={cn(
          'mt-0.5 h-3.5 w-3.5 shrink-0',
          blocking ? 'text-destructive' : 'text-amber-400',
        )}
        aria-hidden
      />
      <span>
        {message}
        {/* **A vaga reservada é a única que muda o que a pessoa precisa fazer
            hoje** · há relógio correndo, e quem assume herda o prazo. Por isso
            é frase própria, e não um adjetivo espremido na de cima. */}
        {/* A vaga reservada só interessa a quem assume · quem está encerrando
            já leu que a vaga volta. */}
        {waiting && side !== 'closing' && (
          <span className="mt-1 block">{t('club.tiePending')}</span>
        )}
      </span>
    </span>
  );
}
