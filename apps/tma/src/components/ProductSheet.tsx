'use client';

import { useState } from 'react';
import Image from 'next/image';
import { apiMutate } from '../lib/api';
import type { Product } from '../lib/api';
import { useTelegramSession } from './TelegramProvider';

export function ProductSheet({ product, onClose }: { product: Product; onClose: () => void }) {
  const { token, user } = useTelegramSession();
  const [status, setStatus] = useState<'idle' | 'adding' | 'added' | 'ordering' | 'ordered' | 'error'>('idle');
  const [phone, setPhone] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);

  async function handleAddToCart() {
    if (!token) return;
    setStatus('adding');
    try {
      await apiMutate('/cart/items', 'POST', token, { productId: product.id, quantity: 1 });
      setStatus('added');
    } catch {
      setStatus('error');
    }
  }

  async function handleBuyNow() {
    if (!token || !user) return;
    // ТЗ п.20.4 предполагает контакты из профиля User, но Telegram initData
    // не отдаёт номер телефона без отдельного запроса (request_contact) —
    // здесь простой инлайн-запрос телефона перед подтверждением заказа.
    if (!phone) {
      setShowPhoneInput(true);
      return;
    }
    setStatus('ordering');
    try {
      await apiMutate('/orders/buy-now', 'POST', token, {
        productId: product.id,
        quantity: 1,
        contactName: user.firstName ?? 'Telegram User',
        contactPhone: phone,
        consentGiven: true,
        source: 'tma',
      });
      setStatus('ordered');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-leaf-900/10" />
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-leaf-50">
          {product.images[0] && (
            <Image src={product.images[0].url} alt={product.name} fill className="object-cover" />
          )}
        </div>
        <p className="mt-3 text-xs text-leaf-900/50">
          {product.manufacturer?.name ?? ''} · {product.articleNumber}
        </p>
        <h2 className="mt-1 text-lg font-semibold">{product.name}</h2>
        <p className="mt-2 text-2xl font-bold text-leaf-800">
          {product.cachedPriceUsd !== null ? `$${product.cachedPriceUsd}` : '—'}
        </p>
        <p className="mt-3 text-sm text-leaf-900/70">{product.shortDescription}</p>

        {status === 'ordered' ? (
          <p className="mt-5 rounded-xl bg-green-50 p-3 text-center text-sm text-green-700">
            Замовлення оформлено! Менеджер зв&apos;яжеться з вами для уточнення деталей.
          </p>
        ) : showPhoneInput ? (
          <div className="mt-5 flex flex-col gap-2">
            <input
              autoFocus
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ваш телефон"
              className="rounded-lg border border-leaf-900/20 px-3 py-2 text-sm"
            />
            <button
              onClick={handleBuyNow}
              disabled={phone.length < 5 || status === 'ordering'}
              className="w-full rounded-full bg-sun-500 py-3 text-center text-sm font-medium text-leaf-900 disabled:opacity-40"
            >
              {status === 'ordering' ? '...' : 'Підтвердити замовлення'}
            </button>
          </div>
        ) : (
          <div className="mt-5 flex gap-2">
            <button
              onClick={handleAddToCart}
              disabled={!product.cachedInStock || status === 'adding'}
              className="flex-1 rounded-full border border-leaf-800 py-3 text-center text-sm font-medium text-leaf-800 disabled:opacity-40"
            >
              {status === 'added' ? '✓ Додано' : 'У кошик'}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={!product.cachedInStock || status === 'ordering'}
              className="flex-1 rounded-full bg-sun-500 py-3 text-center text-sm font-medium text-leaf-900 disabled:opacity-40"
            >
              {status === 'ordering' ? '...' : 'Купити в 1 клік'}
            </button>
          </div>
        )}
        {status === 'error' && <p className="mt-2 text-center text-xs text-red-600">Помилка, спробуйте ще раз</p>}

        <button onClick={onClose} className="mt-3 w-full rounded-full border border-leaf-900/10 py-2 text-center text-sm text-leaf-900/60">
          Закрити
        </button>
      </div>
    </div>
  );
}
