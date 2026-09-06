import { capacityOf, displayStatusOf, effectiveSize, registrationIsOpen } from '@ggclubs/schemas';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import type { TournamentRecord } from '@/lib/api';
import { formatCents } from '@/lib/format';
// **Com HORA** · a inscrição abre às 19h, e "03 de set" faz parecer que já abriu.
import { formatMatchTime } from '@/lib/tournament-format';
import { cn } from '@/lib/utils';

/**
 * A porta de quem ainda não tem conta · **só na página aberta.**
 *
 * Ela é o oposto do painel de inscrever: ali a pessoa opera, aqui ela **decide
 * se entra no produto**. A regra que manda em cada palavra é a do Eduardo ·
 * *"não pode ter fricção até assinar de fato"* · então o botão promete **o
 * campeonato**, e não o formulário, e o `?criar=1` abre o cadastro em vez da
 * tela de entrar.
 *
 * **Ela aparece duas vezes na página**, e o segundo não repete o primeiro · é a
 * escada de botões que a landing aprendeu em 10/08: em cima o motivo, embaixo a
 * ação, pra quem rolou a página inteira convencido não ficar sem o que apertar.
 */
export function TournamentSignUpCta({
  tournament,
  placement,
}: {
  tournament: TournamentRecord;
  placement: 'top' | 'bottom';
}) {
  const { t } = useTranslation();
  const top = placement === 'top';
  // **A premiação sai de UM lugar só** · seis telas derivavam este número por
  // conta própria e discordavam entre si, então o card anunciava um prêmio e a
  // página que recebia o clique anunciava outro. Ver `effectiveSize` · e é ele
  // que decide se o número é o congelado do sorteio ou o anunciado.
  //
  // (Esta linha dizia "o degrau efetivo, e não `sizes[0]`" · desde 04/09/2026 o
  // degrau efetivo **é** o `sizes[0]` antes do sorteio, e o contraste virou
  // mentira. Quem escolhe continua sendo um lugar só, que era o ponto.)
  const prize = effectiveSize(tournament)?.prize.first ?? 0;
  const left = Math.max(capacityOf(tournament) - tournament.registeredCount, 0);
  /**
   * **Quem abre e fecha a porta é a JANELA DE DATAS**, e não o status · a regra
   * está escrita no `registrationIsOpen` desde 22/08/2026, e este bloco era o
   * quinto lugar que a furava (pendência 174).
   *
   * O caso não é raro, é o **mais comum**: fechar a inscrição é ato manual, então
   * toda edição passa por uma janela em que o prazo venceu e o status ainda é
   * `open`. Nela, esta CTA vendia · a pessoa criava conta, criava club, e o
   * servidor recusava.
   */
  /**
   * **Não dá pra inscrever agora** tem TRÊS causas, e a copy afirmava uma.
   *
   * Este booleano respondia *"a inscrição está aberta?"* e a frase dizia *"esta
   * edição já fechou"* · então a edição publicada com a abertura marcada pra
   * daqui a pouco anunciava que tinha acabado. Achado pelo Eduardo em
   * 03/09/2026, com a Copa de Estreia no ar e 45 minutos pra abrir.
   *
   * É a mesma família do resto do dia: **um campo que parece responder e não
   * responde**. Quem separa as três é o `displayStatusOf`, que já existia.
   */
  const shown = displayStatusOf(tournament);
  const notYet = shown === 'notYetOpen';
  /**
   * **A terceira causa, e ela morava DENTRO do `closed`** · o comentário acima
   * já dizia "três causas, e a copy afirmava uma", e o conserto de 03/09 tratou
   * duas: sobrou a edição **lotada com a inscrição ainda aberta**, que anunciava
   * *"esta edição já fechou"* na superfície de aquisição.
   *
   * É a pior das quatro faces do defeito porque manda o visitante embora **de
   * uma edição em que a vaga pode voltar**: reserva que vence sem pagamento
   * devolve o lugar pro bolo, medido em 04/09/2026.
   *
   * **`full` continua se comportando como `closed`** em tudo o que não é texto ·
   * a moldura, o sumiço do topo e o botão de ver outras edições. O que muda é a
   * frase saber qual das causas barrou.
   */
  const full = left === 0 && registrationIsOpen(tournament) && !notYet;
  const closed = (!registrationIsOpen(tournament) && !notYet) || left === 0;
  /**
   * **Cancelada não é fechada, e a página dizia que era** · 19/08/2026, achado
   * pelo Eduardo abrindo o link direto de uma edição cancelada.
   *
   * Ela caía no ramo `closed` e anunciava *"esta edição já fechou · fique de
   * olho na próxima"* · uma frase que descreve inscrição encerrada, dita numa
   * edição que **não vai acontecer**. O selo no topo dizia cancelado e o bloco
   * que a pessoa lê pra decidir dizia outra coisa.
   *
   * **E ela continua abrindo, de propósito** · o link já circulou no Discord e
   * pode estar na conversa de quem se inscreveu. Um não-encontrado ali lê como
   * "o link quebrou" e deixa a pessoa sem a única informação que importa.
   */
  const cancelled = tournament.status === 'cancelled';

  /**
   * **Edição fechada desenha o aviso UMA vez, e é no fim** · até 18/08/2026 ela
   * desenhava duas, com texto e botão idênticos, porque o ramo `closed` ignora
   * o `placement`.
   *
   * **Sair pelo topo é a decisão**, e não pelo rodapé: a de cima era a
   * **segunda coisa** que o visitante lia depois do nome da edição, numa página
   * que é canal de aquisição · dizer "acabou" antes de mostrar a chave é
   * desligar quem acabou de chegar. O estado continua visível lá em cima, no
   * selo e na barra cheia da capa.
   *
   * Quem rola até o fim leu premiação, formato e a chave inteira · aí a saída
   * pra próxima edição é o passo seguinte, e não um beco.
   */
  /**
   * **A cancelada inverte o lugar do aviso, e é o mesmo raciocínio ao
   * contrário.** A regra acima existe porque numa edição que fechou ainda há
   * produto a mostrar · premiação, formato e a chave. Numa cancelada não há: o
   * único fato que importa é que ela não vai acontecer, e enterrá-lo no fim de
   * uma página de treze telas é deixar a pessoa ler tudo pra descobrir no
   * rodapé. Ela aparece **só no topo**, e não nos dois, senão volta a
   * duplicata que 18/08 desfez.
   */
  if (cancelled) {
    if (!top) return null;
  } else if (closed && top) return null;

  return (
    <section
      className={cn(
        'rounded-xl border p-5 sm:p-6',
        closed ? 'border-border bg-card' : 'border-primary/30 bg-primary/5',
      )}
    >
      <h2 className="font-display text-lg uppercase text-foreground sm:text-xl">
        {cancelled
          ? t('tournament.ctaCancelledTitle')
          : notYet
            ? t('tournament.ctaNotYetTitle')
            : full
              ? t('tournament.ctaFullTitle')
              : closed
                ? t('tournament.ctaClosedTitle')
                : top
                  ? t('tournament.ctaTopTitle')
                  : t('tournament.ctaBottomTitle')}
      </h2>

      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
        {cancelled
          ? t('tournament.ctaCancelledBody')
          : notYet
            ? t('tournament.ctaNotYetBody', {
                when: formatMatchTime(tournament.registrationOpensAt),
              })
            : full
              ? t('tournament.ctaFullBody')
              : closed
                ? t('tournament.ctaClosedBody')
                : top
                  ? // O argumento de cima é o **produto**: o club já existe aqui, então
                    // inscrever é um clique · é a vantagem que a leitura do rival
                    // apontou, dita em uma frase.
                    t('tournament.ctaTopBody')
                  : // O de baixo é a **conta**: quem leu premiação, formato e
                    // regulamento já sabe o que é, e o que falta é o número.
                    // `count` e não `spots` · é ele que escolhe entre `_one` e
                    // `_other`, e sem ele a frase dizia "1 vagas de pé".
                    t(prize > 0 ? 'tournament.ctaBottomBody' : 'tournament.ctaBottomNoPrize', {
                      prize: formatCents(prize),
                      count: left,
                    })}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {closed ? (
          <Button asChild variant="ctaOutline">
            <Link to="/campeonatos">{t('tournament.ctaSeeOthers')}</Link>
          </Button>
        ) : (
          <>
            {/* **Um `cta` sólido por tela**, e ele é o de cima · o de baixo é
                contornado, pela regra da escada de botões do `design.md`. */}
            <Button asChild variant={top ? 'cta' : 'ctaOutline'}>
              <Link to="/login?criar=1">{t('tournament.createAccountToJoin')}</Link>
            </Button>
            {top && (
              <Button asChild variant="ghost">
                <Link to="/login">{t('tournament.signInToJoin')}</Link>
              </Button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
