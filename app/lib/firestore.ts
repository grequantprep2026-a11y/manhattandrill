// lib/firestore.ts
import { db } from './firebase';
import {
  doc, setDoc, getDoc, updateDoc, deleteDoc, collection,
  query, where, getDocs, serverTimestamp, increment, arrayUnion, addDoc, orderBy, limit,
} from 'firebase/firestore';
import type {
  UserProfile, QuestionAttempt, QuestionStats, TopicProgress, DifficultyLevel,
  QuestionReport, MockTestSession, MockQuestionAttempt,
} from './types';

function withoutUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as T;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export async function createUserProfile(
  uid: string,
  data: Partial<UserProfile>,
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    {
      ...data,
      isPro:     false,
      plan:      'free',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserProfile) : null;
}

export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
}

// ─── isPro check (fast, single field) ────────────────────────────────────────
// Returns true if user has pro plan.
// Falls back to false if profile doesn't exist yet.
export async function getUserIsPro(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return false;
    return snap.data()?.isPro === true;
  } catch {
    return false;
  }
}

// ─── Question Attempts ────────────────────────────────────────────────────────

export async function saveAttempt(
  uid: string,
  questionId: string,
  data: Partial<QuestionAttempt>,
): Promise<void> {
  const ref  = doc(db, 'questionAttempts', uid, 'attempts', questionId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
    const isNewAttempt = data.isCorrect !== undefined;

    if (isNewAttempt) updates.attemptCount = increment(1);
    if (data.selectedOption  !== undefined) updates.selectedOption  = data.selectedOption;
    if (data.textAnswer      !== undefined) updates.textAnswer      = data.textAnswer;
    if (data.selectedOptions !== undefined) updates.selectedOptions = data.selectedOptions;
    if (data.isCorrect       !== undefined) updates.isCorrect       = data.isCorrect;
    if (data.firstAttemptCorrect !== undefined) updates.firstAttemptCorrect = data.firstAttemptCorrect;
    if (data.markedForReview !== undefined) updates.markedForReview = data.markedForReview;
    if (data.difficultyVote  !== undefined) updates.difficultyVote  = data.difficultyVote;
    if (data.liked           !== undefined) updates.liked           = data.liked;

    await updateDoc(ref, updates);
  } else {
    await setDoc(ref, withoutUndefined({
      ...data,
      questionId,
      firstAttemptCorrect: data.isCorrect ?? false,
      attemptCount: data.isCorrect !== undefined ? 1 : 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
  }
}

export async function getAttempt(
  uid: string,
  questionId: string,
): Promise<QuestionAttempt | null> {
  const snap = await getDoc(
    doc(db, 'questionAttempts', uid, 'attempts', questionId),
  );
  return snap.exists() ? (snap.data() as QuestionAttempt) : null;
}

export async function getAllAttempts(uid: string): Promise<QuestionAttempt[]> {
  const q     = query(collection(db, 'questionAttempts', uid, 'attempts'));
  const snaps = await getDocs(q);
  return snaps.docs.map(d => ({ id: d.id, ...d.data() } as unknown as QuestionAttempt));
}

export async function getTopicAttempts(uid: string, topicId: string): Promise<QuestionAttempt[]> {
  const q = query(
    collection(db, 'questionAttempts', uid, 'attempts'),
    where('topicId', '==', topicId),
  );
  const snaps = await getDocs(q);
  return snaps.docs.map(d => ({ id: d.id, ...d.data() } as unknown as QuestionAttempt));
}

// ─── Toggle mark-for-review ───────────────────────────────────────────────────

export async function toggleMarkForReview(
  uid: string,
  questionId: string,
  marked: boolean,
): Promise<void> {
  const ref = doc(db, 'questionAttempts', uid, 'attempts', questionId);
  await setDoc(ref, { markedForReview: marked, updatedAt: serverTimestamp() }, { merge: true });

  const userRef  = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const profile  = userSnap.data() as UserProfile;
  const current: string[] = (profile as any).markedQuestions ?? [];
  const updated  = marked
    ? Array.from(new Set([...current, questionId]))
    : current.filter((id: string) => id !== questionId);

  await updateDoc(userRef, { markedQuestions: updated, updatedAt: serverTimestamp() });

  const statsRef  = doc(db, 'questionStats', questionId);
  const statsSnap = await getDoc(statsRef);
  const delta = marked ? 1 : -1;

  if (statsSnap.exists()) {
    await updateDoc(statsRef, { markedCount: increment(delta), updatedAt: serverTimestamp() });
  } else {
    await setDoc(statsRef, {
      totalAttempts: 0, correctCount: 0,
      easyVotes: 0, mediumVotes: 0, hardVotes: 0,
      likedCount: 0, markedCount: marked ? 1 : 0,
      updatedAt: serverTimestamp(),
    });
  }
}

// ─── Community Question Stats ─────────────────────────────────────────────────

export async function updateQuestionStats(
  questionId: string,
  opts: {
    correct?: boolean;
    difficulty?: DifficultyLevel;
    prevDifficulty?: DifficultyLevel | null;
    liked?: boolean;
    prevLiked?: boolean;
  },
): Promise<void> {
  const ref  = doc(db, 'questionStats', questionId);
  const snap = await getDoc(ref);

  const hasAnswerUpdate = opts.correct !== undefined;
  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };

  if (hasAnswerUpdate) {
    updates.totalAttempts = increment(1);
    if (opts.correct) updates.correctCount = increment(1);
  }

  if (opts.difficulty !== undefined) {
    if (opts.prevDifficulty && opts.prevDifficulty !== opts.difficulty) {
      if (opts.prevDifficulty === 'easy')   updates.easyVotes   = increment(-1);
      if (opts.prevDifficulty === 'medium') updates.mediumVotes = increment(-1);
      if (opts.prevDifficulty === 'hard')   updates.hardVotes   = increment(-1);
    }
    if (!opts.prevDifficulty || opts.prevDifficulty !== opts.difficulty) {
      if (opts.difficulty === 'easy')   updates.easyVotes   = increment(1);
      if (opts.difficulty === 'medium') updates.mediumVotes = increment(1);
      if (opts.difficulty === 'hard')   updates.hardVotes   = increment(1);
    }
  }

  if (opts.liked !== undefined) {
    const wasLiked = opts.prevLiked ?? false;
    if (opts.liked && !wasLiked)  updates.likedCount = increment(1);
    if (!opts.liked && wasLiked)  updates.likedCount = increment(-1);
  }

  if (snap.exists()) {
    await updateDoc(ref, updates);
  } else {
    await setDoc(ref, {
      totalAttempts:  hasAnswerUpdate ? 1 : 0,
      correctCount:   hasAnswerUpdate && opts.correct ? 1 : 0,
      easyVotes:      opts.difficulty === 'easy'   ? 1 : 0,
      mediumVotes:    opts.difficulty === 'medium' ? 1 : 0,
      hardVotes:      opts.difficulty === 'hard'   ? 1 : 0,
      likedCount:     opts.liked === true ? 1 : 0,
      markedCount:    0,
      updatedAt:      serverTimestamp(),
    });
  }
}

export async function getQuestionStats(
  questionId: string,
): Promise<QuestionStats | null> {
  const snap = await getDoc(doc(db, 'questionStats', questionId));
  return snap.exists() ? (snap.data() as QuestionStats) : null;
}

// ─── Topic Progress ───────────────────────────────────────────────────────────

export interface TopicAttemptRecord {
  attemptNumber:  number;
  correctAnswers: number;
  totalQuestions: number;
  scorePct:       number;
  completedAt:    string;
}

export async function updateTopicProgress(
  uid: string,
  topicId: string,
  totalQuestions: number,
  isCorrect: boolean,
): Promise<void> {
  const ref  = doc(db, 'topicProgress', uid, 'topics', topicId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const updates: Record<string, unknown> = {
      completedQuestions: increment(1),
      updatedAt:          serverTimestamp(),
      lastAttempted:      serverTimestamp(),
    };
    if (isCorrect) {
      updates.correctAnswers   = increment(1);
    } else {
      updates.incorrectAnswers = increment(1);
    }
    await updateDoc(ref, updates);
  } else {
    await setDoc(ref, {
      topicId,
      totalQuestions,
      completedQuestions: 1,
      correctAnswers:     isCorrect ? 1 : 0,
      incorrectAnswers:   isCorrect ? 0 : 1,
      attemptNumber:      1,
      bestScore:          0,
      attemptHistory:     [],
      lastAttempted:      serverTimestamp(),
      updatedAt:          serverTimestamp(),
    });
  }
}

export async function finaliseTopicAttempt(
  uid: string,
  topicId: string,
  correctAnswers: number,
  totalQuestions: number,
  currentAttemptNumber: number,
): Promise<{ scorePct: number; bestScore: number; newBest: boolean }> {
  const ref  = doc(db, 'topicProgress', uid, 'topics', topicId);
  const snap = await getDoc(ref);

  const scorePct = totalQuestions > 0
    ? Math.round((correctAnswers / totalQuestions) * 100)
    : 0;

  const record: TopicAttemptRecord = {
    attemptNumber:  currentAttemptNumber,
    correctAnswers,
    totalQuestions,
    scorePct,
    completedAt:    new Date().toISOString(),
  };

  const existingBest = snap.exists() ? (snap.data().bestScore ?? 0) : 0;
  const newBest      = scorePct > existingBest;
  const bestScore    = newBest ? scorePct : existingBest;

  if (snap.exists()) {
    await updateDoc(ref, {
      bestScore,
      attemptHistory: arrayUnion(record),
      updatedAt:      serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      topicId,
      totalQuestions,
      completedQuestions: totalQuestions,
      correctAnswers,
      incorrectAnswers:   totalQuestions - correctAnswers,
      attemptNumber:      currentAttemptNumber,
      bestScore,
      attemptHistory:     [record],
      lastAttempted:      serverTimestamp(),
      updatedAt:          serverTimestamp(),
    });
  }

  return { scorePct, bestScore, newBest };
}

export async function getTopicProgress(
  uid: string,
  topicId: string,
): Promise<TopicProgress | null> {
  const snap = await getDoc(doc(db, 'topicProgress', uid, 'topics', topicId));
  return snap.exists() ? (snap.data() as TopicProgress) : null;
}

export async function getAllTopicProgress(uid: string): Promise<TopicProgress[]> {
  const q     = query(collection(db, 'topicProgress', uid, 'topics'));
  const snaps = await getDocs(q);
  return snaps.docs.map(d => ({ topicId: d.id, ...d.data() } as TopicProgress));
}

export async function resetTopicProgress(uid: string, topicId: string): Promise<void> {
  const ref  = doc(db, 'topicProgress', uid, 'topics', topicId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data();
    await updateDoc(ref, {
      completedQuestions: 0,
      correctAnswers:     0,
      incorrectAnswers:   0,
      attemptNumber:      (data.attemptNumber ?? 1) + 1,
      updatedAt:          serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      topicId,
      totalQuestions:     0,
      completedQuestions: 0,
      correctAnswers:     0,
      incorrectAnswers:   0,
      attemptNumber:      1,
      bestScore:          0,
      attemptHistory:     [],
      updatedAt:          serverTimestamp(),
    });
  }
}

export async function resetTopicAttempts(
  uid: string,
  questionIds: string[],
): Promise<void> {
  const promises = questionIds.map(qid =>
    deleteDoc(doc(db, 'questionAttempts', uid, 'attempts', qid))
  );
  await Promise.all(promises);
}

// ─── User-specific Likes ──────────────────────────────────────────────────────

export async function checkUserLiked(uid: string, questionId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'questionStats', questionId, 'likedBy', uid));
  return snap.exists();
}

