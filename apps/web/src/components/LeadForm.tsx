'use client';

import { useState } from 'react';
import type { Dictionary } from '../lib/get-dictionary';

export function LeadForm({ dict }: { dict: Dictionary }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    const form = new FormData(e.currentTarget);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    try {
      const res = await fetch(`${apiUrl}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          phone: form.get('phone'),
          comment: form.get('comment') || undefined,
          source: 'WEB',
        }),
      });
      setStatus(res.ok ? 'sent' : 'error');
      if (res.ok) e.currentTarget.reset();
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return <p className="rounded-lg bg-leaf-700/10 p-4 text-leaf-800">{dict.lead.success}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        name="name"
        required
        placeholder={dict.lead.name}
        className="rounded-lg border border-leaf-800/20 px-3 py-2"
      />
      <input
        name="phone"
        required
        placeholder={dict.lead.phone}
        className="rounded-lg border border-leaf-800/20 px-3 py-2"
      />
      <textarea
        name="comment"
        placeholder={dict.lead.comment}
        className="rounded-lg border border-leaf-800/20 px-3 py-2"
        rows={3}
      />
      <button
        type="submit"
        disabled={status === 'sending'}
        className="rounded-full bg-sun-500 px-5 py-2 font-medium text-leaf-900 transition hover:bg-sun-400 disabled:opacity-60"
      >
        {dict.lead.submit}
      </button>
      {status === 'error' && (
        <p className="text-sm text-red-600">Помилка надсилання, спробуйте ще раз.</p>
      )}
    </form>
  );
}
