import type { TFunction } from 'i18next';
import type { NotificationRecord } from '@/lib/api';
import { CHAT_PARAM } from '@/lib/chat-link';
import { isDesktop } from '@/lib/platform';
import { adminTournamentPath, appClubPath, appTournamentPath, tournamentPath } from '@/lib/paths';

/**
 * Pra onde a linha da caixa leva.
 *
 * **Mora aqui, ao lado da frase, e não dentro do sininho** · são a mesma
 * pergunta feita duas vezes (*de que assunto é este aviso?*), e o destino é a
 * metade que erra em silêncio: mandar pro lugar errado não quebra nada e não
 * aparece em captura. Enquanto ele era um `appClubPath` fixo dentro do
 * componente, aviso de campeonato levaria pra página de um club.
 *
 * **`clubTag` continua sendo o destino de quase tudo**, porque quase todo aviso
 * é sobre um club · o de campeonato é a primeira exceção, e ele leva pra edição
 * porque quem recebe já sabe qual é o club dele.
 */
export function notificationTarget(item: NotificationRecord): string {
  /**
   * **O `groupsClosed` também cai na página pública da edição, e é o único aviso
   * de admin do produto** · a mesa dele já está linkada de lá, e mandar pro
   * `/admin` quem abriu o app no celular é oferecer uma tela que não foi
   * desenhada pra aquela largura.
   */
  switch (item.kind) {
    case 'tournament.registered':
    case 'tournament.registrationCancelled':
    case 'tournament.reservationExpired':
    case 'tournament.paymentConfirmed':
    case 'tournament.refunded':
    case 'tournament.cancelled':
    case 'tournament.drawn':
    case 'tournament.removed':
    case 'tournament.courtesy':
    case 'tournament.squadLocked':
    case 'tournament.squadLost':
    case 'tournament.matchReported':
    case 'tournament.matchDisputed':
    case 'tournament.matchTimedOut':
    case 'tournament.matchResolved':
    case 'tournament.matchClosedByAdmin':
    case 'tournament.matchWalkover':
    case 'tournament.nextMatch':
    case 'tournament.groupsClosed':
      return tournamentPath(String(item.params.tournamentSlug ?? ''));
    /**
     * **Os avisos de conversa levam PRA SALA** · o endereço dela é
     * `?conversa=<matchId>`, e sem ele o sininho largava a pessoa na página da
     * edição pra procurar o confronto na chave.
     *
     * **Com queda pra edição quando falta o `matchId`** · aviso gravado antes
     * de 27/08/2026 não tem o parâmetro, e linha antiga não pode virar link
     * quebrado.
     */
    case 'chat.adminCalled':
    case 'chat.adminSpoke':
    case 'chat.mention':
    case 'chat.firstUnread': {
      const slug = String(item.params.tournamentSlug ?? '');
      const matchId = String(item.params.matchId ?? '');
      /**
       * **A sala não mora na página pública** · ela existe no `/app` e, pra
       * quem organiza, no `/admin`. Todos estes avisos apontavam pro
       * `tournamentPath`, que é a página aberta · quem clicava caía numa tela
       * que **não tem conversa nenhuma**.
       */
      const page =
        item.kind === 'chat.adminCalled' ? adminTournamentPath(slug) : appTournamentPath(slug);
      return matchId ? `${page}?${CHAT_PARAM}=${matchId}` : page;
    }
    default:
      /**
       * **O destino também aguenta o desconhecido** · aqui o `default` já
       * existia e não lançava, mas ele mandava pro club, e aviso de um tipo que
       * esta versão não conhece pode não ter club nenhum · aí o endereço saía
       * `/app/clubs/` e a pessoa caía num 404 depois de clicar num aviso.
       */
      return item.params.clubTag ? appClubPath(String(item.params.clubTag)) : '/app';
  }
}

