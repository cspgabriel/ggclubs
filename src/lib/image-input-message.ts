import { MAX_UPLOAD_BYTES } from '@ggclubs/schemas';
import type { TFunction } from 'i18next';
import { ImageInputError } from './normalize-image';

export function imageInputMessage(error: unknown, t: TFunction): string {
  if (error instanceof ImageInputError) {
    return error.code === 'tooBig'
      ? t('upload.tooBig', { mb: MAX_UPLOAD_BYTES / 1024 / 1024 })
      : t('upload.badType');
  }
  return t('upload.badImage');
}
