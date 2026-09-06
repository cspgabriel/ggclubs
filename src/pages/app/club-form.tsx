import { zodResolver } from '@hookform/resolvers/zod';
import {
  CLUB_BIO_MAX,
  CLUB_NAME_MAX,
  CLUB_TAG_MAX,
  CLUB_TAG_MIN,
  clubTag,
  createClubInput,
  updateClubInput,
  type CreateClubInput,
  type UpdateClubInput,
} from '@ggclubs/schemas';
import { Check, Loader2, SearchX, ShieldOff, WifiOff, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { BrandWatermark } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/loading-state';
import { PageHeader } from '@/components/ui/page-header';
import { CharCount } from '@/components/ui/char-count';
import { Textarea } from '@/components/ui/textarea';
import { InfoTip } from '@/components/ui/tooltip';
import { api, type ClubRecord } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import { leadsClub, MAX_CLUBS_PER_PLAYER } from '@/lib/clubs';
import { useMyClubs, useMyClubsSnapshot } from '@/lib/use-my-clubs';
import { useAuth } from '@/lib/use-auth';
import { ClubCrest } from '@/components/club/club-crest';
import { ImageUpload } from '@/components/ui/image-upload';
import { useImagePicker, type ImagePicker } from '@/lib/use-image-picker';
import { ClubIdentity } from '@/components/club/club-identity';
import { PreviewBlock, StickyAside } from '@/components/ui/sticky-aside';
import { ClubShare } from '@/components/club/club-share';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SaveBar } from '@/components/ui/save-bar';
import { PlatformMark } from '@/components/club/platform-mark';
import { PlatformPicker } from '@/components/club/platform-picker';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useClubTournaments } from '@/lib/use-club-tournaments';
import { TournamentTieNote } from '@/components/club/tournament-tie-note';

type TagState = 'idle' | 'invalid' | 'checking' | 'free' | 'taken';