/**
 * A frase de uma linha da caixa do sininho.
 *
 * **O servidor manda a chave e os parâmetros; a frase é daqui.** É o que faz a
 * caixa inteira mudar de idioma junto com a pessoa, em vez de guardar o
 * português de quando cada aviso foi escrito · decisão do Eduardo em
 * 11/08/2026.
 *
 * **É um `switch` e não `t(\`…${kind}\`)`, e a verbosidade se paga duas vezes.**
 * A primeira é o tipo: o catálogo tipado não aceita chave montada em runtime
 * junto com parâmetros, porque cada frase interpola coisas diferentes. A segunda
 * é a que importa · **tipo novo em `notificationKind` sem linha aqui não
 * compila**, e é o mesmo par travado que o schema já cobra do lado do servidor.
 * Sem isso, o aviso novo chegaria na tela como a própria chave.
 */
export function notificationText(t: TFunction, item: NotificationRecord): string {
  const clubName = item.params.clubName ?? '';
  const handle = item.params.handle ?? '';
  const tournamentName = item.params.tournamentName ?? '';
  const rivalName = item.params.rivalName ?? '';

  switch (item.kind) {
    case 'club.invited':
      return t('notifications.kinds.club.invited', { clubName });
    case 'club.joinRequested':
      return t('notifications.kinds.club.joinRequested', { clubName, handle });
    case 'club.joinApproved':
      return t('notifications.kinds.club.joinApproved', { clubName });
    case 'club.joinRejected':
      return t('notifications.kinds.club.joinRejected', { clubName });
    case 'club.promoted':
      return t('notifications.kinds.club.promoted', { clubName });
    case 'club.demoted':
      return t('notifications.kinds.club.demoted', { clubName });
    case 'club.managerStepDown':
      return t('notifications.kinds.club.managerStepDown', { clubName, handle });
    case 'club.managerOffered':
      return t('notifications.kinds.club.managerOffered', { clubName });
    case 'club.managerAccepted':
      return t('notifications.kinds.club.managerAccepted', { clubName, handle });
    case 'club.managerDeclined':
      return t('notifications.kinds.club.managerDeclined', { clubName, handle });
    case 'club.removed':
      return t('notifications.kinds.club.removed', { clubName });
    case 'club.ownershipOffered':
      return t('notifications.kinds.club.ownershipOffered', { clubName });
    case 'club.ownershipAccepted':
      return t('notifications.kinds.club.ownershipAccepted', { clubName, handle });
    case 'club.ownershipDeclined':
      return t('notifications.kinds.club.ownershipDeclined', { clubName, handle });
    case 'club.inviteAccepted':
      return t('notifications.kinds.club.inviteAccepted', { clubName, handle });
    case 'club.inviteDeclined':
      return t('notifications.kinds.club.inviteDeclined', { clubName, handle });
    case 'club.memberLeft':
      return t('notifications.kinds.club.memberLeft', { clubName, handle });
    case 'club.deleted':
      return t('notifications.kinds.club.deleted', { clubName });
    case 'tournament.registered':
      return t('notifications.kinds.tournament.registered', {
        clubName,
        handle,
        tournamentName,
      });
    case 'tournament.registrationCancelled':
      return t('notifications.kinds.tournament.registrationCancelled', {
        clubName,
        handle,
        tournamentName,
      });
    // **Os quatro do laço não têm `handle`** · em nenhum deles existe uma pessoa
    // que agiu, e inventar um sujeito seria a frase mentindo.
    case 'tournament.reservationExpired':
      return t('notifications.kinds.tournament.reservationExpired', { clubName, tournamentName });
    case 'tournament.paymentConfirmed':
      return t('notifications.kinds.tournament.paymentConfirmed', { clubName, tournamentName });
    case 'tournament.refunded':
      /**
       * **Três formas, e a do meio é a decisão do Eduardo** (pendência 182,
       * 03/09/2026): pra quem recebe, reembolso é sair da edição.
       *
       * O motivo só vem quando quem reembolsou o disse, e o `slotFreed` só vem
       * `'true'` quando a inscrição **de fato** já estava cancelada na hora do
       * aviso · pelo painel do provedor ninguém tira ninguém, e aí cai no
       * genérico, que é a verdade lá. A frase não adivinha.
       */
      return t(
        item.params.refundReason === 'over-capacity'
          ? 'notifications.kinds.tournament.refundedOverCapacity'
          : item.params.slotFreed === 'true'
            ? 'notifications.kinds.tournament.refundedAndOut'
            : 'notifications.kinds.tournament.refunded',
        { clubName, tournamentName },
      );
    case 'tournament.cancelled':
      return t('notifications.kinds.tournament.cancelled', { clubName, tournamentName });
    case 'tournament.drawn':
      return t('notifications.kinds.tournament.drawn', { clubName, tournamentName });
    case 'tournament.removed':
      return t('notifications.kinds.tournament.removed', { clubName, tournamentName });
    case 'tournament.courtesy':
      return t('notifications.kinds.tournament.courtesy', { clubName, tournamentName });
    case 'tournament.squadLocked':
      return t('notifications.kinds.tournament.squadLocked', { clubName, tournamentName });
    // A exceção do laço · aqui a frase fala **de** alguém, e sem o nome dele
    // quem gerencia não sabe quem faltou.
    case 'tournament.squadLost':
      return t('notifications.kinds.tournament.squadLost', {
        clubName,
        handle,
        tournamentName,
      });
    // **O laço do resultado fala de club, e não de pessoa** · o sujeito da
    // partida é o outro lado inteiro, e quem declarou por ele não muda nada pra
    // quem recebe.
    case 'tournament.matchReported':
      return t('notifications.kinds.tournament.matchReported', {
        clubName,
        rivalName,
        tournamentName,
      });
    case 'tournament.matchDisputed':
      return t('notifications.kinds.tournament.matchDisputed', {
        clubName,
        rivalName,
        tournamentName,
      });
    case 'tournament.matchTimedOut':
      return t('notifications.kinds.tournament.matchTimedOut', {
        clubName,
        rivalName,
        yourGoals: item.params.yourGoals ?? '',
        rivalGoals: item.params.rivalGoals ?? '',
      });
    case 'tournament.matchResolved': {
      const result = t('notifications.kinds.tournament.matchResolved', {
        clubName,
        rivalName,
        yourGoals: item.params.yourGoals ?? '',
        rivalGoals: item.params.rivalGoals ?? '',
      });
      return item.params.reason
        ? `${result} ${t('competitionUx.decisionReason')}: ${item.params.reason}`
        : result;
    }
    /**
     * **O motivo entra na frase**, e é o que separa este aviso do de prazo · lá
     * o relógio venceu sozinho, aqui uma pessoa decidiu encurtar, e quem ficou
     * calado recebe um placar que não declarou.
     */
    case 'tournament.matchClosedByAdmin':
      return t('notifications.kinds.tournament.matchClosedByAdmin', {
        clubName,
        rivalName,
        yourGoals: item.params.yourGoals ?? '',
        rivalGoals: item.params.rivalGoals ?? '',
        reason: item.params.reason ?? '',
      });
    /**
     * **Sem placar na frase, de propósito** · o 0-0 gravado não é resultado de
     * jogo nenhum, e escrevê-lo aqui faria a pessoa procurar uma partida que não
     * aconteceu.
     */
    case 'tournament.matchWalkover':
      return t('notifications.kinds.tournament.matchWalkover', { clubName, rivalName });
    case 'tournament.nextMatch':
      return t('notifications.kinds.tournament.nextMatch', {
        clubName,
        rivalName,
        tournamentName,
      });
    case 'tournament.groupsClosed':
      return t('notifications.kinds.tournament.groupsClosed', { tournamentName });
    case 'chat.adminCalled':
      return t('notifications.kinds.chat.adminCalled', {
        tournamentName,
        homeTag: String(item.params.homeTag ?? '').toUpperCase(),
        awayTag: String(item.params.awayTag ?? '').toUpperCase(),
      });
    case 'chat.adminSpoke':
      return t('notifications.kinds.chat.adminSpoke', {
        tournamentName,
        homeTag: String(item.params.homeTag ?? '').toUpperCase(),
        awayTag: String(item.params.awayTag ?? '').toUpperCase(),
      });
    case 'chat.mention':
      return t('notifications.kinds.chat.mention', {
        tournamentName,
        homeTag: String(item.params.homeTag ?? '').toUpperCase(),
        awayTag: String(item.params.awayTag ?? '').toUpperCase(),
        byTag: String(item.params.byTag ?? '').toUpperCase(),
      });
    case 'chat.firstUnread':
      return t('notifications.kinds.chat.firstUnread', {
        tournamentName,
        byTag: String(item.params.byTag ?? '').toUpperCase(),
      });
    default:
      /**
       * **A trava que torna o `switch` de fato exaustivo.**
       *
       * O `docs/tempo-real.md` promete que este arquivo "não compila sem" o
       * caso novo, e **isso era falso**: sem `noImplicitReturns`, faltar um
       * `case` só produz um caminho que devolve `undefined`, e o tipo de retorno
       * `string` não reclama. Medido em 22/08/2026, ao acrescentar o
       * `matchWalkover` · ele compilou sem o caso.
       *
       * A atribuição a `never` reprova em tempo de compilação com o nome do tipo
       * que ficou de fora, que é a mensagem que alguém precisa ler. **Convenção
       * que depende de lembrar já falhou três vezes nesta casa**, e o que
       * resolveu nas três foi transformá-la em algo que reprova sozinho.
       */
      return unknownKind(item.kind, t);
  }
}

