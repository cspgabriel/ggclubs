import { DrawGuidance } from './tournament-participation';
import {
  capacityOf,
  displayStatusOf,
  effectiveSize,
  hasKickedOff,
  registrationIsOpen,
  TOURNAMENT_EVENT,
  tournamentTopic,
  type EligibleClub,
} from '@ggclubs/schemas';
import type { PhoneNumber } from '@ggclubs/schemas';
import { Check, Link2, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ClubCrest } from '@/components/club/club-crest';
import { PhoneFormField } from '@/components/phone-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SkeletonBar } from '@/components/ui/skeleton';
import { api, type RegistrationCard, type TournamentRecord } from '@/lib/api';
import { ApiError, apiErrorMessage } from '@/lib/api-error';
import { entryBlockerFor } from '@/lib/clubs';
import { formatCents } from '@/lib/format';
import { tournamentPath } from '@/lib/paths';
import { phoneIsValid } from '@/lib/phone-input';
import { publicOrigin } from '@/lib/public-url';
import { useAuth } from '@/lib/use-auth';
import { useMyClubs } from '@/lib/use-my-clubs';
import { useRealtimeRefresh } from '@/lib/realtime/use-realtime-refresh';
import { relativeTime } from '@/lib/relative-time';
import { cn } from '@/lib/utils';
import { useResource } from '@/lib/use-resource';
import { TournamentPaymentPanel } from './tournament-payment-panel';

/**
 * Inscrever um club · a peça de dentro do app.
 *
 * **Ela também vende, e essa é a correção do Eduardo em 12/08/2026.** Eu tinha
 * escrito que a aberta vende e esta opera · **estar logado não é estar
 * convertido**. O que muda é *o que* se vende: lá o **produto** (crie conta, o
 * seu club joga aqui), aqui **esta edição** (o seu club cabe, são R$ X, faltam N
 * vagas, fecha em Y). A decisão de pôr o time na chave é uma compra, e vai ser
 * literalmente uma no dia em que houver preço.
 *
 * Por isso os três argumentos ficam **grudados no botão**, e não espalhados pela
 * página: prêmio, escassez e prazo. Quem precisa rolar pra achar o motivo já
 * decidiu não decidir.
 *
 * **A elegibilidade é respondida antes do clique** · a pessoa lê *"é de outra
 * geração"* em vez de descobrir no erro. Atrito depois do clique é gente que
 * desiste, e o servidor revalida tudo · esconder é UX.
 */