export function ClubNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { account } = useAuth();
  useDocumentTitle(t('club.createTitle'));

  // **A guarda mora aqui, e não no botão que leva pra cá.**
  //
  // Esconder o CTA resolve o CTA e mais nada: link, favorito, histórico, voltar
  // do navegador e URL digitada chegam nesta tela sem passar por ele. Sem esta
  // conferência, quem está no teto preenchia o formulário inteiro e só então
  // levava `MEMBERSHIP_LIMIT_REACHED` da API · o servidor recusava certo, e a
  // pessoa é que descobria tarde.
  //
  // Quem decide continua sendo o backend · isto é UX, e a rota de criar segue
  // conferindo o teto por conta dela.
  //
  // **É o congelado, e não o vivo** · um formulário aberto não pode virar tela
  // de bloqueio porque um convite foi aceito noutra guia. Ver
  // `useMyClubsSnapshot`.
  // O club que ocupa a vaga de dono sai do provider · é dele que a saída fala,
  // e sem o nome a frase mandaria a pessoa procurar qual dos seus clubs é.
  const { status: clubsStatus, atCap, ledClub: led } = useMyClubsSnapshot();
  /**
   * **A lista viva, só pra mandar ela buscar de novo depois de gravar.**
   *
   * O que a tela **lê** continua congelado (é o `useMyClubsSnapshot` acima, e o
   * porquê está lá). O que se usa aqui é só o `reload`, que não é leitura.
   */
  const { reload: reloadMyClubs } = useMyClubs();

  // A plataforma do club começa na do player · quem joga de PS5 cria club de
  // PS5 na esmagadora maioria das vezes, e perguntar o que já está no perfil é
  // trabalho que a tela podia ter poupado. Continua trocável.
  //
  // **Sem plataforma no perfil, nada vem marcado.** Cravar uma escolhida por
  // nós seria pior que perguntar: quem joga de Xbox criaria um club de
  // PlayStation sem perceber, e o campo pareceria respondido.
  const profilePlatform = account?.platform ?? null;

  const [tagState, setTagState] = useState<TagState>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<CreateClubInput>({
    resolver: zodResolver(createClubInput),
    defaultValues: {
      tag: '',
      name: '',
      bio: '',
      ...(profilePlatform ? { platform: profilePlatform } : {}),
    },
  });

  const tag = form.watch('tag');
  const platform = form.watch('platform');

  useEffect(() => {
    if (!clubTag.safeParse(tag).success) {
      // **Formato errado não pode ser silêncio.** Antes qualquer valor inválido
      // caía em `idle`, então digitar "meu club" com espaço não mostrava nada e
      // a pessoa só descobria no envio · com o texto já escrito e a tag talvez
      // já decorada. Antes do segundo caractere fica quieto de propósito: o
      // primeiro é sempre inválido e reclamar dele é reclamar de digitar.
      setTagState(tag.trim().length >= 2 ? 'invalid' : 'idle');
      return;
    }
    setTagState('checking');
    // Espera a digitação parar · sem isso é uma chamada por tecla.
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const { available } = await api.clubTagAvailable(tag);
          setTagState(available ? 'free' : 'taken');
        } catch {
          setTagState('idle');
        }
      })();
    }, 400);
    return () => clearTimeout(timer);
  }, [tag]);

  const crest = useImagePicker('club_crest');

  async function onSubmit(input: CreateClubInput) {
    setSubmitError(null);
    try {
      // **A imagem sobe aqui, não na hora em que foi escolhida.** Quem
      // desistir do formulário não deixa nada no bucket · ver o
      // `useImagePicker`.
      //
      // Com `catch` próprio porque a saída é outra: falha de imagem se
      // resolve trocando a imagem, e "algo deu errado" não diria isso.
      let crestUrl: string | null;
      try {
        crestUrl = await crest.commit(input.crestUrl ?? null);
      } catch {
        setSubmitError(t('upload.failed'));
        return;
      }
      const { club } = await api.createClub({ ...input, bio: input.bio || null, crestUrl });
      /**
       * **A lista de clubs busca de novo, sem esperar o canal.**
       *
       * A API passou a publicar `user.membership` pra quem cria (01/09/2026), e
       * isso cobre as **outras** telas abertas da pessoa. Esta aqui não pode
       * depender disso: se o WebSocket estiver fora, quem acabou de criar o
       * club voltaria pra tela de Clubs sem ele na lista · que é exatamente o
       * defeito que o Eduardo viu.
       *
       * **Os dois existem de propósito** · o evento é a origem, isto é a
       * garantia de quem agiu.
       */
      reloadMyClubs();
      // Pela **tag**, que é o que a rota resolve · com o `_id` a pessoa caía
      // em "club não encontrado" logo depois de criar o club com sucesso.
      //
      // **O `void` não é ritual pra calar o lint, e trocar por `await` é o
      // conserto errado.** Desde o `react-router` 7 o `navigate` devolve
      // promessa, e aqui ele está **dentro de um `try`**: com `await`, uma
      // falha de navegação cairia no `catch` abaixo e viraria mensagem de erro
      // **da API** · a pessoa leria "não foi possível criar o club" depois de
      // o club ter sido criado. Navegar é dispare-e-siga nos **doze** lugares
      // onde ele aparece, e nenhum tem o que fazer depois.
      void navigate(`/app/clubs/${club.tag}`, { replace: true });
    } catch (err) {
      setSubmitError(apiErrorMessage(err, t));
    }
  }

  // **A casca pinta antes do dado, e aqui ela é o `FormShell`** · título e
  // subtítulo desta tela não dependem de nada. Este trecho chegou a devolver um
  // `LoadingState` de tela cheia, o que trocava um formulário que aparecia na
  // hora por uma espera em branco · e era o defeito que o bloco de 05/08
  // inteiro existiu pra tirar do produto, reintroduzido pela guarda.
  //
  // **E aqui é indicador, não esqueleto**, que é a outra metade da mesma regra:
  // silhueta é pra quando se sabe a forma do que vem, e neste instante a tela
  // **não sabe** · pode ser o formulário ou pode ser o bloqueio. Desenhar
  // campos aqui promete uma coisa e entrega outra, e foi o que a captura em
  // frames pegou · a silhueta aparecia por ~100ms antes da tela de bloqueio.
  //
  // **Falha não espera aqui, ela passa** · com `error` o teto é desconhecido, e
  // o `atCap` nasce `false` de propósito: quem decide de verdade é o servidor,
  // no envio. Bloquear por ausência de resposta trancaria quem tem vaga.
  if (clubsStatus === 'idle' || clubsStatus === 'loading') {
    return (
      <FormShell title={t('club.createTitle')} subtitle={t('club.createSubtitle')}>
        <LoadingState />
      </FormShell>
    );
  }

  // **Tela de bloqueio com saída**, e não um formulário que vai ser recusado ·
  // toda tela precisa de saída, e esta em especial: quem chegou aqui já queria
  // criar um club, então o caminho útil é o que resolve a falta de vaga.
  /**
   * **O teto de posse vem antes do teto de vínculos**, e a ordem é a decisão:
   * ele é o mais específico dos dois e o único que **sempre** vale pra quem já
   * tem um club. Na ordem inversa, quem é dono de um e membro de mais dois
   * leria "saia de um dos seus clubs" · verdade que não resolve nada, porque
   * sair de um club onde ele é só membro não devolve a vaga de dono.
   *
   * A saída aponta pro club dele, que é onde as duas ações que destravam moram:
   * passar a posse e encerrar.
   */
  /**
   * **A porta desligada é a da LIDERANÇA**, e não a da posse · 03/09/2026.
   *
   * Ela olhava só o dono, e a trava do mesmo dia recusa quem é **gerente** de
   * outro club · o gerente atravessava tag, nome, plataforma e escudo pra levar
   * um 409 no envio, que é exatamente o que o docblock acima promete não
   * acontecer. A saída também muda com o papel: o dono passa a posse ou encerra,
   * e o gerente **sai** · por isso o botão só oferece configurar pra quem pode.
   */
  if (led) {
    return (
      <FormShell title={t('club.createTitle')} subtitle={t('club.createSubtitle')}>
        <EmptyState
          icon={ShieldOff}
          title={t('club.ownerBlockedTitle')}
          description={t('club.ownerBlockedBody', { clubName: led.name })}
          action={
            led.role === 'owner'
              ? { label: t('club.configure'), to: `/app/clubs/${led.tag}/editar` }
              : { label: t('club.seeClub'), to: `/app/clubs/${led.tag}` }
          }
        />
      </FormShell>
    );
  }

  if (atCap) {
    return (
      <FormShell title={t('club.createTitle')} subtitle={t('club.createSubtitle')}>
        <EmptyState
          icon={ShieldOff}
          title={t('club.limitBlockedTitle')}
          description={t('club.limitReached', { count: MAX_CLUBS_PER_PLAYER })}
          action={{ label: t('nav.clubs'), to: '/app/clubs' }}
        />
      </FormShell>
    );
  }

  return (
    <FormShell title={t('club.createTitle')} subtitle={t('club.createSubtitle')}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] lg:gap-12">
        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="flex flex-col gap-5">
          <ClubPreviewStrip
            name={form.watch('name')}
            tag={tag}
            platform={platform}
            crestUrl={crest.previewUrl ?? form.watch('crestUrl')}
          />

          <div className="space-y-2">
            <Label htmlFor="tag">{t('club.tagLabel')}</Label>
            <Input
              id="tag"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              // O teto do schema entra no campo: sem ele dá pra digitar trinta
              // caracteres e só descobrir no envio, com o texto já escrito.
              maxLength={CLUB_TAG_MAX}
              // Caixa alta na tela, minúscula no valor · a tipografia da marca é
              // caixa alta e o banco guarda normalizado.
              className="h-11 uppercase"
              {...form.register('tag', { setValueAs: (v: string) => v.trim().toLowerCase() })}
            />
            <p className="text-xs text-muted-foreground">
              {t('club.tagHint', { min: CLUB_TAG_MIN, max: CLUB_TAG_MAX })}
            </p>

            {/* Leitor de tela precisa saber que a tag foi recusada · sem
              aria-live a informação só existe pra quem enxerga. */}
            <div aria-live="polite">
              {tagState === 'invalid' && (
                <p className="inline-flex items-center gap-1.5 text-xs text-destructive">
                  <X className="h-3 w-3" />
                  {t('club.tagInvalid')}
                </p>
              )}
              {tagState === 'checking' && (
                <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t('club.tagChecking')}
                </p>
              )}
              {tagState === 'free' && (
                <p className="inline-flex items-center gap-1.5 text-xs text-primary">
                  <Check className="h-3 w-3" />
                  {t('club.tagFree')}
                </p>
              )}
              {tagState === 'taken' && (
                <p className="inline-flex items-center gap-1.5 text-xs text-destructive">
                  <X className="h-3 w-3" />
                  {t('club.tagTaken')}
                </p>
              )}
            </div>
            {form.formState.errors.tag && (
              <p className="text-xs text-destructive">{form.formState.errors.tag.message}</p>
            )}
          </div>

          <Field
            id="name"
            label={t('club.nameLabel')}
            hint={t('club.nameHint')}
            error={form.formState.errors.name?.message}
            count={{ value: form.watch('name'), max: CLUB_NAME_MAX }}
          >
            <Input
              id="name"
              className="h-11"
              maxLength={CLUB_NAME_MAX}
              {...form.register('name')}
            />
          </Field>

          <Field
            id="bio"
            label={t('club.bioLabel')}
            hint={t('club.bioHint')}
            error={form.formState.errors.bio?.message}
            count={{ value: form.watch('bio') ?? '', max: CLUB_BIO_MAX }}
          >
            <Textarea id="bio" rows={3} maxLength={CLUB_BIO_MAX} {...form.register('bio')} />
          </Field>

          <CrestField
            tag={form.watch('tag') ?? ''}
            value={form.watch('crestUrl') ?? null}
            onChange={(url) => form.setValue('crestUrl', url, { shouldDirty: true })}
            picker={crest}
            disabled={form.formState.isSubmitting}
          />

          <div className="space-y-2">
            <span className="flex items-center gap-1.5">
              <Label>{t('club.platformLabel')}</Label>
              {/* A dica aparece **sempre**, mudando o texto · na primeira versão
                ela dependia de haver plataforma no perfil, então justo quem
                mais precisava da explicação era quem não via nada. */}
              <InfoTip
                label={profilePlatform ? t('club.platformFromProfile') : t('club.platformPickHint')}
              />
            </span>
            <PlatformPicker
              name="platform"
              value={platform ?? null}
              onChange={(v) => v && form.setValue('platform', v, { shouldValidate: true })}
            />
            {form.formState.errors.platform && (
              <p className="text-xs text-destructive">{t('club.platformRequired')}</p>
            )}
          </div>

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}

          <Button
            type="submit"
            variant="cta"
            className="h-11 w-full text-base sm:w-auto sm:px-8"
            disabled={form.formState.isSubmitting || tagState === 'taken'}
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('club.creating')}
              </>
            ) : (
              t('club.create')
            )}
          </Button>
        </form>

        <StickyAside>
          <ClubPreview
            crestUrl={crest.previewUrl ?? form.watch('crestUrl')}
            name={form.watch('name')}
            tag={tag}
            platform={platform}
            bio={form.watch('bio')}
          />
        </StickyAside>
      </div>
    </FormShell>
  );
}