export async function toggleUserLike(uid: string, questionId: string): Promise<boolean> {
  const likeRef  = doc(db, 'questionStats', questionId, 'likedBy', uid);
  const snap     = await getDoc(likeRef);
  const wasLiked = snap.exists();
  const willBeLiked = !wasLiked;

  if (willBeLiked) {
    await setDoc(likeRef, { timestamp: serverTimestamp() });
  } else {
    await deleteDoc(likeRef);
  }

  const statsRef   = doc(db, 'questionStats', questionId);
  const statsDelta = willBeLiked ? 1 : -1;
  await updateDoc(statsRef, {
    likedCount: increment(statsDelta),
    updatedAt:  serverTimestamp(),
  }).catch(() => setDoc(statsRef, {
    totalAttempts: 0, correctCount: 0,
    easyVotes: 0, mediumVotes: 0, hardVotes: 0,
    likedCount: willBeLiked ? 1 : 0, markedCount: 0,
    updatedAt: serverTimestamp(),
  }, { merge: true }));

  return willBeLiked;
}

// ─── User-specific Votes ──────────────────────────────────────────────────────

export async function getUserVote(uid: string, questionId: string): Promise<DifficultyLevel | null> {
  const snap = await getDoc(doc(db, 'questionStats', questionId, 'votedBy', uid));
  if (!snap.exists()) return null;
  return (snap.data() as { difficulty?: DifficultyLevel }).difficulty ?? null;
}

