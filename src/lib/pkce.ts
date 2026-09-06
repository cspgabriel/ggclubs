/**
 * PKCE (RFC 7636) pro fluxo nativo do desktop.
 *
 * Mora sozinho, longe do Firebase, por dois motivos: é matemática pura e não
 * precisa de nenhuma configuração pra rodar · e é o pedaço em que um escorregão
 * de codificação só se manifesta no servidor do Google, com mensagem que não
 * ajuda. Separado, o vetor de teste da própria RFC prova que está certo aqui.
 */

/** 32 bytes aleatórios em base64url · o tamanho recomendado pela RFC 7636. */
export function randomVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

/** Base64 **url**: sem `+`, sem `/` e sem `=` · com padding o Google recusa. */
function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