/**
 * A mesma prévia, em faixa, **para o celular**.
 *
 * A versão em coluna some abaixo de `lg` porque empurraria o formulário pra
 * fora da dobra · o erro da primeira versão foi concluir daí que no celular
 * não há prévia. É onde mais vai ter: quem monta club no telefone precisa
 * tanto quanto quem monta no desktop, e provavelmente mais.
 *
 * Em faixa ela custa uma linha, fica **acima** do formulário (onde funciona
 * como cabeçalho do que está sendo criado) e acompanha a digitação igual.
 */
/**
 * O escudo, nas duas telas.
 *
 * A prévia é o **próprio `ClubCrest`**, e não um retângulo genérico: o que a
 * pessoa vê aqui é exatamente a peça que vai pra página do club, com chanfro
 * e tudo. E quando não há imagem ela mostra a reserva de iniciais, que é o
 * estado normal e não a exceção.
 */
function CrestField({
  tag,
  value,
  onChange,
  picker,
  disabled,
}: {
  tag: string;
  value: string | null;
  onChange: (url: string | null) => void;
  picker: ImagePicker;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <Label>{t('club.crestLabel')}</Label>
      <ImageUpload
        picker={picker}
        value={value}
        onChange={onChange}
        disabled={disabled}
        preview={
          <ClubCrest
            tag={tag?.trim() || 'tag'}
            crestUrl={picker.previewUrl ?? value}
            className="h-16 w-16 text-lg"
          />
        }
      />
    </div>
  );
}

