'use client';

import { useEffect, useState } from 'react';
import { clientApi, getOrCreateSessionId } from '../lib/client-api';
import type { ProjectEstimate } from '../lib/api';

const DOCS = [
  { key: 'SPEC', label: 'Специфікація (позиції + ціни)', always: true },
  { key: 'ANNOTATION', label: 'Анотація проєкту' },
  { key: 'BLOCK_DIAGRAM', label: 'Блочна схема' },
  { key: 'PRINCIPAL_DIAGRAM', label: 'Принципова схема' },
  { key: 'BUSINESS_PLAN', label: "Бізнес-план з Додатком 1 (рекомендації щодо кредитування)" },
];

// ТЗ п.31.11.0 — чек-лист документів + постановка в чергу batch-генерації.
// Показывается только если на шаге 5 квиза отмечено "потрібен кредит" (или
// запрошено вручную позже) — генерируем бизнес-план не для всех подряд.
export function DocumentChecklist({ estimate, onQueued }: { estimate: ProjectEstimate; onQueued: (updated: ProjectEstimate) => void }) {
  const [selected, setSelected] = useState<string[]>(['SPEC']);
  const [channel, setChannel] = useState<'telegram' | 'whatsapp' | 'viber' | 'email'>('email');
  const [contactValue, setContactValue] = useState('');
  const [strategy, setStrategy] = useState<'' | 'HEADROOM' | 'IDENTICAL_SEGMENTS'>(estimate.scalingStrategy ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // За прямим запитом користувача — "Если checked в налаштуваннях то
  // давать вибирати на клієнтському сайті, якщо ні то grayed + not
  // checked". null = ще завантажується — до завантаження нічого не
  // сірити (щоб не мигало disabled→enabled), always=true пункти
  // (SPEC) все одно завжди доступні незалежно від цього списку.
  const [enabledKeys, setEnabledKeys] = useState<string[] | null>(null);

  useEffect(() => {
    clientApi<string[]>('/document-types/enabled')
      .then((keys) => {
        setEnabledKeys(keys);
        // Якщо щось уже було обрано ДО завантаження налаштувань (edge
        // case) і виявилось вимкненим — знімаємо вибір, не лишаємо
        // "обраним" те, що адмін заборонив.
        setSelected((prev) => prev.filter((k) => DOCS.find((d) => d.key === k)?.always || keys.includes(k)));
      })
      .catch(() => setEnabledKeys(DOCS.map((d) => d.key))); // якщо запит впав — не блокувати весь чек-лист, показати як усе дозволено

  }, []);

  function toggle(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await clientApi<ProjectEstimate>(
        `/calculator/${estimate.id}/request-documents?sessionId=${getOrCreateSessionId()}`,
        {
          method: 'POST',
          body: JSON.stringify({
            requestedDocuments: selected,
            contactChannel: channel,
            contactValue: contactValue || 'telegram',
            scalingStrategy: strategy || undefined,
          }),
        },
      );
      onQueued(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка постановки в чергу');
    } finally {
      setSubmitting(false);
    }
  }

  if (estimate.generationStatus === 'QUEUED' || estimate.generationStatus === 'PROCESSING') {
    return (
      <div className="rounded-2xl border border-leaf-800/10 bg-white p-5 text-center">
        <p className="font-medium text-leaf-900">Генерація запущена у фоновому режимі</p>
        <p className="mt-1 text-sm text-leaf-900/60">
          Документи будуть надіслані на {channel === 'email' ? 'вашу пошту' : 'обраний канал'} протягом кількох
          хвилин. Можна закрити вкладку — нічого не загубиться.
        </p>
      </div>
    );
  }

  if (estimate.generationStatus === 'COMPLETED') {
    return (
      <div className="rounded-2xl border border-green-300 bg-green-50 p-5">
        <p className="font-medium text-green-800">✓ Пакет документів готовий</p>
        {estimate.pdfUrl && (
          <a href={estimate.pdfUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-leaf-700 underline">
            Відкрити PDF
          </a>
        )}
      </div>
    );
  }

  if (estimate.generationStatus === 'FAILED') {
    return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Генерація завершилась помилкою — зверніться до менеджера.</p>;
  }

  return (
    <div className="rounded-2xl border border-leaf-800/10 bg-white p-5">
      <h3 className="mb-3 font-semibold text-leaf-900">Замовити пакет документів для банку</h3>
      <div className="mb-4 flex flex-col gap-2">
        {DOCS.map((d) => {
          const isEnabled = d.always || enabledKeys === null || enabledKeys.includes(d.key);
          return (
            <label
              key={d.key}
              className={`flex items-center gap-2 text-sm ${isEnabled ? 'text-leaf-900/80' : 'text-leaf-900/30'}`}
            >
              <input
                type="checkbox"
                checked={d.always || (isEnabled && selected.includes(d.key))}
                disabled={d.always || !isEnabled}
                onChange={() => toggle(d.key)}
              />
              {d.label}
              {d.always && <span className="text-xs text-leaf-900/40">(завжди)</span>}
              {!isEnabled && <span className="text-xs text-leaf-900/30">(недоступно)</span>}
            </label>
          );
        })}
      </div>

      <label className="mb-3 flex flex-col gap-1 text-sm text-leaf-900/70">
        Стратегія масштабування (якщо бюджет не покриває цільову потужність)
        <select value={strategy} onChange={(e) => setStrategy(e.target.value as typeof strategy)} className="rounded-lg border border-leaf-800/20 px-3 py-2">
          <option value="">Без поетапності</option>
          <option value="HEADROOM">HEADROOM — контролер із запасом</option>
          <option value="IDENTICAL_SEGMENTS">IDENTICAL_SEGMENTS — ідентичні сегменти</option>
        </select>
      </label>

      <div className="mb-3 flex gap-2">
        {(['email', 'telegram', 'whatsapp', 'viber'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setChannel(c)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${channel === c ? 'bg-sun-500 text-leaf-900' : 'border border-leaf-800/20 text-leaf-900/70'}`}
          >
            {c === 'email' ? '✉️ Email' : c === 'telegram' ? '✈️ Telegram' : c === 'whatsapp' ? '💬 WhatsApp' : '📞 Viber'}
          </button>
        ))}
      </div>
      {channel !== 'telegram' && (
        <input
          value={contactValue}
          onChange={(e) => setContactValue(e.target.value)}
          placeholder={channel === 'email' ? 'your@email.com' : 'Телефон +380...'}
          className="mb-3 w-full rounded-lg border border-leaf-800/20 px-3 py-2 text-sm"
        />
      )}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-full bg-sun-500 py-2.5 text-center text-sm font-medium text-leaf-900 hover:bg-sun-400 disabled:opacity-50"
      >
        {submitting ? '...' : 'Замовити пакет документів'}
      </button>
    </div>
  );
}
