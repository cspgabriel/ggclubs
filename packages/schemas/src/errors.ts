import { z } from 'zod';

// A API responde código, não frase. Quem traduz é o cliente, no idioma ativo ·
// mensagem em prosa vinda do servidor seria intraduzível.
export const errorCode = z.enum([
  'VALIDATION',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'RATE_LIMITED',
  'INTERNAL',

  'PROFILE_NOT_FOUND',
  'ACCOUNT_NOT_FOUND',
  'ACCOUNT_ALREADY_EXISTS',
  'ACCOUNT_SUSPENDED',
  'CANNOT_EDIT_SELF',
  'HANDLE_TAKEN',
  'EMAIL_MISSING',

  /**
   * A conversa do confronto não aceita mensagem agora · ainda não abriu, a
   * partida fechou, ou passou o teto de relógio.
   *
   * **Um código só pros quatro motivos**, e é decisão: a tela já sabe qual é o
   * caso (a resposta do `GET` carrega o `closedReason` e os dois relógios), e o
   * `POST` só falha aqui quando alguém insiste numa sala que a tela já mostrava
   * fechada · quatro códigos pra isso seriam quatro frases que ninguém lê.
   */
  'CHAT_NOT_OPEN',

  'CLUB_NOT_FOUND',
  'CLUB_TAG_TAKEN',
  /**
   * A tag digitada pra confirmar o encerramento não bate com a do club.
   *
   * Erro próprio, e não `VALIDATION`: o formato está certo, o **valor** é que
   * não confere · e quem lê precisa entender que digitou a tag errada, não que
   * mandou algo malformado.
   */
  'CLUB_TAG_MISMATCH',
  /**
   * O club joga uma edição **já sorteada** · encerrar ele deixaria partidas
   * apontando pra quem saiu, e o estrago não é dele, é do campeonato dos
   * outros. É a mesma regra que impede o admin de tirar um club depois do
   * sorteio.
   */
  'CLUB_IN_DRAWN_TOURNAMENT',
  /**
   * O club tem **inscrição paga** de pé · devolver a vaga aqui devolveria a
   * vaga sem devolver o dinheiro. A saída existe e é a normal: falar com a
   * organização, que tem a porta de tirar da edição.
   */
  'CLUB_HAS_PAID_REGISTRATION',
  // O player já está em 3 clubs · é o teto que o EA FC 26 impõe, ver docs/dados.md.
  'MEMBERSHIP_LIMIT_REACHED',
  /**
   * **Você** já é dono de um club · o teto de posse é 1, desde 18/08/2026. Sai
   * ao criar club e ao aceitar uma posse oferecida.
   *
   * Código próprio, e não `MEMBERSHIP_LIMIT_REACHED`: os dois tetos são
   * diferentes e convivem. Alguém pode estar longe do teto de 3 vínculos e
   * ainda assim não poder criar club nenhum, e a frase "você já está no limite
   * de clubs" mandaria essa pessoa sair de um club onde ela é só membro · o
   * caminho certo é passar ou encerrar **o club dela**.
   */
  'OWNER_LIMIT_REACHED',
  /**
   * **A outra pessoa** já é dona de um club · sai quando o dono tenta oferecer a
   * posse pra alguém nessa situação.
   *
   * Código separado do `OWNER_LIMIT_REACHED` pela mesma régua que separou o
   * `CANDIDATE_LIMIT_REACHED` do teto de vínculos: **o sujeito da frase muda**.
   * Quem lê esta aqui é o dono, que não está no limite de nada, e "você já é
   * dono de um club" seria verdade inútil no lugar da informação que falta.
   */
  'TARGET_ALREADY_OWNER',
  /**
   * **Você** já é gerente de outro club · a trava de liderança única, de
   * 03/09/2026. Sai ao criar club e ao aceitar uma posse oferecida.
   *
   * **Código separado do `OWNER_LIMIT_REACHED` porque a saída é outra, e é ela
   * que a frase precisa dizer.** Quem é *dono* de outro club só se livra dele
   * passando a posse ou encerrando o club; quem é *gerente* sai do cargo num
   * clique, ou simplesmente sai do club. Um código só pros dois mandaria metade
   * das pessoas procurar uma porta que elas não precisam abrir.
   *
   * O teto de 3 vínculos continua sendo outra pergunta: entrar como **membro**
   * em três clubs segue liberado, e é por isso que este código não é
   * `MEMBERSHIP_LIMIT_REACHED`.
   */
  'MANAGER_LIMIT_REACHED',
  /**
   * **A outra pessoa** já lidera outro club · dona ou gerente, tanto faz. Sai ao
   * promover alguém a gerente e ao oferecer a posse.
   *
   * Mesma régua que separou o `TARGET_ALREADY_OWNER` do `OWNER_LIMIT_REACHED`:
   * **o sujeito da frase muda**. Quem lê é quem manda no club e não está no
   * limite de nada · "você já lidera outro club" seria verdade sobre a pessoa
   * errada.
   *
   * **Um código pros dois papéis do alvo**, ao contrário do par acima, e o
   * motivo é o mesmo que os separou lá: aqui a ação de quem lê **não muda** ·
   * nos dois casos o que resta é falar com a pessoa. Quem escolhe entre passar a
   * posse e largar o cargo é ela, não quem promove.
   */
  'TARGET_ALREADY_LEADER',
  /**
   * O club já tem o máximo de gerentes · `MAX_MANAGERS_PER_CLUB`, de
   * 03/09/2026. O dono não conta.
   *
   * **A frase deste código interpola o número**, e é o único erro além do
   * `RATE_LIMITED` que leva parâmetro · teto sem número na mensagem faz a
   * pessoa tentar de novo achando que foi engano. Quem passa o valor é o
   * `apiErrorMessage`, em `apps/web/src/lib/api-error.ts`.
   */
  'MANAGER_CAP_REACHED',
  'ALREADY_MEMBER',
  // Pedidos pendentes demais ao mesmo tempo · o teto de 3 conta vínculo ativo,
  // então sem este limite dava pra encher a fila de todos os clubs da vitrine.
  'JOIN_REQUEST_LIMIT_REACHED',
  'JOIN_REQUEST_NOT_FOUND',
  /**
   * O dono tentou sair do próprio club.
   *
   * Não é permissão faltando, é **ordem de operações**: sair deixaria o club sem
   * dono. Desde 31/07/2026 a saída existe e a mensagem diz qual é · transferir a
   * posse pra alguém do elenco. Num club onde ele é o único, ainda não há saída
   * nenhuma: é o que a exclusão de club vai fechar.
   */
  'OWNER_CANNOT_LEAVE',
  /**
   * O dono tentou **largar o cargo** sem sair do club · 03/09/2026, com a porta
   * que a pendência 186 abriu.
   *
   * **Código separado do `OWNER_CANNOT_LEAVE` porque o verbo da saída é outro**,
   * e a frase dele mandaria a pessoa fazer o que ela não pediu: "passe o club
   * antes **de sair**" fala com quem quer sair, e quem larga o cargo quer
   * exatamente o contrário · ficar no elenco sem responder pelo club.
   *
   * A saída continua sendo a mesma (`club-ownership.ts`), e é isso que a frase
   * diz · o que muda é o que acontece depois dela.
   */
  'OWNER_CANNOT_STEP_DOWN',
  'NOT_A_MEMBER',
  /**
   * A oferta de posse não existe mais · foi cancelada, respondida, substituída
   * por outra, ou **expirou**.
   *
   * Os quatro saem iguais de propósito: pra quem recebeu, a diferença entre
   * "cancelaram" e "passou do prazo" não muda nada do que ele pode fazer agora,
   * e contar qual foi é contar história sobre a decisão de outra pessoa.
   */
  'OWNERSHIP_OFFER_NOT_FOUND',
  /**
   * O convite pra ser gerente não existe mais · foi desistido (o dono rebaixou),
   * respondido, ou **expirou**. 03/09/2026, pendência 185.
   *
   * Irmão exato do `OWNERSHIP_OFFER_NOT_FOUND`, e os motivos saem iguais pela
   * mesma razão: pra quem recebeu, a diferença entre "desistiram" e "passou do
   * prazo" não muda nada do que ele pode fazer agora.
   */
  'MANAGER_OFFER_NOT_FOUND',
  /** O dono ofereceu o club pra si mesmo · a tela nem devia deixar chegar aqui. */
  'CANNOT_TRANSFER_TO_SELF',
  /**
   * O gerente tentou mexer em quem está no mesmo degrau ou acima.
   *
   * Gerente administra o elenco, **não os outros gerentes** · sem isso, dois
   * gerentes em desacordo se removem em looping e o dono perde o club sem
   * nunca ter sido consultado. Quem mexe em gerente é só o dono.
   */
  'CANNOT_MANAGE_MEMBER',
  'INVITE_NOT_FOUND',
  /** Já existe convite esperando resposta · convidar de novo não é erro, é ruído. */
  'ALREADY_INVITED',
  'PLAYER_NOT_FOUND',
  /**
   * O teto de 3 estourou **no candidato**, na hora em que o dono aprovava · ele
   * entrou em outros clubs enquanto o pedido esperava.
   *
   * Código próprio porque o sujeito da frase muda: `MEMBERSHIP_LIMIT_REACHED`
   * diz "você já está no limite", e quem lê esta aqui é o dono do club, que não
   * está no limite de nada.
   */
  'CANDIDATE_LIMIT_REACHED',
  /**
   * A escalação põe num slot alguém que não está no elenco ativo do club.
   *
   * Não é `VALIDATION`: o corpo está bem formado e o `userId` existe · o que
   * falha é o vínculo, que mora em outra collection e por isso o schema não
   * alcança. Quem lê precisa entender que a pessoa saiu (ou foi removida)
   * enquanto a tela estava aberta, não que mandou dado torto.
   */
  'PLAYER_NOT_IN_SQUAD',
  /**
   * O app instalado é anterior ao piso que o servidor exige · resposta **426**.
   *
   * Não é `FORBIDDEN`: não falta permissão a ninguém, e a conta não tem nada de
   * errado · o que está velho é o programa. Quem lê precisa entender que a saída
   * é **atualizar**, e não pedir acesso a alguém.
   *
   * **Só o desktop recebe.** A web serve sempre a última versão, então "versão
   * velha" ali é uma aba aberta há muito tempo, e recarregar resolve.
   */
  'CLIENT_TOO_OLD',

  'TOURNAMENT_NOT_FOUND',
  'TOURNAMENT_SLUG_TAKEN',
  /**
   * Cancelar uma edição **com club dentro** exige o apelido dela no corpo, e o
   * que veio não bate · vale também pra quem não mandou nada.
   *
   * **Os dois casos saem iguais de propósito.** Separar "faltou" de "não
   * confere" daria dois erros pro mesmo engano, e quem lê já sabe o que fazer
   * com um só. É o irmão do `CLUB_TAG_MISMATCH`, e pelo mesmo motivo não é
   * `VALIDATION`: o corpo está bem formado, o **valor** é que não confere.
   */
  'TOURNAMENT_SLUG_MISMATCH',
  /** As inscrições não estão abertas · ainda não abriram, ou já fecharam. */
  'TOURNAMENT_CLOSED',
  /** Edição encerrada ou cancelada não pode gerar novas partidas. */
  'TOURNAMENT_NOT_ACTIVE',
  /**
   * A edição não se edita mais · **alguém já está dentro**, ou ela já andou.
   *
   * **Não é `TOURNAMENT_CLOSED`**, e reusar aquele custou a frase errada: o
   * admin que perdesse a corrida por um club entrando no mesmo minuto lia "as
   * inscrições desse campeonato não estão abertas", que é sobre outra coisa e
   * esconde o que de fato aconteceu. Achado pelo `revisor` em 22/08/2026.
   */
  'TOURNAMENT_NOT_EDITABLE',
  /** As vagas acabaram · o teto é o primeiro degrau da escada de tamanhos. */
  'TOURNAMENT_FULL',
  /**
   * O club é de outra geração.
   *
   * Não é `VALIDATION`: o corpo está certo e o club existe · o que não bate é a
   * plataforma dele contra a da edição, e quem lê precisa entender que **o
   * problema não tem conserto pelo formulário** · no Clubs do EA FC uma geração
   * não joga contra a outra.
   */
  'TOURNAMENT_WRONG_POOL',
  /** Este club já tem inscrição segurando vaga nesta edição. */
  'ALREADY_REGISTERED',
  /**
   * **O dono do club não tem telefone na conta**, e inscrição exige.
   *
   * Não é permissão nem estado da edição · é **dado que falta**, e por isso ele
   * é código próprio: a tela resolve mandando a pessoa preencher, e nenhum dos
   * outros erros tem essa saída. Decisão do Eduardo em 01/09/2026 · o telefone
   * é opcional no cadastro e obrigatório onde ele vale dinheiro, porque é como
   * a organização combina o pagamento da premiação.
   */
  'PHONE_REQUIRED',
  /** O número não bate com o padrão do país escolhido · o front já barra. */
  'PHONE_INVALID',
  'REGISTRATION_NOT_FOUND',
  /**
   * Tentaram publicar uma edição **paga** sem a política de reembolso publicada.
   *
   * **Ele mudou de sentido em 12/08/2026, e o nome ficou** · antes era "o
   * Mercado Pago não existe", e a guarda impedia o pior defeito possível: a
   * pessoa reservaria a vaga, esperaria quinze minutos e veria a reserva morrer
   * sem ter o que apertar. Com o pagamento construído, o que sobra é a outra
   * metade da promessa: **a página precisa dizer o que acontece com o dinheiro
   * antes de alguém pagar**, e essa decisão é do Eduardo.
   */
  'PAYMENT_NOT_AVAILABLE',
  /**
   * A inscrição não está esperando pagamento.
   *
   * Cobre os dois lados: já foi paga (e cobrar de novo seria cobrar duas vezes
   * pela mesma vaga) e a reserva venceu (e a vaga pode já ser de outro club).
   */
  'REGISTRATION_NOT_RESERVED',
  /**
   * O provedor de pagamento não respondeu, ou respondeu erro.
   *
   * **Genérico de propósito, como todo erro deste produto** · o detalhe vai pro
   * log. Quem tenta pagar não precisa saber qual chamada falhou, e contar isso
   * seria descrever a nossa integração pra quem estiver sondando.
   */
  'PAYMENT_PROVIDER_FAILED',
  'PAYMENT_NOT_FOUND',
  /**
   * A caixa do `contato@` não respondeu · o S3 fora do ar, credencial faltando,
   * ou o bucket com outra política.
   *
   * **Genérico como todo erro daqui**, e o detalhe vai pro log · mas ele é
   * **próprio** e não um `INTERNAL`: quem olha o painel precisa saber que o que
   * falhou foi **a leitura da caixa**, e não a tela inteira. É a mesma distinção
   * do `PAYMENT_PROVIDER_FAILED` · falhou o outro lado, não nós.
   */
  'INBOX_UNAVAILABLE',
  /**
   * O envio não saiu · o SES recusou, ou a chamada falhou.
   *
   * **Próprio, e não `INBOX_UNAVAILABLE`** · os dois viviam no mesmo código, e o
   * desfecho era a tela dizer *"não deu pra ler a caixa de entrada"* pra quem
   * tinha acabado de apertar **enviar**. Mensagem que descreve outra operação é
   * pior que mensagem genérica, porque manda procurar o problema no lugar errado.
   */
  'EMAIL_SEND_FAILED',
  /**
   * O pagamento existe e **não tem o que devolver** · pendente, recusado,
   * vencido, ou já estornado.
   *
   * Código próprio, e não `PAYMENT_NOT_FOUND`: quem pediu está olhando pra uma
   * linha que existe, e "não encontrado" mandaria essa pessoa procurar o
   * pagamento em vez de ler o estado dele.
   */
  'PAYMENT_NOT_REFUNDABLE',
  /**
   * Tentaram cancelar uma inscrição que já foi paga.
   *
   * Dono e gerente cancelam **enquanto não foi paga** · depois disso a vaga só
   * sai com reembolso, e isso é decisão de admin. Cancelar por aquela porta
   * devolveria a vaga sem devolver o dinheiro.
   *
   * **A cortesia é a exceção, desde 04/09/2026** · ela é `confirmed` numa edição
   * paga e **nunca teve cobrança**, então não há dinheiro a devolver e este
   * código não sai. O que barra ali é a janela de inscrição, como pra todo mundo.
   */
  'REGISTRATION_ALREADY_PAID',
  /** A chave desta edição já saiu · sortear de novo embaralharia grupos publicados. */
  'TOURNAMENT_ALREADY_DRAWN',
  /**
   * Sobra club pro degrau que a escada alcança · **e isto não é defeito, é a
   * decisão de 14/08/2026.**
   *
   * A escada é rígida: com 41 confirmados num degrau de 32, sortear deixaria
   * nove clubs pagantes fora de uma chave já publicada. Quem resolve é o admin,
   * tirando quem sobra · a conta (quantos confirmaram, quantos cabem) a tela
   * dele já tem, então este código não a carrega.
   */
  'TOURNAMENT_LEFTOVERS',
  /** Nem o menor degrau da escada fecha com quem confirmou. */
  'TOURNAMENT_TOO_FEW',
  /**
   * A partida não existe **ou** quem pediu não manda no club dela.
   *
   * **Os dois casos saem pelo mesmo código, de propósito** · é a regra de erro
   * que não conta história, a mesma que faz membro comum receber "club não
   * encontrado" na fila de pedidos.
   */
  'MATCH_NOT_FOUND',
  /** Os dois clubs declararam placares diferentes · quem decide é a organização. */
  'MATCH_DISPUTED',
  /** A partida já tem resultado · por acordo, por prazo ou por decisão do admin. */
  'MATCH_SETTLED',
  'MATCH_ALREADY_REPORTED',
  'MATCH_CORRECTION_STALE',
  'MATCH_CORRECTION_DEPENDENTS',
  'MATCH_CORRECTION_CLOSED',
  'MATCH_CORRECTION_UNCHANGED',
  /**
   * A organização tentou resolver uma partida que **não está em disputa**.
   *
   * É o negativo da porta do admin, e ele existe pra ela não ser um atalho: com
   * uma declaração pendente ou nenhuma, o caminho é o prazo · deixar o admin
   * cravar placar ali tiraria das duas pontas a decisão que é delas.
   */
  'MATCH_NOT_DISPUTED',
  /**
   * A partida não está esperando declaração · ou já fechou, ou os dois lados já
   * falaram (e aí o desfecho é acordo ou disputa, nunca encerramento).
   *
   * **Os dois casos saem iguais** · pra quem lê, a resposta é a mesma: não há o
   * que encerrar aqui.
   */
  'MATCH_NOT_PENDING',
  /**
   * A partida não está **parada sem declaração nenhuma** · ou já fechou, ou
   * alguém declarou.
   *
   * É o par do `MATCH_NOT_PENDING` na terceira mesa (a de decidir o que ninguém
   * declarou), e sai igual nos três casos pela mesma razão: pra quem lê, a
   * resposta é que esta partida não é desta mesa.
   */
  'MATCH_NOT_STUCK',
  /** Pediram o mata-mata de uma edição que ainda não teve sorteio. */
  'TOURNAMENT_NOT_DRAWN',
  /**
   * Ainda há partida de grupo sem resultado · **e `disputed` conta como sem**,
   * porque o placar dela ainda vai mudar.
   *
   * **A recusa é a regra funcionando**, como a da sobra no sorteio · o que o
   * admin faz a seguir é decidir a disputa ou encerrar a partida travada.
   */
  'GROUPS_STILL_OPEN',
  /** O mata-mata desta edição já existe · ele sai uma vez. */
  'KNOCKOUT_ALREADY_GENERATED',
  /**
   * Os classificados não fecham uma chave · **sobra ou falta time.**
   *
   * É a irmã do `TOURNAMENT_LEFTOVERS` do sorteio, um ciclo adiante: a escada
   * rígida garante potência de dois no papel, e isto pega o caso em que a
   * realidade não bate com ela (club removido depois do sorteio, grupo com
   * menos gente).
   */
  'KNOCKOUT_NOT_ENOUGH',
  /**
   * Mata-mata empatado sem a disputa de pênaltis · **ou com ela empatada.**
   *
   * Não é `VALIDATION`: o corpo está bem formado, e o que falta depende da
   * **fase da partida**, que o schema não conhece.
   */
  'PENALTIES_REQUIRED',
]);

export type ErrorCode = z.infer<typeof errorCode>;