function ClubPreviewStrip({
  name,
  tag,
  platform,
  crestUrl,
}: {
  name: string | undefined;
  tag: string | undefined;
  platform: CreateClubInput['platform'] | undefined;
  crestUrl: string | null | undefined;
}) {
  const { t } = useTranslation();

  // **O formulário usa `gap`, não `space-y`, por causa desta peça.** `space-y`
  // é margem aplicada por posição no DOM, então esta prévia continuava
  // reservando 20px no desktop mesmo com `lg:hidden` · o primeiro campo visível
  // nascia afastado do cabeçalho sem nada explicar o vão. `gap` é do layout e
  // ignora filho que não renderiza.
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-4 lg:hidden">
      <BrandWatermark />
      <div className="relative flex items-center gap-3">
        <ClubCrest tag={tag?.trim() || 'tag'} crestUrl={crestUrl} className="h-12 w-12 text-base" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-base uppercase leading-none tracking-tight">
            {name?.trim() || t('club.previewName')}
          </span>
          <span className="mt-1.5 flex items-center gap-2 text-xs">
            <span className="rounded bg-primary/15 px-1.5 py-0.5 font-semibold uppercase tracking-widest text-primary">
              {tag?.trim() || 'tag'}
            </span>
            {platform && <PlatformMark platform={platform} withLabel />}
          </span>
        </span>
      </div>
    </div>
  );
}

/**
 * Prévia da identidade do club, ao vivo.
 *
 * Ela ocupa a metade da tela que sobrava no desktop, e ocupa **com utilidade**:
 * o club é uma marca, e escolher tag e nome sem ver o resultado é escolher no
 * escuro. Usa o mesmo `ClubIdentity` da página pública de propósito · prévia
 * montada à parte é prévia que um dia passa a mentir.
 *
 * Abaixo de `lg` quem assume é a `ClubPreviewStrip` · a prévia muda de forma,
 * não desaparece.
 */