export async function setUserVote(
  uid: string,
  questionId: string,
  difficulty: DifficultyLevel,
): Promise<void> {
  const voteRef = doc(db, 'questionStats', questionId, 'votedBy', uid);
  const snap    = await getDoc(voteRef);
  const oldVote = snap.exists() ? (snap.data() as { difficulty?: DifficultyLevel }).difficulty : null;

  if (oldVote === difficulty) return;

  await setDoc(voteRef, { difficulty, timestamp: serverTimestamp() });

  const statsRef = doc(db, 'questionStats', questionId);
  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };

  if (oldVote === 'easy')   updates.easyVotes   = increment(-1);
  if (oldVote === 'medium') updates.mediumVotes = increment(-1);
  if (oldVote === 'hard')   updates.hardVotes   = increment(-1);
  if (difficulty === 'easy')   updates.easyVotes   = increment(1);
  if (difficulty === 'medium') updates.mediumVotes = increment(1);
  if (difficulty === 'hard')   updates.hardVotes   = increment(1);

  await updateDoc(statsRef, updates).catch(() => setDoc(statsRef, {
    totalAttempts: 0, correctCount: 0,
    easyVotes:   difficulty === 'easy'   ? 1 : 0,
    mediumVotes: difficulty === 'medium' ? 1 : 0,
    hardVotes:   difficulty === 'hard'   ? 1 : 0,
    likedCount: 0, markedCount: 0,
    updatedAt:   serverTimestamp(),
  }, { merge: true }));
}

