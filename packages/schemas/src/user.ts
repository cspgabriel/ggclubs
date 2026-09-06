import { z } from 'zod';
import { baseDocumentFields, DISPLAY_NAME_MAX, emailLower, httpUrl, slug } from './common.js';
import { accountStatus, membershipRole, platform, playerPosition, role } from './enums.js';
import { DEFAULT_LANGUAGE, language } from './languages.js';
import { phoneNumber } from './phone.js';

/**
 * Teto da frase do player · **o mesmo do club** (`CLUB_BIO_MAX`), e ele é
 * escrito aqui em vez de importado de lá pra não amarrar dois domínios por um
 * número que por acaso coincide hoje. Se um dia divergirem, divergem sozinhos.
 *
 * 280 é o limite de uma frase que cabe na tela sem virar parágrafo · o mesmo
 * raciocínio do club, onde a página se sustenta no elenco e no escudo.
 */
export const PLAYER_BIO_MAX = 280;

// Ponte entre o Firebase Auth e o Mongo. Perfil de jogo, elenco e histórico
// moram nos schemas de domínio, não aqui.

export const userSchema = z.object({
  ...baseDocumentFields,
  firebaseUid: z.string().min(1),
  email: emailLower,
  handle: slug,
  /**
   * Os @nicks que a pessoa **já teve**, e que ficam reservados pra ela.
   *
   * Decisão do Eduardo em 08/08/2026, entre não deixar trocar (como a tag do
   * club), trocar reservando o antigo, e trocar livre · que é o que a API fazia
   * por omissão, sem ninguém ter decidido.
   *
   * **O que a reserva compra não é o link antigo** · esse quebra em qualquer
   * saída que permita trocar. É ninguém **assumir** o endereço de quem trocou:
   * sem ela, o @nick de alguém conhecido volta pro estoque no minuto seguinte, e
   * quem pegar herda os links que circulam no Discord apontando pra outra
   * pessoa. É o mesmo raciocínio da tag ficar reservada pra sempre depois de o
   * club ser encerrado.
   *
   * **A lista nunca contém o handle atual** · ele mora no campo ao lado, e
   * duplicar criaria dois lugares capazes de discordar. O `pnpm scan:data`
   * confere as duas coisas: que o atual não está aqui, e que nada aqui é o
   * handle de outra pessoa.
   */
  previousHandles: z.array(slug).default([]),
  displayName: z.string().trim().min(2).max(DISPLAY_NAME_MAX),
  avatarUrl: httpUrl.nullable().optional(),
  platform: platform.nullable().optional(),
  /**
   * Onde o player joga · **identidade dele, não do vínculo**.
   *
   * Fica aqui pelo mesmo motivo da plataforma: é o que responde 'quem é esse
   * cara' antes de qualquer club, e é o que o mercado de free agents (fatia 3
   * do produto.md) precisa pra existir · 'procuro clube, sou ZAG, PS5' é a
   * frase inteira dessa fatia.
   *
   * O vínculo tem uma posição própria, que **começa nesta** e é trocável: o
   * cara é zagueiro e naquele club joga de lateral porque já tem dois. Dois
   * campos que podem discordar, e aqui isso é a intenção, não descuido.
   */
  position: playerPosition.nullable().optional(),
  /**
   * Uma frase sobre o player · o par da `bio` do club, e com o mesmo teto.
   *
   * **Curta de propósito, pela mesma razão de lá:** a página se sustenta na
   * identidade e nos clubs, e campo de texto longo em perfil vira mural sem
   * moderação · que é justamente o que a pendência 32 recusou construir defesa
   * pra ter.
   */
  bio: z.string().trim().max(PLAYER_BIO_MAX).nullable().optional(),
  /**
   * A pessoa está **procurando club**.
   *
   * **É o gancho social do perfil, e não um enfeite de status.** Sem ele o
   * perfil responde "quem é" e para aí; com ele responde "e dá pra chamar", que
   * é a pergunta de quem gerencia um club e abre a página de alguém. É também a
   * base do mercado de free agents (fatia 3 do `produto.md`), que passa a ter
   * onde ler quem está disponível em vez de adivinhar pelo elenco vazio.
   *
   * **Nasce desligado**, ao contrário do `discoverable`: aparecer numa lista de
   * quem quer club é uma declaração, e declaração não se faz por omissão. Quem
   * não respondeu não está dizendo que quer.
   *
   * Quem está no teto de 3 clubs continua podendo marcar · sair de um e entrar
   * noutro é movimento normal, e a tela é que avisa o teto na hora de aceitar.
   */
  lookingForClub: z.boolean().default(false),
  /**
   * Se o player aparece na busca por @nick. **Nasce `true` e ainda não há tela
   * pra desligar**, e a ausência da tela é decisão, não esquecimento.
   *
   * O campo entra junto da busca (04/08/2026) porque **privacidade apertada
   * depois é mudança de comportamento**: quem se acostumou a ser encontrado e
   * um dia deixa de ser reclama com razão, e o contrário não incomoda ninguém.
   * É o mesmo raciocínio do piso de senha · o momento barato é enquanto quase
   * não há contas, e ele nunca fica mais barato.
   *
   * A chave na tela entra com o mercado de free agents, que é quando alguém de
   * fato vai querer sumir da lista · hoje a busca só serve pra convidar entre
   * conhecidos, e ninguém pediu pra se esconder disso.
   *
   * **A busca filtra por `$ne: false`, não por `=== true`**, justamente porque
   * o default é aparecer: documento sem o campo (conta criada antes desta
   * linha, ou script que esqueceu) continua encontrável em vez de sumir em
   * silêncio. Errar aqui pro lado de esconder seria o defeito invisível.
   */
  discoverable: z.boolean().default(true),
  /**
   * **Conta de serviço** · existe pra o projeto operar e testar, e **não é
   * gente**. Nasce `false`, e hoje são duas: a do admin e a do player de teste,
   * as duas criadas pelo `pnpm seed`.
   *
   * **Não é o `discoverable`, e a diferença é o endereço.** Aquele esconde da
   * **enumeração** e é promessa escrita: quem digita o @nick inteiro continua
   * achando (`player-search.ts`, o `$or` do prefixo). Este esconde do produto:
   * a conta some da vitrine, da busca, do convite e **o perfil dela responde
   * 404**, como se não existisse. Apertar o `discoverable` pra cá quebraria a
   * promessa que ele carrega.
   *
   * **Também não é `status: 'suspended'`** · aquele barra o login, e estas
   * contas precisam entrar · é justamente pra isso que elas existem.
   *
   * **O filtro é `$ne: true`, nunca `=== false`** · documento anterior a esta
   * linha não tem o campo, e `undefined !== false` é verdadeiro. Errar aqui
   * pro lado de esconder sumiria com gente de verdade em silêncio, que é o
   * defeito caro.
   *
   * **Ela não some do elenco nem da escalação**, e o limite é deliberado: lá a
   * conta é **participante**, e escondê-la faria o club mentir sobre o próprio
   * elenco (a começar pelo `memberCount`). O que se esconde é a **descoberta**.
   */
  serviceAccount: z.boolean().default(false),
  /**
   * **Perfil privado** · a conta some da descoberta **e o perfil dela responde
   * 404**, exatamente como a conta de serviço · e por uma razão completamente
   * diferente.
   *
   * **São dois campos com o mesmo efeito de propósito**, e juntá-los era a
   * tentação: o `serviceAccount` diz *"isto não é gente"*, e este diz *"esta
   * pessoa não quer ser encontrada"*. Marcar alguém de verdade como conta de
   * serviço pra escondê-la seria o banco **mentindo sobre quem ela é** · e
   * quem abrir o Mongo daqui a um mês vai ler a marca, não a intenção.
   *
   * **E eles divergem no dia em que alguma coisa tratar as duas famílias
   * diferente** · métrica que não conta bot, e-mail que não vai pra conta de
   * serviço, relatório de gente de verdade. Com um campo só, essa distinção
   * teria que ser redescoberta por lista de `@handle`.
   *
   * **Nasceu em 28/08/2026, do caso concreto** · o Eduardo tem parente com
   * conta na plataforma e não quer o perfil exposto. É privacidade, e não
   * operação.
   *
   * **Não é punição** · quem pune é o `status: 'suspended'`, que barra o login.
   * Quem tem isto entra, joga e aparece no elenco do club dela normalmente ·
   * some só da **descoberta**, que é o mesmo limite da conta de serviço e pela
   * mesma razão: escondê-la do elenco faria o club mentir sobre o próprio time.
   *
   * **O filtro é `$ne: true`**, pelo mesmo motivo de todos os outros: documento
   * anterior a esta linha não tem o campo, e `undefined !== false` é verdadeiro.
   *
   * > **Hoje quem liga é a organização, pelo `/admin`** · e isso é uma escolha
   * > com data de validade, porque privacidade que depende de pedir pro admin
   * > não escala. A versão auto-gerenciável, na tela da própria conta, é a
   * > pendência 147.
   */
  privateProfile: z.boolean().default(false),
  /**
   * **O telefone, e ele é PRIVADO sempre** · não há chave que o torne público,
   * e isso é diferente de tudo o mais no perfil.
   *
   * Existe desde 01/09/2026 por um motivo operacional, e não de produto: é como
   * a organização fala com a pessoa fora da plataforma quando dá problema, e
   * **como se combina o pagamento de quem ganha premiação**.
   *
   * **Nasce nulo e continua nulo até alguém preencher.** Não é obrigatório no
   * cadastro, e a razão está escrita no `createMyAccountInput`: campo a mais na
   * porta de entrada é gente desistindo antes de ter conta. **O atrito mora onde
   * ele vale dinheiro** · quem se inscreve num campeonato precisa ter número, e
   * quem só está olhando não precisa.
   *
   * **Não é verificado, e isso é decisão dele** · sem OTP, sem SMS. O número não
   * é credencial: não abre sessão, não recupera senha e não prova identidade. O
   * dia em que ele fizer qualquer uma dessas coisas, a verificação vem no mesmo
   * commit · **campo não verificado que vira credencial depois é o defeito**.
   *
   * Formato e a lista de países estão no [phone.ts](phone.ts), com o porquê de
   * não validarmos a forma dentro de cada país.
   */
  phone: phoneNumber.nullable().default(null),
  /**
   * Em que idioma esta pessoa lê · **existe por causa do e-mail**, e não da
   * tela.
   *
   * A interface resolve o idioma no cliente (prefixo da URL e catálogo), então
   * até 21/08/2026 o produto não precisava guardar isto em lugar nenhum. **O
   * e-mail é montado no servidor**, e ali não há URL nem navegador pra
   * perguntar · sem o campo, todo e-mail sairia em português, inclusive pra
   * quem usa o produto inteiro em espanhol.
   *
   * **A lista vem do `languages.ts`**, que é a fonte única · idioma novo entra
   * lá e vale aqui sozinho.
   *
   * Default `pt-BR` porque é o idioma da raiz do site e o da maioria de hoje ·
   * documento antigo (as contas criadas antes deste campo) cai nele, que é o
   * comportamento que já existia.
   */
  locale: language.default(DEFAULT_LANGUAGE),
  /**
   * Se esta pessoa aceita e-mail do produto · **vale só pro que é avisável**.
   *
   * **Desligar não desliga tudo**, e a divisão importa: o que é consequência de
   * uma ação de outra pessoa (convite, prazo de partida, dinheiro) é
   * transacional e a pessoa escolheu receber quando entrou no produto. O que o
   * `false` corta é o **canal `email` dos avisos** · a caixa do sininho continua
   * cheia, porque ela é a fonte da verdade e não um canal.
   *
   * **Default `true`, e a leitura é `$ne: false`** pelo mesmo motivo do
   * `discoverable`: conta criada antes desta linha continua recebendo em vez de
   * sumir em silêncio.
   */
  emailNotifications: z.boolean().default(true),
  /**
   * O que identifica esta conta no **descadastro de um clique**, sem sessão.
   *
   * **Ele existe porque o Gmail manda `POST` sozinho**, do servidor dele, sem
   * cookie e sem token do Firebase · o `List-Unsubscribe-Post` promete uma URL
   * que funciona assim desde 21/08/2026, e até este campo existir ela apontava
   * pra `/app/conta`, que **exige login**. O cabeçalho prometia mais do que
   * cumpria, e quem paga por promessa não cumprida é a reputação de envio.
   *
   * **Aleatório, e não derivado do `_id`** · derivar deixaria a URL adivinhável
   * a partir de um id que vaza em resposta de API, e aí qualquer um desligaria
   * o e-mail de qualquer um. Aqui são `UNSUBSCRIBE_TOKEN_BYTES` bytes de
   * `randomBytes`, e a referência do número está na constante.
   *
   * **Opcional e preenchido sob demanda**, no primeiro e-mail que a pessoa
   * recebe · assim ele não exige migração de dado e conta que nunca recebeu
   * e-mail não carrega token à toa. Quem gera é o `unsubscribeTokenFor`.
   *
   * **Interno: não sai em resposta nenhuma** · a lista de exclusão do
   * `publicProfileView` declara isso, como o `locale` e o `emailNotifications`.
   */
  unsubscribeToken: z.string().min(1).optional(),
  /**
   * Palavras do `displayName` e do `handle`, sem acento e em minúscula · é o
   * que faz a busca achar "Kayke" quem tem o nick `@2k`.
   *
   * **Interno: não sai em resposta nenhuma.** É estrutura de índice, não
   * informação do player · o `playerSearchResult` não o lista, e a projeção do
   * repositório é derivada de lá.
   *
   * Existe pelo mesmo motivo do de `clubs`: sem ele, casar nome exigiria regex
   * na collection inteira a cada tecla. O preço é manutenção, e ele é
   * explícito · **as duas escritas que mudam o nome ajustam o token junto**
   * (`createPlayerAccount` e `PATCH /me/profile`), o `pnpm migrate` recalcula
   * tudo e o `pnpm scan:data` compara com a verdade. Token denormalizado sem
   * caminho de volta é conserto manual no banco no dia da divergência.
   */
  searchTokens: z.array(z.string()).default([]),
  role,
  status: accountStatus,
  /**
   * **Quando esta conta foi vista no app instalado** · nunca na web.
   *
   * Ele nasceu como `lastSeenAt`, e nasceu morto: declarado, exposto no painel
   * e **escrito por ninguém** por semanas, o que é pior que ausente porque quem
   * lê o schema acredita que o dado está lá. Virou isto em 06/09/2026 (a
   * pendência 204), com o nome dizendo o que ele mede.
   *
   * **Quem escreve é o `GET /me`, e só quando a `Origin` é a do webview** ·
   * mesmo sinal que o piso de versão usa, e pela mesma razão: é medição de
   * frota, não autorização. Quem forjar a origem mente sobre ter o app e não
   * ganha acesso a nada.
   *
   * **Ausente significa "nunca vi pelo app", e isso inclui todo mundo** ·
   * produção nunca foi migrada, então a conta que usa o app desde agosto só
   * ganha a data no próximo boot. Leitura que precise da diferença entre "não
   * tem" e "faz tempo" tem que aguentar o `undefined`.
   */
  desktopSeenAt: z.coerce.date().optional(),
});

