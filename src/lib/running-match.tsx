import { ledClubTags } from './clubs';
import { useEffect, useState, type ReactNode } from 'react';
import { matchMoment, pickMyMatch } from '@/lib/match-moment';
import { barCovers, EMPTY, RunningMatchContext } from '@/lib/running-match-context';
import { useMyClubs } from '@/lib/use-my-clubs';
import { LIVE_TOURNAMENT, useTournament } from '@/lib/use-tournament';
import { directoryOf } from '@/components/tournament/tournament-shared';

/**
 * **A sua partida da edição que está acontecendo · uma pergunta, um lugar.**
 *
 * Ela era feita em **três** lugares com o mesmo código: a tela inicial, a aba
 * de campeonatos e a faixa da casca. Cada um buscava a lista de edições, achava
 * a que está em jogo, buscava a chave dela e refazia `pickMyMatch` · e a faixa
 * ainda buscava enquanto estava desligada, porque hook não depende de o
 * componente desenhar. Era a **pendência 105**, e ela deixou de ser opcional no
 * dia em que a faixa passou a viver no topo de toda tela do app.
 *
 * **O que ele NÃO faz é decidir quem desenha** · isso é da tela, e as duas
 * respostas dependem da moldura. O provider responde *"qual é a sua partida
 * agora, e em que momento ela está"*.
 *
 * Mora na casca do `/app`, **dentro** do `MyClubsProvider` · ele precisa dos
 * seus clubs pra saber qual das partidas é sua, e de qual você responde.
 */
/**
 * **A janela abre sozinha** · a hora vira sem ninguém navegar, e nada agendava
 * um render. Sem isto, quem abre o app às 19:00 com jogo às 20:30 não veria a
 * barra **nunca**, a menos que outra partida da edição publicasse placar.
 *
 * Meio minuto é folgado pra uma janela de uma hora e pra um momento que muda na
 * virada do horário · achado pelo `revisor` em 19/08/2026, quando isto vivia
 * dentro da faixa.
 */
const TICK_MS = 30_000;

export function RunningMatchProvider({ children }: { children: ReactNode }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const { clubs: myClubs } = useMyClubs();

  /**
   * **Uma busca, e não duas** · pendência 109, fechada em 22/08/2026.
   *
   * Até aqui a casca **listava todas as edições públicas** só pra achar a que
   * está rolando, e só então buscava a dela · duas requisições em toda carga do
   * app, e a lista não servia a tela nenhuma. Achado pelo Eduardo em 20/08/2026
   * lendo o log do `pnpm dev`: *"isso não era pra ser só na página pública?"*.
   *
   * **O tempo real não mudou, e isso foi o cuidado central** · quem busca
   * continua sendo o `useTournament`, com a **mesma** assinatura de tópico e os
   * mesmos tipos de evento. Um hook próprio pra faixa teria uma segunda
   * declaração capaz de divergir, e o `docs/tempo-real.md` diz onde esse defeito
   * mora: ele **não dá erro em canto nenhum**, a tela só para de reagir.
   */
  const myTags = (myClubs ?? []).map((club) => club.tag);
  const {
    tournament: live,
    matches,
    registrations,
    clubs: directory,
  } = useTournament(myTags.length ? LIVE_TOURNAMENT : '', myTags);
  if (!live || myTags.length === 0) {
    return <RunningMatchContext.Provider value={EMPTY}>{children}</RunningMatchContext.Provider>;
  }

  const mine = new Set(myTags);
  const priority = new Set(ledClubTags(myClubs));
  const match = pickMyMatch({ matches, mine, priority });
  const participation = {
    tournament: live,
    registrations,
    matches,
    myTags,
    reportableTags: [...priority],
    clubs: directoryOf(registrations, directory),
  };
  if (!match) {
    return (
      <RunningMatchContext.Provider value={{ ...EMPTY, ...participation }}>
        {children}
      </RunningMatchContext.Provider>
    );
  }

  /**
   * **Qual dos dois lados é o seu** · o club por que você responde ganha,
   * porque é ele que tem o que fazer. Com dois clubs seus na mesma partida (que
   * o teto de posse tornou raro, não impossível) a preferência decide.
   */
  const myTag = priority.has(match.awayTag)
    ? match.awayTag
    : mine.has(match.homeTag)
      ? match.homeTag
      : match.awayTag;

  const canReport = priority.has(myTag);
  const moment = matchMoment({ match, myTag, canReport });

  return (
    <RunningMatchContext.Provider
      value={{
        ...participation,
        match,
        myTag,
        canReport,
        moment,
        onBar: barCovers(moment, match.scheduledAt),
      }}
    >
      {children}
    </RunningMatchContext.Provider>
  );
}
