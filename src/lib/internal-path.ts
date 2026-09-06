/**
 * **Destino de navegação que veio de fora só vale se for daqui de dentro.**
 *
 * O gatilho foi o advisory do `react-router` ([GHSA-wrjc-x8rr-h8h6]): até o
 * 7.18.0, um `to` começando com contrabarra vira endereço **externo**, porque o
 * navegador normaliza `\\` pra `//` e `//host` é protocolo-relativo. O
 * `<Link>` e o `useNavigate` não filtravam isso.
 *
 * **Subir a versão fecha aquele buraco e não fecha este** · a versão nova
 * resolve o caso da contrabarra, e um `to` explicitamente externo
 * (`https://…`, `//host`) continua sendo navegação válida pro router. Quem
 * decide se o valor podia vir de fora é quem o consome, e por isso a checagem
 * mora aqui e não na dependência.
 *
 * **Hoje há um consumidor só** · o `from` do `GuestRoute`, que manda a pessoa
 * de volta pra rota que ela tentou abrir antes de entrar. Ele nasce de
 * `location.pathname` do nosso próprio router, então **não é alcançável hoje**
 * · o que se está travando é o dia em que alguém achar prático guardar aquele
 * destino na query string, que é exatamente como esse defeito nasce em todo
 * lugar onde ele já nasceu.
 *
 * [GHSA-wrjc-x8rr-h8h6]: https://github.com/advisories/GHSA-wrjc-x8rr-h8h6
 */
export function internalPathOr(candidate: string | undefined, fallback: string): string {
  return isInternalPath(candidate) ? candidate : fallback;
}

/**
 * Caminho interno é **uma** barra seguida de coisa que não é barra nem
 * contrabarra. Tudo o mais sai daqui: `//host` e `/\host` são
 * protocolo-relativos, `\host` o navegador normaliza, e `https://host` dispensa
 * explicação.
 */
function isInternalPath(candidate: string | undefined): candidate is string {
  if (!candidate) return false;
  if (candidate[0] !== '/') return false;
  return candidate[1] !== '/' && candidate[1] !== '\\';
}
