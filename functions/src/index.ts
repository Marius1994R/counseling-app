import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, WriteBatch } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

initializeApp();

const SUPREME_LEADER_EMAIL = 'marius.rasbici@biserica-lumina.ro';
const UNASSIGN_TO_WAITING_STATUSES = new Set(['waiting', 'active', 'unfinished']);
const BATCH_LIMIT = 500;

type BatchOp = (batch: WriteBatch) => void;

async function commitBatchOps(
  db: FirebaseFirestore.Firestore,
  ops: BatchOp[]
): Promise<void> {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    ops.slice(i, i + BATCH_LIMIT).forEach((op) => op(batch));
    await batch.commit();
  }
}

export const deleteAuthUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Trebuie să fii autentificat.');
  }

  const callerUid = request.auth.uid;
  const userId = request.data?.userId;

  if (!userId || typeof userId !== 'string') {
    throw new HttpsError('invalid-argument', 'userId este obligatoriu.');
  }

  const db = getFirestore();
  const callerDoc = await db.collection('users').doc(callerUid).get();

  if (!callerDoc.exists || callerDoc.data()?.role !== 'leader') {
    throw new HttpsError('permission-denied', 'Doar liderii pot șterge utilizatori.');
  }

  const callerEmail = callerDoc.data()?.email as string | undefined;

  if (userId === callerUid && callerEmail !== SUPREME_LEADER_EMAIL) {
    throw new HttpsError('permission-denied', 'Nu îți poți șterge propriul cont.');
  }

  const targetDoc = await db.collection('users').doc(userId).get();
  const targetEmail = targetDoc.exists
    ? (targetDoc.data()?.email as string | undefined)
    : undefined;

  if (targetDoc.exists) {
    const targetRole = targetDoc.data()?.role;
    if (callerEmail !== SUPREME_LEADER_EMAIL && targetRole === 'leader') {
      throw new HttpsError('permission-denied', 'Nu poți șterge un cont de lider.');
    }
  }

  const counselorIds = new Set<string>();

  const linkedCounselors = await db
    .collection('counselors')
    .where('linkedUserId', '==', userId)
    .get();
  linkedCounselors.docs.forEach((docSnap) => counselorIds.add(docSnap.id));

  if (targetEmail) {
    const emailCounselors = await db
      .collection('counselors')
      .where('email', '==', targetEmail)
      .get();
    emailCounselors.docs.forEach((docSnap) => counselorIds.add(docSnap.id));
  }

  const batchOps: BatchOp[] = [];

  for (const counselorId of counselorIds) {
    const casesSnap = await db
      .collection('cases')
      .where('assignedCounselorId', '==', counselorId)
      .get();

    casesSnap.docs.forEach((caseDoc) => {
      const status = caseDoc.data().status as string;
      const update: Record<string, unknown> = {
        assignedCounselorId: null,
        assignedCounselorName: null,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (UNASSIGN_TO_WAITING_STATUSES.has(status)) {
        update.status = 'waiting';
      }

      batchOps.push((batch) => batch.update(caseDoc.ref, update));
    });

    batchOps.push((batch) => batch.delete(db.collection('counselors').doc(counselorId)));
  }

  if (batchOps.length > 0) {
    await commitBatchOps(db, batchOps);
  }

  if (targetDoc.exists) {
    await db.collection('users').doc(userId).delete();
  }

  if (!userId.startsWith('demo-')) {
    try {
      await getAuth().deleteUser(userId);
    } catch (error: unknown) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? (error as { code: string }).code
          : undefined;
      if (code !== 'auth/user-not-found') {
        console.error('Failed to delete Firebase Auth user:', error);
        throw new HttpsError('internal', 'Ștergerea din Authentication a eșuat.');
      }
    }
  }

  return { success: true };
});