function ClubPreview({
  name,
  tag,
  platform,
  bio,
  crestUrl,
}: {
  name: string | undefined;
  tag: string | undefined;
  platform: CreateClubInput['platform'] | undefined;
  bio: string | null | undefined;
  crestUrl: string | null | undefined;
}) {
  const { t } = useTranslation();
  const tagOrExample = tag?.trim() || 'tag';

  return (
    // Esconde no celular porque a `ClubPreviewStrip` já responde ali em cima ·
    // a prévia muda de forma, não desaparece.
    <PreviewBlock
      title={t('club.previewTitle')}
      hint={t('club.previewHint')}
      className="hidden lg:block"
    >
      <div className="relative overflow-hidden rounded-2xl border bg-card p-5">
        <BrandWatermark />
        <div className="relative">
          <ClubIdentity
            name={name?.trim() || t('club.previewName')}
            tag={tagOrExample}
            platform={platform ?? null}
            crestUrl={crestUrl}
            size="sm"
          />
          {bio?.trim() && <p className="mt-4 text-sm text-muted-foreground">{bio.trim()}</p>}
        </div>
      </div>
    </PreviewBlock>
  );
}

export function ClubEditPage() {
  const { t } = useTranslation();
  // Pela **tag**: a rota é `/app/clubs/:tag/editar`, irmã da página do club.
  // Editar por id obrigaria a URL a carregar um número de banco onde o resto
  // do produto carrega o endereço público.
  const { tag = '' } = useParams<{ tag: string }>();
  useDocumentTitle(t('club.editTitle'));

  const [club, setClub] = useState<ClubRecord | null>(null);
  /**
   * **Por que não é um booleano.** Ele era, e os quatro desfechos caíam todos
   * na mesma tela de "club não encontrado" · no pior deles a pessoa estava no
   * elenco e o app dizia que o link estava quebrado. Cada um destes muda a
   * frase **e** a saída: quem é membro vai pro club, quem falhou na rede tenta
   * de novo. Ver a pendência 40.
   */
  const [failure, setFailure] = useState<'notManaged' | 'notMine' | 'error' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [reload, setReload] = useState(0);
  // A lista de "Meus clubs" carrega nome e escudo · gravar aqui muda o card
  // dela, e o `reload` local é o que garante isso sem depender do canal.
  const { reload: reloadMyClubs } = useMyClubs();

  const form = useForm<UpdateClubInput>({ resolver: zodResolver(updateClubInput) });
  const platform = form.watch('platform');

  // **Esta tela continua com a busca própria, e isso é decisão, não sobra.**
  //
  // O `MyClubsProvider` responde *"quais são os seus clubs"* como fato de
  // sessão · quatro telas derivam disso o teto, o favorito e o selo "em comum".
  // Aqui a pergunta é outra: **um club, por tag, com o seu papel nele, pra
  // preencher um formulário** · é a mesma rota por conveniência (o comentário
  // abaixo diz por quê), e não a mesma pergunta.
  //
  // As duas coisas que o provider não daria sem crescer pra atender só a ela:
  // o **tentar de novo** do desfecho `error`, que precisa descongelar e buscar
  // de novo, e o `form.reset` acontecendo **uma vez**, na resposta · derivar do
  // provider vivo poria um `reset` debaixo dos dedos de quem está editando.
  useEffect(() => {
    const ctrl = new AbortController();
    // A lista já traz o documento inteiro · uma rota `GET /me/clubs/:tag` só
    // pra isto seria uma rota a mais pra manter sem nada a mais pra mostrar.
    api
      .listMyClubs({ signal: ctrl.signal })
      .then(({ clubs }) => {
        // **O papel entra no achado, não numa checagem depois.** A lista traz
        // todo club em que a pessoa está, inclusive os em que ela é só membro ·
        // sem isto, quem digitasse a URL abria o formulário preenchido e só
        // descobriria no envio, com um 404 que parece defeito. Quem configura é
        // dono ou gerente; o servidor recusa o resto de qualquer jeito.
        const match = clubs.find((c) => c.tag === tag) ?? null;
        const found = match && leadsClub(match.role) ? match : null;
        setClub(found);
        // `match` sem papel de gestão é quem está no elenco como membro · a
        // distinção sai daqui de graça, sem nenhuma requisição a mais.
        if (!found) setFailure(match ? 'notManaged' : 'notMine');
        else {
          form.reset({
            name: found.name,
            platform: found.platform,
            bio: found.bio ?? '',
            crestUrl: found.crestUrl ?? null,
            bannerUrl: found.bannerUrl ?? null,
          });
        }
      })
      .catch(() => {
        // Falha de rede não é club removido · dizer que era apagava um club
        // que está lá, na cara de quem só perdeu o wi-fi por um segundo.
        if (!ctrl.signal.aborted) setFailure('error');
      });
    return () => ctrl.abort();
  }, [tag, form, reload]);

  const crest = useImagePicker('club_crest');

  /**
   * Nada mudou ainda · é o que desliga o Salvar **e** o que ele diz ao lado.
   *
   * **Escolha de escudo pendente é edição**, e ela não passa pelo
   * `react-hook-form` · sem o `crest.picked` aqui, trocar só o escudo deixaria
   * o botão apagado com mudança na tela.
   *
   * Vive numa constante porque virou duas leituras, e botão desligado e motivo
   * do desligamento **não podem discordar**. O motivo existe desde a pendência
   * 41: sem ele o botão lia como tela quebrada, e quem tropeçou foi o próprio
   * Eduardo validando em 05/08.
   */
  const untouched = !form.formState.isDirty && !crest.picked;

  // **O "salvo" é recado, não estado.** Ele conta que a gravação deu certo e
  // sai · fixo na tela ele passaria a mentir no minuto seguinte, ao lado de
  // um botão apagado e de uma edição nova por cima do que foi salvo.
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 4000);
    return () => clearTimeout(timer);
  }, [saved]);

  async function onSubmit(input: UpdateClubInput) {
    if (!club) return;
    setSubmitError(null);
    setSaved(false);
    try {
      // `catch` próprio · ver o mesmo trecho na tela de criar.
      let crestUrl: string | null;
      try {
        crestUrl = await crest.commit(input.crestUrl ?? null);
      } catch {
        setSubmitError(t('upload.failed'));
        return;
      }
      await api.updateClub(club._id, { ...input, bio: input.bio || null, crestUrl });
      // O que foi salvo vira o novo ponto de partida · sem isto o
      // formulário segue "sujo" e o Salvar continua aceso logo depois de
      // salvar, prometendo uma gravação que não tem mais o que gravar.
      form.reset({ ...input, crestUrl });
      crest.clear();
      setSaved(true);
      // **Nome e escudo aparecem no card de "Meus clubs"** · sem isto, salvar e
      // voltar pra tela de Clubs mostrava o nome antigo. Mesmo defeito do criar
      // e do encerrar, por um terceiro caminho.
      reloadMyClubs();
    } catch (err) {
      setSubmitError(apiErrorMessage(err, t));
    }
  }

  if (failure) {
    /**
     * **Mesma tela de bloqueio do teto de 3 clubs**, e isso é decisão do
     * Eduardo em 05/08/2026 · a primeira versão daqui punha a recusa no
     * cabeçalho da página, o que dava dois desenhos para a mesma situação
     * ("você não pode entrar aqui") em duas telas vizinhas. O cabeçalho segue
     * sendo o da tela, e quem fala é o `EmptyState`.
     *
     * Mapa explícito em vez de chave montada por template: chave dinâmica passa
     * reto pela tipagem do catálogo, que é o que impede a tradução de sumir em
     * silêncio.
     *
     * **"Tentar de novo" só onde repetir pode mudar o resultado** · na falha de
     * rede pode, nos outros dois não. E o ícone acompanha o motivo: cadeado pra
     * permissão, lupa pra não achado, rede pra rede.
     */
    const copy = {
      notManaged: {
        icon: ShieldOff,
        title: t('club.editNotManagedTitle'),
        body: t('club.editNotManagedBody'),
        action: { label: t('club.editSeeClub'), to: `/app/clubs/${tag}` },
      },
      notMine: {
        icon: SearchX,
        title: t('club.editNotMineTitle'),
        body: t('club.editNotMineBody'),
        action: { label: t('club.editSeeClub'), to: `/app/clubs/${tag}` },
      },
      error: {
        icon: WifiOff,
        title: t('club.editLoadErrorTitle'),
        body: t('club.editLoadErrorBody'),
        action: {
          label: t('common.retry'),
          onClick: () => {
            setFailure(null);
            setReload((n) => n + 1);
          },
        },
      },
    }[failure];

    return (
      <FormShell title={t('club.editTitle')}>
        <EmptyState
          icon={copy.icon}
          title={copy.title}
          description={copy.body}
          action={copy.action}
        />
      </FormShell>
    );
  }
  // Sem esqueleto aqui de propósito: o cabeçalho desta tela é o **nome do
  // club**, que é justamente o que ainda não chegou · uma silhueta de formulário
  // com o título vazio prometeria uma forma que o conteúdo não tem.
  if (!club) return <LoadingState fill />;

  return (
    <FormShell
      title={club.name}
      subtitle={t('club.editSubtitle')}
      back={{ to: `/app/clubs/${club.tag}`, label: club.name }}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] lg:gap-12">
        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="flex flex-col gap-5">
          <ClubPreviewStrip
            name={form.watch('name')}
            tag={club.tag}
            platform={platform}
            crestUrl={crest.previewUrl ?? form.watch('crestUrl')}
          />

          <Field
            id="name"
            label={t('club.nameLabel')}
            hint={t('club.nameHint')}
            error={form.formState.errors.name?.message}
            count={{ value: form.watch('name'), max: CLUB_NAME_MAX }}
          >
            <Input
              id="name"
              className="h-11"
              maxLength={CLUB_NAME_MAX}
              {...form.register('name')}
            />
          </Field>

          <Field
            id="bio"
            label={t('club.bioLabel')}
            hint={t('club.bioHint')}
            error={form.formState.errors.bio?.message}
            count={{ value: form.watch('bio') ?? '', max: CLUB_BIO_MAX }}
          >
            <Textarea id="bio" rows={3} maxLength={CLUB_BIO_MAX} {...form.register('bio')} />
          </Field>

          <CrestField
            tag={club.tag}
            value={form.watch('crestUrl') ?? null}
            onChange={(url) => form.setValue('crestUrl', url, { shouldDirty: true })}
            picker={crest}
            disabled={form.formState.isSubmitting}
          />

          <div className="space-y-2">
            <span className="flex items-center gap-1.5">
              <Label>{t('club.platformLabel')}</Label>
              <InfoTip label={t('club.platformClubHint')} />
            </span>
            <PlatformPicker
              name="platform"
              value={platform ?? null}
              onChange={(v) => v && form.setValue('platform', v)}
            />
          </div>

          {/* A tag fica visível e travada · fora da tela, ela vira uma dúvida
              sem resposta na hora em que a pessoa procura onde mudar. */}
          <div className="space-y-2">
            <span className="flex items-center gap-1.5">
              <Label>{t('club.tagLabel')}</Label>
              <InfoTip label={t('club.tagLocked')} />
            </span>
            <p className="inline-flex h-11 items-center rounded-md border border-dashed px-3 font-display uppercase tracking-widest text-muted-foreground">
              {club.tag}
            </p>
          </div>

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <SaveBar
              label={t('club.save')}
              // Escolha pendente **é** edição, e ela não passa pelo
              // `react-hook-form` · sem o `crest.picked` no `untouched`, trocar
              // só o escudo deixaria o botão apagado com mudança na tela.
              dirty={!untouched}
              saving={form.formState.isSubmitting}
              saved={saved}
              idleHint={t('club.saveNoChanges')}
            />
          </div>
        </form>

        {/* **O favorito saiu daqui em 06/08/2026** · ele é preferência da conta
            sobre o club, não configuração do club, e esta tela é de dono e de
            gerente. Quem é só membro não alcançava a ação. Hoje ele mora na
            página do club, que é onde a pessoa está quando decide. */}
        <StickyAside>
          <ClubPreview
            crestUrl={crest.previewUrl ?? form.watch('crestUrl')}
            name={form.watch('name')}
            tag={club.tag}
            platform={platform}
            bio={form.watch('bio')}
          />
          <ClubShare tag={club.tag} />
          {/* Só o dono encerra · gerente edita a identidade e para por aí. */}
          {club.role === 'owner' && <DeleteClub club={club} />}
        </StickyAside>
      </div>
    </FormShell>
  );
}

