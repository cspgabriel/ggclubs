import { onDeployDetected } from '@/lib/app-version';
import { createCheckGate } from '@/lib/check-gate';
import { checkForUpdate, onFocusChange, type UpdateInfo } from '@/lib/desktop';

/**
 * **Quando o app instalado pergunta ao updater se saiu versão nova.**
 *
 * Até 06/09/2026 era uma vez só, na montagem · e o app fica na bandeja quando a
 * janela fecha, então "montagem" podia ser uma vez por semana. Quem deixava o
 * app aberto nunca descobria que saiu versão nova, e o docblock da faixa dizia
 * que o aviso de atualização era o que justificava a bandeja.
 *
 * ## Três gatilhos, nenhum relógio de rotina
 *
 * | gatilho | o que ele cobre |
 * |---|---|
 * | a **montagem** | quem acabou de abrir o app |
 * | a janela **volta ao foco** | quem trouxe o app da bandeja, restaurou ou voltou por alt-tab · é quem vai ver a faixa |
 * | o canal **volta depois de uma troca de servidor** | um deploy aconteceu · é o único sinal que alcança o app **escondido na bandeja**, e é o que faz o balão valer |
 *
 * **O sinal de deploy só existe enquanto o canal está de pé** · quem o produz
 * é o `RealtimeProvider`, montado nas cascas de `/app` e `/admin`. Um app
 * minimizado em `/login` ou numa página pública não tem canal e não tem esse
 * gatilho: ele descobre no próximo foco, como antes.
 *
 * **Foco, e não `visibilitychange`.** É a regra da casa pro desktop (o sininho
 * já a segue): a janela pode estar atrás de outra ou escondida na bandeja e o
 * WebView nem sempre conta isso como oculto · quem sabe é o shell, e
 * `onFocusChange` é o adaptador dele. O `show_main` do Rust chama `set_focus`
 * ao trazer a janela da bandeja, então voltar da bandeja **é** um ganho de foco.
 *
 * **Sem polling, e a ausência é decisão.** Intervalo batendo no CDN por app
 * aberto pagaria uma requisição por minuto pra uma coisa que muda poucas vezes
 * por mês, e o caso que ele cobriria (janela em foco por horas sem alt-tab) é
 * quem está usando o produto · a faixa chega no próximo foco.
 *
 * ## O sinal de deploy olha três vezes
 *
 * A ordem de publicação é a API subir primeiro (é o restart dela que produz o
 * sinal) e o instalador do desktop **depois**, minutos depois · quando o sinal
 * chega, o `latest.json` quase sempre ainda é o antigo. Gastar o sinal numa
 * resposta negativa deixaria o app na bandeja na versão velha, que é o caso
 * que este módulo existe pra resolver. Então um sinal que não acha nada agenda
 * mais duas olhadas (`DEPLOY_RECHECK_DELAYS_MS`) · **é um sinal com três
 * olhadas, não um relógio**: sem deploy, nada dispara.
 *
 * ## Depois de achar, continua conferindo · e avisa uma vez por versão
 *
 * O app roda semanas na bandeja: achou a 1.4.0, a pessoa dispensou, sai a
 * 1.4.1 corrigindo falha. Travar no primeiro achado deixaria o `Update` do
 * updater apontando pro artefato daquele dia · instalar na sexta instalaria o
 * de segunda. "Não repetir o balão" e "nunca mais revalidar o alvo" não são a
 * mesma decisão: o balão sai uma vez **por versão**, e a instalação é sempre
 * a mais nova que se sabe.
 */

/**
 * Piso entre duas conferências · alt-tab é gesto que se repete, e a resposta
 * do CDN não muda de segundo em segundo. O sinal de deploy pula o piso: ele
 * chega uma vez por deploy.
 */
export const MIN_INTERVAL_MS = 60_000;

