import type { EmailReason } from '@ggclubs/schemas';

/**
 * De que assunto o e-mail é · **por família, e não um rótulo por tipo.**
 *
 * São **45 razões possíveis** (os 40 avisos, mais `test`, `reply`, `compose`,
 * `password-reset` e `welcome`), e uma chave de tradução pra cada seria 45
 * linhas de catálogo pra responder uma pergunta que se responde com nove. O
 * tipo exato fica no `title`, pra quem precisar dele.
 *
 * ## O default era `test`, e ele mentia · 04/09/2026
 *
 * A função caía em `'test'` pra tudo que não casasse, e **três famílias inteiras
 * caíam ali**: os quatro avisos de conversa, o `welcome` e o `password-reset` ·
 * este último é, pelas palavras do próprio schema, *"a razão mais crítica do
 * painel"*, a que responde quando alguém diz que não consegue entrar. O Eduardo
 * viu o **e-mail de boas-vindas da conta dele** rotulado *"Teste"* e perguntou
 * por quê.
 *
 * **Um default que afirma uma categoria é pior que um que não afirma nada** ·
 * ele não parece defeito, parece dado. Hoje o desconhecido é `other`, e quem
 * impede que uma razão nova caia lá é o teste ao lado, que percorre o schema.
 */
export type EmailFamily =
  | 'club'
  | 'tournament'
  | 'chat'
  | 'test'
  | 'reply'
  | 'compose'
  | 'password'
  | 'welcome'
  | 'other';

export function familyOf(reason: EmailReason): EmailFamily {
  if (reason.startsWith('club.')) return 'club';
  if (reason.startsWith('tournament.')) return 'tournament';
  if (reason.startsWith('chat.')) return 'chat';

  switch (reason) {
    case 'test':
      return 'test';
    case 'reply':
      return 'reply';
    case 'compose':
      return 'compose';
    case 'password-reset':
      return 'password';
    case 'welcome':
      return 'welcome';
    default:
      return 'other';
  }
}