export type User = z.infer<typeof userSchema>;

// O que o painel de admin pode enxergar. Existe pra que a decisão de exposição
// more no schema: a projeção do repositório é derivada daqui, então campo novo
// sensível só sai do banco depois de entrar nesta lista.
export const adminUserView = userSchema.omit({ firebaseUid: true });

export type AdminUserView = z.infer<typeof adminUserView>;

/**
 * Um club da pessoa, como o painel de admin o mostra.
 *
 * **A `tag` sai porque ela é o endereço** · é com ela que a linha vira link pro
 * club, pela mesma regra do resto do produto (nunca id interno numa view).
 */
export const adminUserClub = z.object({
  tag: z.string(),
  name: z.string(),
  role: membershipRole,
  /** Onde essa pessoa joga **neste** club · `null` quando ela não declarou. */
  position: playerPosition.nullable(),
  isCaptain: z.boolean(),
  /** O club que representa a pessoa · a lista mostra ele primeiro. */
  isPrimary: z.boolean(),
});

export type AdminUserClub = z.infer<typeof adminUserClub>;

/**
 * **A conta com o contexto dela** · 28/08/2026, pedido do Eduardo: *"nessa
 * parte de users do admin dá pra melhorar ainda mais e colocar informação de ir
 * para o perfil, se tem club, ir para o club, o cargo/posição no club, se está
 * em algum campeonato, quando criou conta"*.
 *
 * **Por que uma view separada e não campos soltos no `adminUserView`** · o
 * `adminUserView` é *"o documento da conta, menos o que não pode sair"*, e a
 * projeção do repositório é derivada dele. Enfiar aqui dentro coisa que vem de
 * **outras** collections quebraria essa derivação: a projeção passaria a pedir
 * ao Mongo campos que o documento `users` não tem.
 */
export const adminUserRow = adminUserView.extend({
  /** Vínculos **ativos** · quem saiu do club não conta como estando nele. */
  clubs: z.array(adminUserClub),
  /**
   * As edições **vivas** em que algum club dele está inscrito.
   *
   * **Vivas, e não todas** · a pergunta do painel é *"esta pessoa está em
   * campeonato agora?"*, e o histórico inteiro de quem joga há meses afogaria a
   * linha. O `slug` está aqui pelo mesmo motivo da `tag`: é o endereço.
   */
  tournaments: z.array(z.object({ slug: z.string(), name: z.string() })),
});

export type AdminUserRow = z.infer<typeof adminUserRow>;
