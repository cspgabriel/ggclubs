import { zodResolver } from '@hookform/resolvers/zod';
import {
  DISPLAY_NAME_MAX,
  HANDLE_MAX,
  PLAYER_BIO_MAX,
  updateProfileInput,
  type UpdateProfileInput,
} from '@ggclubs/schemas';
import { Check, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { BrandWatermark } from '@/components/brand';
import { DesktopSettings } from '@/components/desktop/app-settings';
import { AccountDownloadSection } from '@/components/desktop/account-download';
import { PreviewBlock, StickyAside } from '@/components/ui/sticky-aside';
import { PlayerIdentity } from '@/components/player/player-identity';
import { PlatformPicker } from '@/components/club/platform-picker';
import { PositionChips } from '@/components/club/position-picker';
import { PhoneFormField } from '@/components/phone-field';
import { phoneIsValid } from '@/lib/phone-input';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CharCount } from '@/components/ui/char-count';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { PageStack } from '@/components/ui/page-stack';
import { SaveBar } from '@/components/ui/save-bar';
import { SectionTitle } from '@/components/ui/section-title';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import { appPlayerPath } from '@/lib/paths';
import { MAX_CLUBS_PER_PLAYER } from '@/lib/clubs';
import { useMyClubs } from '@/lib/use-my-clubs';
import { useAuth } from '@/lib/use-auth';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useImagePicker } from '@/lib/use-image-picker';
import { isDesktop } from '@/lib/platform';

type HandleState = 'idle' | 'checking' | 'free' | 'taken';

/**
 * Configurar a própria conta · a tela que o produto não tinha.
 *
 * **O `PATCH /me/profile` existia desde sempre com zero chamadores** (pendência
 * 36): depois do onboarding ninguém trocava nome, @nick, plataforma, posição ou
 * avatar pela interface. O produto tinha edição de **club** e não tinha edição
 * de **conta**, e a consequência era medível · nenhum usuário da base tinha
 * posição de perfil, porque não havia onde preencher.
 *
 * **A chave do `discoverable` mora aqui** (pendência 34), e era a única coisa
 * que faltava pra ela: o campo existe no banco desde 04/08, nasce ligado, a
 * busca já filtra por ele e o input já o aceita. Faltava o controle.
 */
