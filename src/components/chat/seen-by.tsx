import { useTranslation } from 'react-i18next';
import type { MatchChatView } from '@ggclubs/schemas';

/**
 * **"Visto por @fulano"** · embaixo da última mensagem do seu club.
 *
 * **A pergunta que ele responde é uma só:** *o outro club viu o que eu
 * escrevi?* Numa sala onde se combina horário de jogo, é a diferença entre
 * esperar e cobrar.
 *
 * **Só o OUTRO lado conta, e isso não é detalhe** · o colega do meu próprio
 * club abrir a sala não responde nada · pior, responde errado: eu leria "visto
 * por @gerente-casa" e concluiria que o adversário confirmou o horário. Achado
 * pelo `revisor` em 28/08/2026, com a primeira versão contando os dois lados.
 *
 * **Só na última mensagem do club**, e não em cada linha · é o padrão de
 * mercado (Telegram, Slack em grupo) e o motivo é de leitura: quem leu a última
 * leu as anteriores.
 *
 * **A organização nunca aparece aqui**, e isso é decisão de moderação do
 * Eduardo (27/08/2026): *"pra não saberem quando a administração pode estar
 * olhando"*. Quem garante é o servidor, que **não manda** a leitura dela.
 */
export function SeenBy({
  readers,
  messageAt,
  myClubTags,
}: {
  readers: MatchChatView['readers'];
  /** Quando a mensagem foi escrita · quem leu depois dela, viu. */
  messageAt: Date | string;
  /** Os meus clubs nesta partida · quem é deles não conta como "visto". */
  myClubTags: string[];
}) {
  const { t } = useTranslation();

  /**
   * **Data do wire é STRING**, por mais que o tipo diga `Date` · o cliente da
   * API faz cast cru (`as T`), sem parse. Chamar `.getTime()` direto aqui
   * **derrubava a árvore inteira** no instante em que o primeiro leitor
   * aparecia · e não há `ErrorBoundary` no produto, então era tela branca.
   *
   * O resto do chat já sabia disso (`timeOf` aceita `Date | string`) · este era
   * o primeiro lugar a esquecer.
   */
  const at = (value: Date | string) => new Date(value).getTime();
  const mine = new Set(myClubTags);

  const seen = readers.filter((one) => !mine.has(one.clubTag) && at(one.readAt) >= at(messageAt));
  if (seen.length === 0) return null;

  /**
   * **Um nome vira nome; dois ou mais viram contagem.** O outro club tem até
   * dono e gerente, e dois @handles numa linha de rodapé de bolha estouram a
   * largura no celular · o número responde a mesma pergunta sem competir com a
   * mensagem.
   */
  const label =
    seen.length === 1 && seen[0]
      ? t('chat.seenByOne', { handle: seen[0].handle })
      : t('chat.seenByMany', { count: seen.length });

  return (
    <p className="mt-0.5 text-right text-[11px] leading-none text-muted-foreground">{label}</p>
  );
}
