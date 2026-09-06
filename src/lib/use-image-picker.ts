import { type UploadPurpose } from '@ggclubs/schemas';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { normalizeImage } from '@/lib/normalize-image';

/**
 * Segura a imagem escolhida no navegador e só fala com o S3 quando o
 * formulário é salvo.
 *
 * **O motivo é lixo no bucket.** Subir na escolha do arquivo parece mais
 * simples e é: quem desiste do formulário deixa um objeto órfão lá, e quem
 * troca de imagem três vezes deixa três · nada limpa isso depois, porque a API
 * só fica sabendo da URL que o club chegou a gravar. Segurando até o salvar,
 * o bucket só recebe o que a pessoa confirmou.
 *
 * **A normalização acontece na escolha, não no salvar**, e isso é de propósito:
 * a prévia passa a mostrar exatamente o arquivo que vai ser gravado, com o
 * mesmo recorte e a mesma perda. Prévia que mostra o original é prévia que
 * mente na hora em que a pessoa aprova.
 */
export type ImagePicker = {
  /** Imagem escolhida, já normalizada e ainda não enviada. */
  reading?: boolean;
  picked: { blob: Blob; filename: string } | null;
  /** Endereço local do que foi escolhido, pra prévia. */
  previewUrl: string | null;
  pick: (file: File) => Promise<void>;
  /** Esquece a escolha pendente · não mexe no que já estava gravado. */
  clear: () => void;
  /**
   * Sobe o pendente e devolve a URL pública. Sem escolha pendente devolve
   * `current` sem tocar na rede · assim quem chama não precisa perguntar.
   */
  commit: (current: string | null) => Promise<string | null>;
};

/** `escudo.PNG` com o resultado em WebP viraria `escudo.PNG.webp` sem isto. */
function renameTo(filename: string, type: string): string {
  const ext = type === 'image/png' ? 'png' : 'webp';
  const stem = filename.replace(/\.[^./\\]+$/, '') || 'imagem';
  return `${stem}.${ext}`;
}

export function useImagePicker(purpose: UploadPurpose): ImagePicker {
  const [reading, setReading] = useState(false);
  const operation = useRef(0);
  const [picked, setPicked] = useState<{ blob: Blob; filename: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // O endereço vive fora do React também porque a limpeza no desmonte precisa
  // do valor atual sem reassinar o efeito a cada troca de imagem.
  const urlRef = useRef<string | null>(null);

  const revoke = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }, []);

  useEffect(
    () => () => {
      operation.current += 1;
      revoke();
    },
    [revoke],
  );

  const pick = useCallback(
    async (file: File) => {
      const ticket = ++operation.current;
      setReading(true);
      try {
        const normalized = await normalizeImage(file, purpose);
        if (ticket !== operation.current) return;
        revoke();
        const url = URL.createObjectURL(normalized.blob);
        urlRef.current = url;
        setPreviewUrl(url);
        setPicked({ blob: normalized.blob, filename: renameTo(file.name, normalized.type) });
      } finally {
        if (ticket === operation.current) setReading(false);
      }
    },
    [purpose, revoke],
  );

  const clear = useCallback(() => {
    operation.current += 1;
    setReading(false);
    revoke();
    setPreviewUrl(null);
    setPicked(null);
  }, [revoke]);

  const commit = useCallback(
    async (current: string | null) => {
      if (reading) throw new Error('Image normalization in progress');
      if (!picked) return current;

      const { uploadUrl, publicUrl } = await api.presignUpload({
        purpose,
        contentType: picked.blob.type as 'image/webp' | 'image/png',
        filename: picked.filename,
        size: picked.blob.size,
      });

      const put = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': picked.blob.type },
        body: picked.blob,
      });
      if (!put.ok) throw new Error(`S3 ${put.status}`);

      return publicUrl;
    },
    [picked, purpose, reading],
  );

  return { picked, previewUrl, pick, clear, commit, reading };
}
