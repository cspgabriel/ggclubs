import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Wordmark } from '@/components/brand';
import { LanguageSwitcher } from '@/components/language-switcher';
import { CHANGELOG_PATH, LEGAL_PATH } from '@/lib/paths';

/**
 * O rodapé das telas públicas.
 *
 * ## O que ele carrega, e o que ele **não** carrega
 *
 * Ele era uma linha só (`GGClubs · 2026`), o que é pouco pro rodapé de um
 * produto que se apresenta por link. Mas a tentação aqui é montar quatro colunas
 * de links, e **três quartos deles não existiriam** · rodapé cheio de link morto
 * é pior que rodapé curto, porque ele promete um produto maior do que o que está
 * de pé e a primeira decepção do visitante é um 404.
 *
 * Reúne campeonatos, novidades, acesso à conta, download, documentos legais e
 * idioma.
 *
 * **Os três documentos legais estão no ar desde 13/08/2026** · termos,
 * privacidade e reembolso, na versão 1. Eles não são enfeite de rodapé: a tela
 * de consentimento do Google pede as duas primeiras URLs, e a terceira é o que
 * responde a pergunta de quem está prestes a pagar uma inscrição.
 *
 * O idioma aparece **sempre** aqui, e no header só a partir de 380px · abaixo
 * disso marca, idioma e CTA não cabem na mesma linha, e o idioma é a escolha
 * mais rara das três. Este é o lugar pra onde ele desce.
 */
export function SiteFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t">
      {/*
        **A coluna da marca é larga e as de link são estreitas**, e isso é o que
        conserta o vazio em tela grande. Com marca e links só nas duas pontas de
        um `justify-between`, um monitor de 2560px vira dois blocos pequenos e
        um deserto no meio · a grade distribui, e o `max-w-sm` da marca impede
        que a frase vire uma linha só de ponta a ponta.
      */}
      <div className="container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))] lg:gap-16">
        <div className="max-w-sm">
          <Link to="/" aria-label={t('common.brandName')} className="inline-block">
            <Wordmark />
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {t('footer.tagline')}
          </p>
        </div>

        <nav aria-label={t('footer.product')} className="flex flex-col gap-2.5 text-sm">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('footer.product')}
          </span>
          <Link to="/campeonatos" className="text-muted-foreground hover:text-foreground">
            {t('nav.tournaments')}
          </Link>
          {/* **As novidades ficam ao lado do campeonato**, e não na coluna
              legal: é conteúdo de produto, e é a página que responde quem
              pergunta se um defeito que viu já foi consertado. */}
          <Link to={CHANGELOG_PATH} className="text-muted-foreground hover:text-foreground">
            {t('changelog.title')}
          </Link>
          <Link to="/login" className="text-muted-foreground hover:text-foreground">
            {t('landing.signIn')}
          </Link>
          <Link to="/login?criar=1" className="text-muted-foreground hover:text-foreground">
            {t('common.createAccount')}
          </Link>
          {/* **O rodapé é onde se procura o download depois de já conhecer o
            produto** · a seção da landing pega quem está descobrindo, e este
            link pega quem voltou pra buscar. Ele não some por plataforma: quem
            está no Mac pode estar procurando pra instalar no PC de casa. */}
          <Link to="/download" className="text-muted-foreground hover:text-foreground">
            {t('desktop.downloadLink')}
          </Link>
        </nav>

        <nav aria-label={t('footer.legal')} className="flex flex-col gap-2.5 text-sm">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('footer.legal')}
          </span>
          <Link to={LEGAL_PATH.terms} className="text-muted-foreground hover:text-foreground">
            {t('legal.termsTitle')}
          </Link>
          <Link to={LEGAL_PATH.privacy} className="text-muted-foreground hover:text-foreground">
            {t('legal.privacyTitle')}
          </Link>
          {/* **Ela entra no rodapé porque o produto cobra** · a política de
              reembolso não é letra miúda de contrato, é o que responde a
              pergunta de quem está decidindo pagar uma inscrição. */}
          <Link to={LEGAL_PATH.refund} className="text-muted-foreground hover:text-foreground">
            {t('legal.refundTitle')}
          </Link>
        </nav>
      </div>

      <div className="container">
        <div className="flex flex-col-reverse items-start gap-4 border-t py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            {t('common.brandName')} · {new Date().getFullYear()}
          </span>
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}