export function TournamentJoinPanel({
  tournament,
  onChanged,
  registrations = [],
}: {
  tournament: TournamentRecord;
  onChanged: () => void;
  /**
   * Quem está inscrito · usado só pra **reconhecer os outros clubs da pessoa**
   * na edição. A elegibilidade continua vindo da API, e ela só devolve o club
   * de que a pessoa é dona.
   */
  registrations?: RegistrationCard[];
}) {
  const { t } = useTranslation();
  /**
   * **Falhar aqui é silêncio, como no painel de convite** · a página inteira
   * continua servindo, e o que se perde é um atalho.
   *
   * **Mas silêncio não é lista vazia** · pendência 176. O `error` virava `[]`, e
   * `[]` tem significado nesta tela: *"você ainda não tem club"*, com um botão
   * **Criar um club** que a tela de criar recusa (posse é 1) · o dono do Fúria
   * FC, já inscrito, lia isso no 429 e logo abaixo *"você também joga por Fúria
   * FC"*, sobre o próprio club. O comentário aqui do lado descrevia esse defeito
   * como consertado em 19/08; ele voltou pelo caminho da falha.
   *
   * Com `null`, o painel não afirma nada · é o mesmo "ainda não sei" que a
   * silhueta desenha, e é o que o `useResource` já entrega.
   */
  const { data: eligible, reload: load } = useResource(
    (signal) => api.tournamentEligibility(tournament.slug, { signal }).then((r) => r.clubs),
    [tournament.slug],
  );
  const clubs = eligible;
  /**
   * **Por que a elegibilidade voltou vazia?** · e a resposta é a mesma que a
   * tela inicial dá, então ela mora num lugar só (`entryBlockerFor`).
   *
   * Os clubs saem do `MyClubsProvider`, que já os tem desde 12/08 · buscar aqui
   * seria a sexta tela a pedir o mesmo `GET /me/clubs`.
   */
  const { clubs: myClubs } = useMyClubs();
  const { account, refreshAccount } = useAuth();
  const blocker = entryBlockerFor(myClubs);
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  /**
   * **Este painel ouve o canal, e não deduz do contador.**
   *
   * Ele dependia de `tournament.registeredCount` mudando, e isso quase sempre
   * funciona · quase. **Confirmar um pagamento reservado não mexe no contador**:
   * a vaga já estava contada desde a reserva, e o `applyPaid` só incrementa
   * quando a reserva tinha vencido antes do dinheiro. Ou seja, o gatilho era o
   * único valor que **não** se mexe no caso que mais importa.
   *
   * O desfecho, medido em produção em 13/08/2026 com dinheiro de verdade: o Pix
   * confirmou em **20 segundos**, a inscrição virou `confirmed` no banco, e a
   * tela seguiu mostrando o QR e o relógio correndo. **A pessoa pagou e a página
   * continuou pedindo pagamento.**
   *
   * Todos os outros desfechos mexiam no contador (inscrever, cancelar, a reserva
   * vencendo), e por isso o defeito ficou escondido desde que o painel existe.
   *
   * **O terceiro tipo é a cobrança morrendo no provedor** (pendência 94, 14/08)
   * · ali a vaga **continua reservada**, então o contador não se mexe e nenhum
   * dos outros dois eventos sai. Sem ele, o QR de uma cobrança que já não é
   * pagável fica na tela até o relógio da reserva vencer · e ela ainda tinha
   * minutos pra tentar de novo.
   */
  useRealtimeRefresh(
    tournamentTopic(tournament._id),
    [TOURNAMENT_EVENT.registrations, TOURNAMENT_EVENT.status, TOURNAMENT_EVENT.payment],
    load,
  );

  /**
   * **O telefone é pedido AQUI, e não noutra tela** · decisão do Eduardo em
   * 01/09/2026, olhando a primeira versão: *"isso adiciona fricção; aqui era pra
   * abrir um modal ou algo do tipo pra já preencher na hora junto com o fluxo de
   * pagar"*.
   *
   * Ele está certo, e o erro era de produto. A versão anterior devolvia uma
   * frase mandando a pessoa **ir na conta, preencher e voltar** · três telas e
   * uma volta, no momento em que ela já decidiu entrar e o passo seguinte é
   * pagar. **Pedido de dado no meio de uma decisão se resolve onde a decisão
   * está.**
   *
   * **Quem sabe que falta é o cliente, e sem chamada nova** · quem inscreve é o
   * dono, o dono é quem está logado, e a conta vem do `useAuth()`. A trava do
   * servidor continua existindo por baixo (`PHONE_REQUIRED`) · ela é a verdade,
   * e isto aqui é a porta.
   */
  const [askingPhone, setAskingPhone] = useState<EligibleClub | null>(null);
  const [phone, setPhone] = useState<PhoneNumber | null>(null);

  async function act(club: EligibleClub) {
    // Cancelar nunca pede telefone · quem sai não precisa ser encontrado.
    if (club.reason !== 'already-registered' && !account?.phone) {
      // **O que foi digitado não é apagado ao reabrir** · se a gravação falhar,
      // a pessoa clica de novo e o número dela ainda está lá.
      setFailure(null);
      setAskingPhone(club);
      return;
    }
    await run(club);
  }

  /**
   * @param canAskPhone Reabrir o modal quando o servidor recusar por falta de
   * telefone. É `false` na volta do próprio modal · ali o número **acabou de
   * ser gravado**, e reabrir a janela que está fechando faria as duas se
   * anularem, deixando a pessoa sem inscrição e sem mensagem.
   */
  async function run(club: EligibleClub, canAskPhone = true) {
    setBusy(club.id);
    setFailure(null);
    try {
      if (club.reason === 'already-registered') {
        await api.cancelTournamentRegistration(tournament._id, club.id);
      } else {
        await api.registerForTournament(tournament._id, club.id);
      }
      load();
      onChanged();
    } catch (err) {
      // **O servidor continua sendo a verdade, e aqui ele reabre a porta** · se
      // a conta do contexto estava velha, a resposta do `PHONE_REQUIRED` traz
      // de volta o mesmo modal em vez da frase que mandava a pessoa embora.
      if (canAskPhone && err instanceof ApiError && err.code === 'PHONE_REQUIRED') {
        setAskingPhone(club);
        return;
      }
      setFailure(apiErrorMessage(err, t));
    } finally {
      setBusy(null);
    }
  }

  /**
   * Salva o número e **continua a inscrição no mesmo gesto**.
   *
   * **A ordem importa** · sem o `refreshAccount`, o `account` do contexto ficaria
   * sem telefone e o próximo clique abriria o modal de novo.
   */
  async function savePhoneAndRun(club: EligibleClub) {
    try {
      await api.updateMyProfile({ phone });
      await refreshAccount();
    } catch (err) {
      // **Falhar aqui não pode ser silêncio.** A janela fecha sozinha quando
      // este `onConfirm` resolve, e segurá-la exigiria relançar · aí a falha
      // vira rejeição sem dono. Então a mensagem sai na página, e o número
      // digitado continua no estado pra quem clicar de novo.
      setFailure(apiErrorMessage(err, t));
      return;
    }
    setAskingPhone(null);
    await run(club, false);
  }

  const mine = clubs?.find((c) => c.reason === 'already-registered') ?? null;

  /**
   * Os meus clubs que estão na edição e **não** são o que eu respondo.
   *
   * Sai do cruzamento de dois dados que a página já tem · sem chamada nova.
   */
  /**
   * **`clubs === null` é "ainda não sei", e não "nenhum"** · com o `?? []` a
   * lista nascia vazia enquanto a elegibilidade chegava (e ficava vazia quando
   * ela **falhava**, porque o `catch` faz `setClubs([])`). O club de que a
   * pessoa é dona passava no filtro e era listado sob "você também joga por",
   * com a frase dizendo que ela não inscreve, não paga e não lança placar do
   * próprio club. Achado pelo `revisor` em 19/08/2026.
   */
  const eligibleTags = clubs === null ? null : new Set(clubs.map((c) => c.tag));
  const alsoIn =
    eligibleTags === null
      ? []
      : (myClubs ?? [])
          .filter(
            (club) =>
              !eligibleTags.has(club.tag) && registrations.some((row) => row.club.tag === club.tag),
          )
          .map((club) => ({ tag: club.tag, name: club.name, crestUrl: club.crestUrl }));
  /**
   * **Todos os que esperam pagamento, e não o primeiro.**
   *
   * O teto é de três clubs por pessoa, e nada impede reservar vaga em mais de um
   * na mesma edição · **com `find`, o segundo club ficava com a vaga segura e
   * sem forma de pagar**, até a reserva vencer sozinha. Achado em 13/08/2026
   * olhando a captura, com dois clubs reservados na tela.
   */
  const waiting = clubs?.filter((c) => c.reason === 'awaiting-payment') ?? [];
  const left = Math.max(capacityOf(tournament) - tournament.registeredCount, 0);
  // **A premiação sai de UM lugar só** · seis telas derivavam este número por
  // conta própria e discordavam entre si, então o card anunciava um prêmio e a
  // página que recebia o clique anunciava outro. Ver `effectiveSize` · e é ele
  // que decide se o número é o congelado do sorteio ou o anunciado.
  //
  // (Esta linha dizia "o degrau efetivo, e não `sizes[0]`" · desde 04/09/2026 o
  // degrau efetivo **é** o `sizes[0]` antes do sorteio, e o contraste virou
  // mentira. Quem escolhe continua sendo um lugar só, que era o ponto.)
  const prize = effectiveSize(tournament)?.prize.first ?? 0;
  // A janela de datas, e não o status · ver `registrationIsOpen`.
  const windowOpen = registrationIsOpen(tournament);
  /**
   * **Com a bola rolando ou o campeonato acabado, o painel some inteiro** ·
   * 05/09/2026, pedido do Eduardo: *"quando o campeonato tiver
   * acontecendo/encerrado, não aparecer o container do inscrever um club"*.
   *
   * Ele nasceu pra **vender a vaga**, e depois do primeiro apito não há vaga que
   * ele possa vender: o que sobrava era uma caixa explicando por que você não
   * pode entrar, ocupando o lugar mais alto da página, acima da chave, que é o
   * que quem chega quer ver.
   *
   * **Quem já está dentro não perde nada** · a grade de inscritos marca os seus
   * clubs, a chave acende as suas partidas e a faixa do topo leva pro seu jogo.
   */
  const over =
    hasKickedOff(tournament) ||
    tournament.status === 'finished' ||
    tournament.status === 'cancelled';
  if (over) return null;
  /**
   * **Cabe mais alguém?** · é a outra pergunta, e juntar as duas numa variável
   * chamada `open` foi o que pôs "Inscrições abertas" e "não estão abertas" na
   * mesma tela: a capa perguntava só a janela, este painel perguntava as duas,
   * e a frase de recusa só sabia falar de janela.
   *
   * Elas continuam sendo somadas (`canJoin`), o que mudou é que **cada uma tem
   * nome** e a recusa pode dizer qual das duas barrou.
   */
  const full = left === 0;
  const canJoin = windowOpen && !full;
  /**
   * **Publicada e ainda não aberta é outra coisa que fechada** · pendência 120.
   * A tela dizia "as inscrições estão fechadas" pra uma edição que **vai**
   * abrir, o que faz o visitante ir embora achando que perdeu. Agora ela conta
   * quando abre · a régua da casa é que controle desligado diz por que está.
   */
  const notYetOpen = displayStatusOf(tournament) === 'notYetOpen';
  /**
   * **Sair da edição é coisa de quem ainda pode entrar, E de quem ainda não
   * pagou** · são duas regras, e a tela só contava a primeira.
   *
   * Depois que as inscrições fecham, a vaga não volta pra ninguém e quem não
   * joga leva W.O. Essa metade já estava aqui, **e ela perguntava ao status** ·
   * com o prazo vencido e o admin ainda sem fechar a edição (`status: 'open'`),
   * o botão aparecia e o servidor respondia `closed`. Quem responde hoje é o
   * `registrationIsOpen`, que é a janela de datas. **A que faltava é o
   * dinheiro:**
   * o `cancelRegistration` recusa inscrição paga com `REGISTRATION_ALREADY_PAID`
   * (cancelar devolveria a vaga sem devolver o dinheiro), e a tela oferecia o
   * botão assim mesmo · o servidor respondia 409 depois do clique.
   *
   * **A ironia é que o comentário do próprio botão, doze linhas abaixo, enuncia
   * a regra que ele violava:** *controle que não pode agir não fica desligado,
   * fica fora.*
   *
   * **A condição é `priceCents > 0` E confirmada**, e a primeira metade não é
   * zelo: em edição grátis a inscrição também nasce `confirmed`, e sem ela o
   * botão sumiria justamente onde ele funciona.
   *
   * **E a terceira metade é a cortesia** · ela é `confirmed` numa edição paga e
   * **nunca teve cobrança**, então "pagou" derivado de `priceCents > 0` a
   * incluía e escondia o botão de quem ganhou a vaga. A API deixou de recusar em
   * 04/09/2026 e **esta linha continuou escondendo** · o conserto existia e não
   * chegava a ninguém. Achado pelo `revisor` e pelo `auditor-doc` no mesmo
   * bloco, e é o motivo de o `EligibleClub` carregar `courtesy`: o `reason`
   * responde *"está dentro"*, e não *"pagou"*.
   */
  const paidFor =
    tournament.priceCents > 0 && mine?.reason === 'already-registered' && !mine.courtesy;
  const canLeave = registrationIsOpen(tournament) && !paidFor;

  /**
   * **Quando não há nada a fazer, o painel vira uma linha.**
   *
   * Pedido do Eduardo em 19/08/2026: *"o card do 'X está na chave' está
   * ocupando muito espaço do jeito que está"*.
   *
   * Ele está certo, e o desenho anterior era o de um painel de **ação** usado
   * pra dar um **fato**. Com a chave sorteada não há o que inscrever, o que
   * cancelar, nem link pra chamar adversário (esse morre quando a chave sai) ·
   * o que sobrava era título grande, moldura de 24px e uma lista de um item
   * dizendo "inscrito", ocupando meia tela pra afirmar uma coisa que cabe numa
   * frase.
   *
   * **O critério é "não há controle nenhum aqui"**, e não o status da edição ·
   * quem ainda pode cancelar, pagar ou ver os outros clubs continua com o
   * painel inteiro, porque aí ele tem trabalho a fazer.
   */
  const settled = mine !== null && !canLeave && clubs !== null && clubs.length === 1;

  if (settled) {
    return (
      <section
        data-join-panel
        className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <ClubCrest
            tag={mine.tag}
            crestUrl={mine.crestUrl}
            className="h-8 w-8 shrink-0 text-[10px]"
          />
          {/* **Quebra, e não trunca** · é uma frase, não um nome de coluna. A
              320 ela tinha 76px pra precisar de 227 e saía cortada na segunda
              palavra; com o `basis-40` o selo desce sozinho e a frase fica com
              a linha inteira. Medido na varredura de 19/08/2026. */}
          <p className="min-w-0 grow basis-40 font-display text-sm uppercase text-foreground sm:text-base">
            {t('tournament.joinedTitle', { club: mine.name })}
          </p>
          <Badge data-registered-badge variant="success" icon={Check}>
            {t('tournament.joined')}
          </Badge>
        </div>

        {/**
         * **Os outros clubs entram como LINHA, e não como caixa.**
         *
         * Eles já tiveram moldura própria dentro do painel, e o Eduardo mediu o
         * resultado com o olho: três caixas aninhadas e 277px pra dizer duas
         * coisas que cabem em duas linhas. **Caixa é pra separar o que tem
         * comportamento próprio** · aqui não há nenhum, só um fato e a sua
         * ressalva.
         */}
        <DrawGuidance tournament={tournament} />
        {alsoIn.length > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="uppercase tracking-widest">{t('tournament.alsoInTitle')}</span>
            {alsoIn.map((club) => (
              <span key={club.tag} className="flex items-center gap-1.5 text-foreground">
                <ClubCrest tag={club.tag} crestUrl={club.crestUrl} className="h-4 w-4 text-[7px]" />
                {club.name}
              </span>
            ))}
            <span>{t('tournament.alsoInBody')}</span>
          </p>
        )}
      </section>
    );
  }

  return (
    <section
      data-join-panel
      className={cn(
        'rounded-xl border p-5 sm:p-6',
        mine
          ? 'border-primary/30 bg-primary/5'
          : canJoin
            ? 'border-primary/30 bg-card'
            : 'border-border bg-card',
      )}
    >
      {/* **Quem já está dentro lê outra coisa** · repetir o argumento de venda
          pra quem comprou é ruído, e o que ele quer agora é chamar adversário ·
          que é o laço de crescimento do produto. */}
      <h2 className="font-display text-lg uppercase text-foreground sm:text-xl">
        {waiting.length > 0
          ? t('tournament.joinCompleteTitle')
          : mine
            ? t('tournament.joinedTitle', { club: mine.name })
            : t('tournament.joinTitle')}
      </h2>

      {!mine && waiting.length === 0 && (
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          {canJoin
            ? t(prize > 0 ? 'tournament.joinPitch' : 'tournament.joinPitchNoPrize', {
                prize: formatCents(prize),
                // `count` e não `spots` · é ele que o i18next lê pra escolher
                // entre `_one` e `_other`, e sem isso a tela dizia "1 vagas".
                count: left,
                when: relativeTime(tournament.registrationClosesAt),
              })
            : notYetOpen
              ? t(
                  tournament.priceCents > 0
                    ? 'tournament.joinNotYetOpenPaid'
                    : 'tournament.joinNotYetOpen',
                  { when: relativeTime(tournament.registrationOpensAt) },
                )
              : // **Lotada vem antes de fechada** · com a janela aberta e o teto
                // cheio quem barra é o teto, e era isso que a frase não sabia
                // dizer. Com a janela fechada, `joinClosed` continua certo.
                windowOpen && full
                ? t('tournament.joinFull')
                : t('tournament.joinClosed')}
        </p>
      )}

      {/* **Chamar adversário é convite pra entrar, e ele morre quando a chave
          sai** · com os grupos montados o link não leva ninguém pra dentro da
          edição, e a frase vira promessa falsa na tela de quem já está jogando.
          Só aparece enquanto as inscrições estão abertas. */}
      {(mine ||
        alsoIn.some((club) =>
          registrations.some((row) => row.club.tag === club.tag && row.status === 'confirmed'),
        )) && <DrawGuidance tournament={tournament} />}
      {mine && canLeave && <ShareLine tournament={tournament} />}

      {/**
       * **Os seus outros clubs na edição, com o limite escrito.**
       *
       * Pedido do Eduardo em 19/08/2026: *"poderia mostrar também os clubs que
       * você é membro/gerente, mas só ter as limitações do que pode gerenciar"*.
       *
       * Até aqui este painel enxergava **só o club de que a pessoa é dona**,
       * porque é isso que a elegibilidade devolve desde 18/08/2026 · quem
       * estava em três clubs da edição via um. O painel ficava dizendo a
       * verdade sobre o que ela **pode fazer** e escondendo metade do que ela
       * **tem**.
       *
       * **A lista sai do cruzamento de dois dados que a página já tem** · os
       * meus clubs (provider) e quem está inscrito (a mesma resposta que
       * desenha a grade). Nenhuma chamada nova.
       *
       * **E o limite vem junto, senão a marcação mente** · listar sem dizer que
       * ali ela só joga faria a pessoa procurar um botão de inscrever que a
       * rota recusa.
       */}
      {alsoIn.length > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-background/40 p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {t('tournament.alsoInTitle')}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {alsoIn.map((club) => (
              <li key={club.tag}>
                <span className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
                  <ClubCrest
                    tag={club.tag}
                    crestUrl={club.crestUrl}
                    className="h-5 w-5 text-[8px]"
                  />
                  <span className="text-xs text-foreground">{club.name}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">{t('tournament.alsoInBody')}</p>
        </div>
      )}

      {clubs === null && <SkeletonBar className="mt-4 h-12 w-full rounded-lg" />}

      {/* **Lista vazia tem dois motivos desde 18/08/2026, e a frase é outra em
          cada um.** A elegibilidade passou a devolver só o club de que a pessoa
          é **dona**, então quem está em três clubs sem ser dono de nenhum
          também chega aqui · e pra essa pessoa a frase antiga afirmava que ela
          não tem club, olhando pros clubs dela.

          Quem responde qual é o caso é o provider, e não uma segunda chamada ·
          a lista dos seus clubs já está na sessão. */}
      {clubs?.length === 0 && (
        <div data-eligibility-empty>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(blocker === 'not-lead' ? 'tournament.notOwnerBody' : 'tournament.noClubsBody')}
          </p>
          <Button asChild variant="cta" className="mt-4">
            <Link to="/app/clubs/novo">{t('tournament.createClub')}</Link>
          </Button>
        </div>
      )}

      {clubs && clubs.length > 0 && (
        <ul className="mt-4 space-y-2">
          {clubs.map((club) => (
            <li
              key={club.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3"
            >
              {/* **O nome fica com a linha inteira no celular** · a 320 ele
                  dividia a linha com o escudo e com o botão e sobravam **38px**
                  pra um nome que precisa de 60 · o nome do club saía cortado na
                  própria tela que existe pra inscrever esse club. Medido na
                  varredura de 19/08/2026. A partir de `sm` a linha volta a ser
                  uma só, porque aí ela cabe. */}
              <span className="flex min-w-0 basis-full items-center gap-3 sm:basis-auto sm:flex-1">
                <ClubCrest
                  tag={club.tag}
                  crestUrl={club.crestUrl}
                  className="h-9 w-9 shrink-0 text-xs"
                />
                <span className="min-w-0 flex-1 break-words text-sm font-semibold text-foreground">
                  {club.name}
                </span>
              </span>

              {/* **O sólido da marca fica aqui**, e é o único da tela · é a ação
                  que a página inteira existe pra provocar. */}
              {club.reason === 'ok' && (
                <Button
                  data-join-club
                  variant="cta"
                  size="sm"
                  disabled={busy === club.id}
                  onClick={() => void act(club)}
                >
                  {busy === club.id ? t('tournament.joining') : t('tournament.join')}
                </Button>
              )}

              {club.reason === 'already-registered' && (
                <>
                  <Badge data-registered-badge variant="success" icon={Check}>
                    {t('tournament.joined')}
                  </Badge>
                  {/* **Cancelar só existe enquanto as inscrições estão abertas.**
                      O servidor já recusava depois disso (sair da chave é W.O. e
                      não cancelamento), mas o botão continuava na tela e falhava
                      no clique · achado pelo Eduardo com a chave já sorteada.

                      **Controle que não pode agir não fica desligado, fica
                      fora** · aqui não há o que explicar por que ele existiria:
                      a ação deixou de ser possível, e um botão inerte ao lado do
                      selo de inscrito lê como tela quebrada. */}
                  {canLeave && (
                    <Button
                      data-cancel-registration
                      size="sm"
                      variant="ghost"
                      disabled={busy === club.id}
                      onClick={() => void act(club)}
                    >
                      {busy === club.id ? t('tournament.cancelling') : t('tournament.cancel')}
                    </Button>
                  )}
                </>
              )}

              {/* A vaga está segura e o dinheiro não entrou · o painel de
                  pagamento é quem desenha isso, e ele mora abaixo da lista
                  porque carrega QR e relógio. */}
              {club.reason === 'awaiting-payment' && (
                <Badge data-awaiting-payment variant="strong">
                  {t('tournament.awaitingPayment')}
                </Badge>
              )}

              {/* **Controle desligado diz por que está desligado** · sem a frase,
                  um botão inerte lê como tela quebrada. */}
              {club.reason !== 'ok' &&
                club.reason !== 'already-registered' &&
                club.reason !== 'awaiting-payment' && (
                  <span className="text-xs text-muted-foreground">
                    {t(REASON_KEY[club.reason])}
                  </span>
                )}
            </li>
          ))}
        </ul>
      )}

      {/* **O pagamento mora abaixo da lista, e não dentro da linha** · ele
          carrega QR, código e relógio, e espremer isso ao lado do nome do club
          quebraria a 320. Só aparece pro club que tem vaga segura. */}
      {waiting.map((club) => (
        <TournamentPaymentPanel
          key={club.id}
          tournamentId={tournament._id}
          club={club}
          priceCents={tournament.priceCents}
          onPaid={() => {
            load();
            onChanged();
          }}
          // A cobrança nasceu · só a elegibilidade muda, e o contador de vagas
          // não · reservar já contou a vaga, e é por isso que `onChanged` não
          // entra aqui.
          onCharged={load}
        />
      ))}

      {failure && <p className="mt-3 text-sm text-destructive">{failure}</p>}

      {/* **O telefone pedido no lugar onde a decisão está** · ver o `act`.
          Reusa o diálogo da casa em vez de inventar um: ele já prende o foco,
          associa título e descrição por `aria` e carrega a identidade. */}
      <ConfirmDialog
        open={askingPhone !== null}
        onOpenChange={(v) => {
          if (!v) setAskingPhone(null);
        }}
        title={t('phone.dialogTitle')}
        description={t('phone.dialogBody')}
        // O campo vai no `body`, e não na descrição · ver o slot lá.
        body={
          <PhoneFormField
            id="join-phone"
            value={phone}
            onChange={setPhone}
            labelHidden
            hint={false}
          />
        }
        // **Desligado enquanto o número não fecha** · e quem diz o porquê é o
        // próprio campo, em vermelho, logo acima do botão · o vazio pela dica
        // que já está lá, o errado pelo `phone.invalid`.
        confirmDisabled={!phoneIsValid(phone)}
        confirmLabel={t('phone.dialogConfirm')}
        onConfirm={async () => {
          if (askingPhone) await savePhoneAndRun(askingPhone);
        }}
      />
    </section>
  );
}

/**
 * **Chamar adversário é a ação seguinte de quem acabou de entrar**, e ela é
 * aquisição de graça: o link cai no grupo do WhatsApp e no Discord, que é por
 * onde este público circula.
 *
 * **O endereço sai de `publicOrigin()`, e nunca de `window.location`** · no app
 * instalado a origem é `tauri://localhost`, e copiar de lá colaria no Discord um
 * link que não abre. É a regra escrita no `CLAUDE.md`, e o defeito que a criou
 * foi exatamente este: o link público do club.
 */
function ShareLine({ tournament }: { tournament: TournamentRecord }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const url = `${publicOrigin()}${tournamentPath(tournament.slug)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      // Sem permissão de clipboard o link continua visível no título · não há o
      // que avisar, e um erro aqui seria ruído por uma ação secundária.
    }
  }

  return (
    <>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">{t('tournament.joinedBody')}</p>
      <Button
        variant="ctaOutline"
        size="sm"
        className="mt-3"
        title={url}
        onClick={() => void copy()}
      >
        {copied ? (
          <Check className="mr-1.5 h-3.5 w-3.5" />
        ) : (
          <Share2 className="mr-1.5 h-3.5 w-3.5" />
        )}
        {copied ? t('tournament.linkCopied') : t('tournament.copyLink')}
      </Button>
    </>
  );
}

/** O link da edição, pra quem quiser compartilhar sem estar inscrito. */
export function TournamentShareButton({ tournament }: { tournament: TournamentRecord }) {
  const { t } = useTranslation();
  const url = `${publicOrigin()}${tournamentPath(tournament.slug)}`;
  return (
    <Button
      variant="ghost"
      size="sm"
      title={url}
      onClick={() => void navigator.clipboard.writeText(url).catch(() => {})}
    >
      <Link2 className="mr-1.5 h-3.5 w-3.5" />
      {t('tournament.copyLink')}
    </Button>
  );
}

/**
 * **A chave inteira, e não o sufixo** · catálogo tipado não aceita chave montada
 * em runtime, e essa é justamente a conferência que impede frase faltando.
 */
const REASON_KEY = {
  'wrong-pool': 'tournament.reason.wrongPool',
  'already-registered': 'tournament.reason.alreadyRegistered',
  full: 'tournament.reason.full',
  closed: 'tournament.reason.closed',
} as const satisfies Record<
  // **`awaiting-payment` sai daqui porque não é uma frase, é uma ação** · ele
  // desenha o painel de pagamento, com QR e relógio, e não um texto cinza
  // explicando por que o botão está apagado.
  Exclude<EligibleClub['reason'], 'ok' | 'awaiting-payment'>,
  string
>;
