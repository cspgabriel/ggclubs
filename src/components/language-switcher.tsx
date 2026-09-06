import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { activeLanguage } from '@/i18n';
import {
  DEFAULT_LANGUAGE,
  pathInLanguage,
  SUPPORTED_LANGUAGES,
  type Language,
} from '@/i18n/language';
import { cn } from '@/lib/utils';

/**
 * O idioma cujo basename é a raiz · é a forma em que o caminho do router chega
 * aqui, seja qual for o idioma ativo. Não é "o idioma atual", e a diferença é a
 * que quebrou o seletor uma vez.
 */
const ROOT_LANGUAGE = DEFAULT_LANGUAGE;

const LABELS: Record<Language, string> = {
  'pt-BR': 'PT',
  es: 'ES',
};

/**
 * Segmento único em vez de dois botões soltos: com dois idiomas, mostrar as duas
 * opções lado a lado é mais claro que um menu, e o trilho deixa evidente que uma
 * exclui a outra. O ativo NÃO usa verde de propósito · o verde é da marca e da
 * ação principal, e no header ele competiria com o CTA.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation();
  /**
   * **A rota sai do router, não do `window`.**
   *
   * Ela vinha de `window.location` lido no render, e isso ficou errado no dia
   * em que a casca deixou de sumir ao trocar de tela (05/08/2026): o header
   * passou a viver montado entre navegações, então o `href` congelava na
   * primeira rota em que ele foi desenhado. O sintoma foi o Eduardo abrir
   * `/app/clubs/madruga/editar`, voltar pra lista e **ser levado de volta pra
   * tela de editar ao trocar de idioma**.
   *
   * `useLocation` assina o router, então o componente redesenha a cada
   * navegação · é o que faz o endereço acompanhar. Vale pra qualquer peça da
   * casca que precise saber onde a pessoa está.
   *
   * **E ele não é o `window.location` com outro nome**, que foi o erro da
   * primeira tentativa deste conserto: o `BrowserRouter` roda com
   * `basename={LANGUAGE_BASENAME[activeLanguage]}`, então o caminho daqui vem
   * **sem o prefixo do idioma**. Passar ele pra uma função que espera o caminho
   * inteiro corta o prefixo duas vezes · em `/es/app/clubs/x/editar` o botão de
   * PT apontava pra `/p/clubs/x/editar`, e o Eduardo caiu num 404 em minutos.
   *
   * Como ele já vem na forma da raiz, trocar de idioma é **só pôr o prefixo do
   * destino**, e é o que a função faz quando a origem é a raiz.
   */
  const location = useLocation();
  // Filtro e âncora não podem se perder na troca: quem está numa listagem
  // filtrada e muda de idioma espera continuar no mesmo lugar.
  const suffix = location.search + location.hash;

  // Navegação de página inteira, não troca de estado: a URL do idioma precisa
  // mudar pra que link compartilhado e indexação funcionem.
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-secondary/40 p-0.5',
        className,
      )}
      role="group"
      aria-label={t('common.languageLabel')}
    >
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isActive = lang === activeLanguage;
        return (
          <a
            key={lang}
            href={pathInLanguage(location.pathname, ROOT_LANGUAGE, lang) + suffix}
            hrefLang={lang}
            aria-current={isActive ? 'true' : undefined}
            aria-label={t(`common.language.${lang}`)}
            className={cn(
              'touch-target inline-flex min-w-8 items-center justify-center rounded-full px-2 py-1 text-center text-xs font-semibold transition-colors sm:min-w-9 sm:px-2.5',
              isActive
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {LABELS[lang]}
          </a>
        );
      })}
    </div>
  );
}
