import {
  IMAGE_TARGETS,
  MAX_UPLOAD_BYTES,
  NORMALIZED_MAX_BYTES,
  type ImageFit,
  type UploadPurpose,
} from '@ggclubs/schemas';

/**
 * Reduz a imagem escolhida antes de ela sair da máquina.
 *
 * **Por que no navegador e não na API**, decidido em 04/08/2026 depois de medir
 * o container: ele é `nano`, com **0,25 vCPU e 512 MB**, e é o mesmo processo
 * que atende todas as rotas · decodificar um JPEG de 5 MB passa de 90 MB de
 * bitmap cru e deixaria o site inteiro lento durante um upload. Subir pra
 * `small` resolveria o CPU por mais US$ 8/mês, quase dobrando a conta da infra.
 *
 * Aqui sai de graça, e ainda **melhora pra quem sobe**: o arquivo cai de ~1,3 MB
 * pra algumas dezenas de KB antes de trafegar, o que importa em 4G.
 *
 * **A garantia não é a boa vontade do navegador.** Cliente adulterado pula tudo
 * isto · quem impede é o servidor, que só assina upload dentro de
 * `NORMALIZED_MAX_BYTES` e nos dois formatos do enum.
 *
 * **O que este caminho não garante, e vale saber:** dimensão. Um cliente
 * adulterado consegue subir um WebP de 4000px que caiba no teto de bytes. A
 * consequência é decodificação mais cara pra quem visita, não risco · e o custo
 * de fechar isso seria processar imagem no servidor, que foi medido e recusado.
 */

/** Degraus de qualidade, do melhor pro pior · o primeiro que couber ganha. */
const QUALITY_STEPS = [0.85, 0.7, 0.55, 0.4];

export type NormalizedImage = {
  blob: Blob;
  /** `image/webp` ou, sem codificação WebP no motor, `image/png`. */
  type: string;
  width: number;
  height: number;
};

type Decoded = { source: CanvasImageSource; width: number; height: number; release: () => void };

/**
 * Escolhe o recorte que preenche o alvo sem deformar.
 *
 * Preenche e corta o excedente (o mesmo que o `object-cover` do `ClubCrest`
 * faz na tela), em vez de encaixar com borda · **a prévia tem que ser o que vai
 * ficar gravado**, senão a pessoa aprova uma coisa e publica outra.
 *
 * O retângulo devolvido tem sempre a proporção do alvo · é disso que o
 * `outputSize` depende pra encolher sem deformar.
 */
export function coverRect(
  source: { width: number; height: number },
  target: { width: number; height: number; fit?: ImageFit },
): { sx: number; sy: number; sw: number; sh: number } {
  /**
   * **`contain` não recorta nada** · a imagem inteira entra, e o alvo vira teto.
   *
   * É o modo do print do placar desde 19/08/2026 · ele é **prova**, e a captura
   * mais comum é uma **faixa** (a barra de placar recortada pelo próprio
   * jogador). Forçada em 16:9, ela perdia as laterais · o que sobrava era o
   * miolo, sem os nomes dos dois clubs.
   */
  if (target.fit === 'contain') {
    return { sx: 0, sy: 0, sw: source.width, sh: source.height };
  }
  const scale = Math.max(target.width / source.width, target.height / source.height);
  const sw = Math.min(source.width, target.width / scale);
  const sh = Math.min(source.height, target.height / scale);
  return {
    sx: (source.width - sw) / 2,
    sy: (source.height - sh) / 2,
    sw,
    sh,
  };
}

/**
 * O tamanho que o arquivo gravado vai ter · **o alvo é um teto, não uma meta**.
 *
 * Escudo de 64px desenhado em 512 vira 64px borrado ocupando muito mais bytes:
 * ampliar não cria informação, só espalha a que existe. Logo de club costuma ser
 * PNG pequeno, então este caso é comum, não exótico.
 */