/**
 * **Reprova em compilação, e NÃO derruba a tela em execução** · as duas coisas,
 * e elas foram confundidas até 27/08/2026.
 *
 * O parâmetro `never` continua sendo a trava: faltar um `case` não compila, com
 * o nome do tipo que ficou de fora. O que mudou é o desfecho **em execução**,
 * porque ali a premissa é outra: a caixa de avisos é **dado**, e dado pode
 * conter um tipo que este build não conhece.
 *
 * **Isso não é hipótese** · aconteceu no mesmo dia, em produção: a API de
 * desenvolvimento falava com o **banco de verdade**, então avisos de um tipo
 * novo (`chat.adminCalled`) foram gravados na caixa antes de a web que os
 * entende subir. O sininho lançou no `map` e **levou a página inteira junto** ·
 * `Uncaught Error: tipo de aviso sem frase`.
 *
 * **Aquela causa fechou em 28/08/2026** (o desenvolvimento ganhou banco próprio),
 * e esta guarda **não sai por isso**: o caminho normal continua de pé · a API
 * sobe antes da web em todo deploy, então existe sempre uma janela em que o
 * banco tem tipo que o navegador aberto não conhece.
 *
 * O mesmo vale sem dev nenhum no meio: a API sobe antes da web em qualquer
 * deploy de duas peças, e **essa janela é normal**. Uma linha que a tela não
 * sabe ler é uma linha genérica, nunca uma tela em branco.
 */
function unknownKind(kind: never, t: TFunction): string {
  console.warn(`[avisos] tipo sem frase nesta versão: ${String(kind)}`);
  /**
   * **A saída depende de onde a pessoa está, e essa é a metade que faltava.**
   *
   * "Atualize a página pra ver" é verdade na web · lá a última versão é sempre a
   * que o CloudFront serve, e um F5 resolve. **No app instalado ele não resolve
   * nada**: o front é embutido no binário, então recarregar devolve exatamente o
   * mesmo bundle, e quem lesse a frase ficaria recarregando pra sempre. Lá o que
   * resolve é a atualização do app, que é justamente onde a janela é maior ·
   * dias ou semanas, e não os minutos de um deploy de duas peças.
   */
  return isDesktop() ? t('notifications.kinds.unknownDesktop') : t('notifications.kinds.unknown');
}
