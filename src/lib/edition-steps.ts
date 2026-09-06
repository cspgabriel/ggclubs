import type { TournamentStatus } from '@ggclubs/schemas';

/**
 * **Onde a edição está, e de quem é a vez** · as duas perguntas do painel de
 * campeonatos, como funções puras.
 *
 * **Elas moravam no `edition-rail.tsx` até 26/08/2026**, e saíram de lá por um
 * motivo de ferramenta e não de desenho: arquivo que exporta componente **e**
 * função perde o Fast Refresh do Vite, e o `react-refresh/only-export-components`
 * cobra isso. A régua continua sendo a dona do desenho; o que mudou é que a
 * regra de negócio dela virou módulo.
 */

/** Os cinco momentos da vida de uma edição, na ordem em que acontecem. */
export const STEPS = ['draft', 'signup', 'bracket', 'playing', 'over'] as const;
export type Step = (typeof STEPS)[number];

/**
 * Em que passo a edição está.
 *
 * **`cancelled` cai em `over` de propósito** · um sexto ponto que só existe pro
 * caso ruim faria a régua desenhar o fracasso como etapa prevista, e a régua é
 * a linha do tempo da edição: as duas terminaram, e é isso que ela mostra.
 *
 * **A justificativa antiga era outra e deixou de valer** · ela dizia que as
 * duas "respondem a mesma coisa pra quem opera". Não respondem, e este mesmo
 * arquivo prova: a `nextStepOf` devolve `over` e `cancelled` separados, com
 * frases diferentes ("acabou, nada espera por você" e "não reabre · edição nova
 * começa de um rascunho"). A conflação vale **na régua**, e só nela.
 */
export function stepOf(status: TournamentStatus): Step {
  if (status === 'draft') return 'draft';
  if (status === 'open' || status === 'closed') return 'signup';
  if (status === 'drawn') return 'bracket';
  if (status === 'running') return 'playing';
  return 'over';
}

/**
 * **O que acontece agora, e quem faz** · a chave da frase que o painel escreve.
 *
 * Ela existe separada do `stepOf` porque as duas perguntas são diferentes:
 * a régua diz **onde a edição está** e esta diz **de quem é a vez**. Dois
 * momentos que a régua desenha igual pedem frases opostas · com a chave no ar,
 * a edição segue em `signup` na régua e aqui a vez já é dos clubs.
 *
 * **A frase mais valiosa é a que diz o que NÃO precisa ser feito.** A varredura
 * sorteia sozinha quando a edição **lota** · quem não lotou espera a
 * organização, e é o botão que faz a chave sair. Este parágrafo dizia "quando
 * chega o `drawAt`" e contradizia a tabela trinta linhas abaixo, no mesmo
 * docblock.
 *
 * ---
 *
 * **Ela nasceu decidindo só por `status` e `drawn`, e isso estava errado nos
 * três casos abaixo** · achado pelo `revisor` em 19/08/2026, no mesmo bloco.
 * Os três têm a mesma forma: o estado da edição não muda, então o status
 * sozinho não distingue "está tudo correndo" de "parou esperando alguém".
 *
 * | | |
 * |---|---|
 * | **o pior** | com club sobrando pro degrau, `drawTournament` **recusa** e a edição fica `open` com `drawnAt` nulo · a frase mandava não fazer nada, e a única coisa que destrava é o admin tirar quem sobra |
 * | inscrição fechada cedo | a data do sorteio está **anunciada na página pública**, e dizer "sortear é o que faz começar" convida a antecipar o que foi prometido · **a chave NÃO sai sozinha no `drawAt`** (pendência 180): a varredura só sorteia quando a edição **lota** |
 * | publicada antes de abrir | `registrationOpensAt` no futuro · "os clubs estão se inscrevendo" com ninguém conseguindo entrar |
 *
 * **O `stuck` não tenta adivinhar o motivo da recusa**, e é de propósito: a
 * conta da sobra usa as inscrições **confirmadas**, e o `registeredCount` que
 * chega aqui conta também quem ainda deve · replicar a regra no cliente daria
 * uma segunda fonte pra divergir. O que a tela afirma é o que ela **vê** (o
 * prazo passou e a chave não saiu) e aponta o único lugar onde há o que fazer.
 */
export function nextStepOf({
  status,
  drawn,
  drawAt,
  registrationOpensAt,
  now = new Date(),
}: {
  status: TournamentStatus;
  /**
   * A chave já saiu · **e ela não é derivável do status**, porque a edição
   * segue `open` até alguém fechar.
   */
  drawn: boolean;
  /** A data anunciada do sorteio · a varredura NÃO sorteia por causa dela. */
  drawAt: string | Date;
  registrationOpensAt: string | Date;
  now?: Date;
}):
  'draft' | 'notYetOpen' | 'signup' | 'awaitingDraw' | 'stuck' | 'bracket' | 'over' | 'cancelled' {
  if (status === 'cancelled') return 'cancelled';
  if (status === 'finished') return 'over';
  if (status === 'draft') return 'draft';
  // A chave no ar responde antes do status · uma edição sorteada segue `open`
  // até alguém fechar, e nesse intervalo a vez já é dos clubs.
  if (drawn || status === 'drawn' || status === 'running') return 'bracket';

  // **O prazo passou e a chave não saiu** · a varredura roda de minuto em
  // minuto, então isso não é atraso: é recusa, e ela espera o admin.
  if (new Date(drawAt).getTime() <= now.getTime()) return 'stuck';

  if (status === 'closed') return 'awaitingDraw';
  return new Date(registrationOpensAt).getTime() > now.getTime() ? 'notYetOpen' : 'signup';
}