export function AccountPage() {
  const { t } = useTranslation();
  const { account, refreshAccount } = useAuth();

  const [handleState, setHandleState] = useState<HandleState>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useDocumentTitle(t('account.title'));

  /**
   * **Esta tela revalida a conta ao montar, e ela é a exceção da regra.**
   *
   * A regra da casa é que dado de sessão sai do `AuthProvider` e tela não refaz
   * `GET /me` · ela existe porque cinco telas pediam a mesma coisa por conta
   * própria. **Aqui a pergunta é outra:** esta tela mostra preferências que
   * podem ter mudado **fora do app**, e o descadastro por e-mail é exatamente
   * isso · quem clica em "não quero mais receber" costuma estar no celular, no
   * cliente de e-mail, com o app aberto noutro lugar.
   *
   * **O que isso custava, achado pelo Eduardo em 21/08/2026:** ele descadastrou
   * pelo rodapé, voltou pra cá e a chave dizia **ativo**. E o desfecho é pior
   * que a informação errada · o formulário manda o que está no estado, então
   * **salvar qualquer outra coisa religaria o e-mail que ele acabou de
   * desligar**.
   *
   * **Ao montar, e não a cada mudança** · com o formulário aberto, recarregar é
   * pior que dado velho (é a regra do `useMyClubsSnapshot`), e o `values` do
   * `react-hook-form` sobrescreveria o que a pessoa digitou. Aqui não há nada
   * digitado ainda.
   */
  useEffect(() => {
    void refreshAccount();
    // Uma vez por montagem · o `refreshAccount` é estável, e pô-lo na lista
    // faria isto virar laço se ele deixar de ser.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const avatar = useImagePicker('user_avatar');

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileInput),
    values: account
      ? {
          displayName: account.displayName,
          handle: account.handle,
          avatarUrl: account.avatarUrl ?? null,
          platform: account.platform ?? null,
          position: account.position ?? null,
          bio: account.bio ?? null,
          phone: account.phone ?? null,
          lookingForClub: account.lookingForClub,
          discoverable: account.discoverable,
          emailNotifications: account.emailNotifications,
        }
      : undefined,
  });

  const handle = form.watch('handle') ?? '';
  const platform = form.watch('platform');
  const position = form.watch('position');
  const discoverable = form.watch('discoverable') ?? true;
  // `?? true` pelo mesmo motivo do `discoverable` · conta criada antes do campo
  // existir recebe e-mail, e o default tem que concordar com o `$ne: false` que
  // o servidor usa pra escolher quem notificar.
  const emailNotifications = form.watch('emailNotifications') ?? true;
  const lookingForClub = form.watch('lookingForClub') ?? false;
  const avatarUrl = form.watch('avatarUrl') ?? null;

  /**
   * Quantos clubs ativos você tem · sai do contexto, nunca de um `GET` próprio.
   * É a regra de dado de sessão do `CLAUDE.md`.
   *
   * **A recarga também vem de lá**, e é o que essa mudança tem de melhor: o
   * aviso do teto afirma um número, e número afirmado envelhece · aceitar um
   * convite noutra guia, ou ser tirado de um club, muda este cálculo. Quem ouve
   * `user.membership` é o provider, uma vez, em vez de cada tela por conta.
   */
  const { atCap: atClubCap } = useMyClubs();

  /**
   * **O @nick atual e os antigos dela são dela**, e a consulta pública não sabe
   * disso: `handle-available` responde por endereço, sem sessão, então ela diz
   * "indisponível" pro nick que a pessoa acabou de largar · que é o certo pra
   * qualquer um **menos** pra quem largou. Sem esta exceção, quem trocasse por
   * engano veria a tela recusar o próprio nick de volta.
   */
  const mine = new Set([account?.handle, ...(account?.previousHandles ?? [])].filter(Boolean));

  useEffect(() => {
    // **Sem a conta não dá pra saber o que é meu**, e perguntar assim mesmo é o
    // que produzia o defeito abaixo · o `account` fica nulo por um instante a
    // cada `refreshAccount()`.
    if (!account) {
      setHandleState('idle');
      return;
    }
    if (mine.has(handle)) {
      setHandleState('idle');
      return;
    }
    if (!updateProfileInput.shape.handle.safeParse(handle).success) {
      setHandleState('idle');
      return;
    }

    /**
     * **O `AbortController` aqui não é zelo, é o conserto de um defeito real.**
     *
     * Salvar chama `refreshAccount()`, e durante ele o `account` fica nulo por
     * um instante · o efeito redisparava sem saber quais nicks são meus, partia
     * uma consulta por "admin", e a resposta (**indisponível**, porque o nick é
     * dele mesmo) chegava **depois** do efeito seguinte já ter voltado pra
     * `idle`. Resultado: quem só marcou uma chave e salvou lia "Esse nick já foi
     * levado" sem ter tocado no campo. Achado pelo Eduardo em 08/08/2026.
     *
     * É a regra do `CLAUDE.md` que eu tinha furado: busca de tela leva
     * `AbortController` cancelado no cleanup, **justamente** pra uma resposta
     * atrasada não sobrescrever uma mais nova.
     */
    const ctrl = new AbortController();
    setHandleState('checking');
    // Espera a digitação parar · sem isso é uma chamada por tecla.
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const { available } = await api.handleAvailable(handle, { signal: ctrl.signal });
          if (!ctrl.signal.aborted) setHandleState(available ? 'free' : 'taken');
        } catch {
          if (!ctrl.signal.aborted) setHandleState('idle');
        }
      })();
    }, 400);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
    // `mine` é derivado da conta e nasce novo a cada render · o que importa é o
    // conteúdo, e ele só muda quando a conta muda. O `previousHandles` entra
    // pela **forma serializada** porque o array vem novo a cada `/me`, e a
    // identidade dele redisparava o efeito de graça.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, account?.handle, (account?.previousHandles ?? []).join('|')]);

  const dirty = form.formState.isDirty || avatar.picked !== null;
  // **Número fora do padrão trava o salvar** · o campo mostra o motivo em
  // vermelho. Vazio passa: o telefone é opcional aqui e cobrado na inscrição.
  const typedPhone = form.watch('phone') ?? null;
  const phoneBlocked = typedPhone !== null && !phoneIsValid(typedPhone);

  async function onSubmit(input: UpdateProfileInput) {
    setSubmitError(null);
    setSaved(false);
    try {
      // **A imagem sobe aqui, não na hora em que foi escolhida** · quem desistir
      // da tela não deixa nada no bucket. Com `catch` próprio porque a saída é
      // outra: falha de imagem se resolve trocando a imagem.
      let picked: string | null;
      try {
        picked = await avatar.commit(input.avatarUrl ?? null);
      } catch {
        setSubmitError(t('upload.failed'));
        return;
      }

      await api.updateMyProfile({ ...input, avatarUrl: picked });
      avatar.clear();
      await refreshAccount();
      // **O relógio do "salvo" mora na `SaveBar` desde 08/08/2026** · ele era
      // escrito à mão em cada tela, com o número repetido.
      setSaved(true);
    } catch (err) {
      setSubmitError(apiErrorMessage(err, t));
    }
  }

  if (!account) return null;

  return (
    <PageStack>
      <PageHeader
        title={t('account.title')}
        subtitle={t('account.subtitle')}
        action={
          // A saída pra ver o resultado · é a mesma página que qualquer um vê,
          // e olhar a própria é o jeito mais direto de saber o que ela mostra.
          //
          // **Aponta pra dentro do app**, e não pro endereço público: quem está
          // logado é mandado pra cá de qualquer forma, e um `<a>` pro público
          // custaria um recarregamento inteiro pra terminar na mesma tela.
          <Button asChild variant="outline" size="sm">
            <Link to={appPlayerPath(account.handle)}>{t('account.viewPublic')}</Link>
          </Button>
        }
      />

      {/* **Duas colunas a partir do `lg`, com a prévia à direita.**

          A primeira versão era coluna única com teto de largura, e o Eduardo
          apontou o resultado: campo estreito à esquerda e um vazio enorme no
          resto da tela. Teto de largura resolve a linha longa demais e **não**
          resolve a página · quem resolve é ter o que pôr no espaço, e aqui o que
          cabe é a prévia. É o mesmo desenho da tela de configurar club, e pelo
          mesmo motivo: quem edita identidade quer ver o resultado. */}
      {/* **`minmax(0,1fr)` também na coluna única**, e não só a partir de `lg` ·
          abaixo do breakpoint a grade caía na trilha implícita `auto`, que
          cresce até o **min-content** do filho mais largo. A 320px isso dava
          **7px de vazamento lateral** na página inteira, com as seções medindo
          303 dentro de um container de 272. Achado pelo `pnpm scan:overflow` em
          10/08/2026 · é o mesmo defeito e o mesmo conserto do card de club, que
          já traz o porquê escrito. */}
      <div className="grid gap-6 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
            <section className="rounded-2xl border bg-card p-5 sm:p-6">
              <SectionTitle>{t('account.identity')}</SectionTitle>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>{t('account.avatarLabel')}</Label>
                  <ImageUpload
                    picker={avatar}
                    value={avatarUrl}
                    onChange={(url) => form.setValue('avatarUrl', url, { shouldDirty: true })}
                    preview={
                      <Avatar
                        name={form.watch('displayName') ?? account.displayName}
                        src={avatar.previewUrl ?? avatarUrl}
                        className="h-20 w-20 text-2xl"
                      />
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">{t('account.nameLabel')}</Label>
                  <Input
                    id="displayName"
                    autoComplete="nickname"
                    maxLength={DISPLAY_NAME_MAX}
                    className="h-11"
                    {...form.register('displayName')}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs text-muted-foreground">{t('account.nameHint')}</p>
                    <CharCount value={form.watch('displayName') ?? ''} max={DISPLAY_NAME_MAX} />
                  </div>
                  {form.formState.errors.displayName && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.displayName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="handle">{t('account.handleLabel')}</Label>
                  <div className="relative">
                    {/* O `-translate-y-px` é centro óptico do `@`, medido · ver o
                    onboarding, onde a mesma decisão está explicada por extenso. */}
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex -translate-y-px items-center text-sm leading-none text-muted-foreground">
                      @
                    </span>
                    <Input
                      id="handle"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      maxLength={HANDLE_MAX}
                      className="h-11 pl-7 lowercase"
                      {...form.register('handle', {
                        setValueAs: (v: string) => v.trim().toLowerCase(),
                      })}
                    />
                  </div>
                  {/* **A consequência vem antes do erro**, porque ela é a informação
                  que muda a decisão · trocar o @nick quebra os links que já
                  circulam, e isso não é recuperável depois. */}
                  <p className="text-xs text-muted-foreground">{t('account.handleHint')}</p>
                  <div aria-live="polite">
                    {handleState === 'checking' && (
                      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {t('onboarding.handleChecking')}
                      </p>
                    )}
                    {handleState === 'free' && (
                      <p className="inline-flex items-center gap-1.5 text-xs text-primary">
                        <Check className="h-3 w-3" />
                        {t('onboarding.handleFree')}
                      </p>
                    )}
                    {handleState === 'taken' && (
                      <p className="inline-flex items-center gap-1.5 text-xs text-destructive">
                        <X className="h-3 w-3" />
                        {t('onboarding.handleTaken')}
                      </p>
                    )}
                  </div>
                  {form.formState.errors.handle && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.handle.message}
                    </p>
                  )}
                </div>

                {/* **A frase é a única coisa do perfil que a pessoa escreve.** Sem
                ela a página é uma ficha de seletores · foi o que o Eduardo
                apontou em 08/08/2026 ao chamar o perfil de vazio, e ele estava
                certo. Teto curto pelo mesmo motivo do club: campo de texto
                longo em perfil vira mural sem moderação. */}
                <div className="space-y-2">
                  <Label htmlFor="bio">{t('account.bioLabel')}</Label>
                  <Textarea
                    id="bio"
                    rows={3}
                    maxLength={PLAYER_BIO_MAX}
                    placeholder={t('account.bioPlaceholder')}
                    {...form.register('bio')}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs text-muted-foreground">{t('account.bioHint')}</p>
                    <CharCount value={form.watch('bio') ?? ''} max={PLAYER_BIO_MAX} />
                  </div>
                </div>

                {/* **O telefone mora na identidade e não em Privacidade**, e a
                escolha é deliberada: ali dentro estão as chaves que decidem
                **quem te vê**, e este campo não tem chave nenhuma · ele é
                privado sempre. Pôr um campo sem interruptor no meio de
                interruptores faria a seção prometer um controle que não existe.

                A dica diz que só a organização vê, e pra que serve · é a
                primeira dúvida de quem lê "telefone" num produto de jogo. */}
                <PhoneFormField
                  id="phone"
                  value={form.watch('phone') ?? null}
                  onChange={(v) => {
                    form.setValue('phone', v, { shouldDirty: true });
                  }}
                />
              </div>
            </section>

            <section className="rounded-2xl border bg-card p-5 sm:p-6">
              <SectionTitle>{t('account.inGame')}</SectionTitle>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>{t('account.platformLabel')}</Label>
                  <PlatformPicker
                    name="platform"
                    value={platform ?? null}
                    onChange={(v) => form.setValue('platform', v, { shouldDirty: true })}
                    allowClear
                  />
                </div>

                {/* **A chave que põe a pessoa na vitrine de quem procura club.**
                Ela mora aqui, e não em Privacidade, porque não é sobre quem te
                vê · é uma **declaração** de que dá pra te chamar. Nasce
                desligada pelo mesmo motivo: quem não respondeu não está
                dizendo que quer. */}
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dashed p-3">
                  <Checkbox
                    checked={lookingForClub}
                    onCheckedChange={(v) =>
                      form.setValue('lookingForClub', v === true, { shouldDirty: true })
                    }
                    className="mt-0.5"
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium">
                      {t('account.lookingForClubLabel')}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {t('account.lookingForClubHint')}
                    </span>
                    {/* **Chave ligada que não faz nada é pior que chave desligada**,
                    porque ela afirma · quem está no teto de 3 não conta como
                    disponível em lugar nenhum (pendência 63), e até 08/08/2026 a
                    tela não dizia isso. Apontado pelo Eduardo. */}
                    {lookingForClub && atClubCap && (
                      <span className="block text-xs text-amber-400">
                        {t('account.lookingForClubAtCap', { max: MAX_CLUBS_PER_PLAYER })}
                      </span>
                    )}
                  </span>
                </label>

                <div className="space-y-2">
                  <Label>{t('account.positionLabel')}</Label>
                  {/* Esta é a posição de **identidade** · a de cada club começa nela
                  e é trocável lá dentro, e as duas podem discordar de propósito
                  (o cara é zagueiro e naquele club joga de lateral). */}
                  <PositionChips
                    value={position}
                    onPick={(next) => form.setValue('position', next, { shouldDirty: true })}
                    noneLabel={t('club.positionClear')}
                  />
                  <p className="text-xs text-muted-foreground">{t('account.positionHint')}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border bg-card p-5 sm:p-6">
              <SectionTitle>{t('account.privacy')}</SectionTitle>

              {/* **O vão das chaves mora aqui, e não na `section`** · o
              `SectionTitle` é dono do espaço abaixo dele desde 19/08/2026, e
              `space-y-*` no pai somaria com o dele. O `pnpm scan:spacing`
              reprova exatamente isso. */}
              <div className="space-y-4">
                {/* **A copy não promete invisibilidade, e isso é a decisão inteira
              desta chave** (pendência 34): desligar tira o player da
              **enumeração**, não do **endereço**. Quem tiver o @nick inteiro
              continua chegando na página, e o elenco do club continua listando ·
              prometer o contrário seria a tela mentindo sobre o comportamento,
              que é o defeito que este projeto mais persegue. */}
                <label className="flex cursor-pointer items-start gap-3">
                  <Checkbox
                    checked={discoverable}
                    onCheckedChange={(v) =>
                      form.setValue('discoverable', v === true, { shouldDirty: true })
                    }
                    className="mt-0.5"
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium">
                      {t('account.discoverableLabel')}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {t('account.discoverableHint')}
                    </span>
                  </span>
                </label>

                {/* **Ela desliga o canal, não o aviso**, e a dica precisa dizer isso ·
              quem entende a chave como desligar o aviso inteiro some da caixa do
              sininho na própria cabeça, desliga, e depois reclama de não ter
              sabido do prazo da partida.

              **Sem frase entre aspas neste comentário**, e não é estilo: o
              `pnpm scan:strings` lê o `{…}` do JSX e não distingue comentário de
              texto de tela · uma frase citada aqui reprova a bateria. */}
                {/*

              **Nasce ligada**, ao contrário do `lookingForClub` · o que sai por
              e-mail é prazo, dinheiro e gente esperando resposta, e o padrão de
              não avisar sobre isso seria pior pra pessoa que o de avisar. A
              leitura no servidor é `$ne: false` pelo mesmo motivo do
              `discoverable`: conta antiga continua recebendo em vez de sumir em
              silêncio. */}
                <label className="flex cursor-pointer items-start gap-3">
                  <Checkbox
                    checked={emailNotifications}
                    onCheckedChange={(v) =>
                      form.setValue('emailNotifications', v === true, { shouldDirty: true })
                    }
                    className="mt-0.5"
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium">
                      {t('account.emailNotificationsLabel')}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {t('account.emailNotificationsHint')}
                    </span>
                  </span>
                </label>
              </div>
            </section>

            {submitError && <p className="text-sm text-destructive">{submitError}</p>}

            <SaveBar
              label={t('club.save')}
              dirty={dirty}
              saving={form.formState.isSubmitting}
              saved={saved}
              idleHint={t('club.saveNoChanges')}
              // **Número fora do padrão não salva** · o campo já diz o porquê em
              // vermelho, logo acima. Vazio continua podendo: o telefone é
              // opcional aqui e cobrado na inscrição.
              disabled={handleState === 'taken' || phoneBlocked}
            />
          </form>

          {/* **A seção "Aplicativo" mora fora do formulário** · no app o que
          está ali grava no Windows na hora, e o formulário grava no servidor
          quando a pessoa salva. Misturar os dois faria uma das caixas mentir
          sobre quando ela vale.

          **Do navegador a mesma seção é a porta pro app** · e ela própria
          decide se aparece (só no Windows). */}
          {isDesktop() ? <DesktopSettings /> : <AccountDownloadSection />}
        </div>

        {/* **A prévia acompanha a rolagem** · o formulário é comprido (a grade de
          posições sozinha ocupa meia tela), e uma prévia que sai de vista deixa
          de ser prévia justamente quando a pessoa mexe na posição. Aqui ela
          empilha no celular, e não esconde: esta tela não tem faixa de prévia
          no topo do formulário como a de club tem. */}
        <StickyAside>
          <PreviewBlock title={t('club.previewTitle')} hint={t('account.previewHint')}>
            <div className="relative overflow-hidden rounded-2xl border bg-card p-5">
              <BrandWatermark />
              <div className="relative">
                <PlayerIdentity
                  size="sm"
                  displayName={form.watch('displayName') || account.displayName}
                  handle={handle || account.handle}
                  // A escolha pendente aparece por cima da que está gravada · é o
                  // mesmo contrato do escudo, e é o que faz a prévia não mentir
                  // sobre o que vai ser salvo.
                  avatarUrl={avatar.previewUrl ?? avatarUrl}
                  position={position ?? null}
                />
              </div>
            </div>
          </PreviewBlock>
        </StickyAside>
      </div>
    </PageStack>
  );
}
