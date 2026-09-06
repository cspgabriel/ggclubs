import { canPlayTogether, poolOf, type MembershipRole, type Platform } from '@ggclubs/schemas';
import { Crown, Settings, Star, UserRound, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { ClubCrest } from '@/components/club/club-crest';
import { PlatformMark } from '@/components/club/platform-mark';
import { leadsClub, POOL_KEY, ROLE_KEY } from '@/lib/clubs';

/**
 * Card de club, usado na lista pessoal e na vitrine.
 *
 * Ele leva pra **página do club**, não pro formulário. Cartão que abre edição é
 * atalho de dono aplicado a todo mundo · quem clica quer ver o time, e
 * configurar é ação de dentro da página, com botão próprio.
 *
 * O peso visual é proposital. O público aqui é de EA FC, não de painel de
 * SaaS: nome em caixa alta na fonte de display, tag como selo, escudo grande e
 * o verde acendendo no hover. Linha fina e cinza é o que faz diretório de time
 * parecer planilha · ver docs/design.md.
 *
 * Os `data-club-*` não são enfeite: é por eles que o menu de contexto do app
 * desktop sabe que o clique direito caiu num club, e qual é o seu papel nele ·
 * ver `context-target.ts`.
 *
 * **O card não é uma âncora, é um contêiner com a âncora por cima.** Parece
 * rodeio e não é: o dono ganhou um atalho de configurar no canto, e botão
 * dentro de link é HTML inválido · o navegador desmonta a árvore e o clique
 * passa a acertar o alvo errado. Com a âncora esticada por cima e o atalho
 * acima dela na pilha, os dois destinos convivem e o leitor de tela continua
 * anunciando um link só, nomeado pelo club.
 */
export function ClubCard({
  tag,
  name,
  crestUrl,
  platform,
  memberCount,
  role,
  isPrimary,
  onFavorite,
  viewerPlatform,
}: {
  tag: string;
  name: string;
  crestUrl?: string | null;
  platform: Platform;
  memberCount: number;
  role?: MembershipRole;
  /** Só a lista pessoal manda estes dois · na vitrine não há favorito. */
  isPrimary?: boolean;
  onFavorite?: () => void;
  /**
   * A plataforma de **quem está olhando**, pra o selo dizer se dá pra jogar
   * junto. Sai da sessão, nunca de um `GET` · é o mesmo caminho do `PlayerView`.
   *
   * Sem ela (quem ainda não preencheu a própria) o selo volta a ser neutro e só
   * informa a plataforma · nunca chuta a comparação.
   *
   * **As duas listas passam, inclusive "Meus clubs".** Eu tinha deixado a lista
   * pessoal de fora, com o argumento de que ali a pergunta já está respondida ·
   * o Eduardo pediu a padronização e o argumento dele é mais forte: **o mesmo
   * card, na mesma tela, não pode se comportar de dois jeitos.** E há um caso
   * real onde isso informa · club seu de outra geração que a sua plataforma é
   * ou um dado errado no club, ou no seu perfil, e hoje nada apontaria pra isso.
   */
  viewerPlatform?: Platform | null | undefined;
}) {
  const { t } = useTranslation();
  const path = `/app/clubs/${tag}`;
  const labelId = `club-${tag}`;
  /**
   * Três estados, e o terceiro não é detalhe: sem `viewerPlatform` a tela **não
   * sabe**, e pintar isso de "combina" seria afirmar o que ninguém conferiu.
   */
  const generation: 'same' | 'other' | 'unknown' = !viewerPlatform
    ? 'unknown'
    : canPlayTogether(viewerPlatform, platform)
      ? 'same'
      : 'other';
  const generationHint =
    generation === 'unknown'
      ? undefined
      : t(generation === 'other' ? 'club.crossplayNoHint' : 'club.crossplayYesHint', {
          generation: t(POOL_KEY[poolOf(platform)]),
        });

  return (
    <div
      data-club-tag={tag}
      data-club-role={role ?? ''}
      // `cursor-pointer` e `select-none` no contêiner: a âncora cobre o card,
      // mas o texto por cima dela continuava com cursor de seleção e dava a
      // impressão de que aquele pedaço não era clicável. Com o conteúdo sem
      // eventos de ponteiro, o clique atravessa pra âncora em qualquer ponto.
      // `h-full` porque o item do grid **estica e o card não acompanhava**:
      // numa fila em que só um card quebra a linha de dados, os vizinhos ficam
      // mais baixos e a fila parece desalinhada.
      className="@container group relative flex h-full cursor-pointer select-none items-center gap-4 overflow-hidden rounded-xl border bg-card p-4 transition-colors focus-within:border-primary/50 hover:border-primary/50"
    >
      {/* Brilho que nasce do escudo no hover · o verde entra como luz, não como
          preenchimento, que é a regra da marca. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/0 blur-2xl transition-colors duration-300 group-hover:bg-primary/15"
      />

      {/* A âncora cobre o card inteiro · é ela que faz qualquer ponto levar ao
          club, sem envolver o resto do conteúdo. */}
      <Link to={path} aria-labelledby={labelId} className="absolute inset-0 z-0" />

      {/* **Menor num card estreito, e o motivo é o nome.** O escudo é o maior
          consumidor de largura do card, e a informação que o card existe pra
          mostrar é o nome · com 64px de escudo sobravam ~96px pro título, e aí
          o `break-words` partia a palavra no meio ("PIPOKET" numa linha e "S"
          na outra). Apontado pelo Eduardo olhando a captura de 320.

          **A pergunta é a largura DO CARD, e ela deixou de ser a da janela em
          27/08/2026** · o `sm:` respondia pela janela, e a 640px é justamente
          onde a grade vira duas colunas: o card ficava **mais estreito** e
          ganhava o escudo **maior**, no mesmo pixel. Era o defeito medido em
          04/08 · o card cortava o nome a 320, 360, 640 e 1280, e **subir de
          largura piorava**, que é o sintoma de quem responde à janela errada.
          Com `@container` no card, o escudo cresce quando **ele** tem 22rem ·
          o valor é medido: no `xl` de três colunas o card dá ~380px e continua
          com o escudo grande, e nas duas colunas dá ~290px e fica com o
          pequeno. */}
      <ClubCrest
        tag={tag}
        crestUrl={crestUrl}
        className="pointer-events-none relative h-12 w-12 text-lg @min-[22rem]:h-16 @min-[22rem]:w-16 @min-[22rem]:text-xl"
      />

      <span className="pointer-events-none relative min-w-0 flex-1">
        {/* `truncate` traz `white-space: nowrap`, então o **min-content deste
            título é o nome inteiro**. Item de grid nasce com `min-width: auto`
            e trilha `auto` cresce até o min-content · por isso um club de nome
            comprido esticava a coluna e vazava 6px a 320px, medido. O conserto
            mora na trilha (`minmax(0,1fr)`), não aqui: `min-w-0` no meio do
            caminho deixa o item encolher ao *flexionar* e não muda o que ele
            contribui pro cálculo da grade. */}
        <span className="flex items-center gap-1.5">
          {/* **Quebra em duas linhas, como o `ClubIdentity` desde 30/07** ·
              reticências num nome de club escondem justamente o que identifica
              o time. Aqui isso ficou como `truncate` por quatro dias, e as duas
              telas mostravam o mesmo nome de dois jeitos.

              O que fez a diferença virar defeito foi a medição de 04/08 nas 21
              larguras: o card corta a **320, 360, 640 e 1280**, e **não** corta
              entre 375 e 430 · são os breakpoints da grade (2 colunas a partir
              de 640, 3 a partir de 1280) deixando o card mais estreito do que
              ele é no celular. Subir de largura piorava, que é o tipo de
              comportamento que ninguém procura.

              `line-clamp` e não `truncate`: o segundo traz `nowrap` e por isso
              nunca quebra. O `title` fica, pro caso absurdo que nem em duas
              linhas cabe. */}
          <span
            id={labelId}
            title={name}
            className="line-clamp-2 min-w-0 break-words font-display text-lg uppercase leading-none tracking-tight"
          >
            {name}
          </span>
          {/* Favorito é uma estrela ao lado do nome, não um selo escrito. O
              selo com a palavra, somado ao de DONO, comia metade da largura e
              truncava justamente o nome do club · que é a informação que o
              card existe pra mostrar. */}
          {isPrimary && (
            <Star
              className="h-3.5 w-3.5 shrink-0 fill-current text-primary"
              aria-label={t('club.favorite')}
            />
          )}
        </span>
        {/* **Duas linhas, e a divisão é de significado, não de espaço.**
            Pedido do Eduardo em 09/08/2026, e ela é a mesma dos três tons do
            `Badge`:

            - **em cima, quem é o club e quem você é nele** · a tag e o papel.
              São as duas coisas verdes, e as duas respondem sobre a **relação**;
            - **embaixo, o fato** · plataforma e elenco, em cinza.

            **São quatro selos no máximo, e nunca mais que isso hoje** · o papel
            só existe em "meus clubs" (na vitrine você não tem vínculo), então lá
            a primeira linha tem um só. O favorito **não** conta: ele é a estrela
            ao lado do nome, e virou estrela porque como selo escrito comia a
            largura do próprio nome do club. */}
        <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {/* **Os selos daqui eram escritos à mão e discordavam entre si** · um
              `rounded`, um `rounded-full` com borda, e um terceiro sem caixa.
              Hoje são o `Badge` do produto, como no card de player. */}
          <Badge variant="success" size="sm">
            {tag}
          </Badge>
          {/* **Verde contornado, e colado na tag** · o papel diz qual é a **sua**
              relação com este club, que é a informação mais forte da linha pra
              quem está olhando a própria lista. Em cinza e no meio dos outros
              ele sumia · apontado pelo Eduardo em 09/08/2026. */}
          {role && (
            <Badge variant="brand" size="sm" icon={role === 'owner' ? Crown : UserRound}>
              {t(ROLE_KEY[role])}
            </Badge>
          )}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {/* **Dentro do `Badge`, com a variante sem caixa** · o `PlatformMark`
              traz um quadrado chanfrado próprio, e ele era o único selo com
              forma e altura diferentes das outras. Mesma solução do card de
              player.
              Com o nome ao lado, não só o ícone · o card tem largura de sobra e
              ícone sozinho obriga a decorar quatro desenhos pra ler uma
              informação que cabe escrita.

              **Ele passou a dizer também se dá pra jogar junto** (10/08/2026,
              ideia do Eduardo) · e aqui isso é informação **nova**, não uma
              fusão: o card de player já tinha a ressalva de geração e este não
              tinha nenhuma. Quem abria a vitrine lia "PS4" e precisava saber a
              própria geração pra cruzar as duas na cabeça, em cada card · que é
              exatamente a pergunta que traz alguém a uma lista de clubs.

              **Quem carrega a resposta é a cor, sem palavra** · decisão do
              Eduardo. São os mesmos três estados do card de player, e o
              terceiro é o que impede o cinza de significar duas coisas: âmbar
              não dá, branco dá, cinza apagado é quem ainda não disse onde joga.
              O texto de leitor de tela existe pra a informação não ser **só**
              cor, e o `title` fica com o porquê no ponteiro.

              As frases são as **do bloco de club**, e não cópias novas · a
              página do club já diz isso com essas palavras, e o card é a mesma
              informação uma tela antes. */}
          <Badge
            size="sm"
            variant={
              generation === 'other' ? 'warning' : generation === 'same' ? 'strong' : 'default'
            }
            title={generationHint}
          >
            <PlatformMark platform={platform} withLabel variant="plain" />
            {generationHint && <span className="sr-only">{generationHint}</span>}
          </Badge>
          {/* Número **com a unidade junto**, na ordem em que se fala. Duas
              versões anteriores não liam: um ícone de duas pessoas ao lado de um
              número (que podia ser elenco, seguidor ou partida) e depois o mesmo
              com a unidade antes do número, que inverte a ordem natural da fala
              e parece rótulo de campo. */}
          <Badge size="sm" icon={Users} className="tabular-nums" title={t('club.squadCountLong')}>
            {memberCount === 0
              ? t('club.squadNone')
              : memberCount === 1
                ? t('club.squadOne')
                : t('club.squadMany', { count: memberCount })}
          </Badge>
        </span>
      </span>

      {/* Só as ações à direita. Selo é informação e desceu pra linha de dados ·
          o canto direito de um card é o lugar mais caro dele, e informação
          ocupando esse lugar empurra o nome pra fora. Foi o que aconteceu:
          FAVORITO e DONO juntos comiam metade da largura e o nome do club, que
          é o que o card existe pra mostrar, virava três letras e reticências. */}
      <span className="relative z-10 flex shrink-0 items-center gap-1 self-start">
        {/* Favoritar aparece só no que **ainda não é** favorito · botão que já
            está no estado que promete é botão que não faz nada. */}
        {onFavorite && !isPrimary && (
          <button
            type="button"
            onClick={onFavorite}
            // O menu de contexto do desktop dispara **este botão**, como já faz
            // com o de configurar · assim o menu não precisa conhecer o estado
            // do favorito nem o diálogo, e o item some sozinho onde o botão não
            // existe (no club que já é favorito, e na vitrine).
            data-club-favorite
            aria-label={t('club.setFavorite')}
            // `touch-target` porque a caixa é de 28px e deve continuar sendo ·
            // sem ele a regra de ponteiro grosso a esticava pra 28x44, e o
            // botão de configurar ao lado é um `Link`, então só este dos dois
            // desalinhava. O alvo de 44px continua, desenhado por fora.
            className="touch-target inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star className="h-4 w-4" aria-hidden />
          </button>
        )}
        {/* Atalho de quem configura · dono **e gerente** desde 31/07/2026. Ele
            existe aqui **e** no menu de contexto do desktop · a regra do menu é
            ser atalho pra ação visível, nunca esconderijo pra ação que só
            existe lá. */}
        {leadsClub(role) && (
          <Link
            to={`${path}/editar`}
            data-club-config
            aria-label={t('club.configure')}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Settings className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </span>
    </div>
  );
}
