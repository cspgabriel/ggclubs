import { tournamentIsDrawn } from '@ggclubs/schemas';
import { PageStack } from '@/components/ui/page-stack';
import type { ReactNode } from 'react';
import { capacityOf, effectiveSize, podiumOf, registrationIsOpen } from '@ggclubs/schemas';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { useTranslation } from 'react-i18next';
import { type MatchCard, type TournamentClubCard } from '@ggclubs/schemas';
import { LegalDocument } from '@/components/legal-document';
import type { RegistrationCard, TournamentRecord } from '@/lib/api';
import { BracketPanel } from './tournament-bracket-panel.js';
import {
  FormatPanel,
  PodiumPanel,
  PrizePanel,
  TournamentHero,
  TournamentDates,
} from './tournament-hero.js';
import { RegisteredGrid } from './tournament-registered.js';
import { directoryOf } from './tournament-shared.js';
import type { MatchChatting, MatchReporting } from './tournament-shared.js';

/**
 * A página do campeonato. · **A composição · quem monta a página inteira.**
 *
 * **Só composição** · o que era 4.118 linhas virou o arquivo que decide a ORDEM dos blocos, e nada mais.
 *
 * > **Era um arquivo de 4.118 linhas até 01/09/2026** · o corte é a fase 2 do
 * > [arquitetura.md](../../../../docs/arquitetura.md), e o motivo dele está escrito
 * > lá: arquivo que ninguém lê inteiro é arquivo onde a exceção se esconde.
 */

/**
 * A edição, desenhada uma vez só · **o mesmo componente nas duas molduras.**
 *
 * É o desenho do `ClubView`, e existe pelo mesmo motivo dele: a página aberta e
 * a de dentro do app respondem a **mesma** pergunta, e escrever duas telas é
 * garantir que uma receba o conserto seguinte e a outra não · a divergência não
 * quebra nada, não aparece em captura, e só é vista por quem chega de fora.
 *
 * **Quem muda entre as duas é a moldura e o caminho dos links**, e nada mais ·
 * por isso `clubHref` vem de fora. Dentro do app, o escudo de um inscrito leva
 * pra `/app/clubs/:tag`; na aberta, pra `/club/:tag`.
 */
