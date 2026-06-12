import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_AVATAR_DIMENSION = 320;
const MAX_DATA_URL_LENGTH = 450_000;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return 'invalidType';
  }
  if (file.size > MAX_INPUT_BYTES) {
    return 'tooLarge';
  }
  return null;
}

function scaleDimensions(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };
    image.src = objectUrl;
  });
}

/** Resize and compress to a JPEG data URL stored in Firestore (no Firebase Storage). */
export async function fileToAvatarDataUrl(file: File): Promise<string> {
  const image = await loadImageFromFile(file);
  const { width, height } = scaleDimensions(image.naturalWidth, image.naturalHeight, MAX_AVATAR_DIMENSION);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas not supported');
  }

  context.drawImage(image, 0, 0, width, height);

  let quality = 0.85;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);

  while (dataUrl.length > MAX_DATA_URL_LENGTH && quality > 0.4) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error('tooLargeAfterCompress');
  }

  return dataUrl;
}

export async function syncLinkedUserAvatar(
  linkedUserId: string | undefined,
  avatarUrl: string | undefined
): Promise<void> {
  if (!linkedUserId) return;
  await updateDoc(doc(db, 'users', linkedUserId), {
    avatarUrl: avatarUrl ?? null,
    updatedAt: new Date(),
  });
}