/**
 * Encerrar o club · a saída que não tem volta.
 *
 * **Fica no fim da coluna, discreto, e não some.** Ação destrutiva escondida
 * atrás de um "avançado" que ninguém abre é ação que a pessoa procura no
 * suporte; ação destrutiva em destaque é convite. O meio-termo é este: existe,
 * está por último, e é vermelha só no botão.
 *
 * **Com elenco, a tela oferece passar o club antes.** Quem tem gente dentro
 * quase sempre quer sair, não encerrar · e desde 31/07 essa saída existe. Sem
 * elenco não há a quem passar, e aí encerrar é a única saída de verdade.
 */
function DeleteClub({ club }: { club: ClubRecord }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasSquad = club.memberCount > 1;
  // Encerrar tira o club da lista de sessão · sem isto, a tela de Clubs para a
  // qual esta janela navega mostraria o club que acabou de deixar de existir.
  const { reload: reloadMyClubs } = useMyClubs();

  /**
   * **Só pergunta com a janela aberta** · é o mesmo arranjo do aviso de posse,
   * e o motivo é que esta tela é de edição: quem veio trocar o escudo não deve
   * pagar uma consulta pela existência de um botão que ele não vai apertar.
   */
  const { ties, loading: tiesLoading } = useClubTournaments(open ? club._id : null);
  const blocked = ties.some(
    (tie) => tie.status === 'drawn' || tie.status === 'running' || tie.paid,
  );

  return (
    <div className="rounded-xl border border-destructive/30 p-4">
      <p className="font-display uppercase tracking-tight">{t('club.deleteTitle')}</p>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {hasSquad ? t('club.deleteBodyWithSquad') : t('club.deleteBody')}
      </p>
      <Button
        variant="destructive"
        size="sm"
        className="mt-3"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {t('club.deleteAction')}
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setError(null);
        }}
        title={t('club.deleteConfirmTitle')}
        description={
          <>
            {t('club.deleteConfirmBody', { count: club.memberCount })}
            {/**
             * **O campeonato entra na janela, e ele pode recusar** · 19/08/2026,
             * pedido do Eduardo.
             *
             * Até aqui esta janela falava só do elenco, e encerrar um club
             * inscrito era um caminho **sem nenhum aviso**: a inscrição
             * sobrevivia ao club, a vaga ficava presa e o club morto continuava
             * desenhado na chave. O servidor passou a recusar nos dois casos
             * que quebram terceiros, e esta caixa é a mesma resposta **antes**
             * do clique · descobrir a recusa depois de digitar a tag é a pior
             * ordem possível.
             */}
            <TournamentTieNote ties={ties} side="closing" loading={tiesLoading} />
            {error && <span className="mt-3 block text-destructive">{error}</span>}
          </>
        }
        confirmLabel={t('club.deleteAction')}
        tone="destructive"
        /**
         * **Recusado não pede a tag** · o campo é o freio de uma ação que vai
         * acontecer, e numa janela que já disse *não* ele vira lição de casa
         * pra tirar zero. A caixa vermelha explica, o botão fica desligado, e
         * o que sobra é ler e fechar.
         */
        confirmPhrase={blocked ? undefined : club.tag}
        confirmPhraseLabel={
          <Trans
            i18nKey="club.deleteConfirmPhrase"
            values={{ tag: club.tag.toUpperCase() }}
            components={[<span key="0" className="font-semibold text-primary" />]}
          />
        }
        /**
         * **Segura enquanto a resposta não chegou, e recusa quando ela recusa**
         * · o servidor decide de verdade (`CLUB_IN_DRAWN_TOURNAMENT` e
         * `CLUB_HAS_PAID_REGISTRATION`), e isto é o que impede a pessoa de
         * digitar a tag inteira pra levar um erro no fim.
         */
        confirmDisabled={tiesLoading || blocked}
        onConfirm={async (typed) => {
          try {
            // **Normaliza aqui, na borda.** O schema de entrada só aceita tag
            // no formato guardado (minúscula, sem espaço), e o rótulo desta
            // janela manda digitar em CAIXA ALTA · sem esta linha, quem seguisse
            // a instrução ao pé da letra levava um 400 de validação em vez de
            // encerrar o club. Achado exercitando a rota na mão.
            await api.deleteClub(club._id, typed.trim().toLowerCase());
            // **Antes de navegar** · o provider vive acima desta tela, então
            // ele sobrevive à navegação e a busca já está a caminho quando a
            // lista pinta.
            reloadMyClubs();
            void navigate('/app/clubs', { replace: true });
          } catch (err) {
            setError(apiErrorMessage(err, t));
            throw err;
          }
        }}
      />
    </div>
  );
}

