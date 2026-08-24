'use client';

import { useEffect, useState } from 'react';
import { clientApi } from '../lib/client-api';
import { TelegramLoginButton } from './TelegramLoginButton';
import { DevLoginButton } from './DevLoginButton';
import { getDictionary } from '../lib/get-dictionary';
import type { Locale } from '../lib/i18n';

interface Me {
  id: string;
}

const SCALES: { key: 'businessPlanQualityScore' | 'bankResponsivenessScore' | 'processingSpeedScore' | 'applicationSuccessScore'; label: string; hint: string }[] = [
  { key: 'businessPlanQualityScore', label: 'Якість бізнес-плану', hint: '10 — план був готовий одразу, 1 — довелось усе переробляти' },
  { key: 'bankResponsivenessScore', label: 'Відзивчивість банку', hint: '10 — швидко відповідали, допомагали' },
  { key: 'processingSpeedScore', label: 'Швидкість обробки заявки', hint: '10 — дуже швидко' },
  { key: 'applicationSuccessScore', label: 'Успішність заявки', hint: '10 — заявку схвалено повністю' },
];

// За прямим запитом користувача — "визуализация шкалы отзывов -
// солнышки вместо звёздочек - от 1 до 10". Рейтинг-віджет (не 10 окремих
// кнопок із цифрами — на вузькому мобільному екрані це було б затісно):
// клік на N-те сонечко виставляє оцінку N, сонечка 1..N виглядають
// "заповненими" (яскраві), N+1..10 — приглушені контуром. Стандартний
// UX-патерн зіркового рейтингу, просто з ☀ замість ★.
function SunRating({ value, onChange }: { value: number | undefined; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-wrap gap-0.5">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} з 10`}
          className={`text-lg leading-none transition ${value !== undefined && n <= value ? 'opacity-100' : 'opacity-25 hover:opacity-50'}`}
        >
          ☀
        </button>
      ))}
    </div>
  );
}

// За прямим запитом користувача — "первый пункт - город и в какое
// отделение обращались, затем 4 категории отзывов, затем опционально
// текст отзыва". "статистика привязана к телеграм и анонимная
// (дисклеймер)" — форма вимагає авторизації через Telegram (анти-спам,
// один відгук на програму від користувача), але жодне ім'я/юзернейм
// НІКОЛИ нікуди звідси не відправляється — лише сесійна cookie
// ідентифікує користувача на бекенді, публічний відгук завжди анонімний
// структурно (FinancingReviewService.findPublicReviewsForProgram НІКОЛИ
// не повертає userId/User-поля).
export function ReviewForm({ locale, financingProgramId }: { locale: Locale; financingProgramId: string }) {
  const dict = getDictionary(locale);
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [city, setCity] = useState('');
  const [branch, setBranch] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [coveragePercent, setCoveragePercent] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<'success' | string | null>(null);

  useEffect(() => {
    clientApi<Me>('/auth/me')
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  const canSubmit = city.trim() && branch.trim() && SCALES.every((s) => scores[s.key]);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setResult(null);
    try {
      await clientApi(`/financing-programs/${financingProgramId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          city: city.trim(),
          branch: branch.trim(),
          businessPlanQualityScore: scores.businessPlanQualityScore,
          bankResponsivenessScore: scores.bankResponsivenessScore,
          processingSpeedScore: scores.processingSpeedScore,
          applicationSuccessScore: scores.applicationSuccessScore,
          coveragePercent: coveragePercent ? Number(coveragePercent) : undefined,
          reviewText: reviewText.trim() || undefined,
        }),
      });
      setResult('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      // За прямим запитом користувача — "раз в час": розпізнаємо 429
      // від RateLimitService.checkAndIncrement() і показуємо людяне
      // повідомлення, не сирий текст HTTP-помилки з номером статусу.
      if (message.includes('429')) {
        setResult('Забагато спроб — спробуйте ще раз трохи пізніше (не більше одного відгуку на цю програму за годину).');
      } else if (message.includes('409')) {
        setResult('Ви вже залишали відгук про цю програму.');
      } else {
        setResult(message || 'Не вдалося надіслати відгук');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (me === undefined) return null;

  if (me === null) {
    return (
      <div className="rounded-2xl border border-leaf-800/10 bg-leaf-50 p-6 text-center">
        <p className="mb-3 text-sm text-leaf-900/70">Щоб залишити відгук, увійдіть через Telegram.</p>
        <div className="flex justify-center gap-3">
          <TelegramLoginButton dict={dict} />
          <DevLoginButton />
        </div>
      </div>
    );
  }

  if (result === 'success') {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center text-sm text-green-800">
        ✅ Дякуємо за відгук! Оцінки вже враховані в статистиці, текст (якщо вказали) з'явиться після модерації.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-leaf-800/10 bg-white p-5">
      <h2 className="mb-1 font-medium text-leaf-900">Залишити відгук</h2>
      <p className="mb-4 text-xs text-leaf-900/50">
        Відгук анонімний — публічно не показується жодних персональних даних, вхід через Telegram потрібен лише для
        захисту від накрутки (один відгук на програму від акаунта).
      </p>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          placeholder="Місто"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded-lg border border-leaf-800/20 px-3 py-2 text-sm"
        />
        <input
          placeholder="Відділення / філія"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          className="rounded-lg border border-leaf-800/20 px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-4 flex flex-col gap-3">
        {SCALES.map((scale) => (
          <div key={scale.key}>
            <p className="mb-1 text-sm text-leaf-900">{scale.label}</p>
            <p className="mb-1.5 text-xs text-leaf-900/40">{scale.hint}</p>
            <div className="flex items-center gap-2">
              <SunRating value={scores[scale.key]} onChange={(n) => setScores({ ...scores, [scale.key]: n })} />
              {scores[scale.key] !== undefined && <span className="text-xs text-leaf-900/50">{scores[scale.key]}/10</span>}
            </div>
            {scale.key === 'applicationSuccessScore' && (
              <input
                type="number"
                min={0}
                max={100}
                placeholder="% покриття від прогнозу калькулятора (опційно)"
                value={coveragePercent}
                onChange={(e) => setCoveragePercent(e.target.value)}
                className="mt-2 w-full rounded-lg border border-leaf-800/20 px-3 py-1.5 text-sm"
              />
            )}
          </div>
        ))}
      </div>

      <textarea
        placeholder="Текст відгуку (опційно) — з'явиться публічно після модерації"
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        rows={3}
        maxLength={2000}
        className="mb-4 w-full rounded-lg border border-leaf-800/20 px-3 py-2 text-sm"
      />

      {result && result !== 'success' && <p className="mb-3 text-sm text-red-600">{result}</p>}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="rounded-full bg-sun-500 px-5 py-2 text-sm font-medium text-leaf-900 disabled:opacity-50"
      >
        {submitting ? 'Надсилаю...' : 'Надіслати відгук'}
      </button>
    </div>
  );
}
