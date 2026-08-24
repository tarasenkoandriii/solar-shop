const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function apiGet<T>(path: string, token?: string | null): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiMutate<T>(
  path: string,
  method: 'POST' | 'PUT' | 'DELETE',
  token: string | null,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export interface Manufacturer {
  id: string;
  name: string;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
}

export interface Product {
  id: string;
  slug: string;
  articleNumber: string;
  category: 'SOLAR_PANEL' | 'BATTERY' | 'CONTROLLER' | 'INVERTER';
  name: string;
  manufacturer: Manufacturer | null;
  images: ProductImage[];
  shortDescription: string;
  cachedPriceUsd: string | null;
  cachedInStock: boolean;
  cachedIsPromo: boolean;
  cachedDiscountPercent: number | null;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  totalPages: number;
}

export interface BootstrapUser {
  id: string;
  telegramId: string;
  firstName: string | null;
  role: 'CUSTOMER' | 'MANAGER' | 'ADMIN';
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  priceSnapshot: string;
  product: Product;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotalUsd: number;
}

export interface Order {
  id: string;
  status: string;
  totalUsd: string;
  totalUah: string;
  ttnNumber: string | null;
  createdAt: string;
}