/**
 * Quanto depois de um sinal de deploy que não achou nada o app olha de novo ·
 * o `desktop:build` leva minutos, e a publicação vem depois dele.
 */
export const DEPLOY_RECHECK_DELAYS_MS = [5 * 60_000, 15 * 60_000];

/** `away` diz se a janela estava atrás quando a versão apareceu · é quem decide o balão. */
export type UpdateFound = { update: UpdateInfo; away: boolean };

/** A versão mais nova que se sabe, com o `Update` mais recente dela. */
let latest: UpdateInfo | null = null;
/**
 * Nasce `true` de propósito: enquanto o shell não respondeu, assumir que a
 * janela está na frente é o lado que **não** dispara balão em cima de quem já
 * está olhando a faixa.
 */
let focused = true;

const gate = createCheckGate(async () => {
  const result = await checkForUpdate();
  if (result) latest = result;
  return result;
}, MIN_INTERVAL_MS);

/**
 * Liga os três gatilhos e entrega o achado a quem desenha · a faixa chama uma
 * vez, e uma remontagem dela recebe o que já foi achado sem perguntar de novo.
 */
export function watchForUpdate(onFound: (result: UpdateFound) => void): () => void {
  let stopped = false;
  let reportedVersion: string | null = null;
  const disposers: Array<() => void> = [];
  const rechecks: Array<ReturnType<typeof setTimeout>> = [];

  // **Uma vez por versão.** Os gatilhos continuam ligados depois do achado, e
  // o mesmo número voltando (cada foco, cada deploy) não é notícia · sem esta
  // trava, cada deploy com o app na bandeja seria um balão novo dizendo a
  // mesma versão.
  const report = (update: UpdateInfo | null) => {
    if (!update || stopped || update.version === reportedVersion) return;
    reportedVersion = update.version;
    onFound({ update, away: !focused });
  };

  const cancelRechecks = () => {
    for (const timer of rechecks) clearTimeout(timer);
    rechecks.length = 0;
  };

  const onDeploy = () => {
    cancelRechecks();
    void gate.check({ force: true }).then((result) => {
      report(result);
      if (result || stopped) return;
      for (const delay of DEPLOY_RECHECK_DELAYS_MS) {
        rechecks.push(
          setTimeout(() => {
            if (stopped) return;
            void gate.check({ force: true }).then((found) => {
              report(found);
              if (found) cancelRechecks();
            });
          }, delay),
        );
      }
    });
  };

  // **O estado inicial do foco vem antes da primeira pergunta.** O shell
  // responde `isFocused()` pelo mesmo caminho, e num boot pelo autostart a
  // janela nasce escondida na bandeja · se a montagem perguntasse ao updater
  // antes dessa resposta, o achado sairia como "na frente": sem balão, com a
  // faixa numa janela que ninguém vê. Na web o adaptador devolve na hora.
  const focusKnown = onFocusChange((next) => {
    const regained = next && !focused;
    focused = next;
    if (regained && !stopped) void gate.check().then(report);
  })
    .then((off) => {
      if (stopped) off();
      else disposers.push(off);
    })
    // Sem resposta do shell, vale o padrão (`focused = true`) · a pergunta
    // da montagem não pode depender de o adaptador ter funcionado.
    .catch(() => undefined);

  void focusKnown.then(() => {
    if (stopped) return;
    if (latest) report(latest);
    void gate.check().then(report);
    // O gatilho de deploy entra **depois** do foco pelo mesmo motivo: um sinal
    // avaliado contra o padrão sairia "na frente". O que chegar antes disto é
    // coberto pela pergunta da montagem, que sai na mesma passada.
    disposers.push(onDeployDetected(onDeploy));
  });

  return () => {
    stopped = true;
    cancelRechecks();
    for (const off of disposers) off();
  };
}

/** Só pros testes · o estado é de módulo. */
export function resetUpdateWatch(): void {
  latest = null;
  focused = true;
  gate.reset();
}
