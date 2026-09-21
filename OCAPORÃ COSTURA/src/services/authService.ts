import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '@/firebase/config';
import { mapUserDoc } from '@/firebase/mappers';
import { COLLECTIONS } from '@/constants';
import type { AppUser } from '@/types';
import { DEMO_USER } from '@/services/demoData';

const DEMO_STORAGE_KEY = 'ocapora_demo_auth';

export async function signIn(email: string, password: string): Promise<AppUser> {
  if (!isFirebaseConfigured() || !auth || !db) {
    if (password.length < 4) {
      throw new Error('Senha deve ter pelo menos 4 caracteres (modo demonstração)');
    }
    localStorage.setItem(DEMO_STORAGE_KEY, 'true');
    return DEMO_USER;
  }

  const credential = await signInWithEmailAndPassword(auth, email, password);
  const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, credential.user.uid));

  if (!userDoc.exists()) {
    throw new Error('Usuário não encontrado no sistema');
  }

  const user = mapUserDoc(userDoc);
  if (!user.active) {
    await firebaseSignOut(auth);
    throw new Error('Usuário desativado. Contate o administrador.');
  }

  return user;
}

export async function signOut(): Promise<void> {
  if (!isFirebaseConfigured() || !auth) {
    localStorage.removeItem(DEMO_STORAGE_KEY);
    return;
  }
  await firebaseSignOut(auth);
}

export function subscribeAuth(
  onUser: (user: AppUser | null) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!isFirebaseConfigured() || !auth || !db) {
    const isDemoLoggedIn = localStorage.getItem(DEMO_STORAGE_KEY) === 'true';
    onUser(isDemoLoggedIn ? DEMO_USER : null);
    return () => undefined;
  }

  return onAuthStateChanged(
    auth,
    async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        onUser(null);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db!, COLLECTIONS.USERS, firebaseUser.uid));
        if (!userDoc.exists()) {
          onUser(null);
          return;
        }
        onUser(mapUserDoc(userDoc));
      } catch (error) {
        onError?.(error as Error);
        onUser(null);
      }
    },
    (error) => onError?.(error),
  );
}
