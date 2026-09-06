import { clubUrl } from './clubs.js';
import { publicPlayerPath, tournamentPath } from './paths.js';

/**
 * A rota pública equivalente a uma rota de dentro do app, quando ela existe.
 *
 * **Existe porque quem chega sem sessão quase nunca queria o login.** O link de
 * um club circula no Discord e é o canal de aquisição do produto · mandar um
 * estranho pra um formulário de credencial antes de ele ver qualquer coisa é o
 * funil vazando na entrada. A página pública mostra o mesmo club e tem o próprio
 * convite pra criar conta.
 *
 * **Função pura e testada à parte, não `if` dentro da guarda** · é o mesmo
 * desenho do `resolveTarget` do menu de contexto, e pelo mesmo motivo: esta é a
 * parte que erra em silêncio. Mandar pro lugar errado não quebra nada, não
 * aparece em captura, e só se descobre quando alguém reclama de ter caído noutra
 * tela.
 *
 * **Nem toda rota do app tem gêmea, e a ausência é a regra.** Só entra aqui o
 * que responde a mesma pergunta pra quem está de fora:
 *
 * | rota | gêmea | por quê |
 * |---|---|---|
 * | `/app/clubs/:tag` | `/club/:tag` | mesmo club, mesma pergunta |
 * | `/app/players/:handle` | `/player/:handle` | mesmo player, mesma pergunta |
 * | `/app/campeonatos/:slug` | `/campeonato/:slug` | mesma edição, e ela é a **porta** do produto |
 * | `/app/campeonatos` | `/campeonatos` | a lista é aberta · quem chega de fora tem o que ver |
 * | `/app/clubs/:tag/editar` | nenhuma | quem abre edição quer **agir**, não olhar |
 * | `/app/clubs`, `/app`, `/onboarding`, `/admin` | nenhuma | são sobre **você**, não sobre um club |
 *
 * O prefixo de idioma não entra na conta: o `pathname` do router já vem sem o
 * `basename`, e o destino volta por ele · em espanhol isto vira `/es/club/:tag`
 * sem esta função saber que o espanhol existe.
 */
export function publicTwinOf(pathname: string): string | null {
  // A âncora no fim é o que separa a página do club da tela de editar · sem ela
  // `/app/clubs/fcx/editar` casaria e mandaria quem quer editar pra uma página
  // de leitura.
  const club = /^\/app\/clubs\/([^/]+)$/.exec(pathname);
  if (club?.[1] && club[1] !== 'novo') return clubUrl(club[1]);

  const player = /^\/app\/players\/([^/]+)$/.exec(pathname);
  if (player?.[1]) return publicPlayerPath(player[1]);

  // **A lista entra junto da página**, e é a primeira gêmea de lista do produto ·
  // a de clubs e a de players não têm, porque descobrir club e descobrir gente
  // são de quem tem conta. Campeonato é o contrário: ele **é** a porta.
  const tournament = /^\/app\/campeonatos\/([^/]+)$/.exec(pathname);
  if (tournament?.[1]) return tournamentPath(tournament[1]);
  if (pathname === '/app/campeonatos') return '/campeonatos';

  return null;
}