/** Cabeçalho com saída. Toda tela de formulário precisa de um caminho de volta. */
function FormShell({
  title,
  subtitle,
  back,
  children,
}: {
  title: string;
  /** Opcional porque a tela de bloqueio não tem o que explicar no cabeçalho ·
      quem fala ali é o `EmptyState` do corpo. */
  subtitle?: string;
  /** Padrão é a lista · editar volta pro club, que é de onde a pessoa veio. */
  back?: { to: string; label: string };
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        back={back ?? { to: '/app/clubs', label: t('nav.clubs') }}
      />
      {children}
    </div>
  );
}

/**
 * Rótulo, dica e erro em volta de um campo. Recebe o controle pronto em vez do
 * formulário inteiro: os dois formulários desta tela têm tipos diferentes
 * (criar exige tag, editar não tem), e um componente que aceitasse os dois
 * viraria união de tipos que o `register` não sabe resolver.
 */
function Field({
  id,
  label,
  hint,
  error,
  count,
  children,
}: {
  id: string;
  label: string;
  hint: string;
  error?: string | undefined;
  /** Campo com teto: o contador entra ao lado da dica, perto do fim. */
  count?: { value: string | undefined; max: number };
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {/* Dica e contador na mesma linha · o contador empurrado pra direita não
          rouba a leitura da dica, e some quando ainda há folga. */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-muted-foreground">{hint}</p>
        {count && <CharCount value={count.value} max={count.max} />}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
