import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';

const FIRESTORE_IN_LIMIT = 10;

function chunkIds<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/** Latest meeting note content per caseId, using chunked `in` queries (max 10). */
export async function loadLatestNotesByCaseIds(
  caseIds: string[]
): Promise<Record<string, string>> {
  const notesMap: Record<string, string> = {};
  if (caseIds.length === 0) return notesMap;

  const uniqueIds = Array.from(new Set(caseIds.filter(Boolean)));
  const latestByCase = new Map<string, { content: string; createdAt: Date }>();

  for (const idChunk of chunkIds(uniqueIds, FIRESTORE_IN_LIMIT)) {
    const notesQuery = query(
      collection(db, 'meetingNotes'),
      where('caseId', 'in', idChunk)
    );
    const snapshot = await getDocs(notesQuery);
    snapshot.forEach((noteDoc) => {
      const data = noteDoc.data();
      const caseId = data.caseId as string;
      if (!caseId) return;
      const createdAt = data.createdAt?.toDate?.() ?? new Date(0);
      const content = (data.content as string) || '';
      const existing = latestByCase.get(caseId);
      if (!existing || createdAt > existing.createdAt) {
        latestByCase.set(caseId, { content, createdAt });
      }
    });
  }

  uniqueIds.forEach((caseId) => {
    notesMap[caseId] = latestByCase.get(caseId)?.content ?? '';
  });

  return notesMap;
}