export async function removeUserVote(uid: string, questionId: string): Promise<void> {
  const voteRef = doc(db, 'questionStats', questionId, 'votedBy', uid);
  const snap    = await getDoc(voteRef);
  if (!snap.exists()) return;

  const oldVote = (snap.data() as { difficulty?: DifficultyLevel }).difficulty;
  await deleteDoc(voteRef);

  const statsRef = doc(db, 'questionStats', questionId);
  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (oldVote === 'easy')   updates.easyVotes   = increment(-1);
  if (oldVote === 'medium') updates.mediumVotes = increment(-1);
  if (oldVote === 'hard')   updates.hardVotes   = increment(-1);
  await updateDoc(statsRef, updates);
}

// ─── Similar Question Attempts ────────────────────────────────────────────────

export async function saveSimilarAttempt(
  uid: string,
  questionId: string,
  data: {
    questionId:       string;
    topicId:          string;
    parentId?:        string;
    isCorrect:        boolean;
    selectedOption?:  number;
    textAnswer?:      string;
    selectedOptions?: string[];
    difficultyVote?:  DifficultyLevel | null;
    liked?:           boolean;
  },
): Promise<void> {
  const ref  = doc(db, 'questionAttempts', uid, 'similarAttempts', questionId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const updates: Record<string, unknown> = {
      updatedAt:    serverTimestamp(),
      attemptCount: increment(1),
      isCorrect:    data.isCorrect,
    };
    if (data.selectedOption  !== undefined) updates.selectedOption  = data.selectedOption;
    if (data.textAnswer      !== undefined) updates.textAnswer      = data.textAnswer;
    if (data.selectedOptions !== undefined) updates.selectedOptions = data.selectedOptions;
    if (data.difficultyVote  !== undefined) updates.difficultyVote  = data.difficultyVote;
    if (data.liked           !== undefined) updates.liked           = data.liked;
    await updateDoc(ref, updates);
  } else {
    await setDoc(ref, withoutUndefined({
      ...data,
      firstAttemptCorrect: data.isCorrect,
      attemptCount:        1,
      createdAt:           serverTimestamp(),
      updatedAt:           serverTimestamp(),
    }));
  }
}

export async function getSimilarAttempt(
  uid: string,
  questionId: string,
): Promise<QuestionAttempt | null> {
  const snap = await getDoc(
    doc(db, 'questionAttempts', uid, 'similarAttempts', questionId),
  );
  return snap.exists() ? (snap.data() as QuestionAttempt) : null;
}

export async function getAllSimilarAttemptsForTopic(
  uid: string,
  topicId: string,
): Promise<QuestionAttempt[]> {
  const q = query(
    collection(db, 'questionAttempts', uid, 'similarAttempts'),
    where('topicId', '==', topicId),
  );
  const snaps = await getDocs(q);
  return snaps.docs.map(d => ({ id: d.id, ...d.data() } as unknown as QuestionAttempt));
}

