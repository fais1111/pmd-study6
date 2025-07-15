
import { db, storage, auth } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, doc, setDoc, getDoc, DocumentData, orderBy, limit as firestoreLimit, updateDoc, deleteDoc, Timestamp, writeBatch, collectionGroup } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';

export type UserProfile = {
    id: string;
    displayName: string;
    email: string;
    photoURL: string;
    grade: string;
    createdAt: Date;
}

export type MaterialUpload = {
    title: string;
    description: string;
    grade: string;
    subject: string;
    type: 'notes' | 'video' | 'past-paper';
    file?: File;
    fileUrl?: string; // For YouTube links
};

export type Material = {
    id: string;
    title: string;
    subject: string;
    type: 'video' | 'notes' | 'past-paper';
    grade: string;
    description: string;
    fileUrl: string;
    filePath?: string; // Only for uploaded files
    createdAt: Date;
}

export type CareerTip = {
    text: string;
    author: string;
};

export type Question = {
  text: string;
  options: {
    text: string;
    isCorrect: boolean;
  }[];
};

export type Quiz = {
  id:string;
  title: string;
  grade: string;
  subject: string;
  questions: Question[];
  createdAt: Date;
};

export type QuizAttempt = {
    id: string;
    userId: string;
    quizId: string;
    answers: Record<number, number>; // questionIndex: optionIndex
    score: number;
    completed: boolean;
    createdAt: Timestamp; // Keep as Timestamp for Firestore
    startedAt?: Timestamp;
    completedAt?: Timestamp;
    userDisplayName?: string;
    userPhotoURL?: string;
}

export type LeaderboardEntry = {
    rank: number;
    userId: string;
    displayName: string;
    photoURL: string;
    score: number;
    duration: number; // in seconds
}

// User Profile Functions
export async function createUserProfile(uid: string, data: Omit<UserProfile, 'id' | 'createdAt'>) {
    try {
        await setDoc(doc(db, 'users', uid), {
            ...data,
            createdAt: new Date(),
        }, { merge: true });
        console.log("User profile created/merged successfully for UID:", uid);
    } catch (error) {
        console.error("Error creating user profile:", error);
        throw error;
    }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
        } as UserProfile;
    } else {
        console.log("No such user profile!");
        return null;
    }
}

export async function updateUserProfile(uid: string, data: Partial<Pick<UserProfile, 'displayName' | 'grade'>>) {
    try {
        const userDocRef = doc(db, 'users', uid);
        await updateDoc(userDocRef, data);

        const user = auth.currentUser;
        if (user && data.displayName) {
            await updateProfile(user, { displayName: data.displayName });
        }
        console.log("User profile updated successfully for UID:", uid);
    } catch (error) {
        console.error("Error updating user profile:", error);
        throw error;
    }
}


