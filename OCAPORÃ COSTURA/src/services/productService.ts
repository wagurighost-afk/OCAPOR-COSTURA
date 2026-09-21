import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/firebase/config';
import {
  mapCategoryDoc,
  mapProductDoc,
  productToFirestore,
} from '@/firebase/mappers';
import { COLLECTIONS } from '@/constants';
import type { Category, Product, ProductFormData } from '@/types';
import {
  getDemoCategories,
  getDemoProducts,
  getDemoProductById,
  createDemoProduct,
} from '@/services/demoData';

export async function getCategories(): Promise<Category[]> {
  if (!isFirebaseConfigured() || !db) {
    return getDemoCategories();
  }

  const q = query(
    collection(db, COLLECTIONS.CATEGORIES),
    where('active', '==', true),
    orderBy('name'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapCategoryDoc);
}

export function subscribeCategories(
  onData: (categories: Category[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured() || !db) {
    onData(getDemoCategories());
    return () => undefined;
  }

  const q = query(
    collection(db, COLLECTIONS.CATEGORIES),
    where('active', '==', true),
    orderBy('name'),
  );

  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(mapCategoryDoc)),
    (error) => onError(error),
  );
}

export async function getProducts(): Promise<Product[]> {
  if (!isFirebaseConfigured() || !db) {
    return getDemoProducts();
  }

  const q = query(
    collection(db, COLLECTIONS.PRODUCTS),
    where('active', '==', true),
    orderBy('name'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapProductDoc);
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!isFirebaseConfigured() || !db) {
    return getDemoProductById(id) ?? null;
  }

  const docRef = doc(db, COLLECTIONS.PRODUCTS, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return mapProductDoc(snapshot);
}

export function subscribeProducts(
  onData: (products: Product[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured() || !db) {
    onData(getDemoProducts());
    return () => undefined;
  }

  const q = query(
    collection(db, COLLECTIONS.PRODUCTS),
    where('active', '==', true),
    orderBy('name'),
  );

  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(mapProductDoc)),
    (error) => onError(error),
  );
}

export async function createProduct(data: ProductFormData): Promise<Product> {
  if (!isFirebaseConfigured() || !db) {
    return createDemoProduct(data);
  }

  const now = new Date();
  const productData = {
    ...productToFirestore({
      ...data,
      inProduction: 0,
      inRepair: 0,
      active: true,
    }),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, COLLECTIONS.PRODUCTS), productData);
  const created = await getDoc(docRef);
  return mapProductDoc(created);
}

export async function updateProduct(
  id: string,
  data: Partial<ProductFormData>,
): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    return;
  }

  await updateDoc(doc(db, COLLECTIONS.PRODUCTS, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function seedDefaultCategories(): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;

  const existing = await getDocs(collection(db, COLLECTIONS.CATEGORIES));
  if (!existing.empty) return;

  const { DEFAULT_CATEGORIES } = await import('@/constants');
  for (const cat of DEFAULT_CATEGORIES) {
    await addDoc(collection(db, COLLECTIONS.CATEGORIES), {
      name: cat.name,
      description: cat.description,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}
