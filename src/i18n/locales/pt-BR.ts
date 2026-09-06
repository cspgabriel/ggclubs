// Idioma de referência. Toda chave nasce aqui · `es.ts` é tipado contra este
// objeto, então adicionar chave sem traduzir quebra o build de propósito.
export const ptBR = {
  correction: {
    noImage: 'Sem imagem anexada',
    noOfficial: 'Sem resultado oficial',
    action: 'Corrigir resultado',
    title: 'Revisar resultado da partida',
    body: 'Você está atuando como organização. Confira as declarações e registre o resultado correto. O motivo e o histórico ficam disponíveis aos dois clubs.',
    save: 'Salvar resultado oficial',
    current: 'Resultado atual',
    replacement: 'Novo resultado oficial',
    dependencies:
      'Esta partida já alimentou a chave. A correção só será aceita se preservar os classificados e os adversários já definidos.',
    history: 'Histórico de correções',
    before: 'Antes',
    after: 'Depois',
    notReported: 'Sem declaração',
    list: 'Correção de resultados',
    listHelp:
      'Localize uma partida para revisar declarações ou corrigir um resultado já encerrado.',
    refresh: 'Atualizar dados da revisão',
    stale:
      'Chegou uma atualização desta partida. Atualize os dados antes de salvar; seus campos serão preservados.',
    reasonHelp: 'Explique o que estava errado e por que este resultado é o correto.',
    confirm: 'Confirmar correção',
    confirmBody:
      'Confira o novo resultado acima. Ao confirmar, a classificação será recalculada, a chave poderá avançar e os dois clubs serão avisados. As declarações e os resultados anteriores serão preservados.',
    reportUnavailable:
      'Esta declaração já foi enviada ou a partida foi encerrada. Consulte a conversa para acompanhar ou pedir uma correção.',
  },
  competitionUx: {
    decisionType: 'Tipo de resultado',
    playedResult: 'Placar jogado',
    absentClub: 'W.O. · {{club}} não compareceu',
    walkoverResult: 'Resultado oficial: {{home}} × {{away}} · W.O.',
    decisionReason: 'Motivo da decisão',
    reasonHelp: 'Os dois clubs poderão ler este motivo junto ao resultado.',
    reasonRequired: 'Explique a decisão em pelo menos 4 caracteres.',
    reviewResult: 'Revisar resultado',
    organizerDecision:
      'Você está decidindo como organização. Confira as duas declarações antes de publicar o resultado.',
    searchClub: 'Buscar club por nome ou tag',
    allEntries: 'Todas as inscrições',
    confirmed: 'Confirmados',
    reserved: 'Reservas',
    free: 'Vagas livres',
    editionTotals: 'Totais da edição',
    filteredCount: 'Mostrando {{shown}} de {{total}}',
    noMatches: 'Nenhum item com esses filtros.',
    allPayments: 'Todos os pagamentos',
    approved: 'Recebidos',
    refunded: 'Reembolsados',
    receivedTotal: 'Total recebido',
    refundedTotal: 'Total devolvido',
    balance: 'Saldo após devoluções',
    balanceHelp: 'Valores brutos. Não descontam taxas nem premiação.',
    allGroups: 'Todos os grupos',
    chooseGroup: 'Ver grupo',
    myGroup: 'Meu grupo',
    bestThirds: 'Melhores terceiros',
    fullBracket: 'Chave completa',
    myPath: 'Meu caminho',
    choosePath: 'Caminho do club',
    pathHelp:
      'Confrontos já definidos para o seu club. As próximas rodadas aparecem quando a classificação é confirmada.',
    groupProgress: '{{settled}} de {{total}} resultados dos grupos confirmados',
    groupPending: 'Confirme todos os resultados dos grupos para gerar o mata-mata.',
    groupReady: 'Grupos concluídos. O mata-mata pode ser gerado.',
    thirdPending: 'Final decidida · falta a disputa de 3º lugar',
  },
  common: {
    brandName: 'GGClubs',
    // **A comunicação é de campeonato desde 08/08/2026** · decisão do Eduardo,
    // pedida quatro vezes: "já podemos focar nisso, pois é isso que vai bancar a
    // plataforma".
    //
    // **O argumento é o que a plataforma FAZ**, e não o que o canal do rival não
    // faz · o WhatsApp não é fraqueza dele, e nós vamos usar grupo também. A
    // frase de posicionamento está no `produto.md` e nasceu de lá.
    brandTagline: 'Campeonato de Pro Clubs com o seu club de verdade',
    loading: 'Carregando...',
    errorGeneric: 'Algo deu errado. Tenta de novo?',
    retry: 'Tentar de novo',
    ctaBackHome: 'Voltar pra página inicial',
    close: 'Fechar',
    cancel: 'Cancelar',
    // Vive em `common` porque o header público e o rodapé dizem a mesma coisa ·
    // duas chaves pro mesmo conceito é como as duas começam a divergir.
    createAccount: 'Criar conta',
    // Desceu de `club` pra cá quando o campo de busca virou componente · a
    // vitrine de players já pedia a chave de club emprestada, que é o sintoma.
    searchClear: 'Limpar busca',
    languageLabel: 'Idioma',
    language: {
      'pt-BR': 'Português',
      es: 'Espanhol',
    },
  },

  /**
   * O telefone · **um namespace só, porque a peça é uma só**.
   *
   * O campo aparece no cadastro, na conta e no painel de inscrição, e frase
   * repetida em três lugares é frase que diverge em dois.
   */
  phone: {
    label: 'Telefone',
    // **Diz pra que serve, e não só o que é** · pedir telefone sem explicar por
    // quê é o tipo de campo que a pessoa pula, ou preenche errado de propósito.
    // E diz que é privado, porque é a primeira dúvida de quem lê.
    hint: 'Só a organização vê. É por aqui que a gente te chama se der problema, e que combina o pagamento se você ganhar.',
    // Rótulo acessível do seletor · a bandeira sozinha não é lida por leitor de
    // tela, e no Windows ela nem desenha.
    countryLabel: 'País do telefone',
    placeholder: '11 98765-4321',
    // **O diálogo que pede o número no meio da inscrição** · o título não
    // acusa falta, ele diz que falta pouco. Quem chegou aqui já decidiu
    // entrar, e a frase certa é a que não faz a pessoa se sentir barrada.
    dialogTitle: 'Falta só o seu telefone',
    dialogBody:
      'É por ele que a gente te encontra pra pagar a premiação se o seu club ganhar. Só a organização vê.',
    // O rótulo diz **as duas coisas que vão acontecer** · o verbo da ação
    // original continua ali, que é a regra do ConfirmDialog.
    dialogConfirm: 'Salvar e inscrever',
    searchCountry: 'Buscar país',
    noCountry: 'Nenhum país com esse nome',
    // **Erro, e não aviso** · decisão do Eduardo em 01/09/2026. A frase diz o
    // que fazer, e não só que está errado.
    invalid: 'Esse número não bate com o padrão do país escolhido. Confira os dígitos.',
  },

  account: {
    // Rótulo do gatilho do menu · **não é o nome de nenhuma tela**, e por isso
    // não repete "Sua conta": ele descreve o botão que abre a lista.
    menu: 'Menu da conta',
    profile: 'Meu perfil',

    // A tela de configurar a própria conta · 08/08/2026.
    title: 'Sua conta',
    subtitle: 'Como você aparece pro resto do GGClubs.',
    previewHint: 'É assim que você aparece no elenco e na busca.',
    viewPublic: 'Ver minha página',
    identity: 'Identidade',
    avatarLabel: 'Foto',
    nameLabel: 'Nome de exibição',
    nameHint: 'É como o seu nome aparece no elenco e na sua página.',
    handleLabel: 'Seu @nick',
    // **A consequência, não o formato** · o formato o campo já mostra enquanto a
    // pessoa digita. O que ela não tem como saber é que o endereço antigo não
    // volta pro estoque, e que os links já compartilhados param de funcionar ·
    // isso não é recuperável depois, então é o que a dica precisa dizer.
    handleHint:
      'É o endereço da sua página. Trocar quebra os links que você já compartilhou, e o @nick antigo fica reservado pra você · ninguém mais pode usar.',
    bioLabel: 'Sua frase (opcional)',
    bioPlaceholder: 'Zagueiro canhoto, jogo de madrugada, chamo no mic.',
    bioHint: 'Aparece na sua página e ajuda quem procura alguém pro club.',
    // **"No jogo" não dizia nada** · a seção é sobre onde e como a pessoa joga,
    // que é o que um club precisa saber pra chamar. Apontado pelo Eduardo.
    inGame: 'Como você joga',
    lookingForClubLabel: 'Estou procurando club',
    // **Diz o que acontece**, não o que a chave é · quem liga isso quer saber
    // onde vai aparecer e quem vai ver.
    //
    // **A frase anterior terminava em "desligue quando não quiser mais
    // convites", e isso era falso** · o `inviteToClub` nunca olhou esta chave,
    // então qualquer gerente com o seu @nick continua convidando. Ela é sobre
    // **enumeração**, como a do `discoverable` logo abaixo, e não sobre
    // consentimento · o consentimento é o aceite do convite. Apontado pelo
    // Eduardo em 08/08/2026.
    lookingForClubHint:
      'Você aparece na vitrine de jogadores como quem está disponível, e ganha o selo na sua página. Desligue quando já tiver club · quem tem seu @nick ainda pode te convidar.',
    lookingForClubAtCap:
      'Você não aparece como disponível porque já está em {{max}} clubs, que é o máximo. Saia de um pra voltar a aparecer.',
    platformLabel: 'Plataforma',
    positionLabel: 'Posição',
    positionHint: 'É a sua posição de sempre. Em cada club dá pra jogar noutra.',
    privacy: 'Privacidade',
    discoverableLabel: 'Aparecer na busca por @nick',
    // **A copy não promete invisibilidade**, e é essa a decisão inteira desta
    // chave (pendência 34): ela esconde da enumeração, não do endereço.
    // Prometer o contrário seria a tela mentindo sobre o comportamento.
    discoverableHint:
      'Desligado, você some da lista de sugestões quando alguém digita parte de um nick. Quem souber seu @nick inteiro continua achando sua página, e o elenco dos seus clubs continua mostrando você.',
    emailNotificationsLabel: 'Receber e-mail do GGClubs',
    // **A dica diz o que NÃO muda**, pela mesma razão da de cima: quem lê "não
    // quero e-mail" e entende "não quero ser avisado" desliga achando que some
    // da caixa do sininho, e depois perde o prazo de uma partida.
    emailNotificationsHint:
      'Mandamos e-mail só do que tem prazo ou dinheiro: pagamento e reembolso, a chave que saiu, a sua vez de lançar o placar e quem está esperando sua resposta. Desligado, tudo isso continua chegando no sininho aqui dentro.',
  },

  /**
   * A tela inicial do app · **ela é sobre campeonato, porque o produto é.**
   *
   * Saudação curta e nada de título formal · o cabeçalho empurraria o campeonato
   * pra baixo da dobra no celular, que é onde a maior parte do público está.
   */
  home: {
    welcomeSubtitle: 'Seu próximo jogo começa com um club. Monte o seu ou encontre um elenco.',
    viewProfile: 'Ver meu perfil',
    getStarted: 'Entre em campo',
    findYourTeam: 'Seu lugar no jogo',
    findClub: 'Encontrar um club',
    playerHint: 'Já tem um time? Peça um convite ao dono ou gerente para entrar no elenco.',
    explore: 'Encontre sua equipe',
    clubsError: 'Não deu pra carregar seus clubs.',
    title: 'Início',
    greeting: 'E aí, {{name}}',
    subtitle: 'O que está rolando nos campeonatos e nos seus clubs.',
    // **Dois títulos, e a escolha é do status** · com um só, a edição terminada
    // aparecia como "O próximo campeonato" na tela de Início · achado pelo
    // Eduardo em 02/09/2026, e é a mesma família da sobrelinha da landing.
    nextTournament: 'O próximo campeonato',
    noTournament: 'Nenhuma edição aberta agora. Assim que a próxima abrir, ela aparece aqui.',
    needClub: 'Pra entrar num campeonato você precisa de um club · leva menos de um minuto.',
    // **A outra metade da mesma pergunta** · quem está em clubs sem ter cargo em
    // nenhum também não inscreve, e a frase de cima afirmaria que ele não tem
    // club olhando pros clubs dele.
    //
    // **"Cargo" e não "dono", desde 03/09/2026** · o gerente passou a inscrever,
    // e esta frase é a irmã da `tournament.notOwnerBody` · as duas respondem a
    // mesma pergunta em telas diferentes, e ficar só uma corrigida é o app
    // dizendo duas regras.
    needOwnClub:
      'Quem inscreve o club num campeonato é quem tem cargo nele · dono ou gerente. Crie o seu pra entrar, leva menos de um minuto.',
    // **No teto sem cargo nenhum, "crie o seu" mandaria clicar num botão que
    // não existe** · o teto de participação tranca a criação, então a frase tem
    // que dizer a saída em vez de prometer uma. O `{{max}}` vem da constante.
    needOwnClubAtCap:
      'Quem inscreve o club num campeonato é quem tem cargo nele · dono ou gerente. Você já está em {{max}} clubs, que é o máximo · peça o cargo a quem lidera um deles, ou saia de um pra criar o seu.',
    allTournaments: 'Ver todos',
    yourClubs: 'Seus clubs',
    newClub: 'Criar um club',
    // A vaga que sobra pra quem já é dono · o teto de 3 é de participação,
    // não de posse, então ela continua existindo e muda de convite.
    joinAnotherClub: 'Entrar em mais um club',
    primary: 'Principal',
    discoverClubs: 'Ache um time pra jogar ou monte o seu.',
    discoverPlayers: 'Ache gente pro seu elenco.',
  },

  nav: {
    primary: 'Navegação principal',
    home: 'Início',
    clubs: 'Clubs',
    players: 'Jogadores',
    tournaments: 'Campeonatos',
    admin: 'Admin',
    backToApp: 'Voltar pro app',
    signOut: 'Sair',
  },

  /**
   * O sininho · **a frase mora aqui e não no banco.**
   *
   * O servidor grava a chave e os parâmetros; a caixa inteira muda de idioma
   * junto com a pessoa. Chave nova em `notificationKind` sem entrada aqui **não
   * compila**, porque o `es.ts` é tipado contra este arquivo e o catálogo tem
   * teste próprio.
   *
   * **Sujeito curto e verbo no passado** · a linha divide 22rem com a data e o
   * ponto de não lida, e nome de club cabe até 15 caracteres.
   */
  notifications: {
    title: 'Avisos',
    open: 'Abrir avisos',
    /**
     * **Número de uma unidade se escreve por extenso**, e é por isso que o
     * `_one` daqui pra baixo não interpola `{{count}}` · decisão do Eduardo em
     * 11/08/2026, e vale pro catálogo inteiro.
     *
     * **A pegadinha, e ela é do português:** pelo CLDR o **zero também cai no
     * `_one`** em pt-BR (`Intl.PluralRules('pt-BR').select(0)` devolve `one`,
     * medido) · em espanhol não. Ou seja, uma frase escrevendo "um" aqui
     * aparece com contador zero se o chamador deixar. **Os cinco chamadores de
     * hoje tratam o zero antes**, cada um com chave própria · quem acrescentar
     * um sexto confere isso, e o `docs/i18n.md` tem a armadilha escrita.
     */
    openWithCount_one: 'Abrir avisos · um novo',
    openWithCount_other: 'Abrir avisos · {{count}} novos',
    empty: 'Nada por aqui ainda.',
    // O título do balão nativo · o corpo dele é a frase do aviso. Curto porque
    // no Windows ele divide a linha com o nome do app.
    toastTitle: 'Novidade no GGClubs',
    kinds: {
      club: {
        invited: 'O {{clubName}} te chamou pro elenco.',
        joinRequested: '@{{handle}} pediu pra entrar no {{clubName}}.',
        joinApproved: 'Você entrou no {{clubName}}.',
        joinRejected: 'O {{clubName}} recusou seu pedido.',
        promoted: 'Você virou gerente do {{clubName}}.',
        demoted: 'Você não é mais gerente do {{clubName}}.',
        // Quem lê é quem **continua** mandando · a vaga de gerente abriu, e
        // são só duas por club.
        managerStepDown: '@{{handle}} largou a gerência do {{clubName}}.',
        // **O aviso diz o que o cargo custa**, e não só que ele foi oferecido ·
        // aceitar ocupa a vaga de liderança da conta, e quem não sabe disso
        // aceita sem saber o que está gastando.
        managerOffered:
          'O {{clubName}} quer você como gerente. Aceitar ocupa a sua vaga de liderança.',
        managerAccepted: '@{{handle}} aceitou ser gerente do {{clubName}}.',
        managerDeclined: '@{{handle}} recusou ser gerente do {{clubName}}.',
        // **"Tirou", e não "saiu"** · sair e ser tirado são estados diferentes
        // no banco (`left` e `removed`), e quem sai já sabe que saiu.
        removed: 'O {{clubName}} tirou você do elenco.',
        // O verbo canônico é "assumir" · ver o glossário do docs/i18n.md.
        ownershipOffered: 'O dono do {{clubName}} quer que você assuma o club.',

        // Os seis que fecham laço · o sujeito aqui é **quem respondeu**, e por
        // isso todos começam pelo @nick. É o oposto dos de cima, onde o sujeito
        // é o club.
        ownershipAccepted: '@{{handle}} assumiu o {{clubName}}.',
        ownershipDeclined: '@{{handle}} não quis assumir o {{clubName}}.',
        inviteAccepted: '@{{handle}} entrou no {{clubName}}.',
        inviteDeclined: '@{{handle}} recusou o convite do {{clubName}}.',
        memberLeft: '@{{handle}} saiu do {{clubName}}.',
        deleted: 'O {{clubName}} foi encerrado.',
      },
      /**
       * **O sujeito aqui é quem agiu**, como nos seis que fecham laço · quem
       * recebe é dono e gerente, e a primeira pergunta deles é *quem foi*.
       *
       * Eles existem porque **qualquer membro do elenco inscreve** (decisão de
       * 12/08/2026): sem fricção na porta, o controle do club é este aviso mais
       * o botão de cancelar.
       */
      tournament: {
        registered: '@{{handle}} inscreveu o {{clubName}} no {{tournamentName}}.',
        registrationCancelled:
          '@{{handle}} cancelou a inscrição do {{clubName}} no {{tournamentName}}.',
        // **Diz o que fazer**, porque a vaga ainda existe pra quem for rápido ·
        // e é ele que corrige o "inscreveu" que já saiu.
        reservationExpired:
          'A vaga do {{clubName}} no {{tournamentName}} venceu sem pagamento. Dá pra inscrever de novo.',
        paymentConfirmed:
          'Pagamento confirmado · o {{clubName}} está dentro do {{tournamentName}}.',
        refunded: 'O valor da inscrição do {{clubName}} no {{tournamentName}} foi devolvido.',
        refundedAndOut:
          'O valor da inscrição do {{clubName}} foi devolvido e ele saiu do {{tournamentName}}.',
        refundedOverCapacity:
          'O {{tournamentName}} encheu antes do pagamento do {{clubName}} ser confirmado · o valor voltou por inteiro.',
        cancelled: 'O {{tournamentName}} foi cancelado. O {{clubName}} não está mais na disputa.',
        drawn: 'A chave do {{tournamentName}} saiu · veja contra quem o {{clubName}} joga.',
        removed: 'A organização tirou o {{clubName}} do {{tournamentName}}.',
        // **Sem o motivo da cortesia** · ele é anotação de uma mesa pra outra, e
        // o `NOTIFICATION_PARAMS` nem o carrega. Ver o `tournament.courtesy`.
        courtesy:
          'A organização deu ao {{clubName}} uma vaga no {{tournamentName}} · não há inscrição a pagar.',
        squadLocked:
          'No {{tournamentName}} você joga pelo {{clubName}} · foi o primeiro dos seus clubs a se inscrever.',
        squadLost:
          '@{{handle}} vai jogar pelo {{clubName}} no {{tournamentName}} e não conta no seu elenco desta edição.',
        matchReported:
          'O {{rivalName}} lançou o placar do jogo contra o {{clubName}} no {{tournamentName}} · confirme o seu.',
        matchDisputed:
          'Os placares de {{clubName}} e {{rivalName}} no {{tournamentName}} não bateram · a organização decide.',
        matchTimedOut:
          'Ninguém do {{clubName}} respondeu no prazo, então valeu o placar do adversário · {{clubName}} {{yourGoals}}, {{rivalName}} {{rivalGoals}}.',
        matchResolved:
          'A organização decidiu a partida em disputa · {{clubName}} {{yourGoals}}, {{rivalName}} {{rivalGoals}}.',
        // **O motivo vai na frase, e não num "saiba mais"** · quem ficou calado
        // recebe um placar que não declarou, e a pergunta seguinte é o porquê.
        matchClosedByAdmin:
          'A organização encerrou a partida antes do prazo · {{clubName}} {{yourGoals}}, {{rivalName}} {{rivalGoals}}. Motivo: {{reason}}',
        // **Sem placar** · o 0-0 gravado não é resultado de jogo nenhum, e pôr
        // número aqui faria a pessoa procurar uma partida que não aconteceu.
        matchWalkover:
          'Ninguém declarou o resultado de {{clubName}} contra {{rivalName}} no prazo · a partida foi dada como não jogada, e nenhum dos dois pontuou.',
        // **O adversário na frente**, porque é a informação nova · o nome da
        // edição e o do seu club a pessoa já sabe.
        nextMatch:
          'O próximo jogo do {{clubName}} no {{tournamentName}} é contra o {{rivalName}} · a sala do confronto já está aberta.',
        groupsClosed:
          'A fase de grupos do {{tournamentName}} acabou · a chave do mata-mata espera você gerar.',
      },
      /**
       * **A linha que a versão não sabe ler** · a API pode gravar um tipo novo
       * antes de esta web subir, e nesse intervalo a caixa não pode quebrar.
       */
      unknown: 'Você tem um aviso novo · atualize a página pra ver.',
      /**
       * **A mesma linha, no app instalado** · e a frase muda porque o conserto
       * muda. Lá o front vem embutido no binário, então recarregar devolve
       * exatamente o mesmo bundle · quem lesse "atualize a página" ficaria
       * recarregando pra sempre. Quem resolve é o updater. Ver
       * `lib/notification-text.ts`.
       */
      unknownDesktop: 'Você tem um aviso novo · atualize o app pra ver.',
      chat: {
        // **Sem trecho da mensagem, de propósito** · o aviso diz onde olhar, e
        // quem lê o que foi dito é quem abre a sala.
        adminCalled:
          'Chamaram a organização na conversa de {{homeTag}} × {{awayTag}}, no {{tournamentName}}.',
        adminSpoke:
          'A organização falou na conversa de {{homeTag}} × {{awayTag}}, no {{tournamentName}}.',
        mention:
          '{{byTag}} marcou você na conversa de {{homeTag}} × {{awayTag}}, no {{tournamentName}}.',
        firstUnread: '{{byTag}} falou na conversa do confronto, no {{tournamentName}}.',
      },
    },
  },

  /**
   * Campeonatos · **a tela que é superfície de aquisição, não vitrine do que já
   * foi feito.**
   *
   * A regra que o Eduardo escreveu manda em toda frase daqui: *"não pode ter
   * fricção até assinar de fato"*. Por isso a premiação, o formato e o que
   * acontece se não encher estão escritos **antes** de qualquer botão · a maior
   * objeção de quem paga cedo é a edição não acontecer.
   */
  /**
   * O visualizador de imagem do CDN · a prova vista **dentro do site**, e não
   * numa aba nova com a imagem crua no fundo branco do navegador.
   */
  viewer: {
    close: 'Fechar',
    openOriginal: 'Abrir a imagem original',
    previous: 'Anterior',
    next: 'Próxima',
    counter: '{{current}} de {{total}}',
  },

  tournament: {
    listTitle: 'Campeonatos',
    listSubtitle: 'Inscreva o club que você já tem aqui. A elegibilidade sai do próprio club.',
    emptyTitle: 'Nenhuma edição aberta agora',
    emptyBody: 'Quando a próxima abrir, ela aparece aqui.',
    notFoundTitle: 'Campeonato não encontrado',
    notFoundBody: 'Esse endereço não leva a nenhuma edição.',
    failureTitle: 'Não deu pra carregar o campeonato',
    retry: 'Tentar de novo',
    // A sobrelinha da capa · o mesmo desenho do hero da landing, um degrau abaixo.
    overline: 'Campeonato de Pro Clubs',
    // **O rótulo do numerão da capa, e ele concorda com o número** · a capa
    // dizia "1 VAGAS RESTANTES" na única situação em que a última vaga existe,
    // que é justamente a que ninguém monta pra olhar. Aqui o `_one` não escreve
    // a palavra do número (a regra do `i18n.md`) porque **o número já está na
    // tela**, num elemento próprio · escrevê-lo daria "1 uma vaga".
    // O zero não chega aqui: com a edição cheia o rótulo é o `spotsFull`.
    spotsLeftLabel_one: 'vaga restante',
    spotsLeftLabel_other: 'vagas restantes',
    closesIn: 'fecha {{when}}',
    seoDescription: '{{name}} · inscreva o seu club no GGClubs.',
    backToList: 'Todos os campeonatos',
    groupOpen: 'Inscrições abertas',
    groupRunning: 'Acontecendo agora',
    groupSoon: 'Vai começar',
    groupFinished: 'Já aconteceram',
    historyTitle: 'Edições anteriores',
    viewResults: 'Ver resultados',
    followEdition: 'Acompanhar',
    viewEdition: 'Ver edição',
    viewSignup: 'Ver edição e inscrição',
    entryPerClub: 'Inscrição por club',
    signupOpens: 'Inscrições abrem em',
    signupClosed: 'Inscrições encerradas · acompanhe a chave',
    availableSpots_one: '{{count}} vaga disponível de {{total}}',
    availableSpots_other: '{{count}} vagas disponíveis de {{total}}',
    summaryTeams_one: '{{count}} time',
    summaryTeams_other: '{{count}} times',
    listSubtitlePublic:
      'Campeonato de Pro Clubs com o club que você já tem. Sem planilha, sem print.',
    emptyBodyPublic:
      'Crie a sua conta e o seu club agora · quando a próxima edição abrir, você entra num clique.',

    // **A de dentro do app também vende**, e o que ela vende é ESTA edição ·
    // correção do Eduardo em 12/08/2026. Os três argumentos ficam grudados no
    // botão: prêmio, escassez e prazo.
    // Sem ponto no fim · o `{{when}}` pode ser uma data abreviada ("26 de ago."),
    // e os dois juntos viram "ago.." · visto na tela em 12/08/2026.
    // **`_one` escreve a palavra e não interpola o número** · é a regra do
    // `i18n.md`, e aqui ela vale porque a frase não tem o número em lugar
    // nenhum. O zero não alcança estas duas: elas só saem com `canJoin`.
    joinPitch_one:
      '{{prize}} pro campeão e uma vaga de pé · a chave sai quando todas as vagas estiverem confirmadas, e as inscrições fecham {{when}}',
    joinPitch_other:
      '{{prize}} pro campeão e {{count}} vagas de pé · a chave sai quando todas as vagas estiverem confirmadas, e as inscrições fecham {{when}}',
    joinNotYetOpen:
      'As inscrições abrem {{when}}. Guarde o endereço · a vaga é por ordem de chegada.',
    // **Numa edição paga, "ordem de chegada" é a ordem do PAGAMENTO** · quem se
    // inscreve primeiro e paga depois não fica na frente de quem pagou em dia,
    // e é essa a regra que decide quem perde a vaga quando a edição estoura o
    // teto. Dizer só "ordem de chegada" prometia a leitura errada.
    joinNotYetOpenPaid:
      'As inscrições abrem {{when}}. Guarde o endereço · a vaga é de quem confirma o pagamento primeiro.',
    joinClosed: 'As inscrições desta edição não estão abertas.',
    /**
     * **Lotada é diferente de fechada**, e a tela dizia a segunda pras duas ·
     * com a janela aberta e o teto cheio, o painel afirmava "não estão abertas"
     * duas linhas abaixo do selo verde dizendo **Inscrições abertas**.
     *
     * A segunda frase não é enfeite: a vaga volta pro bolo mesmo (medido em
     * 04/09/2026), então quem lê tem motivo pra voltar.
     *
     * **Ela cita os DOIS caminhos de propósito** · reserva só existe em edição
     * paga, e a primeira versão desta frase falava só dela · numa edição grátis
     * lotada ela prometia um mecanismo que aquela edição não tem. Citar os dois
     * é o que dispensa um par `_Paid`, que seria mais uma chave capaz de
     * divergir.
     */
    joinFull:
      'As vagas acabaram · elas voltam pro bolo quando um club sai ou quando uma reserva vence sem pagamento.',
    joinedTitle: '{{club}} tem inscrição confirmada',
    joinedBody:
      'Chame os adversários · o link abre a página do campeonato pra qualquer pessoa, com ou sem conta.',
    copyLink: 'Copiar link',
    linkCopied: 'Link copiado',

    // A porta de quem não tem conta · em cima o motivo, embaixo a ação.
    ctaTopTitle: 'Entre com o club que você já tem',
    ctaTopBody:
      'Aqui o seu club já existe com elenco, papéis e plataforma · inscrever é um clique, e a elegibilidade sai do próprio club em vez de um formulário.',
    ctaBottomTitle: 'Bora colocar o seu time nessa',
    ctaBottomBody_one: '{{prize}} pro campeão e uma vaga de pé. Criar conta leva um minuto.',
    ctaBottomBody_other:
      '{{prize}} pro campeão e {{count}} vagas de pé. Criar conta leva um minuto.',
    timeZone: 'Horários no fuso de Brasília.',
    ctaNotYetTitle: 'As inscrições ainda não abriram',
    ctaNotYetBody:
      'Elas abrem em {{when}} · crie a conta agora e o seu club entra assim que abrir.',
    ctaClosedTitle: 'Esta edição já fechou',
    ctaClosedBody: 'Fique de olho na próxima · elas abrem com vagas limitadas.',
    /**
     * **Lotada com a inscrição aberta não é "já fechou"**, e esta era a pior das
     * quatro faces do mesmo defeito: ela mora na superfície de **aquisição**, e
     * mandava o visitante procurar outra edição enquanto uma reserva vencendo
     * ainda podia devolver a vaga dele.
     */
    ctaFullTitle: 'As vagas desta edição acabaram',
    ctaFullBody:
      'A vaga volta pro bolo quando um club sai ou quando uma reserva vence sem pagamento, então vale voltar aqui · e as próximas abrem com vagas limitadas.',
    // **Cancelada diz que não vai acontecer**, e não que a inscrição encerrou ·
    // são coisas diferentes e a página dizia a segunda pras duas.
    ctaCancelledTitle: 'Esta edição foi cancelada',
    ctaCancelledBody:
      'A organização cancelou este campeonato, então ele não vai acontecer. Quem tinha club inscrito foi avisado.',
    ctaSeeOthers: 'Ver os campeonatos',

    // **O contador de vagas é escassez verdadeira**, e é ele que anda sozinho no
    // canal · o teto existe de verdade, então nada aqui é urgência inventada.
    spotsLeft_one: 'Falta uma vaga',
    spotsLeft_other: 'Faltam {{count}} vagas',
    spotsFull: 'Vagas esgotadas',
    teamsIn_one: 'Um time',
    teamsIn_other: '{{count}} times',
    teamsInLabel: 'times na edição',
    startsOn: 'Começa em',
    playedOn: 'Jogado em',
    spotsOf: '{{taken}} de {{total}} vagas',
    registeredCount_one: 'um club inscrito',
    registeredCount_other: '{{count}} clubs inscritos',

    free: 'Grátis',
    entry: 'Inscrição',
    // **O pódio** · 20/08/2026. A edição acabava e não dizia quem ganhou.
    podiumTitle: 'O pódio',
    podiumMeta: 'a edição acabou',
    podiumFirst: 'Campeão',
    podiumSecond: 'Vice',
    podiumThird: 'Terceiro',
    prizeTitle: 'Premiação',
    /**
     * **O meio do pagamento entra no valor** · pedido do Eduardo em 05/09/2026.
     * Quem lê "R$ 500" pergunta como recebe; a resposta cabe na mesma linha.
     */
    prizeViaPix: '{{value}} no PIX',
    /** O par do de cima, pro painel que já mostra o valor em corpo grande. */
    pixHint: 'no PIX',
    prizeFirst: '1º lugar',
    prizeSecond: '2º lugar',
    prizeThird: '3º lugar',

    // A resposta pra maior objeção de quem paga cedo, escrita na página.
    ladderTitle: 'E se não encher',
    ladderBody:
      'A organização confirma o tamanho conforme os inscritos e os formatos previstos. Cada tamanho tem sua premiação.',
    ladderRow_one: 'Com um time',
    ladderRow_other: 'Com {{count}} times',
    ladderCurrent: 'É o tamanho de agora',
    ladderNoneYet_one:
      'Falta 1 club pro menor tamanho · se ele não fechar, a edição não acontece e o valor volta por inteiro.',
    ladderNoneYet_other:
      'Faltam {{count}} clubs pro menor tamanho · se ele não fechar, a edição não acontece e o valor volta por inteiro.',

    formatTitle: 'Formato',
    factGroups: 'Grupos',
    factQualifiers: 'Classificam',
    factKnockout: 'No mata-mata',
    // **Os três números vêm marcados** · pedido do Eduardo em 19/08/2026, e o
    // `<0>` é o mesmo mecanismo do resto do catálogo. Eles são a informação da
    // frase, e liam com o mesmo peso das preposições.
    formatLine:
      '<0>{{groups}}</0> grupos de <1>{{groupSize}}</1>, com <2>{{qualifiers}}</2> passando de cada.',
    // **Sem o número e sem o "mais"** · os dois viraram o `+N` em display ao
    // lado, quando a repescagem ganhou linha própria no painel do formato.
    formatBestThirds_one: 'melhor terceiro colocado também passa',
    formatBestThirds_other: 'melhores terceiros também passam',
    thirdPlace: 'Tem disputa de terceiro lugar.',

    rulesTitle: 'Regulamento',
    registrationOpens: 'Inscrições abrem',
    registrationCloses: 'Inscrições até',
    // O sorteio é uma data só, e é isso que faz ele ser fácil de comunicar:
    // nele o club precisa existir, o elenco congela e a chave sai.
    draw: 'Sorteio',
    drawHint:
      'A chave sai quando todas as vagas estiverem confirmadas. Se ainda houver vagas livres ou reservas, a organização sorteia a partir desta data.',
    starts: 'Começa',
    generationTitle: 'Geração',
    generationHint: 'No Clubs do EA FC só joga junto quem está na mesma geração.',

    registeredCapacity: '{{count}} vagas na edição',
    registeredPreview: 'Ver prévia',
    registeredShowAll: 'Ver todos os {{count}}',
    registeredConfirmed: 'Confirmados',
    registeredReserved: 'Reservas',
    registeredReservation: 'Reserva',
    registeredAvailable_one: 'Vaga livre',
    registeredAvailable_other: 'Vagas livres',
    registeredReservationHint: 'Reservas aguardam a confirmação do pagamento.',
    registeredSearch: 'Buscar por nome ou tag',
    registeredFilter: 'Situação da inscrição',
    registeredAll: 'Todos',
    registeredConfirmedClub: 'Confirmado',
    registeredNoResults: 'Nenhum club encontrado. Tente outro nome, tag ou filtro.',
    registeredResults: 'Mostrando {{count}} de {{total}} clubs',
    joinCompleteTitle: 'Concluir inscrição',
    joinPitchNoPrize_one:
      'Uma vaga disponível · as inscrições fecham {{when}}. Confira o formato e o regulamento abaixo.',
    joinPitchNoPrize_other:
      '{{count}} vagas disponíveis · as inscrições fecham {{when}}. Confira o formato e o regulamento abaixo.',
    ctaBottomNoPrize_one:
      'Uma vaga disponível nesta edição. Crie sua conta e confira a inscrição do seu club.',
    ctaBottomNoPrize_other:
      '{{count}} vagas disponíveis nesta edição. Crie sua conta e confira a inscrição do seu club.',
    registeredTitle: 'Quem já está dentro',
    registeredEmpty: 'Ninguém ainda. O seu club pode ser o primeiro.',
    groupName: 'Grupo {{name}}',
    // **A letra grande é o nome do grupo** · o rótulo em cima só diz o que
    // aquela letra é. Antes eram "A" e "GRUPO A" colados, dizendo o mesmo.
    groupsTitle: 'Grupos',
    matchesTitle: 'Os confrontos',
    participation: {
      waitingDraw: 'Aguardando o sorteio',
      drawDate: 'Sorteio previsto para {{when}}',
      drawBody: 'Grupo, adversários e horários aparecem aqui quando a organização fizer o sorteio.',
      reservedTitle: '{{club}} tem uma vaga reservada',
      reservedBody:
        'A inscrição ainda depende da confirmação do pagamento. Abra a edição para acompanhar ou concluir.',
      reservedMember:
        'A inscrição aguarda o pagamento. O dono ou gerente pode acompanhar pela página do campeonato.',
      reservedUntil: 'Reserva até {{when}} · horário de Brasília.',
      paymentAction: 'Acompanhar pagamento',
    },
    progress: {
      clubScore: 'Seu club: {{home}}-{{away}}',
      soon: 'Prepare o elenco e combine a partida com o adversário. Depois do jogo, cada club declara o placar.',
      toReport:
        'Jogo concluído? Declare o placar e anexe a prova. Resultados iguais confirmam a partida.',
      waitingRival:
        'Seu club já declarou. A confirmação depende do adversário; se houver divergência, a organização decide.',
      live: 'Acompanhe a partida. O dono ou gerente do club declara o resultado após o jogo.',
      disputed:
        'A partida aguarda uma decisão da organização. Acompanhe o resultado e, se tiver acesso, converse na sala.',
      done: 'O resultado está confirmado. Confira a classificação e os próximos confrontos.',
      rivalScore: 'Adversário: {{home}}-{{away}}',
      penalties: 'Pênaltis: {{home}}-{{away}}',
    },
    moment: {
      // **O que a partida quer de VOCÊ** · não é o `status` dela, que responde
      // ao sistema. Ver `matchMoment`.
      soon: 'O seu próximo jogo',
      toReport: 'É a sua vez · lance o placar',
      // **Curto porque ele quebra em duas linhas a 320** · "você lançou" é
      // dedutível de estar esperando, e a linha longa empurrava o confronto
      // pra fora da primeira dobra no iPhone SE.
      waitingRival: 'Esperando o adversário',
      live: 'Acontecendo agora',
      disputed: 'Em disputa · a organização decide',
      done: 'Encerrada',
    },
    // A saída escrita da faixa do topo · uma seta sozinha não diz pra onde
    // leva, e levar ao campeonato é a razão de ela existir.
    liveBarOpen: 'Ver o campeonato',
    // **A forma curta do momento, só na faixa** · lá a ação já está escrita na
    // ponta da linha, e repeti-la custava o nome do adversário.
    liveBarYourTurn: 'É a sua vez',
    // A preposição que liga o momento ao adversário na faixa · sem ela os dois
    // ficam colados sem relação, e o nome ao lado pode ser qualquer coisa.
    liveBarAgainst: 'contra',
    // **O estado do documento não é o estado pra quem olha** · "chave
    // sorteada" descreve o sistema; isto descreve o que a pessoa quer saber.
    //
    // **Curto de propósito** · a seção que agrupa estas edições já se chama
    // "acontecendo agora", e o selo repetindo a frase inteira logo abaixo dela
    // era a mesma palavra duas vezes em dois pesos.
    happeningNow: 'Ao vivo',
    // **Duas marcações, e a diferença entre elas é a regra de 18/08/2026** ·
    // quem responde pelo club na edição é o dono, e só ele.
    youRespond: 'Você responde',
    youPlay: 'Você joga aqui',
    alsoInTitle: 'Você também joga por',
    // **O limite vem junto da marcação** · listar sem dizer que ali ela só
    // joga faria a pessoa procurar um botão que a rota recusa.
    //
    // **"Quem tem cargo" e não "o dono", desde 03/09/2026** · o gerente passou a
    // inscrever, pagar e declarar, e a frase ficaria mentindo pra ele · que é
    // justamente quem lê esta linha, porque ela só aparece pra quem está em
    // mais de um club.
    alsoInBody:
      'Nestes você joga, mas quem inscreve, paga e lança placar é quem tem cargo no club.',
    groupLabel: 'Grupo',
    // **O que está em jogo, no próprio card** · a página dizia isto só no
    // painel de formato, longe da tabela onde a pergunta nasce.
    groupQualify_one: 'Passa 1',
    groupQualify_other: 'Passam {{count}}',
    // **A legenda é o que faz a barra ser informação e não enfeite** · três
    // pesos sem legenda são três cinzas que ninguém decodifica.
    zoneDirect: 'Classificado',
    zoneBestNext: 'Repescado',
    zoneChasing: 'Na briga pela repescagem',
    groupSize: '{{count}} club no grupo',
    groupSize_other: '{{count}} clubs no grupo',
    /**
     * **Os nomes das rodadas do mata-mata** · saem de quantos times estão
     * nelas, e não de um rótulo gravado no documento.
     */
    round: {
      final: 'Final',
      // A disputa de terceiro · ela é um jogo do campeonato e não um degrau da
      // chave, e por isso o rótulo diz o que ela vale.
      thirdPlace: 'Disputa do 3º lugar',
      semi: 'Semifinal',
      quarter: 'Quartas de final',
      round16: 'Oitavas de final',
      /**
       * **O nome vem do número de JOGOS, e não de times** · 32 times são
       * **dezesseis** confrontos, e a rodada de dezesseis confrontos se chama
       * "16 avos de final" · "trinta e dois avos" seria a de 64 times.
       *
       * Errei isto na primeira versão, e apareceu na captura do cenário de 48
       * clubs · com uma chave de 2 o rótulo nunca era exercitado.
       */
      round32: '16 avos de final',
    },
    // Quantos jogos uma rodada que **ainda não começou** vai ter · ela
    // substitui a pilha de caixas de "a definir", que numa chave de 32 eram
    // dezesseis por coluna.
    roundGamesCount_one: '· 1 jogo',
    roundGamesCount_other: '· {{count}} jogos',
    // O placar da disputa, embaixo do placar do jogo · curto porque a coluna
    // mede 60px.
    // O slot da chave que ainda não tem confronto · é ele que dá a árvore
    // inteira de relance, sem inventar documento no banco.
    bracketPending: 'A definir',
    bracketTitle: 'O caminho até a taça',
    bracketExplore: 'Explore a chave de uma ponta à outra',
    bracketSeeFinal: 'Ver final',
    bracketScrollBack: 'Rolar a chave para a esquerda',
    bracketScrollForward: 'Rolar a chave para a direita',
    bracketShortRound: {
      final: 'Final',
      semi: 'Semi',
      quarter: 'Quartas',
      round16: 'Oitavas',
      round32: '16 avos',
    },
    bracketSummary_one: '{{clubs}} clubs · {{count}} rodada',
    bracketSummary_other: '{{clubs}} clubs · {{count}} rodadas',
    bracketComplete: 'Título decidido',
    bracketOverview: 'Chave completa · role para explorar',
    bracketRounds: 'Rodadas do mata-mata',
    bracketPrevious: 'Rodada anterior',
    bracketNext: 'Próxima rodada',
    bracketNextStage: 'Os vencedores se encontram: {{round}}',
    bracketWaiting: 'Aguardando confronto',
    bracketCancelled: 'Cancelado',
    bracketSettled: 'Encerrado',
    bracketGame: 'Jogo {{number}}',
    bracketWinnerOf: 'Vencedor do jogo {{number}}',
    bracketQualifiedWaiting: 'Classificado · aguardando a rodada',
    bracketYourClub: 'Seu club',
    bracketWinner: 'Vencedor',
    sectionsLabel: 'Navegação do campeonato',
    groupWaiting: 'Aguardando sorteio',
    fullAwaitingDraw: 'Vagas esgotadas · aguardando sorteio',
    moreEditions: 'Ver mais campeonatos',
    informationTab: 'Regulamento e detalhes',
    phaseProgress: 'Resultados nesta fase: {{settled}}/{{total}}',
    standingsTitle: 'Classificação',
    playedFormatTitle: 'Formato da edição',
    calendarPast: {
      registrationCloses: 'Prazo das inscrições',
      draw: 'Sorteio previsto',
      starts: 'Início previsto',
    },
    tablePosition: 'Posição',
    tableCompact: 'Voltar ao resumo',
    tableComplete: 'Ver estatísticas completas',
    bracketPenalties: 'pên.',
    bracketScoreWithPenalties: 'Placar: {{goals}} · pênaltis: {{penalties}}',
    bracketTrophyWaiting: 'O último vencedor leva a taça.',
    // **Qual fase está acontecendo** · duas seções empilhadas não dizem em qual
    // delas a edição está.
    phaseLive: 'Acontecendo agora',
    // O selo de quem já está na próxima fase · curto porque divide a célula
    // com o nome do club.
    // O club que jogou e saiu depois · ele fica na chave, sem link.
    clubClosed: 'Club encerrado',
    qualifiedTag: 'Passou',
    eliminatedTag: 'Não passou',
    // **Passar em terceiro é outra história** · a cor muda, e o rótulo também.
    qualifiedThird: 'Passou na repescagem',
    // **A corrida da repescagem** · responde o que a barrinha tracejada só
    // levantava.
    thirdsTitle: 'Melhores terceiros',
    thirdsSubtitle_one: '{{count}} vaga em jogo',
    thirdsSubtitle_other: '{{count}} vagas em jogo',
    // Sigla, como as outras colunas da tabela · a coluna é estreita e rola.
    thirdsGroupCol: 'GP',
    penaltiesShort: '{{home}}-{{away}} pên.',
    roundMatches_one: '{{count}} jogo',
    roundMatches_other: '{{count}} jogos',
    roundName: '{{round}}ª rodada',
    yourClub: 'Você',
    cardSlots: 'Vagas na edição',
    // Os rótulos da tabela · abreviados como todo mundo do futebol escreve, e o
    // nome inteiro fica no `title` de quem usa leitor de tela.
    tableClub: 'Club',
    // **A ordem antes da primeira rodada é a do sorteio, e a tabela diz
    // isso** · sem a nota, quatro linhas numeradas com tudo zerado leem
    // como classificação, e o produto afirma um líder que não existe.
    /**
     * **Por que a tabela está zerada** · e a frase mudou em 19/08/2026 porque a
     * anterior não era entendida: *"não entendo o intuito desse"*, sobre o
     * "Ordem do sorteio" solto no topo.
     *
     * Sozinha, ela lia como **controle de ordenação** (um filtro), e não como
     * explicação. O que a pessoa precisa saber é que **aqueles números não são
     * classificação** · dizer primeiro que não houve jogo é o que dá sentido ao
     * resto da frase.
     */
    tableDrawOrder: 'Sem jogos · ordem do sorteio',
    // A leitura da linha pra quem não vê a metade que rola · a metade das
    // estatísticas é `aria-hidden`, então ela precisa existir em texto.
    rowSummary:
      '{{points}} pontos, {{played}} jogos, {{won}} vitórias, {{drawn}} empates, {{lost}} derrotas, {{goalsFor}} gols marcados, {{goalsAgainst}} sofridos',
    tablePlayed: 'PJ',
    tableWon: 'V',
    tableDrawn: 'E',
    tableLost: 'D',
    tableGoalsFor: 'GM',
    tableGoalsAgainst: 'GC',
    tableDiff: 'SG',
    tablePoints: 'PTS',
    // **O verbo é o mesmo do resto do produto** · a interface toda já diz
    // "declarou", "esperando declaração" e "Declarar W.O.", e só este botão
    // dizia "lançar". Trocado em 29/08/2026 · o objeto ("placar") sai porque a
    // linha do confronto já é o contexto, e sem ele o botão cabe na coluna.
    reportAction: 'Placar',
    reportWaiting: 'Esperando o adversário',
    // **O que VOCÊ declarou** · a regra que esconde o placar de um lado existe
    // contra o adversário, e estava valendo contra quem declarou.
    reportYours: 'Você: {{home}}-{{away}}',
    // **O relógio da declaração, e ele NÃO fecha nada** · esta frase dizia
    // "Vale sozinho" até 31/08/2026, herdada da varredura que caiu em 22/08.
    // O prazo hoje diz uma coisa só: quando a partida entra na mesa da
    // organização. Serve nos dois tempos ("em 20 minutos" e "há 3 horas").
    reportCountsIn: 'Sem resposta, vai pra organização {{when}}',
    /**
     * **O que você está esperando** · cada causa tem frase própria porque elas
     * pedem coisas diferentes de quem lê: uma pede paciência de minutos, a
     * outra é a hora de falar com a organização.
     */
    waiting: {
      waitingGroupsKicker: 'Sua rodada',
      waitingGroupsTitle: 'Seus jogos da rodada acabaram',
      waitingGroups: 'A fase de grupos continua · o seu próximo jogo sai quando a rodada fechar.',
      waitingBracketKicker: 'Aguardando a organização',
      waitingBracketTitle: 'A fase de grupos acabou',
      waitingBracket:
        'A chave do mata-mata é gerada pela organização, e ela já foi avisada · é quando a chave sair que você fica sabendo contra quem joga.',
      waitingRoundKicker: 'Classificado',
      waitingRoundTitle: 'Você passou',
      waitingRoundUnknown: 'O seu adversário sai deste jogo, que ainda não terminou.',
      waitingRoundKnown:
        'O seu adversário já é o {{rival}} · a partida aparece quando a rodada fechar.',
      waitingRoundRest_one: 'Ainda falta {{count}} jogo desta rodada pra chave andar.',
      waitingRoundRest_other: 'Ainda faltam {{count}} jogos desta rodada pra chave andar.',
      waitingThirdPlaceKicker: 'Disputa de terceiro',
      waitingThirdPlaceTitle: 'Você ainda tem jogo',
      waitingThirdPlace:
        'A semifinal não foi, mas a disputa de terceiro é sua · ela aparece quando a outra semi terminar.',
      eliminatedKicker: 'Fim de linha',
      eliminatedTitle: 'Sua caminhada acabou aqui',
      eliminated: 'O seu club não segue na competição · a chave continua sem ele.',
    },
    // O que o outro lado lê · **que** o adversário declarou, nunca o quê.
    reportRivalSent: 'O adversário já declarou',
    // O rótulo do link da prova · dois ícones lado a lado sem dizer de quem são
    // não informam nada.
    shotOf: 'Print do {{club}}',
    // A legenda de baixo no visualizador · o placar que **aquele** print
    // sustenta, na perspectiva mandante × visitante.
    shotScore: '{{homeClub}} {{home}} × {{away}} {{awayClub}}',
    // **O acordo passou a aparecer** · ver o comentário do selo na linha.
    // **Curto porque a coluna mede 160px** · ela carrega o selo e o botão da
    // prova, e a forma longa ("confirmada pelos dois") empurrava tudo por cima
    // do nome do club. O que a palavra precisa dizer é **como** fechou.
    settledAgreement: 'Confirmada',
    shotsCount_one: '{{count}} print anexado',
    shotsCount_other: '{{count}} prints anexados',
    reportDisputed: 'Em disputa',
    reportTitle: 'Lançar o placar',
    reportBody:
      'Preencha o placar e mande o print da tela final. Quando o adversário mandar o mesmo, o resultado fecha sozinho.',
    // **A sigla de mando na linha da partida, no celular** · empilhado os dois
    // lados leem iguais, e o placar é declarado na perspectiva do mandante.
    // **Falha de rede na lista de edições** · ela não pode ler como "não há
    // campeonato", que é o que a tela dizia até 18/08/2026.
    listFailureBody: 'Não deu pra carregar os campeonatos agora. Pode ser a sua conexão.',
    // **Como a partida fechou** · o dado existe desde 15/08/2026 e nunca tinha
    // chegado à tela. O caminho normal (`agreement`) fica calado: carimbar toda
    // partida jogada faria os dois casos que importam deixarem de saltar.
    // **O título da fase só aparece quando há mais de uma** · com grupos
    // sozinhos ele seria um cabeçalho explicando o óbvio.
    // **Os cinco momentos da vida de uma edição** · a régua que diz onde ela
    // está. Curtos de propósito: eles ficam lado a lado numa fita.
    step: {
      draft: 'Rascunho',
      signup: 'Inscrições',
      bracket: 'Chave',
      playing: 'Em jogo',
      over: 'Fim',
    },
    phaseGroup: 'Fase de grupos',
    phaseKnockout: 'Mata-mata',
    settledTimeout: 'Valeu por prazo',
    // Curto porque a coluna de ação da linha mede 160px, e ela se dimensiona
    // pelo maior selo · a forma longa cobraria essa largura de toda a chave.
    // O sujeito já é a partida em que o selo está, então o verbo é dispensável.
    settledAdmin: 'Pela organização',
    // **Encerrada e decidida não são a mesma coisa** · aqui a organização
    // validou o placar que um lado declarou, antes do prazo.
    //
    // **Curto porque a coluna do selo mede 160px** · a forma longa saía por
    // cima do nome do club, e é a mesma medida que encurtou o `settledAdmin`.
    // O texto inteiro e o motivo moram no `title`, e o aviso conta a história
    // completa na caixa dos dois clubs.
    settledClosed: 'Encerrada',
    /**
     * **Quem decidiu tinha club nesta partida** · 28/08/2026.
     *
     * Frase inteira e não rótulo curto: ela vive no `title` e no leitor de
     * tela, e o que aparece na linha é um asterisco · aqui o espaço não cobra.
     * E ela diz o **fato**, não um juízo: quem lê tira a conclusão.
     */
    settledByInvolved: 'Quem decidiu tem club nesta partida',
    sideHome: 'Man',
    sideAway: 'Vis',
    reportHomeGoals: 'Gols do mandante',
    reportAwayGoals: 'Gols do visitante',
    // **Os pênaltis, no mata-mata empatado** · a frase explica por que os dois
    // campos apareceram do nada enquanto a pessoa digitava.
    reportPenaltiesHint: 'Empatou no tempo normal · diga como ficou a disputa de pênaltis.',
    reportKnockoutHint:
      'Aqui é mata-mata: informe o placar do tempo normal. Se der empate, a gente pergunta os pênaltis.',
    reportHomePenalties: 'Pênaltis do mandante',
    reportAwayPenalties: 'Pênaltis do visitante',
    reportPenaltiesTied: 'Alguém precisa ter passado · a disputa não pode empatar.',
    reportShot: 'Print do placar',
    reportSend: 'Enviar',
    reportSending: 'Enviando...',
    reportNeedsShot: 'Mande o print da tela final.',
    reportDeadlineHint:
      'Se ninguém do outro lado responder em {{minutes}} minutos, a partida vai pra organização decidir.',

    // O W.O. · a declaração de que o adversário não apareceu. O número do placar
    // é interpolado da constante, nunca escrito · é a regra dos limites de campo.
    walkoverTitle: 'Declarar W.O.',
    walkoverBody:
      'Você declara que o adversário não apareceu. Fica {{goals}} a 0 pro {{club}}, que é o padrão do regulamento.',
    walkoverSwitch: 'O {{club}} não apareceu',
    walkoverBackToScore: 'Voltar e lançar o placar',
    walkoverShot: 'Print (opcional)',
    walkoverSend: 'Declarar W.O.',
    // A linha da chave · o selo e a frase do duplo.
    walkoverBadge: 'W.O.',
    walkoverBoth: 'Ninguém apareceu',
    walkoverBothHint:
      'Ninguém declarou o resultado no prazo · a partida não conta pra tabela, e nenhum dos dois pontuou.',
    // A vaga está segura e o dinheiro não entrou · o selo qualifica o card em
    // vez de escondê-lo, porque o contador de vagas conta essa vaga.
    registrationReserved: 'Reservado',
    registrationReservedHint: 'Vaga reservada · o pagamento ainda não foi confirmado.',

    joinTitle: 'Inscrever um club',
    join: 'Inscrever',
    joining: 'Inscrevendo...',
    joined: 'Inscrito',
    // **"Vaga segura" e não "pagamento pendente"** · o que a pessoa precisa
    // saber neste instante é que o club não perdeu o lugar enquanto ela paga.
    awaitingPayment: 'Vaga segura',
    payTitle: 'Pagar a vaga do {{club}}',
    // **A frase existe pra responder a única dúvida que sobra aqui**, e ela não
    // é sobre o meio de pagamento: é "vou perder o lugar enquanto pago?".
    payPitch: 'A vaga do seu club fica segura enquanto você paga.',
    payConsequence:
      'Depois do prazo a vaga volta pro bolo. Pagamento que cair com a edição já cheia é reembolsado por inteiro.',
    payClock: 'Vaga segura por mais',
    payPix: 'Pagar com Pix',
    payCard: 'Pagar com cartão',
    paying: 'Abrindo...',
    payPixHelp: 'Abra o app do banco, escolha Pix e leia o código. A vaga confirma sozinha.',
    payQrAlt: 'Código QR do Pix',
    payCopy: 'Copiar código',
    payCopied: 'Código copiado',
    payTicket: 'Abrir no Mercado Pago',
    payCardOpened: 'O pagamento abriu em outra aba.',
    payCardReopen: 'Abrir de novo',
    cancel: 'Cancelar inscrição',
    cancelling: 'Cancelando...',
    signInToJoin: 'Entrar pra inscrever',
    createAccountToJoin: 'Criar conta e entrar',
    noClubsTitle: 'Você ainda não tem club',
    noClubsBody: 'Dá pra entrar assim mesmo: é só ter um club até o sorteio.',
    notOwnerBody:
      'Quem inscreve o club é quem tem cargo nele · dono ou gerente. Nestes você joga, mas quem entra na edição é quem responde.',
    createClub: 'Criar um club',

    // **A elegibilidade respondida antes do clique** · sem estas frases a pessoa
    // descobre no erro que o club é de outra geração, e atrito antes de pagar é
    // gente que desiste.
    reason: {
      wrongPool: 'É de outra geração',
      alreadyRegistered: 'Já está inscrito',
      full: 'As vagas acabaram',
      closed: 'As inscrições estão fechadas',
    },

    status: {
      open: 'Inscrições abertas',
      // Os dois que só a data conhece · ver `displayStatusOf`. Uma edição
      // publicada é `open` no banco antes de abrir e depois de fechar, e o selo
      // dizia "abertas" nas duas pontas.
      notYetOpen: 'Inscrições em breve',
      signupEnded: 'Inscrições encerradas',
      closed: 'Inscrições encerradas',
      drawn: 'Chave sorteada',
      running: 'Em andamento',
      finished: 'Terminado',
      cancelled: 'Cancelado',
      draft: 'Rascunho',
    },
  },

  empty: {
    notFoundTitle: 'Página não encontrada',
    notFoundBody: 'O link que você seguiu está quebrado ou a página foi movida.',
  },

  landing: {
    showcaseExample: 'Exemplo',
    showcaseChatHome: 'Tudo pronto para jogar?',
    showcaseChatAway: 'Pronto. Vamos jogar!',
    showcaseChatHelp: 'Conversa com o adversário e acesso à organização',
    termsSingle: 'Esta edição precisa de {{count}} clubs confirmados para acontecer.',
    termsMinimum: 'Mínimo para acontecer: {{count}} clubs.',
    termsPaidOnly: 'Nas edições pagas',
    howPlayer: 'Ainda sem club? Crie sua conta para montar um ou participar de um elenco.',
    // A seção de campeonatos · **o chamariz do hero e a seção em si.**
    //
    // O `<0>` das duas primeiras é a **âncora** `#campeonatos`, e não um link de
    // rota · quem clica desce na própria landing.
    //
    // **Cada um tem a forma de quando há edição de pé e a de quando não há**, e
    // as duas primeiras foram frase única até 02/09/2026 · com a última edição
    // terminada, a landing anunciava "acontecendo agora" sobre um card que dizia
    // TERMINADO, e mandava o visitante ver um campeonato que já tinha acabado.
    heroSeeTournaments: 'Ou <0>veja o campeonato que está rolando</0>',
    heroSeeTournamentsSignup: 'Ou <0>inscreva seu club no campeonato aberto</0>',
    heroSeeTournamentsSoon: 'Ou <0>veja o campeonato que vem aí</0>',
    heroSeeTournamentsPast: 'Ou <0>veja a última edição</0>',
    tournamentsOverline: 'Acontecendo agora',
    tournamentsOverlineSignup: 'Inscrições abertas',
    tournamentsOverlinePast: 'A última edição',
    // **Não repete a promessa do hero** (pendência 172: dois títulos disputavam
    // a mesma frase, 600px um do outro). A sobrelinha diz o momento; o título
    // diz o que o card ao lado prova.
    nextEditionTitle: 'Seu próximo campeonato',
    howTitle1: 'Escolha a edição',
    howTitle2: 'Acompanhe a disputa',
    howTitle3: 'Confirme o resultado',
    howBrief1: 'Confira o valor e as vagas. Dono ou gerente inscreve o club.',
    howBrief2: 'Grupos, chave e horários ficam na página do campeonato.',
    howBrief3: 'Jogue e confirme o placar com o adversário.',
    tournamentsBody:
      'Inscreva seu club, acompanhe grupos e mata-mata e registre os resultados. Cada partida tem sua conversa com o adversário e acesso à organização.',
    tournamentsHowTitle: 'Como funciona',
    how1: 'Confira geração, valor e vagas. Dono ou gerente inscreve o club; nas edições pagas, a confirmação vem após o pagamento.',
    how2: 'Depois do sorteio, consulte grupos, adversários e horários. A chave acompanha o avanço da disputa.',
    how3: 'Cada club informa o placar. Bateu, o resultado fecha sozinho.',
    tournamentsCta: 'Ver todos os campeonatos',
    closingTitle: 'Bota o seu time na chave',
    closingBody:
      'Criar conta é grátis. Monte seu club ou entre em um que já existe. O dono ou gerente cuida da inscrição na edição escolhida.',
    proofEditions_one: 'edição realizada',
    proofEditions_other: 'edições realizadas',
    proofTeams_one: 'participação de club',
    proofTeams_other: 'participações de clubs',
    proofPrize: 'em prêmios das edições',
    // **A tarja anuncia o foco** · três dos cinco termos (elencos, táticas)
    // estavam fora da mensagem de hoje, que é campeonato. Ela roda em seis
    // telas públicas, então mudar aqui muda todas de uma vez.
    marquee: 'Campeonatos · Premiação · Chave · Súmula · Rivalidades',

    // ---------------------------------------------- a vitrine do produto
    //
    // **A landing nunca mostrava o produto** (pendência 172) · daqui saem os
    // textos das peças desenhadas: a chave no hero, e os três painéis (tabela,
    // súmula e aviso). **Nome de club é espaço reservado óbvio**, regra do
    // `docs/design.md` · o número é interpolado, e o escudo mostra a sigla.
    showcaseTeam: 'Time {{n}} FC',
    // Marca própria pode · é a edição de exemplo, e nunca uma real.
    showcaseEdition: 'Copa GGClubs',
    // Descreve a peça pra quem usa leitor de tela, e diz que é exemplo.
    showcaseBracketAlt: 'Demonstração do mata-mata, da semifinal ao campeão.',
    // **Não cita concorrente** · decisão do Eduardo em 08/08/2026: a gente
    // também vai usar grupo, pra captar e avisar. A diferença é onde o
    // campeonato acontece, e a segunda linha (a verde) é a que carrega isso.
    showcaseOverline: 'O que muda',
    showcaseTitle1: 'O grupo avisa.',
    showcaseTitle2: 'O campeonato acontece aqui.',
    showcaseTableLabel: 'Tabela',
    showcaseTableTitle: 'Classificação na hora',
    showcaseTableBody:
      'Cada resultado confirmado atualiza a classificação. Veja quem avança e abra as estatísticas do grupo.',
    showcaseTableAlt: 'Exemplo de uma tabela de grupo, com quatro times de exemplo.',
    showcaseReportLabel: 'Partida',
    showcaseReportTitle: 'Conversa e resultado juntos',
    // **O que acontece quando não bate está escrito** · é a regra do produto,
    // e prometer que fecha sempre seria a promessa que a partida em disputa
    // desmente.
    showcaseReportBody:
      'Conversem na sala da partida e informem o placar. Resultados iguais fecham o jogo; divergências vão para decisão da organização.',
    showcaseReportAlt: 'Exemplo de conversa da partida e resultado confirmado pelos dois clubs.',
    showcaseReported: '{{club}} lançou {{score}}',
    showcaseMatched: 'Bateu · fechou sozinho',
    showcasePrint: 'Print anexado',
    showcaseNoticeLabel: 'Aviso',
    showcaseNoticeTitle: 'Seu próximo confronto',
    // Os três canais que existem de verdade · sininho, e-mail e, com o app,
    // a bandeja do Windows. Nenhum a mais.
    showcaseNoticeBody:
      'Saiba quando a chave e o próximo confronto estiverem definidos. Os avisos chegam no sininho, no e-mail e, com o app aberto, no Windows.',
    showcaseNoticeAlt: 'Exemplo de um aviso do campeonato',
    showcaseNoticeReport: 'É a sua vez de lançar o placar',
    showcaseNoticeReportBody: 'Quartas de final · Copa GGClubs',

    // ----------------------------------------- preço, escada e reembolso
    //
    // **O preço não aparecia em lugar nenhum** além de um selo no card, e nada
    // dizia o que acontece se a edição não encher (pendência 172). A frase da
    // seção é a `pillarPrizeBody`, que sempre foi este argumento. A escada e o
    // reembolso usam as frases que o produto já usa na página da edição.
    termsOverline: 'Sem letra miúda',
    termsTitle: 'Quanto custa, e o que acontece se não encher',
    termsPriceTitle: 'Inscrição',
    termsPriceNow: 'por club, nesta edição',
    // Sem edição nenhuma no ar, o cartão diz a regra em vez de um número.
    termsPriceEach: 'Cada edição diz o valor',
    termsPriceBody: 'Pix ou cartão, pelo Mercado Pago. Paga o club, e o elenco inteiro joga.',
    termsRefundTitle: 'Dinheiro de volta',
    // **A frase responde o medo que a pessoa TEM, e não um caso operacional** ·
    // correção do Eduardo em 03/09/2026. A versão anterior falava do pagamento
    // que cai com a edição já cheia · é o caso mais raro dos quatro da política,
    // e o único que **cria** uma dúvida em quem lê ("posso pagar e não
    // entrar?"). Na vitrine isso é vender contra si.
    //
    // Os dois que valem estão na política e são os itens 2 e 3 dela: edição que
    // não acontece por falta de times, e desistência em até 7 dias.
    termsRefundBody:
      'Se a edição não acontecer por falta de times, o valor volta por inteiro. E dá pra desistir em até 7 dias, antes do sorteio · o resto está na <0>política de reembolso</0>.',
    // **Só aparece quando há preço** · dizer os meios de pagamento embaixo de
    // um "Grátis" é a tela se contradizendo em duas linhas. Achado pelo Eduardo
    // olhando a tela em 03/09/2026.
    termsPriceFreeBody: 'Esta edição não cobra inscrição. O elenco inteiro joga.',
    // **Três peças, e o termo do jogo é a do meio, que é a grande** · quem joga
    // procura por "Pro Clubs", não por "campeonato". A sobrelinha dá o contexto
    // sem competir.
    heroEyebrow: 'Campeonato de',
    heroFocus: 'Pro Clubs',
    heroLine2: 'com o seu club',
    signIn: 'Entrar',
    // "club" em todo lugar · o produto se chama GGClubs e o jogo chama de club.
    // Dizer "time" aqui e "club" no resto ensina dois nomes pra mesma coisa.
    // **Três coisas, nesta ordem, e a ordem é a decisão:** o campeonato (que é
    // o que banca), quem pode entrar (todo mundo, que é o contrário de liga
    // fechada) e a premiação. Táticas e elenco entram como **o que o club já
    // tem**, não como funcionalidade solta · a vantagem é inscrever com o club
    // que já existe, e não ter que montar um do zero a cada edição.
    pitch: 'Seu club em campo. <0>A disputa organizada</0>, do primeiro jogo à taça.',
    // **Curto porque tem que caber a 320px** · "Entrar no próximo campeonato"
    // vazava a tela no piso de largura, com o tamanho de hero, e nenhum ajuste
    // de layout salva uma frase dessa medida ali. O título logo acima já diz que
    // é campeonato · o botão só precisa do verbo de quem lê.
    cta: 'Quero jogar',
    // **A descrição da busca é a promessa do hero**, e não uma lista de
    // funcionalidade · quem lê está decidindo se clica, não comparando recurso.
    // **Sem número e sem regra específica** · cada campeonato pode ter formato e
    // premiação próprios, então cravar "até o terceiro" aqui vira promessa que a
    // segunda edição desmente. Apontado pelo Eduardo em 08/08/2026.
    seoDescription:
      'Campeonatos de Pro Clubs no EA FC. Veja as próximas edições, confira valores e vagas e acompanhe grupos, mata-mata e resultados com o seu club.',
    // **scan-i18n: guardada · a seção saiu da tela em 12/08/2026 e a copy fica**
    // Decisão registrada no topo do `landing.tsx`: os três pilares são copy
    // validada pelo Eduardo em 08/08, e apagá-los transformaria "trazer a seção
    // de volta" numa reescrita em vez de um `<ul>`.
    pillarOpenTitle: 'Todo mundo joga',
    pillarOpenBody:
      'Não é liga fechada nem convite. Se você tem um club com elenco, você se inscreve · a divisão sai da geração do seu club, sem formulário.',
    // **O que vale sempre é a regra estar escrita antes**, e não um número · o
    // formato e a premiação mudam de campeonato pra campeonato.
    // scan-i18n: guardada · mesma razão da OpenTitle acima
    pillarPrizeTitle: 'Premiação de verdade',
    pillarPrizeBody:
      'Cada campeonato diz o valor da inscrição, o formato e quanto volta em prêmio · tudo escrito antes de você entrar.',
    // **Não promete que o elenco do campeonato é o do club** · isso não é regra,
    // e a frase anterior deixava entender que sim. O que o club resolve é o
    // cadastro, não quem entra em campo.
    // scan-i18n: guardada · mesma razão da OpenTitle acima
    pillarClubTitle: 'Com o club que já é seu',
    pillarClubBody:
      'Seu club já existe aqui, com elenco e plataforma. Inscrever é um clique · não é recadastrar o time a cada edição.',
  },

  /**
   * **A versão do site** · a faixa de "saiu coisa nova" e as duas telas de
   * quando o carregamento de uma rota falha. Pendência 193.
   *
   * **Nenhuma destas frases promete que algo acontece sozinho**, e isso é
   * decisão: a página nunca recarrega por conta própria, então dizer
   * "atualizando..." seria a documentação mentindo sobre o comportamento, na
   * versão que o usuário lê.
   *
   * **Elas não existem no app instalado** · lá quem fala de versão é o bloco
   * `desktop`, e o mecanismo é outro (o updater).
   */
  siteVersion: {
    bannerTitle: 'Saiu uma versão nova',
    // **"Quando quiser" é o ponto da frase** · ela existe pra tirar a urgência,
    // porque nada quebra enquanto a pessoa não recarregar. A segunda metade
    // responde o medo real de quem está no meio de declarar um placar.
    bannerBody: 'Recarregue quando quiser. Nada é perdido até você recarregar.',
    bannerCta: 'Recarregar',
    bannerLater: 'Agora não',
    // A faixa dizia que saiu uma versão nova e era muda sobre o conteúdo · o
    // destino dela é a página de novidades, desde 06/09/2026.
    bannerChangelog: 'Ver o que mudou',
    // O caso da pendência 193 · **a frase não diz "erro"**, porque não houve
    // um: o site foi atualizado enquanto esta aba estava aberta, e a única
    // coisa que falta é buscar o resto.
    staleTitle: 'Esta aba está numa versão antiga',
    staleBody: 'O site foi atualizado enquanto você estava aqui. Recarregar traz a versão nova.',
    staleCta: 'Recarregar',
    crashTitle: 'Esta tela não abriu',
    crashBody: 'Recarregar costuma resolver. Se não resolver, volte para o início.',
    crashHome: 'Ir para o início',
  },

  desktop: {
    updateTitle: 'Nova versão disponível',
    updateBody: 'A versão {{version}} do GGClubs já pode ser instalada.',
    updateCta: 'Atualizar e reiniciar',
    updateLater: 'Agora não',
    updateInstalling: 'Instalando...',
    updateChangelog: 'Ver o que mudou',
    // A trava de atualização obrigatória · o texto evita "erro" e "problema" de
    // propósito. Não há nada errado com a conta nem com a internet da pessoa:
    // o que acabou foi a validade desta versão, e a frase precisa levar direto
    // ao que resolve.
    forcedUpdateTitle: 'Atualize para continuar',
    // **Sem o `·` no meio**, e o motivo é de tela: com ele a frase quebrava
    // deixando o separador **órfão no começo da segunda linha** a 1280. Visto na
    // captura · o separador é da nossa voz, mas ele não sobrevive a quebra
    // automática no meio de parágrafo.
    forcedUpdateBody: 'Esta versão do GGClubs não é mais aceita. Atualizar leva alguns segundos.',
    forcedUpdateLooking: 'Procurando...',
    forcedUpdateRetry: 'Tentar de novo',
    // **"Não deu pra encontrar", e não "ainda não está disponível"** · três
    // coisas chegam aqui iguais (o instalador ainda não publicado, a rede
    // caída, o updater que falhou), e a frase antiga afirmava só a primeira.
    forcedUpdateMissing:
      'Não deu pra encontrar a atualização agora. Tente de novo em alguns minutos.',
    // A instalação que falhou (UAC cancelado, download que caiu, assinatura
    // que não bate) · é outra coisa que "não achei", e tem saída própria.
    updateFailed:
      'Não deu pra instalar agora. Tente de novo · se continuar assim, baixe o instalador em ggclubs.com.br/download.',
    minimize: 'Minimizar',
    maximize: 'Maximizar',
    restore: 'Restaurar',
    close: 'Fechar',
    trayOpen: 'Abrir GGClubs',
    trayQuit: 'Sair',
    hiddenTitle: 'O GGClubs continua aberto',
    hiddenBody:
      'A janela foi pra bandeja do sistema. Pra sair de vez, use Sair no menu da bandeja.',
    menuCut: 'Recortar',
    menuCopy: 'Copiar',
    menuPaste: 'Colar',
    menuSelectAll: 'Selecionar tudo',
    menuCopyLink: 'Copiar link',
    menuOpenClub: 'Abrir club',
    menuCopyClubLink: 'Copiar link do club',
    menuFavoriteClub: 'Tornar favorito',
    menuConfigureClub: 'Configurar club',
    menuCopyHandle: 'Copiar @nick',
    // O espelho do link do club · o player ganhou página aberta em 08/08/2026,
    // e até ali o @nick era a única coisa copiável de uma pessoa.
    menuCopyPlayerLink: 'Copiar link do jogador',

    // ------------------------------------- a seção "Aplicativo" de /app/conta
    //
    // Só existe no app instalado · é o endereço de toda configuração de
    // máquina, e nasce com uma chave (06/09/2026).
    settingsTitle: 'Aplicativo',
    autostartLabel: 'Abrir junto com o Windows',
    // **Diz onde o app abre e quando a chave vale** · quem liga isso precisa
    // saber que não vai ver janela (é na bandeja, de propósito), que não há
    // botão de salvar, e que o Gerenciador de Tarefas também manda aqui.
    autostartHint:
      'O GGClubs abre na bandeja quando você entra no Windows, sem janela, e os avisos chegam sem você abrir nada. Vale na hora e só neste computador · a aba Inicializar do Gerenciador de Tarefas também manda aqui.',
    // Chave desligada diz por quê · o shell não soube ler o registro.
    autostartUnavailable:
      'O Windows não respondeu se o GGClubs abre junto com ele. Dá pra conferir na aba Inicializar do Gerenciador de Tarefas.',
    autostartFailed:
      'Não deu pra mudar isso agora. Tente de novo · ou use a aba Inicializar do Gerenciador de Tarefas.',
    // A dica do ícone da bandeja enquanto há aviso não lido · sem aviso ela é
    // só o nome do produto, escrito no Rust.
    trayUnread_one: 'GGClubs · um aviso não lido',
    trayUnread_other: 'GGClubs · {{count}} avisos não lidos',

    // ------------------------------ o convite pro app, pra quem já está logado
    //
    // **Só onde o fato acontece** · na sala do confronto, quando a pessoa abre
    // e encontra mensagem que chegou com o navegador fechado (06/09/2026). O
    // aviso de conversa é o único que não sai por e-mail, e a bandeja do app é
    // quem alcança quem está longe da tela · é a única coisa que ela não tem.
    // Nada de modal nem faixa: a porta do produto é o login (29/07/2026). A
    // regra de quando aparece está em `lib/app-invite.ts`.
    //
    // O `_one` escreve a palavra, e o zero cai nele em pt-BR · quem chama já
    // garante `unread > 0`.
    inviteMissed_one: 'Chegou uma mensagem enquanto você estava fora.',
    inviteMissed_other: 'Chegaram {{count}} mensagens enquanto você estava fora.',
    // **Diz o que a pessoa não tem hoje**, numa frase só · a nota mora dentro
    // da lista de mensagens e cada linha dela empurra a conversa pra fora da
    // vista. O resto do argumento (o ícone na barra, abrir com o Windows) fica
    // na seção da conta, que tem espaço.
    inviteBody: 'Com o app, o aviso chega na bandeja do Windows mesmo com o navegador fechado.',
    // A seção "Aplicativo" de /app/conta, vista do navegador no Windows · é a
    // porta permanente pro app dentro do produto, no lugar onde a pessoa já
    // procura as coisas dela. No app instalado a mesma seção guarda a chave.
    accountPitch:
      'O GGClubs tem app pra Windows: o aviso chega na bandeja mesmo com o navegador fechado, e o ícone na barra de tarefas mostra quando tem mensagem esperando. Ele abre direto na bandeja e pode abrir junto com o Windows.',

    // ---------------------------------------------------------- o download
    //
    // **O app existia e ninguém do site sabia disso** · até 28/08/2026 a landing
    // não tinha uma linha sobre ele. Estas chaves são a porta, e a decisão que
    // as organiza é: **o app é conveniência, não é o produto**. Por isso ele não
    // compete com "criar conta" em lugar nenhum · quem chega pelo link de um
    // club precisa de conta, e não de instalador.
    // **A capa do `/download` diz o que o app FAZ**, e não o que ele é · estas
    // duas nasceram no card do app do hero (02/09/2026) e, quando ele saiu pra
    // dar lugar à chave desenhada, viraram o título da página de download.
    downloadPitchTitle: 'Não perca o jogo',
    downloadPitchBody:
      'Com o app instalado o aviso chega mesmo com o navegador fechado, direto da bandeja do Windows.',
    // O aviso de exemplo · desenhado na capa do download e na landing.
    noticeTitle: 'Seu próximo confronto foi definido',
    // **Nome de espaço reservado, e ele PARECE um** · a primeira versão usava
    // dois clubs de produção (a peça fabricava um aviso sobre gente de verdade),
    // e a segunda usava nomes inventados que passavam por reais. Decisão do
    // Eduardo: melhor que se leia como exemplo. Marca própria pode; club de
    // terceiro, nem real nem verossímil.
    noticeBody: 'Time 1 FC x Time 2 FC · Copa GGClubs',
    // Descreve a peça pra quem usa leitor de tela · sem isto ela anunciaria um
    // jogo que não existe como se fosse aviso de verdade.
    noticeAlt: 'Exemplo de um aviso do app, como ele aparece no Windows',
    // O bloco da edição em destaque, embaixo dos passos de instalação · o app
    // é o jeito de acompanhar, e isto é o que se acompanha.
    editionTitle: 'O que você vai acompanhar',
    downloadTitle: 'Leve o GGClubs pro seu PC',
    // **Diz o que o app ADICIONA**, e não o que ele é · "versão desktop" não
    // responde por que alguém instalaria. O aviso e a bandeja são o motivo real:
    // saber do jogo sem estar com o site aberto.
    downloadBody:
      'O app avisa dos seus jogos e das mensagens do confronto mesmo com o navegador fechado, e abre direto na bandeja do Windows.',
    downloadCta: 'Baixar para Windows',
    // O tamanho ao lado do botão é prática de mercado e reduz desistência ·
    // quem clica sabe o que vem. **O número sai do manifesto**, não daqui.
    downloadMeta: 'Windows 10 ou 11 · ~{{mb}} MB',
    // **Só o tamanho**, pro hero · lá o rótulo do botão já diz "para Windows",
    // e a linha ficava "Baixar para Windows · Windows 10 ou 11". Visto na captura.
    downloadSizeOnly: '~{{mb}} MB',
    // **Quem não é Windows ouve o que existe, em vez de a seção sumir** · seção
    // que desaparece faz o visitante concluir que o produto não tem app.
    downloadOtherDesktop:
      'Por enquanto o app é só pra Windows · no seu sistema o GGClubs roda no navegador, com tudo funcionando.',
    /**
     * **A saída pra quem vai levar o arquivo pra outro PC** · o rodapé já
     * reconhecia esse caso (*"quem está no Mac pode estar procurando pra
     * instalar no PC de casa"*), e a página não oferecia nada a ele desde que
     * o disparo automático passou a ser só do Windows.
     */
    downloadAnyway: 'Baixar o instalador do Windows mesmo assim',
    downloadMobile:
      'O app é de computador. No celular, o GGClubs roda no navegador · e dá pra adicionar à tela de início.',
    downloadLink: 'Baixar o app',

    // ------------------------------------------- a página de depois do clique
    //
    // **Ela existe porque a instalação é onde a pessoa some** · o download
    // começa, o Windows mostra um aviso de editor desconhecido, e quem não foi
    // avisado fecha. Preparar pra esse aviso ANTES dele aparecer é o que a
    // página faz de mais valioso.
    thanksTitle: 'O download começou',
    thanksBody: 'Se não começar sozinho em alguns segundos, <0>clique aqui</0>.',
    thanksStepsTitle: 'Como instalar',
    thanksStep1: 'Abra o arquivo <0>GGClubs-setup.exe</0> na sua pasta de downloads.',
    // **A frase que mais importa da página inteira.** Ela é literal de propósito
    // ("Mais informações" é o texto do botão do Windows) · instrução que não usa
    // a palavra da tela obriga a pessoa a traduzir sozinha, no momento em que
    // ela já está desconfiada.
    thanksStep2:
      'O Windows vai dizer que o editor é desconhecido · isso acontece porque o instalador ainda não tem certificado de assinatura. Clique em <0>Mais informações</0> e depois em <1>Executar assim mesmo</1>.',
    thanksStep3: 'Entre com a sua conta do GGClubs · o app usa a mesma.',
    thanksBackHome: 'Voltar pro início',
  },

  auth: {
    signUpTitle: 'Criar conta',
    signUpSubtitle: 'Leva um minuto. Depois você escolhe seu @nick.',
    signUpCta: 'Criar conta',
    signUpLoading: 'Criando conta...',
    // Só a ação vai em destaque · a pergunta é contexto. Com a linha inteira no
    // mesmo cinza, ninguém enxergava que ali havia o que clicar.
    signUpSwitch: 'Ainda não tem conta? <0>Criar agora</0>',
    signInSwitch: 'Já tem conta? <0>Entrar</0>',
    signUpHint: 'Use pelo menos {{min}} caracteres na senha.',
    passwordTooShort: 'A senha precisa ter pelo menos 8 caracteres.',
    passwordObvious: 'Essa senha é fácil demais de adivinhar. Escolha outra.',
    // O medidor orienta, não bloqueia · quem valida a senha é o Firebase.
    // "Comprida" e não "complicada": é o conselho que de fato funciona.
    passwordStrengthLabel: 'Força da senha:',
    passwordWeak: 'Fraca',
    passwordMedium: 'Média',
    passwordStrong: 'Forte',
    panelLine1: 'Seu club',
    panelLine2: 'em um só lugar',
    // **Não ataca o WhatsApp**, e isso é decisão dele em 08/08/2026: nós também
    // vamos usar grupo, pra captar e avisar de campeonato · a diferença é onde o
    // campeonato **acontece**. Esta frase sobreviveu à derrubada da anterior e
    // foi pega numa captura da landing.
    panelPitch: 'Inscreva o seu club, dispute premiação e leve o elenco junto.',
    // A marca já está no wordmark logo acima · repetir o nome aqui é ruído.
    signInTitle: 'Entrar',
    signInSubtitle: 'Bem-vindo de volta ao seu club.',
    forgotTitle: 'Recuperar senha',
    forgotSubtitle: 'Te mandamos um link por e-mail.',
    forgotHint: 'Informe seu e-mail e enviaremos um link pra criar uma nova senha.',
    emailLabel: 'E-mail',
    passwordLabel: 'Senha',
    forgotLink: 'Esqueci minha senha',
    showPassword: 'Mostrar senha',
    hidePassword: 'Ocultar senha',
    signInCta: 'Entrar',
    signInLoading: 'Entrando...',
    resetCta: 'Enviar link de recuperação',
    resetLoading: 'Enviando...',
    // **A frase não confirma que a conta existe**, e é de propósito · a rota
    // responde 200 exista ou não o endereço, e uma tela que dissesse "esse
    // e-mail não está cadastrado" viraria um verificador de quem tem conta aqui.
    // "Se existir conta" é o que a torna verdadeira nos dois casos.
    resetSent:
      'Se existir uma conta em {{email}}, o link de recuperação já está a caminho. Veja sua caixa de entrada.',
    backToSignIn: 'Voltar pro login',
    resetMissingEmail: 'Informe o e-mail da conta.',
    // Falha de rede, e só ela · a rota nunca reprova por causa do endereço.
    resetFailed: 'Não deu pra enviar agora. Tenta de novo?',
    googleCta: 'Entrar com Google',
    googleSignUpCta: 'Criar conta com Google',
    googleLoading: 'Aguardando o Google...',
    googleWaitingHint: 'O login continua na janela do Google. Fechou sem concluir?',
    googleCancel: 'Cancelar e voltar pro login',
    separator: 'ou',
  },

  upload: {
    choose: 'Escolher imagem',
    replace: 'Trocar imagem',
    remove: 'Remover',
    reading: 'Preparando...',
    hint: 'Qualquer imagem, até {{mb}} MB.',
    badType: 'Esse arquivo não é uma imagem.',
    badImage: 'Não deu pra abrir essa imagem. Escolhe outra?',
    tooBig: 'A imagem passa de {{mb}} MB. Escolha uma menor.',
    failed: 'Não deu pra enviar a imagem. Tenta de novo?',
  },

  club: {
    mine: 'Meus clubs',
    crestLabel: 'Escudo',
    mineEmptyTitle: 'Você ainda não tem club',
    mineEmptyBody: 'Crie o seu e compartilhe o link · é assim que os outros jogadores te acham.',
    create: 'Criar club',
    createTitle: 'Criar seu club',
    createSubtitle: 'Dá pra mudar tudo depois, menos a tag.',
    edit: 'Editar club',
    editTitle: 'Editar club',
    editSubtitle: 'A tag não muda · ela é o endereço público do club.',
    // O sujeito é a pessoa e o produto é este · a regra do EA FC explica o
    // porquê e entra depois, nunca no lugar do que a tela está dizendo.
    limitReached: 'Você já está nos seus {{count}} clubs. Pra entrar em outro, saia de um.',
    limitBlockedTitle: 'Sem vaga pra mais um club',
    slotJoin: 'Entre em mais um club',
    seeClub: 'Ver o club',
    ownerBlockedTitle: 'Você já responde por um club',
    // **"Responde" e não "tem"**, desde 03/09/2026 · quem barra a criação passou
    // a ser a liderança (dono **ou** gerente) e não a posse. Pro gerente, a saída
    // é outra: ele sai do club, e não passa nem encerra.
    ownerBlockedBody:
      'Cada conta responde por um club só. Pra criar outro, saia do {{clubName}} · e se você for o dono, passe ele pra alguém do elenco ou encerre antes.',
    tagLabel: 'Tag',
    // A tag vira o endereço · dizer isso na dica evita a pergunta e a troca.
    //
    // **Não citar a abreviação do EA FC aqui.** A copy dizia "como a abreviação
    // no EA FC" e estava errada: a do jogo são 3 caracteres, num campo à parte.
    // Citar o jogo é certo quando o fato é do jogo · este é nosso.
    tagHint: 'De {{min}} a {{max}} caracteres. É o endereço público do club e não muda depois.',
    tagInvalid: 'Só letras, números e hífen · sem espaço e sem acento.',
    tagTaken: 'Essa tag já foi levada. Tenta outra.',
    tagFree: 'Tag livre',
    tagChecking: 'Verificando...',
    nameLabel: 'Nome do club',
    nameHint: 'O nome que aparece na página e nas escalações.',
    bioLabel: 'Descrição (opcional)',
    bioHint: 'Uma frase sobre o club.',
    platformLabel: 'Onde o club joga',
    // Só pra leitor de tela, quando o selo aparece sem nome ao lado · o rótulo
    // acima é de club e estava sendo lido para player também.
    platformLabelPlayer: 'Onde o jogador joga',
    // A dica responde a pergunta que a pessoa faz DEPOIS de olhar, que é por
    // que o campo já veio preenchido · não é informação pra decidir.
    platformFromProfile: 'Já veio a plataforma do seu perfil. Troque se o club joga em outra.',
    platformPickHint:
      'Escolha onde o club joga. Se você definir sua plataforma no perfil, o próximo club já vem marcado.',
    platformClubHint: 'É a plataforma do club, que pode ser diferente da sua.',
    platformRequired: 'Escolha onde o club joga.',
    previewTitle: 'Prévia',
    previewName: 'Nome do club',
    previewHint: 'É assim que a página pública fica.',
    statMembers: 'Elenco',
    statPlatform: 'Plataforma',
    crossplayYes: 'Mesma geração',
    crossplayNo: 'Outra geração',
    // **"EA FC", sem o ano** · decisão do Eduardo em 07/08/2026. O produto não
    // se amarra à edição da temporada: a frase que hoje diz 26 estaria errada
    // no ano que vem, e texto de tela é o lugar mais caro pra isso envelhecer.
    crossplayHint:
      'No Clubs do EA FC só joga junto quem está na mesma geração. Este club é {{generation}}.',
    crossplayHintViewer:
      'Este club é {{generation}}. No Clubs do EA FC, só joga junto quem está na mesma geração da sua plataforma.',
    // **As duas do card da vitrine, e elas afirmam** · a de cima é neutra de
    // propósito (ela serve o dono do club também), e no card a cor é a única
    // coisa visível · quem chega no hover ou no leitor de tela precisa da
    // resposta, não da regra do jogo.
    crossplayYesHint:
      'Vocês podem jogar juntos · este club é {{generation}}, a mesma da sua plataforma.',
    crossplayNoHint:
      'Vocês não podem jogar juntos · este club é {{generation}}, e a sua plataforma é de outra.',
    statSinceHint:
      'Quando o club foi criado aqui no GGClubs. Não é a data em que ele nasceu no EA FC.',
    statSince: 'No GGClubs desde',
    saving: 'Salvando...',
    save: 'Salvar',
    saved: 'Salvo',
    creating: 'Criando...',
    copyLink: 'Copiar link',
    linkCopied: 'Link copiado',
    notFoundTitle: 'Club não encontrado',
    notFoundBody: 'O link que você seguiu está quebrado ou o club foi removido.',
    // O par do de cima, e a distinção é o ponto: este diz que a falha é nossa e
    // passa, aquele afirma que o club não existe. Trocar um pelo outro é mandar
    // embora quem chegou pelo link no exato momento em que a API tossiu.
    loadErrorTitle: 'Não deu pra carregar este club',
    // **Três desfechos diferentes, três frases.** A tela de configurar dizia
    // "club não encontrado" pros quatro casos, e no pior deles a pessoa estava
    // no elenco e ouvia que o link estava quebrado · ver a pendência 40.
    editNotManagedTitle: 'Você não gerencia este club',
    editNotManagedBody: 'Configurar é coisa de dono e de gerente. Você continua no elenco.',
    editNotMineTitle: 'Não dá pra configurar este club',
    editNotMineBody: 'Ou ele não existe, ou você não está no elenco dele.',
    editLoadErrorTitle: 'Não deu pra carregar este club',
    editLoadErrorBody: 'Pode ter sido a conexão. Nada foi alterado.',
    editSeeClub: 'Ver o club',
    // O par do "botão desligado diz por que está desligado" · ver pendência 41.
    saveNoChanges: 'Nada mudou ainda',
    // Voz de quem fala com o player, não rótulo de sistema · foi o que o
    // Eduardo apontou comparando com o cabeçalho do feed.
    pageSubtitle: 'Seu club, seu elenco e o link que você manda no grupo.',
    squadHint: 'Quem veste a camisa.',
    squadOne: 'um jogador',
    squadMany: '{{count}} jogadores',
    squadNone: 'sem elenco',
    favorite: 'Favorito',
    setFavorite: 'Tornar favorito',
    favoriteHint:
      'Seu club principal aqui no GGClubs. É ele que aparece primeiro na sua lista e representa você. Dá pra trocar quando quiser.',
    favoriteConfirmTitle: 'Trocar de favorito?',
    favoriteConfirmBody:
      '<0>{{club}}</0> passa a ser o seu club principal aqui, e o de agora deixa de ser. Você pode trocar de novo quando quiser.',
    favoriteConfirmFirstBody:
      '<0>{{club}}</0> passa a ser o seu club principal aqui. Você pode trocar quando quiser.',
    slotEmpty: 'Cabe mais um club',
    poolCurrent: 'Geração atual',
    poolLegacy: 'Geração anterior',
    poolSwitch2: 'Switch 2',
    poolSwitch1: 'Switch',
    poolHint: 'No Clubs, só joga junto quem está na mesma geração.',
    squadCountLong: 'Jogadores ativos no elenco',
    shareTitle: 'Chama a galera',
    shareBody: 'Manda esse link no grupo. Quem abrir vê o elenco inteiro sem precisar de conta.',
    copyFailed: 'Não deu pra copiar. Selecione o link e copie na mão.',
    tagLocked:
      'A tag é o endereço público do club e não muda · links já compartilhados continuariam apontando pro lugar errado.',
    yours: 'Seu club',
    youAreMember: 'Você joga aqui',
    you: 'você',
    discoverTitle: 'Clubs pra conhecer',
    // Diz o critério da lista sem soar relatório · quem lê entende a ordem e
    // ainda lê como placar. A primeira versão era o critério cru, e critério
    // cru em produto de jogo lê como painel de banco.
    discoverSubtitle: 'Os elencos mais cheios da rede.',
    searchPlaceholder: 'Buscar por nome ou tag',
    filterPool: 'Geração',
    filterAllPools: 'Todas as gerações',
    searchEmpty: 'Nenhum club com "{{term}}". Tenta outro nome ou a tag.',
    // **Falha e ausência são coisas diferentes** · pendência 170. Até 02/09/2026
    // a API fora do ar virava "ninguém aqui ainda" nas duas vitrines.
    discoverFailed: 'Não deu pra carregar os clubs agora. Pode ser a sua conexão.',
    discoverEmpty:
      'Ainda não há outros clubs por aqui. O seu pode ser o primeiro que alguém encontra.',
    loadMore: 'Mostrar mais',
    configure: 'Configurar',
    ctaTitleAccent: 'Seu nome',
    ctaTitle: 'nesse elenco',
    ctaBody:
      'Crie seu perfil de jogador, monte seu club e tenha uma página assim pra chamar de sua. É de graça.',
    squad: 'Elenco',
    squadEmpty: 'Este club ainda não tem elenco.',

    // Entrar num club. O sujeito é sempre a pessoa aqui no GGClubs · nada de
    // explicar regra do EA FC numa ação que é nossa.
    joinAction: 'Pedir pra entrar',
    joinSending: 'Enviando...',
    joinPending: 'Pedido enviado',
    joinCancel: 'Retirar',
    // "Quem pediu" e não "solicitações": a fila é de gente, não de papéis.
    requests: '{{count}} quer entrar',
    requests_one: 'Um quer entrar',
    requests_other: '{{count}} querem entrar',
    requestsHint: 'Aprovar põe a pessoa no elenco na hora.',
    requestApprove: 'Aceitar',
    requestReject: 'Recusar',

    // Convite · o club chama, e quem decide é quem foi chamado.
    invite: 'Chamar alguém',
    inviteHint: 'O convite só entra no elenco quando a pessoa aceitar.',
    // Diz os dois jeitos de procurar · o campo dizia só "nick do player" e
    // continuou dizendo depois de passar a casar nome também, então ele
    // escondia metade do que sabe fazer.
    invitePlaceholder: 'Procure pelo nome ou @nick',
    inviteAction: 'Convidar',
    inviteSending: 'Convidando...',
    inviteWaiting: 'Aguardando',
    inviteCancel: 'Desistir',
    // Sugestão do campo de convite · os quatro últimos são o motivo de um
    // resultado aparecer desligado, e existem porque controle inerte sem
    // explicação lê como tela quebrada.
    inviteNeedsPick: 'Escolha alguém da lista pra convidar.',
    playerSearchLoading: 'Procurando...',
    playerSearchMore: 'Tem mais gente · escreva um pouco mais pra afinar',
    playerSearchClear: 'Trocar de jogador',
    playerSearchEmpty: 'Ninguém com esse nome ou nick',
    playerSearchMember: 'já está no elenco',
    playerSearchInvited: 'já convidado',
    playerSearchRequested: 'pediu pra entrar',
    playerSearchNoRoom: 'sem vaga',
    myInvites: '{{count}} club te chamou',
    myInvites_one: 'Um club te chamou',
    myInvites_other: '{{count}} clubs te chamaram',
    myInvitesHint: 'Aceitar ocupa uma das suas vagas.',
    // Na página do club, o convite é o que importa naquele momento · quem foi
    // chamado via "Pedir pra entrar" e não via que já tinha sido convidado.
    inviteHere: 'Este club te chamou',
    inviteAccept: 'Aceitar',
    inviteDecline: 'Recusar',

    // Passar o club · a palavra é "passar", não "transferir": transferir é
    // vocabulário de banco, e o que acontece aqui é alguém entregando o time
    // pra outra pessoa. A dica diz a consequência, porque ela não é óbvia:
    // quem aceita vira dono e quem passou continua no elenco, como gerente.
    // **Sem substantivo pro que se passa.** Dizia "te passar a liderança", e
    // "liderança" era uma terceira palavra pra coisa que o menu chama de passar
    // o club e o botão chama de assumir · o verbo sozinho resolve. Ver o
    // glossário em `docs/i18n.md`.
    ownershipOffers: '{{count}} club quer que você assuma',
    ownershipOffers_one: 'Um club quer que você assuma',
    ownershipOffers_other: '{{count}} clubs querem que você assuma',
    ownershipOffersHint: 'Aceitar põe o club no seu nome. Quem passou continua no elenco.',
    ownershipAccept: 'Assumir o club',
    ownershipDecline: 'Recusar',
    ownershipOffer: 'Passar o club',
    // **O que a transferência de posse leva junto** · 18/08/2026.
    //
    // Campeonato é do dono: inscrever, pagar, cancelar e lançar placar. Quem
    // passa o club passa isso junto, e as duas pontas precisam ler o nome da
    // edição antes de decidir · sem isso quem deu descobre ao não conseguir
    // mais lançar o placar do jogo que acabou de jogar.
    //
    // **O plural muda o verbo**, então as duas formas existem · "está inscrito
    // em" contra "está inscrito em" com lista. O `_one` é o caso comum.
    tieGiving_one:
      'O club está inscrito em {{names}}. Quem assumir passa a responder por ele lá: inscrever, pagar, cancelar e lançar placar.',
    tieGiving_other:
      'O club está inscrito em {{count}} campeonatos ({{names}}). Quem assumir passa a responder por ele neles: inscrever, pagar, cancelar e lançar placar.',
    tieTaking_one:
      'Assumindo, você passa a responder pelo club em {{names}} · é você que vai inscrever, pagar, cancelar e lançar placar.',
    tieTaking_other:
      'Assumindo, você passa a responder pelo club em {{count}} campeonatos ({{names}}) · é você que vai inscrever, pagar, cancelar e lançar placar.',
    // **Largar a gerência, e o sujeito é quem larga** · não há sucessor aqui,
    // então "quem assumir passa a responder" seria falso · ver o `stepping`.
    tieStepping_one:
      'O club está inscrito em {{names}}. Largando a gerência você para de inscrever, pagar, cancelar e lançar placar por ele lá · quem continua respondendo é o dono.',
    tieStepping_other:
      'O club está inscrito em {{count}} campeonatos ({{names}}). Largando a gerência você para de inscrever, pagar, cancelar e lançar placar por ele neles · quem continua respondendo é o dono.',
    tiePending:
      'Uma das vagas está reservada com pagamento em aberto, e o prazo continua correndo.',
    // O terceiro lado do mesmo aviso · encerrar o club. Aqui ele **não é só
    // aviso**: as duas primeiras frases são recusa, e a terceira é o que vai
    // acontecer. Ver `TournamentTieNote`.
    tieClosingDrawn_one:
      'Não dá pra encerrar agora: o club está numa edição já sorteada ({{names}}). Sair dela deixaria as partidas dos outros sem adversário · fale com a organização.',
    tieClosingDrawn_other:
      'Não dá pra encerrar agora: o club está em {{count}} edições já sorteadas ({{names}}). Sair delas deixaria as partidas dos outros sem adversário · fale com a organização.',
    tieClosingPaid:
      'Não dá pra encerrar agora: o club tem inscrição paga em {{names}}. Fale com a organização pra sair da edição antes.',
    tieClosing_one:
      'Encerrar o club tira ele de {{names}} e devolve a vaga pra edição. Isso não tem volta.',
    tieClosing_other:
      'Encerrar o club tira ele de {{count}} campeonatos ({{names}}) e devolve as vagas pras edições. Isso não tem volta.',
    ownershipOfferTitle: 'Passar o club pra <0>{{name}}</0>?',
    ownershipOfferBody:
      'Ele precisa aceitar. Enquanto isso o club continua seu, e você pode desistir a qualquer momento.',
    // **O que a pessoa vira depois de passar, e o que isso custa** · 03/09/2026,
    // pendência 186.
    //
    // Quem passa a posse vira **gerente do mesmo club**, e gerente é liderança ·
    // então a conta continua ocupada e criar outro club continua recusado. A
    // pessoa descobria isso no erro, um clique depois, sem nada na tela ter
    // avisado. A frase diz a saída junto, porque ela agora existe.
    ownershipOfferLeadNote:
      'Você continua no elenco como gerente, e gerente também ocupa a sua vaga de liderança · pra abrir outro club depois, largue a gerência aqui também.',
    // O título do aviso **na página do club** · o par do `inviteHere`, e a
    // razão de existir é a mesma: a oferta vivia só em `/app/clubs`, então quem
    // abrisse o club não via a decisão mais importante daquele momento.
    ownershipHere: 'Este club quer que você assuma',
    ownershipCancel: 'Desistir de passar',
    // A forma curta é da **faixa dentro do card**, onde ela divide uma linha de
    // ~264px a 320px com o rótulo ao lado · a longa continua no menu `⋮`, que
    // tem a linha inteira. Mesmo padrão de `landing.signIn` contra
    // `auth.signInTitle`, e o motivo está em `docs/i18n.md`.
    ownershipCancelShort: 'Desistir',
    // **Diz o que está esperando, não que está esperando.** "Esperando
    // resposta" some no meio de uma tela que também tem convite aguardando ·
    // apontado pelo Eduardo olhando a captura. O verbo casa com o
    // "Assumir o club" que a outra ponta mostra.
    ownershipWaiting: 'Convidado a assumir',
    // **A oferta de gerência, um degrau abaixo da de posse** · 03/09/2026,
    // pendência 185. Mesma forma de propósito: pra quem lê, as duas são "um
    // club está esperando você", e a diferença é o que se aceita.
    //
    // O plural muda o verbo, como no da posse · as três formas existem por isso.
    managerOffers: '{{count}} club quer você como gerente',
    managerOffers_one: 'Um club quer você como gerente',
    managerOffers_other: '{{count}} clubs querem você como gerente',
    // **A dica diz o que o cargo CUSTA**, e não só o que ele dá · a vaga de
    // liderança é uma só por conta, e quem não sabe disso aceita sem saber o
    // que está gastando.
    managerOffersHint:
      'Gerente inscreve o club em campeonatos, paga, cancela e lança placar. O cargo ocupa a sua vaga de liderança: enquanto for gerente, você não abre nem lidera outro club.',
    managerAccept: 'Aceitar a gerência',
    managerDecline: 'Recusar',
    // Verbo igual ao "Convidado a assumir" ao lado · as duas faixas dizem o
    // mesmo tipo de coisa e não podem ler como coisas diferentes.
    managerWaiting: 'Convidado a ser gerente',
    // O título do convite **na página do club** · o par do `ownershipHere`, e a
    // razão de existir é a mesma: o e-mail e o sininho apontam pra cá.
    managerHere: 'Este club quer você como gerente',
    // O item de menu de quem ofereceu · é o mesmo `role: 'member'` que rebaixa,
    // e o rótulo muda porque o que a pessoa desfaz é outro.
    managerOfferCancel: 'Desistir do convite',
    positionSet: 'Definir posição',
    positionTitle: 'Onde <0>{{name}}</0> joga?',
    positionTitleSelf: 'Onde você joga neste club?',
    // "Sem posição" é uma **opção**, não uma ação · ela vive na grade junto das
    // doze, e não como botão no rodapé disputando com o Cancelar.
    positionClear: 'Sem posição',
    positionApply: 'Usar esta posição',
    positionUnchanged: 'É a posição atual',
    deleteTitle: 'Encerrar o club',
    deleteBody: 'O club sai do ar e a tag fica reservada · o link antigo não vira outro club.',
    deleteBodyWithSquad:
      'Tem gente no elenco. Se você só quer sair, passe o club pra alguém antes de encerrar.',
    deleteAction: 'Encerrar club',
    deleteConfirmTitle: 'Encerrar de vez?',
    // **As duas formas, e não uma com `{{count}}` no meio** · com um membro só
    // a janela dizia "Os 1 jogadores saem do elenco", visto na captura de
    // 19/08/2026. É a armadilha de plural que o `docs/i18n.md` registra, e ela
    // sobreviveu aqui porque o club de teste tinha três pessoas.
    deleteConfirmBody_one:
      'Isto não tem desfazer. O jogador sai do elenco e a página pública deixa de existir.',
    deleteConfirmBody_other:
      'Isto não tem desfazer. Os {{count}} jogadores saem do elenco e a página pública deixa de existir.',
    deleteConfirmPhrase: 'Digite <0>{{tag}}</0> pra confirmar',

    // Sair do club · o nome da ação é o mesmo do gatilho até o fim, e a
    // janela diz o que ela custa em vez de perguntar "tem certeza?".
    leaveAction: 'Sair do club',
    manageMember: 'Gerenciar jogador',
    makeCaptain: 'Tornar capitão',
    clearCaptain: 'Tirar a braçadeira',
    // **"Convidar" e não "Promover" desde 03/09/2026** · a ação não muda papel
    // nenhum, ela manda um convite · o verbo do gatilho tem que bater com o que
    // acontece, senão quem clica lê a linha do elenco sem mudança e conclui que
    // o clique falhou.
    promote: 'Convidar a gerente',
    demote: 'Rebaixar a membro',
    removeMember: 'Tirar do elenco',
    removeConfirmTitle: 'Tirar do elenco?',
    removeConfirmBody:
      '<0>{{name}}</0> sai do elenco e a vaga fica livre. Ele pode pedir pra voltar depois.',
    // Todo club nasce sem capitão · o estado que mais aparece convida em vez
    // de ficar em silêncio.
    noCaptainHint: 'Este club ainda não tem capitão. Escolha um no menu de um jogador.',
    leaveConfirmTitle: 'Sair do club?',
    leaveConfirmBody:
      'Você sai do elenco do <0>{{name}}</0> e a vaga fica livre. Pra voltar, vai precisar pedir de novo e alguém aprovar.',
    // **Largar a gerência sem sair** · a saída menor, e a janela diz as duas
    // coisas que a pessoa precisa saber pra escolher entre as duas: o que ela
    // continua tendo (o elenco) e o que ela ganha (a vaga de liderança).
    stepDownAction: 'Largar a gerência',
    stepDownConfirmTitle: 'Largar a gerência?',
    stepDownConfirmBody:
      'Você continua no elenco do <0>{{name}}</0> como membro, e para de inscrever, pagar e lançar placar por ele. A sua vaga de liderança fica livre pra abrir ou assumir outro club · o dono pode te promover de novo depois.',
    roleOwner: 'Dono',
    roleManager: 'Gerente',
    roleCaptain: 'Capitão',
    roleMember: 'Membro',
    viewProfile: 'Ver perfil',
  },

  // A página de um jogador · a ponta que faltava no elenco. O termo de tela é
  // **jogador** em português e **jugador** em espanhol desde 11/08/2026 · o
  // `player` continua sendo o nome no código, como o `handle` que na tela é nick.
  player: {
    clubs: 'Clubs',
    // O selo que muda o que o visitante faz com a página · por isso ele mora na
    // identidade, e não numa seção abaixo da dobra.
    lookingForClub: 'Procurando club',
    // **A forma curta e a do CARD** · com icone ao lado, a palavra inteira era a
    // peca mais longa do rodape e empurrava o resto. A longa segue viva na
    // pagina do player, onde ha a linha toda. Pedido do Eduardo em 09/08/2026.
    lookingForClubShort: 'Procura club',
    // **A comparação, não o dado** · a tela não diz "geração legada", diz que
    // vocês dois **não** cabem no mesmo club. Quem lê quer decidir se chama, não
    // aprender a tabela de crossplay do EA FC.
    //
    // **E marca a exceção**: o par positivo ("joga com você") existiu por uma
    // hora e caiu na captura · aparecia em quase todo card, porque a geração
    // atual é a maioria da base.
    otherGeneration: 'Outra geração',
    otherGenerationHint: 'Vocês não podem jogar juntos · ele é de outra geração do EA FC.',
    // O par afirmativo do de cima · desde 10/08/2026 o selo de plataforma tem
    // **três** estados, e o "sim" precisava de frase própria pro hover e pro
    // leitor de tela. Sem ela, a cor seria a única portadora da informação.
    sameGenerationHint: 'Vocês podem jogar juntos · é a mesma geração do EA FC.',
    atCapHint: 'Está em 3 clubs, que é o máximo · não dá pra convidar.',
    // **O convite mora na página da pessoa desde 08/08/2026** · antes a página
    // dizia que ela procurava club e não oferecia verbo nenhum.
    invite: 'Chamar pro club',
    // Com um club só o botão diz **qual** · botão que não diz pra onde chama é
    // o tipo que a pessoa aperta e se arrepende.
    inviteTo: 'Chamar pro {{club}}',
    inviteSentTo: 'Convite enviado pro {{club}}',
    alreadyMemberOf: 'Já joga no {{club}}',
    askedToJoin: 'Pediu pra entrar no {{club}}',
    inviteNoRoom: 'Sem vaga',
    inviteNoRoomHint: 'Este jogador já está em 3 clubs, que é o máximo.',
    // **O nome do club quando é um, a contagem quando é mais** · "joga com você
    // em 2 clubs" sem dizer quais é meia informação, e por isso os nomes vão no
    // `title`. Dividir mais de um club ao mesmo tempo é caso real, e a ressalva
    // é do Eduardo. Isto é do **card** da vitrine, que não lista os clubs.
    sharedClubs: 'Com você em {{count}} clubs',
    // O mesmo fato **na página do player**, onde o nome do club já está na
    // linha · aqui a frase só precisa dizer a relação. A chave que existia pra
    // isto ("com você no {{name}}") nunca teve chamador e saiu junto.
    sharedClubHere: 'Com você',
    // A estrela do favorito **na página de outra pessoa** · lá o `primaryClub`
    // era a palavra dentro de um selo, e aqui a frase inteira mora no hover e no
    // rótulo acessível, porque o glifo sozinho não diz de quem é o favorito.
    primaryClubHint: 'O club principal deste jogador',
    thisIsYou: 'Este é você',
    editMine: 'Editar perfil',
    statClubs: 'Clubs',
    statSinceHint: 'Quando esta conta foi criada aqui no GGClubs.',
    statPlatform: 'Plataforma',
    // "No GGClubs desde" e não "desde" · a distinção é a mesma do club, e existe
    // porque não lemos nada da EA. Insinuar que a data é de lá seria prometer
    // integração que não existe.
    statSince: 'No GGClubs desde',

    // A vitrine de players · a aba que lista gente.
    directoryTitle: 'Jogadores',
    directorySubtitle: 'Quem está no GGClubs, e quem está procurando club.',
    searchLabel: 'Buscar por nome ou @nick',
    searchPlaceholder: 'Nome ou @nick',
    filterLooking: 'Só quem procura club',
    filterPosition: 'Posição',
    // **Geração e não plataforma** · é ela que decide quem joga junto no Clubs.
    filterPool: 'Geração',
    filterAll: 'Todas',
    // **A chave do club em comum** · pedido do Eduardo em 10/08/2026, e a
    // palavra é a dele. Ela é o par do selo verde que o card já mostrava: a tela
    // sabia apontar quem divide club com você e não sabia listar só eles.
    filterShared: 'Só quem joga com você',
    // **O vazio dela precisa valer nos dois casos** · quem não está em club
    // nenhum e quem está mas não tem mais ninguém que sobreviva aos outros
    // filtros. Dizer "você não tem club" seria falso pro segundo, e "tire um
    // filtro" não explica o primeiro · a frase que serve aos dois é a que
    // descreve o que a chave faz.
    filterSharedEmpty:
      'Com essa chave só aparece quem está num club seu. Desligue pra ver o resto.',
    // **Falha e ausência são coisas diferentes** · pendência 170.
    directoryFailed: 'Não deu pra carregar os players agora. Pode ser a sua conexão.',
    directoryEmpty: 'Ninguém por aqui com esses filtros.',
    directoryEmptyHint: 'Tire um filtro ou procure por outro nome.',
    directoryMore: 'Ver mais jogadores',
    // A forma curta do CARD · a longa continua no `title` e na pagina.
    inClubsShort_one: 'um club',
    inClubsShort_other: '{{count}} clubs',
    inClubs_one: 'em um club',
    inClubs_other: 'em {{count}} clubs',
    noClub: 'Sem club',
    // Estado normal de quem acabou de criar conta, não erro · a frase não
    // lamenta nem convida, porque quem lê é um visitante e não o dono do perfil.
    clubsEmpty: 'Ainda não joga em nenhum club.',
    notFoundTitle: 'Jogador não encontrado',
    // O par do de baixo, e a distinção é a mesma do club: este afirma que o
    // endereço não existe, aquele diz que a falha é nossa e passa.
    notFoundBody: 'O link que você seguiu está quebrado ou esse @nick não existe.',
    loadErrorTitle: 'Não deu pra carregar este jogador',
    // **Não fala do leitor, fala do produto** · a página do club diz "Seu nome
    // nesse elenco" e as duas aparecem pro mesmo visitante em sequência, então
    // duas promessas sobre **ele** competiam. Apontado pelo Eduardo em
    // 08/08/2026, e a do club fica porque ela é a mais específica das duas.
    ctaTitleAccent: 'Jogue com',
    ctaTitle: 'gente de verdade',
    ctaBody: 'Crie sua página, diga onde você joga e entre num club. É de graça.',
    // Sem pronome de propósito · "os clubs onde ele joga" atribui gênero a quem
    // nunca disse o dele.
    seoDescription: 'Perfil de {{name}} no GGClubs · plataforma, posição e os clubs.',
  },

  // A sigla da posição é traduzida porque **o jogo traduz**: quem joga em
  // português vê VOL e MEI, não CDM e CAM. O valor gravado continua sendo o
  // inglês do enum (`playerPosition`, em packages/schemas) · aqui é só tela.
  // Um teste trava enum e catálogo juntos, senão posição nova entra e some da
  // interface sem nada avisar.
  // As linhas do campo são **frase, não sigla**, e por isso moram fora do grupo
  // `position` · lá dentro o teste de paridade exige que toda chave seja um
  // valor do enum, e ele quebrou na hora em que este bloco entrou junto.
  footer: {
    // **Voltou a ser "Produto" em 06/09/2026.** A coluna se chamou "Conta"
    // enquanto só listava entrar e criar conta · o comentário de então dizia
    // que ela voltaria a ser de produto no dia em que houvesse campeonato pra
    // listar, e o campeonato entrou sem que o título andasse junto. Hoje ela
    // lista campeonatos, novidades e o app, além da conta.
    product: 'Produto',
    legal: 'Legal',
    tagline: 'Campeonatos de Pro Clubs no EA FC, organizados de ponta a ponta.',
  },

  unsubscribe: {
    title: 'Parar de receber e-mail?',
    body: 'Você deixa de receber aviso por e-mail do GGClubs. Os avisos dentro do produto continuam, no sininho.',
    confirm: 'Parar de receber',
    doneTitle: 'Pronto, não mandamos mais',
    // **A pergunta que a página existe pra responder** · quem sai pelo botão do
    // cliente de e-mail não tem quem lhe conte que dá pra voltar. Até a
    // pendência 118 esta frase mandava pras configurações da conta, que exigem
    // login · ela contava o caminho de volta e não deixava percorrer.
    doneBody: 'Mudou de ideia? Dá pra voltar a receber por aqui mesmo, sem entrar na conta.',
    resumeCta: 'Voltar a receber',
    resumedTitle: 'Pronto, você voltou a receber',
    resumedBody:
      'Os avisos importantes voltam pro seu e-mail. Dá pra parar de novo por este mesmo link.',
    resumeFailed: 'Não deu pra religar agora. Tenta de novo?',
    homeCta: 'Voltar pro início',
    failed: 'Não deu pra desligar agora. Tenta de novo?',
    retry: 'Tentar de novo',
  },
  resetPassword: {
    title: 'Criar uma senha nova',
    // O endereço aparece porque quem tem duas contas precisa saber qual delas
    // está mudando de senha **antes** de escolher uma.
    forAccount: 'Para a conta {{email}}.',
    newPasswordLabel: 'Senha nova',
    submit: 'Salvar a senha nova',
    saving: 'Salvando...',
    doneTitle: 'Senha trocada',
    doneBody: 'Pronto. Agora é só entrar com ela.',
    signInCta: 'Entrar',
    // **Um desfecho só pros três casos** (vencido, já usado, inventado) · pra
    // quem está aqui os três significam a mesma coisa, e distinguir só ensinaria
    // alguém testando código alheio.
    invalidTitle: 'Este link não vale mais',
    invalidBody:
      'Links de senha valem por pouco tempo e só funcionam uma vez. Peça outro e a gente manda na hora.',
    askAgain: 'Pedir outro link',
    homeCta: 'Voltar pro início',
  },
  /**
   * As novidades · a página que lê `docs/novidades.*.md`. O texto de cada
   * entrada mora no markdown, e aqui fica só a moldura.
   */
  markdown: {
    table: 'Tabela do documento',
    write: 'Escrever',
    preview: 'Prévia',
    formatting: 'Formatação do texto',
    heading: 'Título',
    bold: 'Negrito',
    italic: 'Itálico',
    list: 'Lista',
    ordered: 'Lista numerada',
    quote: 'Destaque',
    link: 'Link',
    sampleText: 'Texto',
    emptyPreview: 'Escreva um texto para ver como ele vai aparecer.',
    hint: 'Aceita títulos, negrito, itálico, listas, destaques, tabelas e links. A prévia mostra como o texto será publicado.',
    limitReached: 'Não há espaço para essa formatação. Reduza o texto e tente novamente.',
  },
  changelog: {
    title: 'Novidades',
    subtitle: 'O que mudou no GGClubs, do mais recente pro mais antigo.',
    newBadge: 'Novo',
    // **O zero nunca chega aqui** · a página só desenha a frase com contagem
    // acima de zero, porque em pt-BR o zero cai no `_one` (ver `docs/i18n.md`).
    unread_one: 'Uma novidade desde a sua última visita.',
    unread_other: '{{count}} novidades desde a sua última visita.',
    // Só pra leitor de tela · o ponto verde do menu é desenho e não fala.
    unreadHint: 'há novidades',
  },

  legal: {
    documents: 'Documentos do GGClubs',
    termsTitle: 'Termos de uso',
    privacyTitle: 'Política de privacidade',
    refundTitle: 'Política de reembolso',
    subtitle: 'Toda versão publicada fica no ar · a antiga não some quando entra uma nova.',
    emptyTitle: 'Ainda não publicamos este documento',
    emptyBody: 'Quando ele existir, todas as versões vão ficar listadas aqui.',
    history: 'Versões',
    versionLabel: 'Versão {{version}}',
    publishedOn: 'Versão {{version}} · publicada em {{date}}',
    // Diz **quais** versões estão na tela · "ver mudanças" sozinho não responde
    // com o que se compara, e comparar virava adivinhação.
    compareWith: 'Ver o que mudou desde a versão {{from}}',
    comparingTitle: 'Comparando a versão {{to}} com a versão {{from}}',
    comparingBody: '{{added}} trecho(s) novo(s) e {{removed}} removido(s).',
    backToText: 'Voltar ao texto',
    markAdded: 'Entrou nesta versão',
    markRemoved: 'Saiu nesta versão',
    currentHint: 'A versão mais recente é a que vale hoje.',
  },

  positionLine: {
    goalkeeper: 'Gol',
    defense: 'Defesa',
    midfield: 'Meio',
    attack: 'Ataque',
  },

  position: {
    GK: 'GOL',
    CB: 'ZAG',
    LB: 'LE',
    RB: 'LD',
    CDM: 'VOL',
    CM: 'MC',
    CAM: 'MEI',
    LM: 'ME',
    RM: 'MD',
    LW: 'PE',
    RW: 'PD',
    ST: 'ATA',
  },

  /**
   * O sufixo da formação · `4-3-3 Conservador`, `4-2-3-1 Aberto`.
   *
   * **É a palavra que o EA FC 26 usa**, lida pelo Eduardo na tela de tática do
   * modo Clubs em 04/08/2026. Antes disso o catálogo trazia o termo em inglês
   * (`Holding`, `Wide`) de propósito, porque inventar "Contenção" criaria uma
   * convenção que não existe pro jogador · foi o erro das siglas de posição.
   *
   * **O jogo escreve em caixa alta e aqui vai em caixa normal**, porque lá é
   * estilo da interface e não a palavra: no `docs/design.md` a caixa alta é do
   * display (hero, placar, nome de time), e opção de lista em caixa alta grita.
   */
  formationVariant: {
    narrow: 'Fechado',
    wide: 'Aberto',
    flat: 'Em linha',
    holding: 'Conservador',
    attack: 'Ofensivo',
    defend: 'Defensivo',
    midfield: 'Meio-campo',
  },

  tactic: {
    title: 'Escalação',
    // **Quem mudou não é dito, e é decisão** · a frase é sobre o que fazer
    // agora, e o nome de quem gravou não muda a escolha de quem lê. Num club
    // com dois gerentes, ele ainda soaria como acusação.
    changedElsewhere: 'A escalação mudou enquanto você montava a sua.',
    loadChanged: 'Ver a nova',
    hint: 'O time que vocês combinaram antes de entrar no lobby.',
    formation: 'Formação',
    // Agrupa as 29 formações pela linha de trás · quem monta time pensa
    // primeiro em quantos zagueiros vai jogar.
    backLine: 'Com {{count}} zagueiros',
    // O diálogo tem dois estados: a formação que o club joga hoje e a que
    // você está olhando. Sem nomear as duas, escolher na lista parecia ter
    // aplicado.
    formationCurrent: 'Atual',
    formationApply: 'Usar esta formação',
    formationUnchanged: 'É a formação atual',
    bench: 'Fora da escalação',
    benchEmpty: 'Todo mundo do elenco está escalado.',
    pick: 'Toque em quem entra nesse slot',
    clear: 'Tirar do slot',
    save: 'Salvar escalação',
    unsaved: 'Você tem mudanças não salvas.',
    // O par do `unsaved` · o botão de salvar nasce desligado, e controle inerte
    // sem explicação lê como tela quebrada. Mesma regra do "É a posição atual"
    // no diálogo de posição.
    nothingChanged: 'Nada mudou ainda.',
    // O rótulo da lista **enquanto** alguém é arrastado do campo pra cá · sem
    // ele a zona acende sem dizer o que vai acontecer ao soltar.
    dropToBench: 'Solte pra tirar do time',
    // O selo ao lado do rótulo da formação · a forma curta do `unsaved`, que
    // continua sendo a frase ao lado do botão.
    notSaved: 'Não salvo',
    slotEmpty: 'Slot vazio',
    // A EA rotula o encaixe do player na posição em quatro níveis, e o pior
    // deles se chama "Bad Fit · Out of Position". Usar o vocabulário do jogo
    // em vez de inventar o nosso · o jogador já leu isso no lobby.
    outOfPosition: 'Fora da posição',
    // As duas siglas ganham peso, e **não** cor: a frase é um contraste entre
    // dois valores, e verde marca um · marcar os dois gasta o acento duas vezes
    // e ainda não mostra a oposição, que quem carrega é o "é X, está como Y".
    // E aqui verde diria a coisa errada · isto é aviso, e foi justamente por
    // parecer erro que o selo saiu do vermelho.
    outOfPositionHint: '{{player}} é <0>{{position}}</0> e está escalado como <1>{{slot}}</1>.',
    countPlaced: '{{count}} de {{total}} escalados',
  },

  onboarding: {
    signedInAs: 'Entrando como <0>{{email}}</0>',
    notYou: 'Não é você? Sair',
    // Os dois campos opcionais do cadastro dizem "(opcional)", e cada um por um
    // motivo diferente: aqui porque o seletor limpa por **clique repetido**, que
    // não se descobre olhando · lá porque nada nasce marcado.
    platformOptional: 'Onde você joga (opcional)',
    // A posição perdeu o "(opcional)" em 07/08/2026 e **recuperou no mesmo
    // dia**, e a ida e a volta ensinam a mesma coisa: a palavra saiu porque o
    // chip "Sem posição" nascia marcado e dizia aquilo sozinho. Quando o chip
    // parou de nascer marcado (formulário em branco não afirma escolha), o
    // argumento caiu junto e o rótulo voltou a ser o único sinal.
    lookingForClubHint:
      'Você entra na vitrine de jogadores como quem está disponível. Dá pra mudar depois.',
    positionOptional: 'Sua posição (opcional)',
    title: 'Falta só o seu nome no elenco',
    subtitle: 'É assim que os outros Clubs vão te encontrar.',
    // "handle" é jargão de produto · o jogador chama de nick. O @ continua
    // visível pra deixar claro que é endereço público, não apelido trocável.
    handleLabel: 'Seu nick',
    handleHint: 'É o endereço público do seu perfil. Letras, números e hífen.',
    handleTaken: 'Esse nick já foi levado. Tenta outro.',
    handleFree: 'Nick livre',
    handleChecking: 'Verificando...',
    nameLabel: 'Seu nome',
    nameHint: 'O nome que aparece no seu card e nas escalações.',
    cta: 'Criar minha conta',
    loading: 'Criando sua conta...',
  },

  authErrors: {
    invalidCredential: 'E-mail ou senha incorretos.',
    wrongPassword: 'Senha incorreta.',
    userNotFound: 'Não encontramos uma conta com esse e-mail.',
    userDisabled: 'Esta conta foi desativada. Fale com o administrador.',
    invalidEmail: 'E-mail inválido.',
    missingPassword: 'Informe a senha.',
    missingEmail: 'Informe o e-mail.',
    // Mesma voz do `errors.RATE_LIMITED`, que fala da mesma situação · esta
    // dizia "Aguarde alguns minutos e tente de novo", em imperativo formal, e
    // era a única frase de recusa do produto falando assim.
    tooManyRequests: 'Muitas tentativas em pouco tempo. Tenta de novo daqui a pouco.',
    networkFailed: 'Falha de rede. Verifique sua conexão e tente de novo.',
    internal: 'Erro temporário no servidor. Tente novamente em instantes.',
    emailInUse: 'Este e-mail já está em uso.',
    weakPassword: 'Senha muito fraca. Use ao menos 8 caracteres.',
    passwordPolicy:
      'Esta senha não atende à política de segurança. Escolha uma mais longa · se for uma conta antiga, redefina em Esqueci minha senha.',
    operationNotAllowed: 'Operação indisponível no momento. Fale com o administrador.',
    expiredActionCode: 'O link de recuperação expirou. Solicite um novo.',
    invalidActionCode: 'O link de recuperação é inválido ou já foi usado.',
    sessionExpired: 'Sessão expirada. Faça login novamente.',
    sessionRevoked: 'Sessão revogada. Faça login novamente.',
    requiresRecentLogin: 'Por segurança, faça login novamente antes de continuar.',
    invalidVerificationCode: 'Código de verificação inválido.',
    invalidVerificationId: 'Verificação inválida. Tente novamente.',
    popupBlocked:
      'Seu navegador bloqueou a janela do Google. Libere popups deste site e tente de novo.',
    unauthorizedDomain: 'Este endereço não está autorizado a fazer login com Google.',
    generic: 'Não conseguimos completar a ação. Tente novamente em instantes.',
    browserFailed: 'Não conseguimos abrir seu navegador. Verifique se há um instalado.',
  },

  /**
   * A tela de quem foi suspenso · a `errors.ACCOUNT_SUSPENDED` continua sendo
   * a frase curta que qualquer resposta de API usa; isto é a **tela**.
   */
  suspended: {
    title: 'Conta suspensa',
    body: 'O acesso desta conta está bloqueado pela organização. Se você acha que foi engano, escreva pra gente · a gente responde no mesmo endereço.',
    contactEmail: 'contato@ggclubs.com.br',
    recheck: 'Já resolvi · verificar de novo',
    recheckWait: 'Aguarde {{seconds}}s',
    hint: 'A organização precisa reativar a conta pelo painel · depois é só verificar aqui.',
  },
  admin: {
    /**
     * Montar campeonato · **formulário de números, e a conta aparece na tela.**
     *
     * A decisão de 10/08/2026 (formato padrão da casa) é o que fez esta tela
     * caber num formulário · o montador de fases arrastável vira trabalho do dia
     * em que existir um formato que o padrão não cobre.
     */
    tournaments: {
      title: 'Campeonatos',
      subtitle: 'Monte a edição, confira a conta e publique quando ela virar promessa.',
      emptyTitle: 'Nenhuma edição ainda',
      emptyBody:
        'Monte a primeira aqui. Ela nasce em rascunho e só aparece pra alguém depois de publicada.',
      new: 'Nova edição',
      name: 'Nome',
      slug: 'Endereço',
      pool: 'Geração',
      price: 'Inscrição',
      priceHint: 'Zero é grátis. Campeonato pago só publica quando o pagamento existir.',
      ladder: 'Escada de tamanhos',
      ladderHint:
        'Do maior pro menor. A edição roda no maior que couber quando as inscrições fecharem, e cada degrau tem a premiação dele.',
      slots: 'Times',
      groupSize: 'Por grupo',
      qualifiers: 'Passam',
      bestThirds: 'Melhores 3ºs',
      addSize: 'Mais um tamanho',
      removeSize: 'Tirar',
      bracketOk: '{{groups}} grupos, {{knockout}} no mata-mata.',
      bracketBad: 'Esses números não formam uma chave que dá pra jogar.',
      needsNameAndSlug: 'Falta o nome e o endereço da edição.',
      // Sem "rascunho" nos dois desde 22/08/2026 · o formulário também abre em
      // edição publicada que ainda não tem ninguém dentro.
      openNow: 'Abrir a inscrição assim que a edição for publicada, em vez de numa data.',
      editTitle: 'Editar edição',
      edit: 'Editar',
      save: 'Salvar',
      slugLocked: 'O endereço não muda depois de criado · ele já pode estar num link.',
      poolHint:
        'No Clubs do EA FC uma geração não joga contra a outra, então a edição é de uma só.',
      rules: 'Regulamento',
      thirdPlace: 'Tem disputa de terceiro lugar',
      thirdPlaceHint:
        'Os dois perdedores da semifinal jogam entre si. A partida nasce sozinha quando as semis fecham.',
      // A porta pra tela de operar · a lista responde "qual edição", ela
      // responde "e agora".
      manage: 'Gerenciar',
      // A mesa de operação · o que esta tela tem que as outras molduras da
      // edição não têm.
      ops: 'Operação',
      opsHint: 'O que só a organização pode fazer nesta edição.',
      // Sem botão nenhum · e não é tela quebrada, é a vez de outra pessoa.
      chatsTitle: 'Conversas dos confrontos',
      chatsMeta_one: '{{count}} confronto',
      chatsMeta_other: '{{count}} confrontos',
      chatsCalled_one: '{{count}} chamou a organização',
      chatsCalled_other: '{{count}} chamaram a organização',
      chatCalled: 'Chamaram você',
      chatLocked: 'Travada',
      chatFilterNeedsYou: 'Precisam de você',
      chatFilterWithChat: 'Com conversa',
      chatFilterAll: 'Todos',
      chatRound: 'Rodada',
      chatRoundAll: 'Todas as rodadas',
      chatPhaseGroups: 'Grupos',
      chatState: 'Estado da partida',
      chatStateAll: 'Todos os estados',
      chatStateOpen: 'Resultado pendente',
      chatStateClosed: 'Já encerradas',
      chatSearch: 'Buscar por tag',
      chatsEmpty: 'Nada aqui com este filtro.',
      chatCallingTitle: 'Chamaram a organização em {{home}} × {{away}}',
      chatCallingAction: 'Abrir a conversa',
      chatMessages_one: '{{count}} mensagem',
      chatMessages_other: '{{count}} mensagens',
      opsIdle: 'Nada pra fazer agora · a vez é dos clubs, e você entra quando eles travarem.',
      opsOver: 'Esta edição chegou ao fim · não há mais nada pra operar aqui.',
      // A saída do engano · encerrar é terminal, e o botão fica ao lado dos outros.
      reopen: 'Voltar a jogar',
      finishTitle: 'Encerrar a edição?',
      finishBody:
        'A edição sai do ar como terminada e a chave para de andar. Dá pra voltar atrás aqui mesmo, mas ninguém mais vai lançar placar até você voltar.',
      // O dinheiro da edição · pendência 88.
      showPayments: 'Ver os pagamentos',
      hidePayments: 'Fechar os pagamentos',
      showPaymentsCount_zero: 'Nenhum pagamento',
      showPaymentsCount_one: 'Ver 1 pagamento',
      showPaymentsCount_other: 'Ver {{count}} pagamentos',
      overCapacity: 'excedente',
      overCapacityHint_one:
        '{{count}} pagamento confirmou depois de a edição encher · a vaga é de quem confirma primeiro, então ele é reembolsado.',
      overCapacityHint_other:
        '{{count}} pagamentos confirmaram depois de a edição encher · a vaga é de quem confirma primeiro, então eles são reembolsados.',
      // **A linha que responde "17 vagas contra 16 pagamentos"** · pendência
      // 191. Foi essa diferença que virou leitura de defeito no dia da estreia.
      courtesyInMoney_one:
        'Uma vaga desta edição foi dada de cortesia · ela ocupa lugar na chave e não soma em receita nenhuma.',
      courtesyInMoney_other:
        '{{count}} vagas desta edição foram dadas de cortesia · elas ocupam lugar na chave e não somam em receita nenhuma.',
      noPayments: 'Ninguém pagou nada nesta edição.',
      methodPix: 'Pix',
      methodCard: 'Cartão',
      paymentBack: 'Devolvido',
      refund: 'Devolver',
      refundTitle: 'Devolver o dinheiro?',
      // **A vaga NÃO volta mais sozinha** · pendência 169, 02/09/2026. Devolver
      // o dinheiro e tirar o club viraram duas ações, e esta frase prometia a
      // segunda enquanto fazia só a primeira.
      refundBody:
        'O estorno de {{value}} vai pro cartão ou pra conta de quem pagou. Isto não tem desfazer.',
      refundAlsoRemove: 'Tirar {{club}} da edição também',
      refundAlsoRemoveHint:
        'Sem isto, o club continua na edição e a vaga segue ocupada · é o que você quer quando devolve por cortesia.',
      removeTitle: 'Tirar {{club}} da edição?',
      removeBody: 'A vaga volta pro bolo e o club sai da grade.',
      removeAlsoRefund: 'Devolver os {{value}} também',
      removeAlsoRefundHint:
        'Sem isto, o dinheiro fica com a organização · o club sai da edição e o estorno é decisão separada.',
      showDisputesCount_zero: 'Nenhuma disputa',
      showDisputesCount_one: 'Ver 1 disputa',
      showDisputesCount_other: 'Ver {{count}} disputas',
      showPendingCount_zero: 'Ninguém devendo placar',
      showPendingCount_one: 'Ver 1 partida esperando placar',
      showPendingCount_other: 'Ver {{count}} partidas esperando placar',
      state: {
        draft: 'rascunho',
        open: 'inscrições abertas',
        // Publicada com a abertura no futuro · `open` no banco e fechada na
        // prática. Ver o `nextStepOf`.
        notYetOpen: 'ainda não abriu',
        signupEnded: 'inscrições encerradas pelo prazo',
        closed: 'inscrições fechadas',
        drawn: 'chave sorteada',
        running: 'em jogo',
        finished: 'encerrada',
        cancelled: 'cancelada',
      },
      backToList: 'Todos os campeonatos',
      statSpots: 'Inscritos',
      statPrize: 'Campeão',
      // O preço deixou de ser um quarto da grade e virou selo · o rótulo
      // precisa dizer o que o número é, porque fora da grade ele perde o `dt`.
      perSpot: '{{price}} por vaga',
      statDraw: 'Sorteio',
      // **Os três grupos da lista** · a ordem é a da urgência, e o último vem
      // fechado porque ele é consulta e não trabalho.
      group: {
        live: 'Em jogo',
        draft: 'Rascunhos',
      },
      groupDone_one: 'Uma edição encerrada',
      groupDone_other: '{{count}} edições encerradas',
      start: 'Começar',
      finish: 'Encerrar',
      draw: 'Sortear',
      drawWithCount: 'Sortear · {{count}} de {{slots}}',
      showEntries: 'Ver inscritos',
      hideEntries: 'Esconder inscritos',
      removeEntry: 'Tirar',
      // **Diz o que o sistema NÃO faz** · quem aperta precisa saber antes que o
      // dinheiro volta pela mão dele, no painel do Mercado Pago.
      // **Devolver o dinheiro e tirar o club viraram duas ações** · pendência
      // 169, 02/09/2026. A frase antiga mandava o admin ao painel do Mercado
      // Pago, e o botão de devolver existe aqui desde 19/08.
      removeHint:
        'Tirar um club devolve a vaga. Se ele já pagou, o próprio diálogo oferece devolver o dinheiro junto.',
      // **A vaga dada** · pendência 191. Até 04/09/2026 dar uma inscrição de
      // graça era cobrar o Pix e reembolsar, e o registro que sobrava era
      // indistinguível de um defeito.
      courtesyBadge: 'Cortesia',
      courtesyNote: 'Cortesia · {{reason}}',
      courtesyBy: 'por @{{handle}}',
      grantCourtesy: 'Dar uma vaga de cortesia',
      // **Diz as duas metades da regra** · ela ocupa degrau no sorteio e não
      // entra na conta do dinheiro. Sem isso, quem dá a vaga descobre a
      // primeira na hora em que o sorteio recusa.
      grantCourtesyHint:
        'A vaga entra confirmada, sem passar pelo Mercado Pago · ela ocupa lugar na chave e não conta como receita. O motivo vai de {{min}} a {{max}} letras, e fica visível aqui pra quem abrir esta lista depois.',
      courtesyTagLabel: 'Tag do club',
      courtesyReasonLabel: 'Motivo',
      courtesyReasonPlaceholder: 'Por que essa vaga está sendo dada?',
      grantCourtesyAction: 'Dar a vaga',
      grantingCourtesy: 'Dando…',
      showDisputes: 'Ver disputas',
      hideDisputes: 'Esconder disputas',
      noDisputes: 'Nenhuma partida em disputa nesta edição.',
      // **As partidas travadas com uma ponta só** · o admin vê, e não age: quem
      // fecha é a varredura, no prazo.
      // **Gerar o mata-mata** · o verbo diz o que acontece, e a recusa (fase de
      // grupos aberta) vem da rota.
      knockout: 'Gerar mata-mata',
      showPending: 'Ver quem está devendo placar',
      hidePending: 'Esconder quem está devendo',
      noPending: 'Nenhuma partida esperando declaração nesta edição.',
      /**
       * **O aviso na mesa de quem tem club na partida** · 28/08/2026.
       *
       * Ele diz o que vai acontecer, e não o que não fazer: a decisão continua
       * disponível, e o que muda é que ela sai marcada na chave. Proibir seria
       * travar a edição quando a organização é uma pessoa só.
       */
      pendingLine: '{{club}} declarou {{home}}-{{away}} · {{rival}} não respondeu',
      // **Nada vale sozinho** · o prazo diz quando a partida chegou aqui, e
      // quem decide é quem está lendo. Ver o `reportCountsIn`.
      pendingDeadline: 'Prazo do adversário {{when}}',
      // **Encerrar é validar a declaração que existe**, e não cravar placar · o
      // rótulo diz o que acontece, e não "resolver", que é o verbo da mesa de
      // disputa. Ele dizia "antecipar o prazo", e não há prazo a antecipar
      // desde 22/08/2026 · este é o único desfecho.
      pendingClose: 'Encerrar com esse placar',
      pendingClosing: 'Encerrando…',
      pendingReasonPlaceholder: 'Por que está encerrando agora?',
      pendingReasonHint: 'Escreva o motivo · ele vai pros dois clubs.',
      pendingShotAlt: 'Print enviado pelo {{club}}',
      // O W.O. não tem print · não se fotografa a ausência de alguém.
      pendingWalkover: 'Declarou que o {{club}} não apareceu · sem print, e é o certo.',
      // A partida que ninguém declarou · a linha que trava uma edição.
      stuckLine: '{{home}} × {{away}} · ninguém declarou',
      stuckHint:
        'Passou do horário e nenhum dos dois declarou nada. Ela fica parada até você decidir · não há fechamento automático.',
      stuckDecide: 'Decidir a partida',
      // **A linha parada não tem "vale sozinho"** · e desde 22/08/2026 a linha
      // com declaração também não tem. Nenhuma das duas fecha sozinha.
      stuckSince: 'Parada {{when}}',
      stuckReasonPlaceholder: 'Por que está decidindo assim?',
      pendingNoShot: 'Declarou sem print.',
      claimWalkover: 'Diz que o {{club}} não apareceu',
      claimOf: 'O que o {{club}} lançou',
      openShotOf: 'Abrir o print do {{club}} em tamanho cheio',
      resolveLabel: 'Placar final',
      resolve: 'Decidir',
      resolving: 'Decidindo...',
      resolveHint: 'Preencha os dois placares.',
      resolveTooBig: 'O placar vai de 0 a {{max}}.',
      resolvePenaltiesHint: 'Empate no mata-mata · diga quem passou nos pênaltis.',
      // **Diz o que o botão faz, antes de ele ser apertado** · a decisão fecha a
      // partida, avisa os dois clubs e não tem desfazer nesta tela.
      resolveWarning:
        'A decisão fecha a partida, entra na classificação e avisa os dois clubs. As duas declarações continuam gravadas.',
      create: 'Criar rascunho',
      saving: 'Criando...',
      publish: 'Publicar',
      close: 'Fechar inscrições',
      cancel: 'Cancelar edição',
      // **A janela diz as consequências, e não pergunta "tem certeza?"** ·
      // quem lê "tem certeza" já decidiu que sim. O que segura o clique errado
      // é a lista do que vai acontecer, e ela muda com a edição ter gente
      // dentro ou não.
      cancelTitle: 'Cancelar esta edição?',
      cancelBody:
        'A edição sai de todas as listas e não reabre. Como ela ainda não tem club inscrito, ninguém é avisado.',
      // **O reembolso deixou de ser "na mão, pelo Mercado Pago"** · o botão
      // Devolver existe no painel de dinheiro desde 19/08/2026, e a frase
      // continuou mandando o admin pro painel deles · pendência 180.
      cancelBodyWithClubs_one:
        'O club inscrito é avisado na hora, a edição sai de todas as listas e não reabre. O que já foi pago não volta sozinho: você devolve pelo painel de dinheiro desta edição.',
      cancelBodyWithClubs_other:
        'Os {{count}} clubs inscritos são avisados na hora, a edição sai de todas as listas e não reabre. O que já foi pago não volta sozinho: você devolve pelo painel de dinheiro desta edição.',
      cancelType: 'Digite {{slug}} pra confirmar',
      // **Diz o que preserva** · lado a lado com "cancelar edição", um botão
      // chamado "cancelar" não diz qual dos dois cancelamentos ele faz.
      cancelKeep: 'Manter a edição',
      open: 'Ver página',
      /**
       * **O que acontece agora, e QUEM faz.**
       *
       * A que mais vale é a de `signup`, e ela **mudou de dono**: a varredura
       * sorteia sozinha quando a edição **lota**, e não quando chega o
       * `drawAt` · edição que não lotou espera a organização. Este comentário
       * dizia o contrário e sobreviveu à varredura da pendência 180, quatro
       * linhas acima da string que já tinha sido corrigida.
       */
      next: {
        draft:
          'Ninguém vê esta edição ainda. Publique quando os números estiverem certos · depois disso o formato não muda mais.',
        notYetOpen:
          'Publicada, e as inscrições ainda não abriram. Ninguém consegue entrar até a data de abertura · até lá não há o que fazer.',
        signup:
          'Os clubs estão se inscrevendo. A chave sai sozinha se a edição lotar · se não lotar, quem sorteia é você, quando quiser.',
        awaitingDraw:
          'As inscrições estão fechadas e a chave espera você · o botão de sortear é o que a faz sair.',
        // **O único estado que pede o admin de verdade** · e o caso comum aqui
        // é a edição que **não lotou**, porque só a lotada sorteia sozinha.
        // Quando o botão recusa, é club sobrando pro degrau.
        stuck:
          'Passou a data anunciada do sorteio e a chave não saiu. Sortear é seu · e se o botão recusar, é club sobrando pro degrau da escada: acerte a lista de inscritos abaixo.',
        bracket:
          'A chave está no ar e a vez é dos clubs: são eles que declaram o placar. Você entra quando os dois discordam, e também quando ninguém declara · nada fecha sozinho.',
        over: 'Acabou. Nada aqui espera por você.',
        cancelled: 'Cancelada. Ela não reabre · uma edição nova começa de um rascunho.',
      },
    },
    users: 'Usuários',
    /**
     * O e-mail, do lado de quem opera · **"enviado" não é "chegou".**
     *
     * O desfecho de cada mensagem vem do SES por webhook, e é ele que faz esta
     * tela valer · sem ele o painel afirmaria entrega onde houve bounce.
     */
    emails: {
      title: 'E-mail',
      subtitle: 'O que o produto mandou, e o que chegou pra gente.',
      inboxHint: 'Lida direto do S3 · o corpo aparece em texto puro',
      settledAt: 'desfecho em {{when}}',
      reply: 'Responder',
      replyTo: 'A resposta vai pra {{who}} · não há campo de destinatário, de propósito.',
      replyPlaceholder: 'Escreva a resposta...',
      replySend: 'Enviar resposta',
      replySent: 'Resposta enviada.',
      family: {
        club: 'Club',
        tournament: 'Campeonato',
        chat: 'Conversa',
        test: 'Teste',
        reply: 'Resposta',
        compose: 'Escrita',
        password: 'Senha',
        welcome: 'Boas-vindas',
        other: 'Outro',
      },
      sent: 'O que saiu daqui',
      inbox: 'O que chegou pra gente',
      all: 'Tudo',
      count: 'mostrando {{shown}} de {{count}}',
      bounceRate: 'Taxa de retorno: {{rate}}% · a AWS revisa acima de 5%.',
      empty: 'Nenhum e-mail ainda.',
      loadFailed: 'Não deu pra carregar os envios.',
      reports: 'Relatórios automáticos',
      reportsCount_one: '{{count}} mensagem · DMARC, do dmarc@',
      reportsCount_other: '{{count}} mensagens · DMARC, do dmarc@',
      inboxEmpty: 'Nenhuma mensagem recebida.',
      inboxOnlyReports: 'Ninguém escreveu ainda · só chegou relatório automático, logo abaixo.',
      inboxReadFailed: 'Não deu pra ler esta mensagem.',
      more: 'Mostrar mais',
      compose: 'Escrever e-mail',
      composeTo: 'Para quem',
      composeSubject: 'Assunto',
      composeSend: 'Enviar',
      composeSent: 'E-mail enviado.',
      hint: {
        contact: 'Sai do contato@ · a resposta cai na nossa caixa.',
      },
      alertTitle: 'A taxa de retorno de e-mail subiu',
      alertDetail:
        'Retorno {{bounce}}% · reclamação {{complaint}}%. Acima disso a AWS revisa a conta, e ela é compartilhada.',
      status: {
        sent: 'Enviado',
        delivered: 'Entregue',
        bounced: 'Voltou',
        complained: 'Spam',
        failed: 'Não saiu',
      },
    },
    // **A aba diz EA, e a página diz o resto** · aba longa quebra em duas linhas
    // num iPad Mini e some do olho, que é a mesma razão de "Documentos".
    ea: 'EA',
    eaTitle: 'API do EA FC · levantamento',
    eaSubtitle: 'O que a API interna de Pro Clubs responde hoje, e a que custo.',
    // **O aviso é a metade que impede a tela de mentir sobre o que ela é** · sem
    // ele, quem abrir isto daqui a um mês lê como funcionalidade pronta.
    eaRawTitle: 'Banco de teste',
    // **Meta curto** · o `SectionTitle` desenha ele com `whitespace-nowrap`, e
    // uma frase aqui empurrou 121px a 320 · medido, não suposto.
    eaRawMeta: 'a resposta crua',
    eaLookupTitle: 'Ficha do club',
    eaLookupCount_zero: 'nenhum club com esse nome',
    eaLookupCount_one: 'um club',
    eaLookupCount_other: '{{count}} clubs',
    eaLookupName: 'Nome do club',
    eaLookupPlaceholder: 'Pipokets',
    eaLookupPlatform: 'Geração',
    eaLookupGo: 'Buscar',
    eaLookupNeedsName: 'Escreva o nome do club pra buscar.',
    eaLookupEmpty: 'Nenhum club chamado “{{name}}” nesta geração.',
    eaLookupUpstream:
      'A EA respondeu {{status}} · o serviço dela não tem contrato e cai sem aviso.',
    eaCardId: 'club #{{id}}',
    eaCardForm: 'últimos 5',
    eaFormWin: 'V',
    eaFormDraw: 'E',
    eaFormLoss: 'D',
    eaCardSkill: 'rating {{n}}',
    eaCardStreak: 'Invicto',
    eaCardNoStats: 'O acumulado deste club não voltou · a API da EA cai sem aviso.',
    eaCardSquad_one: 'Elenco · uma pessoa',
    eaCardSquad_other: 'Elenco · {{count}} pessoas, as {{shown}} que mais jogaram aqui',
    eaCardMemberLine: '{{games}} jogos aqui · {{goals}} gols · {{rate}}% de vitória',
    eaCardOverall: 'OVR {{n}}',
    eaCardWins: 'vitórias',
    eaCardDraws: 'empates',
    eaCardLosses: 'derrotas',
    eaCardRate: 'aproveitamento',
    eaCardPlayed: 'Jogos',
    eaCardGoals: 'Gols',
    eaCardPerGame: '{{n}} por jogo',
    eaCardBalance: 'Saldo',
    eaCardLast_one: 'Última partida',
    eaCardLast_other: 'Últimas {{count}} partidas',
    eaSeasonUp: 'subiu de divisão',
    eaSeasonDown: 'caiu de divisão',
    eaPulseLast: 'Última partida',
    eaPulseNever: 'sem registro',
    eaPulseTogether: 'Entram juntos',
    eaPulseTogetherValue_zero: 'ninguém',
    eaPulseTogetherValue_one: 'uma pessoa',
    eaPulseTogetherValue_other: '{{count}} pessoas',
    eaPulseWhoOnly: '{{n}} pessoas, em {{over}} jogos',
    eaPulseWho: 'Quem tem jogado',
    eaPulseWhoValue: '{{n}} de {{total}}, em {{over}} jogos',
    eaRep0: 'Heróis Locais',
    eaRep1: 'Em Ascensão',
    eaRep2: 'Bem Conhecido',
    eaRep3: 'Renome Mundial',
    eaMatchWon: 'venceu',
    eaMatchVsAvg: '{{sign}}{{n}} vs média',
    eaMatchVsAvgWhy: 'A nota desta partida comparada com a média da temporada dele, que é {{n}}.',
    eaMatchShortLeague: 'A partida acabou antes do tempo · pode ter sido abandono.',
    eaMatchShort:
      'A partida acabou antes do tempo · parece abandono, mas o amistoso não registra W.O.',
    eaMatchShots: 'finalizações',
    eaMatchPasses: 'passes certos',
    eaMatchTackles: 'desarmes',
    eaMatchMine: 'este club',
    eaMatchMomWhy: 'Marcado pela própria EA no dado da partida · não é conta nossa.',
    eaMatchTeamLine:
      '{{humans}} em campo · {{shots}} finalizações · {{passes}}/{{attempts}} passes · {{tackles}} desarmes · {{saves}} defesas',
    eaMatchTitle: 'Súmula da partida',
    eaMatchNoHumans: 'Nenhuma pessoa deste lado · o time foi completado pela IA.',
    eaMatchMom: 'craque',
    eaMatchRed: 'vermelho',
    eaMatchLine:
      '{{goals}} gols · {{assists}} assistências · {{shots}} finalizações · {{passes}}/{{attempts}} passes · {{tackles}} desarmes',
    eaMatchSaves: '{{n}} defesas',
    eaCardSquadAll_one: 'Elenco · uma pessoa',
    eaCardSquadAll_other: 'Elenco · {{count}} pessoas, todas',
    eaCardSquadMore: 'ver todos',
    eaCardSquadLess: 'ver menos',
    eaCardMoreMatches_one: 'ver mais uma partida',
    eaCardMoreMatches_other: 'ver mais {{count}} partidas',
    eaKindPlayoff: 'playoff',
    eaKindLeague: 'liga',
    eaKindFriendly: 'amistoso',
    eaCardWalkover: 'W.O.',
    eaCardAgo: 'há {{n}} {{unit}}',
    eaUnitSecond_one: 'segundo',
    eaUnitSecond_other: 'segundos',
    eaUnitMinute_one: 'minuto',
    eaUnitMinute_other: 'minutos',
    eaUnitHour_one: 'hora',
    eaUnitHour_other: 'horas',
    eaUnitDay_one: 'dia',
    eaUnitDay_other: 'dias',
    eaUnitWeek_one: 'semana',
    eaUnitWeek_other: 'semanas',
    eaUnitMonth_one: 'mês',
    eaUnitMonth_other: 'meses',
    eaCardSeasons: 'Por temporada',
    eaCardSeason: 'T{{n}} · {{div}}',
    eaCardHistory:
      'Melhor: {{best}} · {{up}} acessos e {{down}} quedas · {{league}} jogos de liga.',
    eaDivNow: 'agora',
    eaDivBest: 'melhor',
    eaDivisionElite: 'Elite',
    eaDivisionN: 'Divisão {{n}}',
    eaPosGoalkeeper: 'goleiro',
    eaPosDefender: 'zagueiro',
    eaPosMidfielder: 'meio-campo',
    eaPosForward: 'atacante',
    eaWarning:
      'Isto é estudo, não integração: nada aqui é gravado e nenhuma tela do produto usa estes dados. A API do outro lado não é oficial e não tem contrato · ela pode mudar ou sair do ar sem aviso.',
    eaEndpoint: 'Endpoint',
    eaCall: 'Chamar',
    overview: 'Painel',
    overviewSubtitle: 'O tamanho do produto, e o que está esperando alguém.',
    statUsers: 'Contas',
    statEmails: 'E-mails enviados',
    statNewUsers: 'Novas na semana',
    statClubs: 'Clubs ativos',
    statClosedClubs: 'Clubs encerrados',
    // **Diagnóstico, não alarme.** Com o tráfego de hoje, zero é o estado normal
    // na maior parte do dia · o número serve pra quando você **sabe** que
    // alguém deveria estar conectado, e vê zero.
    realtimeNow: 'Tempo real · {{connections}} conexão(ões) de {{accounts}} conta(s)',
    needsAction: 'Pede ação',
    allClear: 'Nada esperando por você agora.',
    suspendedAccounts: '{{count}} conta(s) suspensa(s).',
    legalMissingDoc: 'Falta publicar: {{docs}}',
    // Diz por que importa · sem isso vira item de lista que ninguém prioriza.
    legalMissingWhy:
      'Sem as duas URLs o login com Google não sai do modo de teste, e ninguém de fora consegue entrar por ele.',
    // **Rótulo de aba é curto; título de tela é completo.** "Documentos legais"
    // quebrava em duas linhas num iPad Mini (768px) e empurrava a barra · e aba
    // que quebra é aba que some do olho. O título da página continua inteiro,
    // porque lá há linha sobrando e ele é quem nomeia o lugar.
    legal: 'Documentos',
    legalTitle: 'Documentos legais',
    legalSubtitle: 'Publicar termos de uso e política de privacidade.',
    legalNeverPublished: 'Nenhuma versão publicada ainda.',
    legalCurrent: 'No ar hoje: versão {{version}}, de {{date}}.',
    legalWillPublish: 'Isto vai publicar a versão {{version}}.',
    legalBody: 'Texto',
    legalRequired: 'obrigatório',
    legalPlaceholder: '## 1. Sobre estes termos\n\nEscreva aqui...',
    // O idioma e a versão destacados · são o que muda entre uma prévia e outra.
    // **O `<0>` e o `<1>` são índices**: repetir `<0>` faz os dois apontarem
    // pro mesmo componente, que funciona por acaso e quebra no dia em que os
    // dois destaques precisarem ser diferentes.
    legalPreviewNext: 'Prévia em <0>{{lang}}</0> · como a versão <1>{{version}}</1> vai ficar',
    legalPreviewCurrent: 'Prévia em <0>{{lang}}</0> · a versão <1>{{version}}</1> está assim',
    legalNoChanges: 'Edite o texto pra publicar uma versão nova.',
    legalNoChangesYet: 'O texto abaixo é o que está no ar. Edite pra publicar uma versão nova.',
    legalPublish: 'Publicar versão',
    legalMissing: 'Falta o texto em: {{langs}}',
    legalPublished: 'Versão {{version}} publicada.',
    // O freio é proporcional ao estrago · publicar não se desfaz, e a versão
    // publicada é o que alguém aceitou.
    legalConfirmTitle: 'Publicar a versão {{version}}?',
    legalConfirmBody:
      'Publicar não tem volta: a versão entra no ar e passa a ser a que vale. Corrigir depois é publicar outra, e as duas ficam no histórico.',
    legalConfirmPhrase: 'PUBLICAR',
    badge: 'Admin',
    colName: 'Nome',
    colHandle: 'Nick',
    colEmail: 'E-mail',
    /**
     * **As três colunas de contexto** · 28/08/2026, pedido do Eduardo.
     *
     * Rótulo de uma palavra porque a tabela tem oito colunas agora · o que cada
     * uma diz está na própria célula, e cabeçalho longo cobraria largura de
     * todas as linhas.
     */
    colClubs: 'Clubs',
    colTournaments: 'Campeonatos',
    colSince: 'Desde',
    /** No cartão do celular a data precisa do sujeito · lá não há cabeçalho. */
    sinceLine: 'Na plataforma desde {{when}}',
    noClub: 'Sem club',
    noTournament: '·',
    colRole: 'Papel',
    emptyTitle: 'Nenhuma conta ainda',
    emptyBody: 'Rode `pnpm seed` pra criar a conta admin inicial.',
    colStatus: 'Status',
    // **A tela de contas ganhou busca e ação em 19/08/2026** · a rota de editar
    // existia desde o começo e não tinha interface nenhuma.
    // O que espera a organização numa edição · a linha nova do "pede ação".
    attentionDisputes_one: '1 partida em disputa',
    attentionDisputes_other: '{{count}} partidas em disputa',
    attentionDraw: 'o prazo do sorteio passou e a chave não saiu',
    /**
     * **A partida que ninguém declarou e cujo prazo venceu** · 28/08/2026.
     *
     * A frase diz **o que fazer**, e não só o que houve · esta é a única das
     * três em que a organização crava um placar do nada, e a mesa dela é a de
     * partidas paradas.
     */
    attentionStuck_one: '1 partida parada sem ninguém ter declarado',
    attentionStuck_other: '{{count}} partidas paradas sem ninguém ter declarado',
    usersCount_one: '1 conta',
    usersCount_other: 'Mostrando {{shown}} de {{count}} contas',
    usersSearch: 'Buscar por nome ou @handle',
    usersMore_one: 'Carregar mais 1',
    usersMore_other: 'Carregar mais {{count}}',
    usersNoMatchTitle: 'Ninguém com esse nome',
    usersNoMatchBody: 'Nenhuma conta bate com "{{term}}". Tente o @handle, ou parte do nome.',
    roleAdmin: 'Admin',
    rolePlayer: 'Player',
    statusActive: 'Ativa',
    statusSuspended: 'Suspensa',
    promote: 'Promover',
    demote: 'Rebaixar',
    suspend: 'Suspender',
    reinstate: 'Reativar',
    // **Esconder da DESCOBERTA, e o verbo evita prometer invisibilidade** · a
    // conta some da vitrine, da busca e do convite, e o perfil dela responde
    // 404 · mas ela continua no elenco do club dela, porque escondê-la ali
    // faria o club mentir sobre o próprio time.
    hide: 'Esconder',
    reveal: 'Revelar',
    hiddenBadge: 'Escondida',
    // O título da coluna existe só pro leitor de tela · na tabela o selo fala.
    hiddenTitle: 'Conta escondida da vitrine, da busca e do convite',
    // **A marca das contas do projeto** · elas somem do produto pelo mesmo
    // filtro, e sem um selo próprio o painel mentia por omissão: a organização
    // via conta sem marca nenhuma e concluía que ela aparece na vitrine.
    serviceBadge: 'De serviço',
    serviceTitle:
      'Conta do projeto · escondida do produto pelo mesmo filtro, e o item não mexe nela',
    /** O rótulo do gatilho do menu · leitor de tela precisa saber de QUEM é a linha. */
    rowActions: 'Ações de {{name}}',
    promoteTitle: 'Promover a admin?',
    promoteBody:
      '{{name}} passa a ver e mexer em tudo aqui: contas, campeonatos, documentos e dinheiro. Dá pra rebaixar depois.',
    demoteTitle: 'Rebaixar pra player?',
    demoteBody: '{{name}} perde o painel na hora. A conta continua igual pro resto do produto.',
    suspendTitle: 'Suspender a conta?',
    suspendBody:
      '{{name}} é desconectado na hora e não entra mais até você reativar. Os clubs e as inscrições ficam como estão.',
    reinstateTitle: 'Reativar a conta?',
    reinstateBody: '{{name}} volta a entrar normalmente.',
  },

  // Espelha packages/schemas/src/errors.ts · a API manda o código, o texto é daqui.
  /**
   * **A sala do confronto** · a palavra canônica é "conversa", decidida em
   * 27/08/2026 · "mensagens" colidiria com "aviso", que já é a palavra de
   * notificação na tela.
   */
  chat: {
    liveAction: 'Chat',
    title: 'Conversa do confronto',
    openAction: 'Conversar',
    // O rótulo do ícone na linha da chave · ele não tem palavra na tela, então
    // é isto que o `title` mostra no hover e o leitor de tela lê.
    openActionWithCount_one: 'Conversar · {{count}} mensagem nova',
    openActionWithCount_other: 'Conversar · {{count}} mensagens novas',
    loading: 'Abrindo a conversa',
    empty: 'Ninguém falou ainda · combine o horário por aqui.',
    // **O vazio da sala JÁ ENCERRADA** · a frase acima manda combinar o
    // horário, e numa conversa que fechou ela pede o que a tela proíbe logo
    // abaixo. Aqui ela conta o que aconteceu, que é a única coisa que resta.
    emptyArchived: 'Ninguém falou aqui · dá pra comentar o jogo mesmo depois dele.',
    placeholder: 'Escreva pro adversário',
    send: 'Enviar',
    loadOlder: 'Ver o que veio antes',
    loadingOlder: 'Carregando',
    toEnd: 'Ir pro fim da conversa',
    // **Plural pelo i18next**, e não uma frase com número colado · o singular
    // muda o verbo, e "1 mensagens novas" é o tipo de erro que só aparece
    // quando chega exatamente uma.
    newMessages_one: '{{count}} mensagem nova',
    newMessages_other: '{{count}} mensagens novas',
    // **O visto por** · um nome vira nome, dois ou mais viram contagem · três
    // @handles numa linha de rodapé de bolha estouram a largura no celular.
    seenByOne: 'Visto por @{{handle}}',
    seenByMany: 'Visto por {{count}} pessoas',
    adminName: 'Organização',
    /**
     * **O papel de quem está na sala, no header do diálogo** · o par do
     * `adminName`, e ele existe porque o badge diz *em que papel você entrou*.
     */
    roleClub: 'Club',
    /**
     * **O papel, no `title` do badge do header** · ele era uma caixa âmbar no
     * alto da sala, e virou micro-identificador em 28/08/2026 (noite), a
     * pedido do Eduardo.
     *
     * **A frase deixou de prometer marca** · ela dizia *"fica marcado pros dois
     * lados"*, e a marca saiu da tela na mesma conversa · ninguém precisa saber
     * que quem organiza também joga, e o elenco do club já é público.
     */
    organizerPlayingNotice: 'Você tem club nesta partida e está aqui como organização.',
    organizerPlayingAsClub:
      'Você tem club nesta partida, então aqui você fala pelo club · pela mesa do admin você entra como organização.',
    typing: '{{who}} está digitando',
    delete: 'Apagar',
    react: 'Reagir',
    actions: 'Ações da mensagem',
    shotAdd: 'Anexar um print',
    shotRemove: 'Tirar o print',
    shotSending: 'Enviando',
    shotOpen: 'Abrir o print',
    shotAlt: 'Print do confronto',
    deleting: 'Apagando',
    showMore: 'Ver mais',
    showLess: 'Ver menos',
    archived: 'Partida encerrada · esta conversa é histórico',
    archivedShort: 'Encerrada',
    shortTitle: 'Conversa',
    officialResult: 'Resultado oficial',
    declarations: 'Declarações dos clubs',
    agreedResult: 'Confirmado pelos dois clubs',
    disputed: 'Em disputa',
    disputeGuidance:
      'Aguardando a decisão da organização. As declarações ainda não são o resultado oficial.',
    pendingResult: 'Resultado pendente',
    cancelledMatch: 'Cancelada',
    notReported: 'Ainda não declarou',
    scoreOrder: 'Ordem do placar: {{home}} × {{away}}',
    reportedAbsence: 'Ausência de {{club}}',
    walkoverShort: 'W.O.',
    brasiliaTime: 'Brasília',
    resultClosedChatOpen: 'Partida encerrada · a conversa continua aberta',
    reported: 'Súmula',
    reportedShot: 'Print do {{club}}',
    reportedShotCaption: 'Print da súmula',
    deleteConfirmTitle: 'Apagar a mensagem?',
    deleteConfirmBody:
      'Ela continua na conversa como apagada · o outro lado vê que existiu, sem o texto.',
    tray: 'Suas conversas',
    trayWithCount_one: 'Suas conversas · {{count}} mensagem nova',
    trayWithCount_other: 'Suas conversas · {{count}} mensagens novas',
    trayTitle: 'Suas conversas',
    callAdmin: 'Chamar a organização',
    calling: 'Chamando',
    adminCalled: 'A organização foi chamada',
    // **O mesmo fato, lido por quem foi chamado** · pra ela não é um aviso de
    // que o pedido saiu, é o motivo de ela estar na sala.
    adminWasCalled: 'Chamaram você aqui',
    callAdminAgain: 'Chamar de novo',
    lock: 'Travar a conversa',
    unlock: 'Destravar',
    speakAsAdmin: 'Falando como organização',
    system: {
      adminCalled: 'A organização foi chamada nesta conversa.',
      chatLocked: 'A organização travou a conversa.',
      chatUnlocked: 'A organização destravou a conversa.',
    },
    deletedByAuthor: 'Mensagem apagada',
    deletedByAdmin: 'Removida pela organização',
    unread_one: '{{count}} nova',
    unread_other: '{{count}} novas',
    opensAt: 'A conversa abre {{when}}',
    closed: {
      locked: 'A organização travou esta conversa · a decisão é dela.',
      tooEarly: 'A conversa deste confronto ainda não abriu.',
      // **Duas delas são AVISO, e uma é fechamento** · desde 29/08/2026 a
      // partida encerrada e o relógio vencido não trancam mais nada, então elas
      // dão contexto e não recusam: quem lê acabou de ver que o jogo já passou,
      // e o campo de escrever continua logo abaixo. Só a edição encerrada fecha
      // de verdade, e a frase dela é a única que fala em registro.
      matchOver: 'A partida acabou · dá pra continuar falando sobre ela por aqui.',
      expired: 'O horário do jogo já passou · a conversa segue aberta.',
      tournamentOver: 'A edição acabou · a conversa fica aqui como registro.',
      // **O único aviso que fala do FUTURO** · os outros contam o que já foi. É
      // o "explicitamente avisado" da decisão dele: a sala diz que vai fechar e
      // quando, em vez de fechar calada.
      tournamentEnding: 'A edição acabou · esta conversa fecha em 6 horas.',
    },
  },

  errors: {
    VALIDATION: 'Confira os dados preenchidos.',
    UNAUTHENTICATED: 'Sua sessão expirou. Entre de novo.',
    FORBIDDEN: 'Você não tem acesso a isso.',
    NOT_FOUND: 'Não encontramos o que você procura.',
    RATE_LIMITED: 'Muitas tentativas em pouco tempo. Tenta de novo daqui a pouco.',
    RATE_LIMITED_IN: 'Muitas tentativas em pouco tempo. Tenta de novo {{when}}.',
    INTERNAL: 'Algo deu errado do nosso lado. Tente de novo em instantes.',
    // **Uma frase pros quatro motivos** · a tela já sabe qual é o caso pelo
    // `closedReason`, e este erro só aparece pra quem insistiu numa sala que
    // ela já mostrava fechada.
    CHAT_NOT_OPEN: 'A conversa deste confronto não está aberta.',
    CLUB_NOT_FOUND: 'Esse club não existe.',
    CLUB_TAG_TAKEN: 'Essa tag já está em uso.',
    CLUB_TAG_MISMATCH: 'A tag não confere. Digite exatamente a do club.',
    CLUB_IN_DRAWN_TOURNAMENT:
      'Este club está numa edição que já foi sorteada. Encerrar ele agora deixaria as partidas dos outros sem adversário · fale com a organização.',
    CLUB_HAS_PAID_REGISTRATION:
      'Este club tem inscrição paga numa edição. Fale com a organização pra sair dela antes de encerrar o club.',
    MEMBERSHIP_LIMIT_REACHED: 'Você já está no limite de clubs por conta.',
    OWNER_LIMIT_REACHED: 'Você já é dono de um club. Cada conta responde por um só.',
    TARGET_ALREADY_OWNER: 'Esse jogador já é dono de um club, então não pode assumir outro.',
    // As duas de baixo são a trava de liderança única · uma conta lidera **um**
    // club. Elas dizem a saída porque quem lê está travado: sem ela, a única
    // ação possível é adivinhar.
    //
    // **A saída que elas mandam usar precisa EXISTIR**, e esta frase já mentiu
    // duas vezes em direções opostas · a primeira versão mandava largar só o
    // cargo antes de isso ser possível, e a segunda mandava sair do club porque
    // largar o cargo não existia. **Existe desde 03/09/2026** (pendência 186), e
    // a frase diz **onde fica**: botão que a pessoa não acha é botão que não
    // existe pra ela.
    MANAGER_LIMIT_REACHED:
      'Você já é gerente de outro club, e cada conta lidera um só. Abra a página daquele club e use "Largar a gerência" · você continua no elenco dele.',
    TARGET_ALREADY_LEADER:
      'Esse jogador já lidera outro club, e cada conta lidera um só. Ele precisa sair de lá antes · se for dono, passando a posse ou encerrando.',
    // O `{{max}}` vem da constante do schema, pelo `apiErrorMessage` · teto sem
    // número faz a pessoa tentar de novo achando que foi engano.
    //
    // **A frase parou de contar gerente e passou a contar VAGA** · desde
    // 03/09/2026 um convite pendente ocupa uma das duas, então "este club já
    // tem 2 gerentes" era falso num club com 1 gerente e 1 convite aberto · e
    // a ação que destrava ali é **desistir do convite**, que a versão anterior
    // nem mencionava. Achado pelo `revisor`.
    MANAGER_CAP_REACHED:
      'As {{max}} vagas de gerente deste club estão ocupadas · contando quem já é gerente e quem foi convidado e ainda não respondeu. Rebaixe um gerente ou desista de um convite antes de chamar outro.',
    ALREADY_MEMBER: 'Você já está nesse club.',
    JOIN_REQUEST_LIMIT_REACHED: 'Você tem pedidos demais esperando resposta.',
    JOIN_REQUEST_NOT_FOUND: 'Esse pedido não existe mais.',
    // Quem lê esta é o dono do club, não o candidato · por isso o sujeito muda.
    CANDIDATE_LIMIT_REACHED: 'Esse jogador já está no limite de clubs.',
    // Diz o que aconteceu, não "dado inválido" · quem lê tem a tela aberta com
    // o cara escalado, e a causa provável é ele ter saído nesse meio-tempo.
    PLAYER_NOT_IN_SQUAD: 'Um dos escalados não está mais no elenco. Recarregue a escalação.',
    // Existe pro caso de alguma tela mostrar o erro antes de a trava cobrir a
    // tela · o caminho normal do 426 é o `UpdateRequired`, não uma mensagem.
    CLIENT_TOO_OLD: 'Esta versão do app não é mais aceita. Atualize para continuar.',
    // Diz **qual é a saída**, não só que não dá · a versão anterior era um beco
    // sem saída, e desde 31/07 existe transferir.
    OWNER_CANNOT_LEAVE:
      'Você é o dono desse club. Passe o club pra alguém do elenco antes de sair.',
    // **O verbo muda, e por isso o código é outro** · quem lê esta não quer
    // sair, quer ficar no elenco sem responder pelo club. Mandar "antes de
    // sair" seria responder outra pergunta.
    OWNER_CANNOT_STEP_DOWN:
      'Você é o dono desse club, e o dono não larga o cargo. Passe o club pra alguém do elenco · você continua no elenco como gerente depois disso.',
    OWNERSHIP_OFFER_NOT_FOUND: 'Essa oferta não está mais valendo.',
    // Irmã da de cima · desistiram, você já respondeu, ou passou do prazo. As
    // três saem iguais porque nenhuma muda o que a pessoa pode fazer agora.
    MANAGER_OFFER_NOT_FOUND: 'Esse convite pra ser gerente não está mais valendo.',
    CANNOT_TRANSFER_TO_SELF: 'Você já é o dono desse club.',
    NOT_A_MEMBER: 'Você não está nesse club.',
    CANNOT_MANAGE_MEMBER: 'Você não pode gerenciar esse jogador.',
    INVITE_NOT_FOUND: 'Esse convite não existe mais.',
    ALREADY_INVITED: 'Esse jogador já foi convidado.',
    PLAYER_NOT_FOUND: 'Não achamos esse @nick.',
    PROFILE_NOT_FOUND: 'Esse perfil não existe.',
    ACCOUNT_NOT_FOUND: 'Conta não encontrada.',
    ACCOUNT_ALREADY_EXISTS: 'Sua conta já estava criada.',
    HANDLE_TAKEN: 'Esse nick já foi levado. Tenta outro.',
    EMAIL_MISSING: 'Seu login não informou um e-mail. Tente entrar por outro caminho.',
    ACCOUNT_SUSPENDED: 'Sua conta está suspensa. Fale com o admin.',
    CANNOT_EDIT_SELF: 'Não dá pra mudar papel ou status da própria conta.',
    TOURNAMENT_NOT_FOUND: 'Esse campeonato não existe.',
    TOURNAMENT_SLUG_TAKEN: 'Esse endereço já está em uso.',
    // Diz o que fazer, como a da tag do club · quem lê aqui digitou errado ou
    // chamou a rota sem confirmar, e a saída é a mesma nos dois casos.
    TOURNAMENT_SLUG_MISMATCH: 'O apelido não confere. Digite exatamente o da edição.',
    TOURNAMENT_CLOSED: 'As inscrições desse campeonato não estão abertas.',
    TOURNAMENT_NOT_ACTIVE:
      'Essa edição foi encerrada ou cancelada. Não é possível gerar novas partidas.',
    TOURNAMENT_NOT_EDITABLE: 'Essa edição não pode mais ser editada · já há club inscrito nela.',
    TOURNAMENT_FULL: 'As vagas desse campeonato acabaram.',
    // **Diz que não tem conserto pelo formulário** · no Clubs do EA FC uma
    // geração não joga contra a outra, então trocar de club é a única saída.
    TOURNAMENT_WRONG_POOL: 'Esse club é de outra geração e não pode entrar nessa edição.',
    ALREADY_REGISTERED: 'Esse club já está inscrito.',
    // A frase diz **o que fazer**, e não só o que faltou · é a única desta
    // lista cuja saída é preencher um campo.
    // **A rede de segurança, e não a porta** · quem inscreve preenche o número
    // no próprio modal (ver o `tournament-join-panel`), e esta frase só é lida
    // se a chamada vier de outro lugar. Ela não manda ninguém pra outra tela.
    PHONE_REQUIRED:
      'Falta o seu telefone. É por ele que a organização fala com você e combina o pagamento da premiação.',
    PHONE_INVALID: 'Esse número não bate com o padrão do país escolhido. Confira os dígitos.',
    REGISTRATION_NOT_FOUND: 'Essa inscrição não existe mais.',
    PAYMENT_NOT_AVAILABLE: 'Publique a política de reembolso antes de abrir um campeonato pago.',
    // **Não diz qual dos dois lados aconteceu** · a vaga pode ter sido paga por
    // outra pessoa do club ou a reserva pode ter vencido, e as duas terminam com
    // a pessoa recarregando a página, que é o que a frase pede.
    REGISTRATION_NOT_RESERVED: 'Essa inscrição não está esperando pagamento. Atualize a página.',
    PAYMENT_PROVIDER_FAILED: 'Não deu pra falar com o pagamento agora. Tente de novo.',
    INBOX_UNAVAILABLE: 'Não deu pra ler a caixa de entrada agora. Tente de novo.',
    EMAIL_SEND_FAILED: 'Não deu pra enviar o e-mail agora. Tente de novo.',
    PAYMENT_NOT_FOUND: 'Esse pagamento não existe mais.',
    PAYMENT_NOT_REFUNDABLE:
      'Esse pagamento não tem o que devolver · ou ele nunca entrou, ou o dinheiro já voltou.',
    REGISTRATION_ALREADY_PAID:
      'Essa inscrição já foi paga. Fale com a organização pra sair da edição.',
    TOURNAMENT_ALREADY_DRAWN: 'A chave dessa edição já saiu.',
    // **Diz o que fazer, e não só o que houve** · é a única destas frases que o
    // admin lê no meio de uma decisão, e ela precisa apontar a saída.
    TOURNAMENT_LEFTOVERS: 'Sobra club pro tamanho que a chave alcança. Tire quem sobrou e sorteie.',
    TOURNAMENT_TOO_FEW: 'Não há clubs confirmados suficientes pro menor tamanho da chave.',
    MATCH_NOT_FOUND: 'Essa partida não existe.',
    // **Diz quem resolve** · sem isso os dois clubs ficam tentando declarar de
    // novo, que é a discussão que a disputa existe pra tirar de cima deles.
    MATCH_DISPUTED: 'Os dois clubs mandaram placares diferentes. A organização vai decidir.',
    MATCH_ALREADY_REPORTED:
      'Seu club já declarou. Para corrigir, fale com a organização na conversa da partida.',
    MATCH_CORRECTION_STALE:
      'A partida mudou durante a revisão. Atualize os dados e confira novamente antes de salvar.',
    MATCH_CORRECTION_DEPENDENTS:
      'A alteração mudaria os classificados ou adversários de uma chave já gerada. Esse resultado não foi alterado.',
    MATCH_CORRECTION_CLOSED:
      'Não é possível corrigir uma partida cancelada ou anterior ao sorteio.',
    MATCH_CORRECTION_UNCHANGED:
      'Esse já é o resultado oficial. Altere o placar, os pênaltis ou o W.O. para registrar uma correção.',
    MATCH_SETTLED: 'Essa partida já tem resultado. Fale com a organização se algo estiver errado.',
    MATCH_NOT_DISPUTED: 'Essa partida não está em disputa.',
    MATCH_NOT_PENDING: 'Essa partida não está esperando declaração.',
    MATCH_NOT_STUCK: 'Essa partida não está parada · alguém já declarou, ou ela já fechou.',
    TOURNAMENT_NOT_DRAWN: 'A chave desta edição ainda não foi sorteada.',
    GROUPS_STILL_OPEN:
      'Ainda há partida de grupo sem resultado · resolva antes de gerar o mata-mata.',
    KNOCKOUT_ALREADY_GENERATED: 'O mata-mata desta edição já foi gerado.',
    KNOCKOUT_NOT_ENOUGH: 'Os classificados não fecham uma chave de mata-mata.',
    PENALTIES_REQUIRED: 'No mata-mata não existe empate · diga como ficou a disputa de pênaltis.',
  },
} as const;