export async function deleteSimilarAttempt(
  uid: string,
  questionId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'questionAttempts', uid, 'similarAttempts', questionId));
}

export async function resetSimilarAttempts(
  uid: string,
  questionIds: string[],
): Promise<void> {
  const promises = questionIds.map(qid =>
    deleteDoc(doc(db, 'questionAttempts', uid, 'similarAttempts', qid))
  );
  await Promise.all(promises);
}

// ─── Question Reports ─────────────────────────────────────────────────────────

export async function saveQuestionReport(
  uid: string,
  report: Omit<QuestionReport, 'id' | 'uid' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'questionReports'), {
    ...report,
    uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getUserReportsForQuestion(
  uid: string,
  questionId: string,
): Promise<QuestionReport[]> {
  const q = query(
    collection(db, 'questionReports'),
    where('uid', '==', uid),
    where('questionId', '==', questionId),
  );
  const snaps = await getDocs(q);
  return snaps.docs.map(d => ({ id: d.id, ...d.data() } as QuestionReport));
}

// ─── Mock Test Sessions ───────────────────────────────────────────────────────

export async function createMockSession(uid: string): Promise<string> {
  const ref = await addDoc(collection(db, 'mockTests', uid, 'sessions'), {
    uid,
    startedAt:      new Date().toISOString(),
    totalQuestions: 40,
    attempts:       [],
    status:         'in_progress',
    createdAt:      serverTimestamp(),
    updatedAt:      serverTimestamp(),
  });
  return ref.id;
}

export async function saveMockQuestionAttempt(
  uid: string,
  sessionId: string,
  attempt: MockQuestionAttempt,
): Promise<void> {
  const ref = doc(db, 'mockTests', uid, 'sessions', sessionId);
  await updateDoc(ref, {
    attempts:  arrayUnion(attempt),
    updatedAt: serverTimestamp(),
  });
}

export async function finaliseMockSession(
  uid: string,
  sessionId: string,
  data: {
    section1Correct: number;
    section2Correct: number;
    totalCorrect:    number;
    totalQuestions:  number;
  },
): Promise<void> {
  const section1Score = Math.round((data.section1Correct / 20) * 100);
  const section2Score = Math.round((data.section2Correct / 20) * 100);
  const overallScore  = Math.round((data.totalCorrect / data.totalQuestions) * 100);

  await updateDoc(doc(db, 'mockTests', uid, 'sessions', sessionId), {
    completedAt:     new Date().toISOString(),
    section1Score,
    section2Score,
    overallScore,
    section1Correct: data.section1Correct,
    section2Correct: data.section2Correct,
    totalCorrect:    data.totalCorrect,
    status:          'completed',
    updatedAt:       serverTimestamp(),
  });
}

export async function getLatestMockSession(
  uid: string,
): Promise<(MockTestSession & { id: string }) | null> {
  const q = query(
    collection(db, 'mockTests', uid, 'sessions'),
    orderBy('createdAt', 'desc'),
    limit(1),
  );
  const snaps = await getDocs(q);
  if (snaps.empty) return null;
  const d = snaps.docs[0];
  return { id: d.id, ...d.data() } as MockTestSession & { id: string };
}

export async function getAllMockSessions(
  uid: string,
): Promise<(MockTestSession & { id: string })[]> {
  const q = query(
    collection(db, 'mockTests', uid, 'sessions'),
    orderBy('createdAt', 'desc'),
  );
  const snaps = await getDocs(q);
  return snaps.docs.map(d => ({ id: d.id, ...d.data() } as MockTestSession & { id: string }));
}

export async function getMockSessionAttempts(
  uid: string,
  sessionId: string,
): Promise<MockQuestionAttempt[]> {
  const snap = await getDoc(doc(db, 'mockTests', uid, 'sessions', sessionId));
  if (!snap.exists()) return [];
  return (snap.data().attempts as MockQuestionAttempt[]) ?? [];
}

// ─── Count completed mock sessions (for free-tier limit) ─────────────────────
// Free users can only take 1 mock test. Returns count of completed sessions.
export async function getCompletedMockSessionCount(uid: string): Promise<number> {
  const q = query(
    collection(db, 'mockTests', uid, 'sessions'),
    where('status', '==', 'completed'),
  );
  const snaps = await getDocs(q);
  return snaps.size;
}