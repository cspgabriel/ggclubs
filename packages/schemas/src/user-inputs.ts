import { z } from 'zod';
import { DISPLAY_NAME_MAX, emailLower, httpUrl, slug } from './common.js';
import { accountStatus, platform, playerPosition, role } from './enums.js';
import { language } from './languages.js';
import { phoneNumber } from './phone.js';
import { PLAYER_BIO_MAX } from './user.js';

// PATCH /me/profile · o proprio usuario editando a conta dele.
export const updateProfileInput = z
  .object({
    displayName: z.string().trim().min(2).max(DISPLAY_NAME_MAX).optional(),
    handle: slug.optional(),
    avatarUrl: httpUrl.nullable().optional(),
    platform: platform.nullable().optional(),
    position: playerPosition.nullable().optional(),
    /** O telefone · **privado sempre**, e nunca sai em perfil público. Ver o `userSchema`. */
    phone: phoneNumber.nullable().optional(),
    bio: z.string().trim().max(PLAYER_BIO_MAX).nullable().optional(),
    /** Procurando club · ver o `userSchema`. É declaração da pessoa, de mais ninguém. */
    lookingForClub: z.boolean().optional(),
    /**
     * Se esta pessoa aceita e-mail do produto · ver o `userSchema`.
     *
     * **O que ela desliga é o canal, não o aviso** · a caixa do sininho continua
     * cheia, porque ela é a fonte da verdade. Desligar aqui é dizer "não me
     * mande e-mail", e não "não me avise".
     *
     * **É do dono da conta e de mais ninguém**, como o `discoverable` · não
     * entra no `adminUpdateUserInput`. Admin decide papel e status, que são
     * acesso; preferência de contato é da pessoa.
     */
    emailNotifications: z.boolean().optional(),
    /**
     * Em que idioma a pessoa lê · **é o que decide a língua do e-mail**, que sai
     * do servidor e não tem URL pra perguntar.
     *
     * Entra aqui porque quem troca de idioma no site precisa que o e-mail
     * acompanhe · sem isto, quem criou conta em português e passou a usar o
     * produto em espanhol continuaria recebendo em português pra sempre, sem
     * lugar nenhum pra corrigir.
     */
    locale: language.optional(),
    /**
     * Se o player aparece na busca por @nick · ver o `userSchema`.
     *
     * **Entra aqui antes de existir a tela, e isso é decisão do Eduardo em
     * 04/08/2026:** a tela de perfil fica pra depois, e o campo já fica
     * gravável **corretamente** em vez de esperar por ela. Sem esta linha o
     * schema é `.strict()`, então mandar `discoverable` levava **400** · o
     * campo existia no banco e **ninguém no mundo conseguia mudá-lo**, nem
     * pela API.
     *
     * A diferença que isso faz: hoje falta o **controle**, e não a
     * **capacidade**. Quando a tela nascer, ela chama a rota que já existe.
     *
     * **É do dono da conta e de mais ninguém** · não entra no
     * `adminUpdateUserInput`. Admin decide papel e status, que são acesso;
     * quem decide aparecer numa busca é a pessoa.
     */
    discoverable: z.boolean().optional(),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileInput>;

// POST /me · primeiro acesso de quem o Firebase autenticou e o GGClubs ainda não conhece.
// `role` e `status` estão fora daqui de propósito: quem grava é o servidor. Se
// entrassem no input, qualquer pessoa se promoveria a admin no próprio cadastro.
export const createMyAccountInput = z
  .object({
    handle: slug,
    displayName: z.string().trim().min(2).max(DISPLAY_NAME_MAX),
    /**
     * Em que idioma a pessoa está lendo · **quem sabe isso é o cliente**, pela
     * URL que ela abriu, e o servidor não tem como descobrir sozinho.
     *
     * **É a única coisa do cadastro que vem do cliente sem ser identidade**, e
     * ela é inofensiva: errar manda e-mail na língua errada, e a pessoa troca na
     * tela da conta. Opcional, com default no schema do documento · quem não
     * mandar cai em `pt-BR`, que é o comportamento de antes de este campo
     * existir.
     */
    locale: language.optional(),
    platform: platform.nullable().optional(),
    // Opcional no cadastro · quem chega quer entrar, e campo obrigatório a mais
    // no onboarding é gente desistindo antes de ter conta. Dá pra definir
    // depois, no próprio club.
    position: playerPosition.nullable().optional(),
    /**
     * **"Estou procurando club", já no cadastro** · pedido do Eduardo em
     * 08/08/2026.
     *
     * A chave nasce **desligada** (ver `dados.md`: aparecer na lista é uma
     * declaração, e declaração não se faz por omissão), e até aqui o único lugar
     * de ligá-la era `/app/conta` · que é exatamente a tela que quem acabou de
     * criar conta não conhece. **Quem chega sem club é quem procura um.**
     *
     * Continua **opcional**, pelo mesmo motivo da posição: campo obrigatório a
     * mais no onboarding é gente desistindo antes de ter conta.
     */
    lookingForClub: z.boolean().optional(),
    /**
     * **O telefone, e ele é opcional aqui de propósito.**
     *
     * Ele existe pra a organização falar com a pessoa fora da plataforma e pra
     * combinar o pagamento de quem ganha premiação · e nada disso acontece com
     * quem acabou de criar conta. **O atrito mora onde ele vale dinheiro**: o
     * painel de inscrição exige o número, e a porta de entrada não.
     *
     * É a mesma regra da posição e do `lookingForClub` acima · campo obrigatório
     * a mais no onboarding é gente desistindo antes de ter conta. Decisão do
     * Eduardo em 01/09/2026, entre este desenho e exigir no cadastro.
     */
    phone: phoneNumber.nullable().optional(),
  })
  .strict();

export type CreateMyAccountInput = z.infer<typeof createMyAccountInput>;

/**
 * POST /public/password-reset · **quem pede não tem sessão, por definição.**
 *
 * O `locale` está aqui pela mesma razão do cadastro: **quem sabe em que língua a
 * pessoa lê é o cliente**, pela URL que ela abriu. E aqui isso importa mais que
 * lá · o e-mail de senha vai pra quem está **trancado do lado de fora**, e a
 * conta pode nem ter `locale` gravado ainda.
 *
 * **Ele é dica, não autoridade** · quando a conta já declara idioma, quem manda
 * é o documento. Ver `requestPasswordReset`.
 */
export const passwordResetRequestInput = z
  .object({
    email: emailLower,
    locale: language.optional(),
  })
  .strict();

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestInput>;

// POST /admin/users · cria a conta no Firebase + o documento em `users`.
export const adminCreateUserInput = z
  .object({
    email: emailLower,
    password: z.string().min(8).max(72),
    displayName: z.string().trim().min(2).max(DISPLAY_NAME_MAX),
    handle: slug,
    role: role.default('player'),
  })
  .strict();

export type AdminCreateUserInput = z.infer<typeof adminCreateUserInput>;

// PATCH /admin/users/:id
export const adminUpdateUserInput = z
  .object({
    displayName: z.string().trim().min(2).max(DISPLAY_NAME_MAX).optional(),
    handle: slug.optional(),
    role: role.optional(),
    status: accountStatus.optional(),
    /**
     * **Esconder a pessoa da descoberta** · vitrine, busca, convite e o perfil
     * público, num interruptor só.
     *
     * Ele entrou em 28/08/2026 de um caso concreto: parente do Eduardo com
     * conta na plataforma, e o perfil exposto pra qualquer um. **É privacidade,
     * e não operação** · por isso ele mexe no `privateProfile` e **não** no
     * `serviceAccount`, que diz outra coisa sobre a conta ("isto não é gente").
     * Os dois têm o mesmo efeito hoje, e o porquê de serem dois está no
     * `userSchema`.
     *
     * **É um interruptor, e não quatro** · os quatro efeitos respondem a mesma
     * pergunta ("esta conta participa da descoberta?"), e separá-los criaria
     * combinações que ninguém sabe explicar depois.
     *
     * **E ele NÃO é ferramenta de moderação**, que é a linha que não se cruza:
     * quem pune é o `status`. Esconder alguém aqui deixaria a pessoa
     * **entrando e jogando** com o perfil invisível, que não é punição nem
     * transparência.
     *
     * **Não tem guarda de `isSelf`**, ao contrário de `role` e `status`: os dois
     * trancam o admin fora do painel de forma que a própria interface não
     * desfaz, e este é reversível pela mesma tela.
     */
    privateProfile: z.boolean().optional(),
  })
  .strict();

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserInput>;