export function outputSize(
  source: { width: number; height: number },
  target: { width: number; height: number; fit?: ImageFit },
): { width: number; height: number } {
  /**
   * **Em `contain` os dois lados encolhem juntos** · com o teto aplicado por
   * lado, uma faixa de 1600x200 num alvo de 1024x576 sairia esmagada em
   * 1024x200 · o mesmo defeito de cortar, com outro nome. O fator é o menor dos
   * dois, e nunca amplia.
   */
  if (target.fit === 'contain') {
    const scale = Math.min(1, target.width / source.width, target.height / source.height);
    return {
      width: Math.max(1, Math.round(source.width * scale)),
      height: Math.max(1, Math.round(source.height * scale)),
    };
  }
  const { sw, sh } = coverRect(source, target);
  return {
    width: Math.max(1, Math.min(target.width, Math.round(sw))),
    height: Math.max(1, Math.min(target.height, Math.round(sh))),
  };
}

/**
 * O primeiro degrau de qualidade cujo arquivo cabe no teto.
 *
 * Separado do desenho porque **canvas não existe em teste de nó** · a decisão
 * dá pra provar sem motor gráfico, e o desenho se prova no navegador.
 */
export function pickWithinCap(
  candidates: { quality: number; size: number }[],
  cap = NORMALIZED_MAX_BYTES,
): number | null {
  const fits = candidates.find((c) => c.size <= cap);
  return fits ? fits.quality : null;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Decodifica pelo caminho bom e, se ele não existir, pelo que existe em todo
 * lugar.
 *
 * **`createImageBitmap` com `Blob` não existe no Safari abaixo de 15**, e sem
 * este fallback a pessoa levaria "não deu pra abrir essa imagem" por um arquivo
 * perfeito · culpar o arquivo pelo navegador é o pior tipo de mensagem de erro.
 * O `<img>` decodifica em qualquer motor e respeita a orientação do EXIF do
 * mesmo jeito, que é o que impede foto de celular deitar sozinha.
 */
async function decode(blob: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    };
  }

  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode failed'));
      el.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

export class ImageInputError extends Error {
  constructor(public readonly code: 'badType' | 'tooBig') {
    super(code);
  }
}

export function validateImageInput(file: Blob) {
  if (!file.type.startsWith('image/')) throw new ImageInputError('badType');
  if (file.size > MAX_UPLOAD_BYTES) throw new ImageInputError('tooBig');
}

export async function normalizeImage(file: Blob, purpose: UploadPurpose): Promise<NormalizedImage> {
  const target = IMAGE_TARGETS[purpose];
  validateImageInput(file);
  const decoded = await decode(file);

  try {
    const out = outputSize(decoded, target);
    const canvas = document.createElement('canvas');
    canvas.width = out.width;
    canvas.height = out.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');

    // Sem isto o motor usa interpolação barata em parte dos casos, e reduzir
    // 4000px pra 512 de uma vez sai serrilhado.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const { sx, sy, sw, sh } = coverRect(decoded, target);
    ctx.drawImage(decoded.source, sx, sy, sw, sh, 0, 0, out.width, out.height);

    let smallestWebp: Blob | null = null;
    for (const quality of QUALITY_STEPS) {
      const blob = await toBlob(canvas, 'image/webp', quality);
      // **`toBlob` com tipo não suportado devolve PNG em silêncio**, sem erro
      // nenhum · é por isso que o tipo do resultado é conferido em vez de
      // assumido. Safari abaixo de 16.4 decodifica WebP e não codifica.
      if (!blob || blob.type !== 'image/webp') break;
      smallestWebp = blob;
      if (blob.size <= NORMALIZED_MAX_BYTES) {
        return { blob, type: blob.type, width: out.width, height: out.height };
      }
    }

    // **O fallback é pra motor que não codifica WebP, não pra arquivo grande** ·
    // PNG é maior, então cair nele por tamanho pioraria exatamente o que se
    // está tentando resolver. Sem WebP nenhum, vale por guardar transparência:
    // logo de club com fundo transparente em JPEG viraria retângulo preto.
    if (smallestWebp) {
      return { blob: smallestWebp, type: 'image/webp', width: out.width, height: out.height };
    }
    const png = await toBlob(canvas, 'image/png');
    if (!png) throw new Error('encode failed');
    return { blob: png, type: 'image/png', width: out.width, height: out.height };
  } finally {
    decoded.release();
  }
}
