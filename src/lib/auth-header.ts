// Mora fora do auth.tsx pra quebrar o ciclo: o provider consulta a API, e a
// API precisa do header.
//
// **O SDK entra por import dinâmico**, e este arquivo é o que mais importava
// pra isso: ele é usado em **toda** requisição, então o import estático daqui
// prendia os 161 kB do Firebase no pacote de entrada mesmo depois de o provider
// ter passado a carregá-lo sob demanda. Quando alguém chama isto, o módulo já
// veio · o registro do navegador devolve o mesmo download.
export async function getAuthHeader(): Promise<Record<string, string>> {
  const { firebaseAuth } = await import('./firebase.js');
  const u = firebaseAuth.currentUser;
  if (!u) return {};
  const token = await u.getIdToken();
  return { Authorization: `Bearer ${token}` };
}
