import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { Case } from '../types';

export const CONSENT_MAX_BYTES = 5 * 1024 * 1024;
export const CONSENT_ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export type ConsentContentType = (typeof CONSENT_ALLOWED_TYPES)[number];

export function consentStoragePath(caseId: string): string {
  return `caseConsents/${caseId}/consent`;
}

export function validateConsentFile(file: File): string | null {
  if (!CONSENT_ALLOWED_TYPES.includes(file.type as ConsentContentType)) {
    return 'Tip fișier neacceptat. Folosește PDF, JPEG sau PNG.';
  }
  if (file.size > CONSENT_MAX_BYTES) {
    return 'Fișierul depășește 5MB.';
  }
  return null;
}

export interface UploadConsentParams {
  caseItem: Case;
  file: File;
  userId: string;
  userName: string;
}

export async function uploadCaseConsent({
  caseItem,
  file,
  userId,
  userName,
}: UploadConsentParams): Promise<void> {
  const validationError = validateConsentFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const storagePath = consentStoragePath(caseItem.id);
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      caseId: caseItem.id,
      originalName: file.name,
    },
  });

  const now = new Date();
  await updateDoc(doc(db, 'cases', caseItem.id), {
    consentAttached: true,
    consentFileName: file.name,
    consentContentType: file.type,
    consentUploadedAt: now,
    consentUploadedByName: userName,
    updatedAt: now,
  });

  await setDoc(doc(db, 'caseConsents', caseItem.id), {
    caseId: caseItem.id,
    caseTitle: caseItem.title,
    counseledName: caseItem.counseledName,
    assignedCounselorName: caseItem.assignedCounselorName || null,
    storagePath,
    fileName: file.name,
    contentType: file.type,
    sizeBytes: file.size,
    uploadedAt: now,
    uploadedBy: userId,
    uploadedByName: userName,
  });
}

export async function getConsentDownloadUrl(storagePath: string): Promise<string> {
  return getDownloadURL(ref(storage, storagePath));
}

export async function deleteCaseConsent(caseId: string): Promise<void> {
  const storagePath = consentStoragePath(caseId);
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code: string }).code)
        : '';
    if (code !== 'storage/object-not-found') {
      throw err;
    }
  }

  await deleteDoc(doc(db, 'caseConsents', caseId));

  const now = new Date();
  await updateDoc(doc(db, 'cases', caseId), {
    consentAttached: false,
    consentFileName: null,
    consentContentType: null,
    consentUploadedAt: null,
    consentUploadedByName: null,
    updatedAt: now,
  });
}

export async function replaceCaseConsent(params: UploadConsentParams): Promise<void> {
  // Same path overwrite + rewrite metadata docs
  await uploadCaseConsent(params);
}
