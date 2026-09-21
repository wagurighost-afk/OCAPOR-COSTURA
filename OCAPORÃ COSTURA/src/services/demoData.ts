import type { Category, Product, ProductFormData } from '@/types';
import { DEFAULT_CATEGORIES } from '@/constants';

const DEMO_CATEGORIES: Category[] = DEFAULT_CATEGORIES.map((cat, index) => ({
  id: `demo-cat-${index + 1}`,
  name: cat.name,
  description: cat.description,
  active: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}));

const DEMO_PRODUCTS: Product[] = [
  {
    id: 'demo-1',
    name: 'Camisa Feminina',
    code: 'CF-M-001',
    categoryId: 'demo-cat-1',
    model: 'Operacional',
    gender: 'feminino',
    size: 'M',
    color: 'Branca',
    currentStock: 12,
    minimumStock: 8,
    idealStock: 15,
    maximumStock: 20,
    inProduction: 3,
    inRepair: 1,
    active: true,
    notes: 'Dado de demonstração',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 'demo-2',
    name: 'Camisa Feminina',
    code: 'CF-G-001',
    categoryId: 'demo-cat-1',
    model: 'Operacional',
    gender: 'feminino',
    size: 'G',
    color: 'Branca',
    currentStock: 0,
    minimumStock: 8,
    idealStock: 15,
    maximumStock: 20,
    inProduction: 0,
    inRepair: 0,
    active: true,
    notes: 'Dado de demonstração',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 'demo-3',
    name: 'Camisa Masculina',
    code: 'CM-M-001',
    categoryId: 'demo-cat-1',
    model: 'Operacional',
    gender: 'masculino',
    size: 'M',
    color: 'Branca',
    currentStock: 18,
    minimumStock: 10,
    idealStock: 20,
    maximumStock: 25,
    inProduction: 0,
    inRepair: 0,
    active: true,
    notes: 'Dado de demonstração',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 'demo-4',
    name: 'Camisa Masculina',
    code: 'CM-G-001',
    categoryId: 'demo-cat-1',
    model: 'Operacional',
    gender: 'masculino',
    size: 'G',
    color: 'Branca',
    currentStock: 5,
    minimumStock: 10,
    idealStock: 20,
    maximumStock: 25,
    inProduction: 0,
    inRepair: 0,
    active: true,
    notes: 'Dado de demonstração',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 'demo-5',
    name: 'Calça Masculina',
    code: 'CLM-M-001',
    categoryId: 'demo-cat-1',
    model: 'Operacional',
    gender: 'masculino',
    size: 'M',
    color: 'Preta',
    currentStock: 14,
    minimumStock: 8,
    idealStock: 16,
    maximumStock: 20,
    inProduction: 0,
    inRepair: 0,
    active: true,
    notes: 'Dado de demonstração',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 'demo-6',
    name: 'Avental',
    code: 'AV-G-001',
    categoryId: 'demo-cat-1',
    size: 'G',
    color: 'Branco',
    currentStock: 4,
    minimumStock: 6,
    idealStock: 10,
    maximumStock: 15,
    inProduction: 0,
    inRepair: 0,
    active: true,
    notes: 'Dado de demonstração',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 'demo-7',
    name: 'Lençol Casal',
    code: 'LC-001',
    categoryId: 'demo-cat-2',
    size: 'Casal',
    color: 'Branco',
    currentStock: 25,
    minimumStock: 15,
    idealStock: 30,
    maximumStock: 40,
    inProduction: 0,
    inRepair: 2,
    active: true,
    notes: 'Dado de demonstração',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 'demo-8',
    name: 'Fronha',
    code: 'FR-001',
    categoryId: 'demo-cat-2',
    size: 'Padrão',
    color: 'Branco',
    currentStock: 40,
    minimumStock: 20,
    idealStock: 50,
    maximumStock: 60,
    inProduction: 0,
    inRepair: 0,
    active: true,
    notes: 'Dado de demonstração',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
];

let demoProducts = [...DEMO_PRODUCTS];

export function getDemoCategories(): Category[] {
  return [...DEMO_CATEGORIES];
}

export function getDemoProducts(): Product[] {
  return [...demoProducts];
}

export function getDemoProductById(id: string): Product | undefined {
  return demoProducts.find((p) => p.id === id);
}

export function createDemoProduct(data: ProductFormData): Product {
  const product: Product = {
    id: `demo-${Date.now()}`,
    ...data,
    inProduction: 0,
    inRepair: 0,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  demoProducts = [product, ...demoProducts];
  return product;
}

export function updateDemoProduct(id: string, data: Partial<Product>): Product | undefined {
  const index = demoProducts.findIndex((p) => p.id === id);
  if (index === -1) return undefined;
  demoProducts[index] = {
    ...demoProducts[index],
    ...data,
    updatedAt: new Date(),
  };
  return demoProducts[index];
}

export const DEMO_USER = {
  id: 'demo-user',
  name: 'Maria',
  email: 'maria@demo.local',
  role: 'ADMIN' as const,
  active: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};