// Study Material Functions
export async function uploadStudyMaterial(material: Omit<MaterialUpload & {id?: string}, 'id'>) {
    const { file, type, ...materialData } = material;
    let fileUrl = material.fileUrl || '';
    let filePath: string | null = null;

    if (type !== 'video' && file) {
        filePath = `study_materials/${material.grade}/${material.subject}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, filePath);
        const snapshot = await uploadBytes(storageRef, file);
        fileUrl = await getDownloadURL(snapshot.ref);
    }

    if (!fileUrl) {
        throw new Error("A file or a valid URL is required.");
    }

    await addDoc(collection(db, 'study_materials'), {
        ...materialData,
        type,
        fileUrl: fileUrl,
        filePath: filePath,
        createdAt: new Date(),
    });

    console.log("Material uploaded successfully!");
}

export async function updateStudyMaterial(id: string, material: Partial<MaterialUpload & {id?: string}>) {
    const docRef = doc(db, 'study_materials', id);
    const updateData: any = { ...material };
    delete updateData.id;
    delete updateData.file;

    if (material.type !== 'video' && material.file) {
        const existingDoc = await getDoc(docRef);
        if (existingDoc.exists() && existingDoc.data().filePath) {
            const oldFileRef = ref(storage, existingDoc.data().filePath);
            await deleteObject(oldFileRef).catch(e => console.error("Could not delete old file, it may not exist:", e));
        }
        
        const filePath = `study_materials/${material.grade}/${material.subject}/${Date.now()}_${material.file.name}`;
        const storageRef = ref(storage, filePath);
        const snapshot = await uploadBytes(storageRef, material.file);
        updateData.fileUrl = await getDownloadURL(snapshot.ref);
        updateData.filePath = filePath;
    } else if (material.type === 'video' && material.fileUrl) {
        // If it was a file before and now is a video, delete the old file
        const existingDoc = await getDoc(docRef);
        if (existingDoc.exists() && existingDoc.data().filePath) {
            const oldFileRef = ref(storage, existingDoc.data().filePath);
            await deleteObject(oldFileRef).catch(e => console.error("Could not delete old file, it may not exist:", e));
        }
        updateData.filePath = null; // Remove file path for YouTube links
    }

    await updateDoc(docRef, updateData);
}

export async function deleteStudyMaterial(id: string) {
    const docRef = doc(db, 'study_materials', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data() as Material;
        if (data.filePath) {
            const fileRef = ref(storage, data.filePath);
            await deleteObject(fileRef).catch(err => {
                console.warn(`Could not delete file ${data.filePath}. It might have been already removed.`, err);
            });
        }
        await deleteDoc(docRef);
    }
}

export async function getStudyMaterials(grade: string, sorted = true, limit?: number): Promise<Material[]> {
    const collRef = collection(db, 'study_materials');
    const queryConstraints = [where('grade', '==', grade)];

    if (sorted) {
      queryConstraints.push(orderBy('createdAt', 'desc'));
    }
    if (limit) {
      queryConstraints.push(firestoreLimit(limit));
    }

    const q = query(collRef, ...queryConstraints);
    const snapshot = await getDocs(q);
    const data: Material[] = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
            id: doc.id,
            ...docData,
            createdAt: docData.createdAt?.toDate(),
        } as Material;
    });
    
    return data;
}

// Quiz Functions
export async function createQuiz(quizData: Omit<Quiz, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'quizzes'), {
    ...quizData,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateQuiz(id: string, quizData: Partial<Omit<Quiz, 'id' | 'createdAt'>>) {
    const batch = writeBatch(db);

    const quizDocRef = doc(db, 'quizzes', id);
    batch.update(quizDocRef, {
        ...quizData,
        updatedAt: Timestamp.now(),
    });

    const attemptsQuery = query(collectionGroup(db, 'attempts'), where('quizId', '==', id));
    const attemptsSnapshot = await getDocs(attemptsQuery);
    attemptsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}


export async function deleteQuiz(id: string) {
    const docRef = doc(db, 'quizzes', id);
    const attemptsQuery = query(collectionGroup(db, 'attempts'), where('quizId', '==', id));
    const attemptsSnapshot = await getDocs(attemptsQuery);
    const batch = writeBatch(db);
    attemptsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    await deleteDoc(docRef);
}


export async function getQuiz(id: string): Promise<Quiz | null> {
  const docRef = doc(db, 'quizzes', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate(),
    } as Quiz;
  }
  return null;
}

export async function getQuizzes(grade: string, limit?: number): Promise<Quiz[]> {
    const collRef = collection(db, 'quizzes');
    const queryConstraints: any[] = [where('grade', '==', grade), orderBy('createdAt', 'desc')];
    
    if (limit) {
        queryConstraints.push(firestoreLimit(limit));
    }

    const q = query(collRef, ...queryConstraints);
    const snapshot = await getDocs(q);
    const data: Quiz[] = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
            id: doc.id,
            ...docData,
            createdAt: docData.createdAt?.toDate(),
        } as Quiz;
    });
    
    return data;
}

// Quiz Attempt Functions
export async function saveQuizAttempt(userId: string, quizId: string, data: Partial<Omit<QuizAttempt, 'id' | 'userId' | 'quizId' | 'createdAt'>>, attemptId?: string) {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const collectionRef = collection(db, 'users', userId, 'attempts');
    const docRef = attemptId ? doc(collectionRef, attemptId) : doc(collectionRef); // Create a new doc ref if no ID is provided

    const attemptData: any = {
        ...data,
        userId,
        quizId,
        updatedAt: Timestamp.now(), // Use updatedAt to track saves
    };
    
    if (!attemptId) {
        attemptData.createdAt = Timestamp.now();
    }

    await setDoc(docRef, attemptData, { merge: true });
    
    return docRef.id;
}


export async function getUserQuizAttemptsForQuiz(userId: string, quizId: string): Promise<QuizAttempt[]> {
    const attemptsRef = collection(db, 'users', userId, 'attempts');
    const q = query(attemptsRef, where('quizId', '==', quizId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const attempts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizAttempt));
    return attempts;
}

export async function getAllUserQuizAttempts(userId: string): Promise<QuizAttempt[]> {
    const attemptsRef = collection(db, 'users', userId, 'attempts');
    const q = query(attemptsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizAttempt));
}

export async function getQuizLeaderboard(quizId: string): Promise<LeaderboardEntry[]> {
    // This query finds all documents in the "attempts" subcollection across all "users"
    const attemptsQuery = query(
        collectionGroup(db, 'attempts'), 
        where('quizId', '==', quizId), 
        where('completed', '==', true)
    );
    const attemptsSnapshot = await getDocs(attemptsQuery);
    
    const allCompletedAttempts = attemptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizAttempt));

    const userBestAttempts: { [userId: string]: QuizAttempt } = {};

    for (const attempt of allCompletedAttempts) {
        const existingBest = userBestAttempts[attempt.userId];
        if (!existingBest || attempt.score > existingBest.score) {
            userBestAttempts[attempt.userId] = attempt;
        } else if (attempt.score === existingBest.score) {
            const attemptDuration = (attempt.completedAt?.toMillis() || 0) - (attempt.startedAt?.toMillis() || 0);
            const existingBestDuration = (existingBest.completedAt?.toMillis() || 0) - (existingBest.startedAt?.toMillis() || 0);
            if (attemptDuration < existingBestDuration) {
                userBestAttempts[attempt.userId] = attempt;
            }
        }
    }
    
    const userIds = Object.keys(userBestAttempts);
    if (userIds.length === 0) {
        return [];
    }
    
    const userProfiles: Record<string, UserProfile> = {};
    
    // Firestore 'in' query is limited to 30 items. If there are more users, we need to batch the requests.
    const userChunks: string[][] = [];
    for (let i = 0; i < userIds.length; i += 30) {
        userChunks.push(userIds.slice(i, i + 30));
    }

    for (const chunk of userChunks) {
        const usersQuery = query(collection(db, 'users'), where('__name__', 'in', chunk));
        const usersSnapshot = await getDocs(usersQuery);
        usersSnapshot.forEach(doc => {
            userProfiles[doc.id] = { id: doc.id, ...doc.data() } as UserProfile;
        });
    }

    const ranked = Object.values(userBestAttempts)
        .map(attempt => {
            const userProfile = userProfiles[attempt.userId];
            const duration = (attempt.completedAt?.toMillis() || 0) - (attempt.startedAt?.toMillis() ?? 0);
            return {
                userId: attempt.userId,
                displayName: userProfile?.displayName || 'Anonymous',
                photoURL: userProfile?.photoURL || 'https://placehold.co/100x100.png',
                score: attempt.score,
                duration: Math.round(duration / 1000), // duration in seconds
            };
        })
        .sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score; // Higher score is better
            }
            return a.duration - b.duration; // Lower duration is better
        })
        .map((player, index) => ({
            ...player,
            rank: index + 1,
        }));

    return ranked;
}


// General Config Functions
export async function getCareerTip(): Promise<CareerTip> {
    const docRef = doc(db, 'configs', 'careerTip');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as CareerTip;
    }
    return {
        text: "The best way to predict the future is to create it. Start building your skills today for the career you want tomorrow. Every small step in your studies is a big leap towards your professional goals.",
        author: "Abraham Lincoln (paraphrased)",
    };
}

export async function updateCareerTip(tip: CareerTip) {
    const docRef = doc(db, 'configs', 'careerTip');
    await setDoc(docRef, tip);
}