export function TournamentView({
  tournament,
  registrations,
  matches,
  clubs = [],
  myClubTags = [],
  chat,
  clubHref,
  join,
  footer,
  report,
}: {
  tournament: TournamentRecord;
  registrations: RegistrationCard[];
  /**
   * A chave · **vazia até o sorteio, e desenhada nas duas molduras.**
   *
   * **Ela é pública de propósito** · a chave é o cartaz da edição, e é o que
   * circula no Discord depois do sorteio. Ela responde *"que campeonato é
   * esse?"* pra quem nunca ouviu falar, que é o critério que separa o que vai
   * pra fora do que fica no app.
   */
  matches: MatchCard[];
  /**
   * As tags dos clubs de quem está olhando · **vazio na moldura aberta**, e é
   * isso que faz a chave ser a mesma pra todo mundo e ainda assim ser **a sua**
   * pra quem tem club dentro: a linha acende e a faixa do próximo jogo aparece.
   *
   * Vem de fora porque o `MyClubsProvider` só existe dentro do `/app` · a página
   * aberta não tem sessão, e não deve ter.
   */
  myClubTags?: string[];
  /** A conversa do confronto · ausente na página pública, que não tem sessão. */
  chat?: MatchChatting;
  clubHref: (tag: string) => string;
  /**
   * O painel de inscrever · **é o que mais muda entre as molduras, e a diferença
   * não é de layout: é de conversa.**
   *
   * Na aberta ele é a **porta** · quem lê ainda não tem conta, e o que está em
   * jogo é convencer. Na de dentro do app ele é **operação** · a pessoa já
   * entrou, tem club, e o que ela quer é pôr o time na chave. É a mesma divisão
   * que a página do club faz entre o "Criar conta" acima da dobra e o botão de
   * configurar.
   */
  /**
   * Os clubs que a **chave** menciona · vem da mesma resposta, e cobre quem
   * saiu da grade depois de jogar. Ver `ClubDirectory`.
   */
  clubs?: TournamentClubCard[];
  join?: ReactNode;
  /**
   * O que fecha a página.
   *
   * **Só a aberta usa**, e ela usa pelo motivo que a landing ensinou em 10/08:
   * quem rolou até o fim convencido não tinha o que apertar. Dentro do app não
   * há o que fechar · o botão já estava no alto e a pessoa não veio ser
   * convencida.
   */
  footer?: ReactNode;
  report?: MatchReporting;
}) {
  const { t } = useTranslation();
  // **Um degrau, e ele vem do schema** · o `sizeFor` cru ignorava o `drawnSize`,
  // então depois do sorteio a premiação exibida voltava a ser a promessa em vez
  // do que a edição de fato jogou. Ver `effectiveSize`.
  const current = effectiveSize(tournament);
  /**
   * **Quantos já PAGARAM** · o número que o sorteio conta.
   *
   * O `registeredCount` conta **vaga** (reserva + pago) e está certo assim ·
   * quem pergunta *"tem vaga?"* quer a reserva contada. O que **não** pode usar
   * o contador é quem fala do **sorteio**, do **degrau** ou do **prêmio**, e é
   * por isso que a escada recebe este número em vez de derivar do documento.
   *
   * Sai do `status` que já viaja no card da inscrição · nenhuma chamada nova.
   */
  const paidCount = registrations.filter((one) => one.status === 'confirmed').length;

  // A fase abre quando suas partidas chegaram; as datas seguem o sorteio realizado.
  const hasBracket = matches.length > 0;
  const drawn = hasBracket || tournamentIsDrawn(tournament);

  /**
   * **Quem ganhou** · derivado da chave, e `null` enquanto a final não fechou.
   *
   * Ele muda a página inteira de assunto: com pódio, a primeira coisa que a
   * edição diz é o campeão, e a escada de venda vira registro.
   */
  /**
   * **E ele só aparece quando não sobra partida por jogar** · pendência 178.
   *
   * O `podiumOf` fica não-nulo assim que a **final** fecha, e a disputa de
   * terceiro é da mesma rodada · a página abria com *"O PÓDIO · a edição
   * acabou"* enquanto os dois semifinalistas liam *"É a sua vez"* e a partida
   * deles estava logo abaixo, marcada.
   *
   * A pergunta certa não é "a final fechou", é **"ainda tem jogo?"**.
   *
   * **Menos quando a organização encerrou a edição**, e essa metade faltava: o
   * `setTournamentStatus(id, 'finished')` não exige partida nenhuma fechada, e a
   * disputa de terceiro que nunca aconteceu deixava o `stillPlaying` verdadeiro
   * **pra sempre** · a final tinha sido jogada e a página não mostrava campeão
   * nenhum. Encerrada, a pergunta "ainda tem jogo?" já tem resposta.
   */
  const stillPlaying =
    tournament.status !== 'finished' &&
    matches.some((m) => m.status === 'scheduled' || m.status === 'disputed');
  const podium = stillPlaying || tournament.status === 'cancelled' ? null : podiumOf(matches);

  const pitch = (
    <PageStack>
      {/**
       * **A premiação some quando o pódio existe** · pedido do Eduardo em
       * 05/09/2026: *"juntar com a parte de premiação pra não ter os cards
       * separados"*.
       *
       * Os dois diziam a mesma coisa em momentos diferentes: antes do fim, a
       * premiação é **promessa** e precisa de peça própria; depois dele, ela é
       * **fato** e mora no pódio, ao lado do nome de quem levou. Mantê-los
       * juntos fazia a página anunciar os mesmos três valores duas vezes, e a
       * segunda sem dono.
       */}
      {current && !podium && <PrizePanel size={current} />}
      <FormatPanel tournament={tournament} current={current} paidCount={paidCount} drawn={drawn} />
      {drawn && <TournamentDates tournament={tournament} historical />}

      {tournament.rules && (
        // Decisão de 19/08/2026: quem paga precisa ler as regras antes de inscrever.
        // Sem chave, o regulamento fica aberto na página. Com chave, a fase atual é inicial;
        // ao selecionar Regulamento e detalhes, o conteúdo das regras já está expandido (05/09/2026).
        <CollapsibleSection title={t('tournament.rulesTitle')} defaultOpen>
          <LegalDocument body={tournament.rules} />
        </CollapsibleSection>
      )}
    </PageStack>
  );

  const bracket = (
    <>
      {/* **A chave vem antes da grade de inscritos depois do sorteio**, e a
          ordem é a pergunta que a página passa a responder: enquanto as
          inscrições estão abertas, o que importa é quem já entrou; com a chave
          no ar, o que importa é **contra quem e quando**. */}
      <BracketPanel
        key={tournament._id}
        matches={matches}
        directory={clubs}
        registrations={registrations}
        clubHref={clubHref}
        myClubTags={myClubTags}
        report={report}
        chat={chat}
        /**
         * **Quantos passam de cada grupo** · e é o que faz a tabela do grupo
         * virar competição em vez de lista. A página dizia "passam 2 de cada"
         * no painel de formato e **não marcava a linha de corte** na tabela,
         * que é a única pergunta de uma fase de grupos.
         *
         * Vem do degrau efetivo, como tudo o mais · `null` antes do sorteio,
         * quando o número ainda pode mudar e desenhar um corte seria promessa.
         */
        size={drawn ? current : null}
        status={tournament.status}
        thirdPlaceMatch={tournament.format.thirdPlaceMatch}
        information={pitch}
      />
    </>
  );

  return (
    <PageStack>
      <TournamentHero tournament={tournament} matches={matches} resultsComplete={Boolean(podium)} />

      {join}

      {/* **O pódio na frente de tudo** · quem abre uma edição terminada quer
          saber quem ganhou, e essa resposta não espera cinco mil pixels de
          chave. */}
      {podium && (
        <PodiumPanel
          podium={podium}
          clubs={directoryOf(registrations, clubs)}
          clubHref={clubHref}
          size={current}
        />
      )}

      {/**
       * **Quem já está dentro mora colado no CTA** · 19/08/2026, decisão do
       * Eduardo: *"isso poderia estar embaixo do 'inscrever um club', pensando
       * na parte de vendas"*.
       *
       * Ele está certo, e o nome disso é prova social: *"48 clubs já entraram"*
       * logo abaixo do botão é o argumento que responde a objeção de quem vai
       * mandar Pix pra um link de terceiro · lá embaixo, depois da chave
       * inteira, ela chegava a quem **já** tinha decidido.
       *
       * Uma prévia permanece visível; a lista completa oferece busca e filtro.
       */}
      <RegisteredGrid
        capacity={capacityOf(tournament)}
        registrations={registrations}
        clubHref={clubHref}
        mine={new Set(myClubTags)}
        responds={new Set(report?.tags ?? [])}
        open={registrationIsOpen(tournament)}
        drawn={drawn}
      />

      {hasBracket ? bracket : pitch}

      {footer}
    </PageStack>
  );
}
