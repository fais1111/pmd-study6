
import { db, storage, auth } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, doc, setDoc, getDoc, DocumentData, orderBy, limit as firestoreLimit, updateDoc, deleteDoc, Timestamp, writeBatch, collectionGroup, getCountFromServer, deleteField } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';

export type UserProfile = {
    id: string;
    displayName: string;
    email: string;
    photoURL: string;
    grade: string;
    createdAt: Date;
    accessExpiresAt?: Timestamp;
}

export type AccessControlSettings = {
    isRestricted: boolean;
};

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

export type PostUpload = {
    title: string;
    description: string;
    grade: string;
    link?: string;
    image?: File;
    imageUrl?: string;
};

export type Post = {
    id: string;
    title: string;
    description: string;
    grade: string;
    link?: string;
    imageUrl: string;
    imagePath?: string;
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

// Access Control Functions
export async function getAccessControlSettings(): Promise<AccessControlSettings> {
    const docRef = doc(db, 'configs', 'accessControl');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as AccessControlSettings;
    }
    return { isRestricted: false }; // Default to not restricted
}

export async function setAccessControlSettings(settings: AccessControlSettings) {
    const docRef = doc(db, 'configs', 'accessControl');
    await setDoc(docRef, settings);
}

export async function grantUserFullAccess(uid: string) {
    const userDocRef = doc(db, 'users', uid);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 31);
    await updateDoc(userDocRef, {
        accessExpiresAt: Timestamp.fromDate(expiryDate)
    });
}

export async function revokeUserFullAccess(uid: string) {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
        accessExpiresAt: deleteField()
    });
}


// User Profile Functions
export async function createUserProfile(uid: string, data: Omit<UserProfile, 'id' | 'createdAt' | 'accessExpiresAt'>) {
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

export async function getAllUsers(grade?: string): Promise<UserProfile[]> {
    const collRef = collection(db, 'users');
    const queryConstraints = [orderBy('createdAt', 'desc')];
    if (grade && grade !== 'all') {
        queryConstraints.unshift(where('grade', '==', grade));
    }
    const q = query(collRef, ...queryConstraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
        } as UserProfile;
    });
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
    } else if (type === 'video') {
        filePath = null; // Ensure filePath is null for videos
    }


    if (!fileUrl) {
        throw new Error("A file or a valid URL is required.");
    }

    await addDoc(collection(db, 'study_materials'), {
        ...materialData,
        type,
        fileUrl: fileUrl,
        filePath: filePath, // This can be null
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

export async function getStudyMaterials(grade: string, hasFullAccess: boolean, limit?: number): Promise<Material[]> {
    const collRef = collection(db, 'study_materials');
    
    if (hasFullAccess) {
        const queryConstraints = [where('grade', '==', grade), orderBy('createdAt', 'desc')];
        if (limit) {
          queryConstraints.push(firestoreLimit(limit));
        }
        const q = query(collRef, ...queryConstraints);
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt.toDate() } as Material));
    } else {
        // Restricted access: 10% of oldest materials
        const countQuery = query(collRef, where('grade', '==', grade));
        const countSnapshot = await getCountFromServer(countQuery);
        const totalCount = countSnapshot.data().count;
        const limitCount = Math.max(1, Math.floor(totalCount * 0.1));

        const q = query(collRef, where('grade', '==', grade), orderBy('createdAt', 'asc'), firestoreLimit(limitCount));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt.toDate() } as Material));
    }
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

    const attemptsQuery = query(collectionGroup(db, 'attempts'), where('quizId', '==', id));
    const attemptsSnapshot = await getDocs(attemptsQuery);
    attemptsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    const quizDocRef = doc(db, 'quizzes', id);
    batch.update(quizDocRef, {
        ...quizData,
        updatedAt: Timestamp.now(),
    });

    await batch.commit();
}


export async function deleteQuiz(id: string) {
    const quizDocRef = doc(db, 'quizzes', id);
    await deleteDoc(quizDocRef);
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


// Admin Posts
export async function createPost(post: PostUpload): Promise<string> {
    const { image, ...postData } = post;
    let imageUrl = post.imageUrl || '';
    let imagePath: string | undefined = undefined;

    if (image) {
        imagePath = `posts/${Date.now()}_${image.name}`;
        const storageRef = ref(storage, imagePath);
        const snapshot = await uploadBytes(storageRef, image);
        imageUrl = await getDownloadURL(snapshot.ref);
    }
    
    if (!imageUrl) {
        throw new Error("An image is required for a post.");
    }

    const docRef = await addDoc(collection(db, 'posts'), {
        ...postData,
        imageUrl,
        imagePath,
        createdAt: new Date(),
    });
    return docRef.id;
}

export async function updatePost(id: string, post: Partial<PostUpload & {id?: string}>) {
    const docRef = doc(db, 'posts', id);
    const updateData: any = { ...post };
    delete updateData.id;
    delete updateData.image;

    if (post.image) {
        const existingDoc = await getDoc(docRef);
        if (existingDoc.exists() && existingDoc.data().imagePath) {
            const oldFileRef = ref(storage, existingDoc.data().imagePath);
            await deleteObject(oldFileRef).catch(e => console.error("Could not delete old image, it may not exist:", e));
        }
        
        const imagePath = `posts/${Date.now()}_${post.image.name}`;
        const storageRef = ref(storage, imagePath);
        const snapshot = await uploadBytes(storageRef, post.image);
        updateData.imageUrl = await getDownloadURL(snapshot.ref);
        updateData.imagePath = imagePath;
    }
    await updateDoc(docRef, updateData);
}

export async function deletePost(id: string) {
    const docRef = doc(db, 'posts', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data() as Post;
        if (data.imagePath) {
            const fileRef = ref(storage, data.imagePath);
            await deleteObject(fileRef).catch(err => {
                console.warn(`Could not delete image ${data.imagePath}. It might have been already removed.`, err);
            });
        }
        await deleteDoc(docRef);
    }
}

export async function getPosts(grade?: string, limit?: number): Promise<Post[]> {
    const collRef = collection(db, 'posts');
    
    const queryConstraints: any[] = [];
    
    if (grade) {
      // Query for posts matching the specific grade OR posts marked for 'all' grades.
      queryConstraints.push(where('grade', 'in', [grade, 'all']));
    }

    queryConstraints.push(orderBy('createdAt', 'desc'));
    
    if (limit) {
      queryConstraints.push(firestoreLimit(limit));
    }
    
    const q = query(collRef, ...queryConstraints);
    const snapshot = await getDocs(q);
    const data: Post[] = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
            id: doc.id,
            ...docData,
            createdAt: docData.createdAt?.toDate(),
        } as Post;
    });
    
    return data;
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
