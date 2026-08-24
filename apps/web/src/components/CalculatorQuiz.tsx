'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi, getOrCreateSessionId } from '../lib/client-api';
import type { CalculatorStepResult, ProjectGoal } from '../lib/api';

const BUDGET_RANGES = [
  { label: '$300–700', min: 300, max: 700 },
  { label: '$700–1500', min: 700, max: 1500 },
  { label: '$1500–3500', min: 1500, max: 3500 },
  { label: '$3500+', min: 3500, max: null },
];

// За прямим запитом користувача — "значения фильтра из вкладки
// кредитование" — ті самі 3 значення й підписи, що
// FinancingFilters.tsx на /financing (без "Усі типи клієнтів" — тут
// це не фільтр, а обов'язковий вибір).
const CLIENT_TYPE_LABEL: Record<'фізичні' | 'ОСББ' | 'бізнес', string> = {
  фізичні: 'Фізична особа',
  ОСББ: 'ОСББ/ЖБК',
  бізнес: 'Бізнес',
};

interface NpCityOption {
  ref: string;
  name: string;
}

interface Me {
  photoUrl: string | null;
  firstName: string | null;
}

// За прямим запитом користувача — "стилизовать заполнение квиза под
// переписку в мессенджере - у нас есть аватар пользователя при
// логине через телеграм - аватарка сайта из лого (солнышко)". Той
// самий колірний акцент, що вже логотип у Header ("☀ Solar Shop",
// text-sun-400) — не вигадано новий колір спеціально для бота.
function BotAvatar() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-leaf-900 text-base text-sun-400">
      ☀
    </div>
  );
}

// Гість (не залогінений через Telegram) — дефолтна аватарка, не
// фото. Той самий візуальний "порожній" стан, що вже інші місця
// проєкту показують для відсутніх даних (нейтральний, не помилка).
function UserAvatar({ photoUrl }: { photoUrl: string | null }) {
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- зовнішній Telegram CDN URL, не з нашого домену
    return <img src={photoUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-leaf-800/10 text-sm text-leaf-900/40">
      🙂
    </div>
  );
}

function BotBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-2">
      <BotAvatar />
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-leaf-50 px-4 py-2.5 text-sm text-leaf-900">{children}</div>
    </div>
  );
}

function UserBubble({ children, photoUrl }: { children: React.ReactNode; photoUrl: string | null }) {
  return (
    <div className="flex items-end justify-end gap-2">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-sun-500 px-4 py-2.5 text-sm text-leaf-900">{children}</div>
      <UserAvatar photoUrl={photoUrl} />
    </div>
  );
}

export function CalculatorQuiz({ locale }: { locale: string }) {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [goals, setGoals] = useState<ProjectGoal[]>([]);
  const [me, setMe] = useState<Me | null>(null);

  const [cityQuery, setCityQuery] = useState('');
  const [cityOptions, setCityOptions] = useState<NpCityOption[]>([]);
  const [selectedCity, setSelectedCity] = useState<NpCityOption | null>(null);

  const [budgetUsd, setBudgetUsd] = useState<number | null>(null);
  const [customBudget, setCustomBudget] = useState('');

  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const [knowsLoad, setKnowsLoad] = useState<'yes' | 'no' | null>(null);
  const [dailyConsumptionKwh, setDailyConsumptionKwh] = useState('');
  const [cableRunMeters, setCableRunMeters] = useState('');

  // За прямим запитом користувача — "Если доп установка инвертор
  // может быть не нужен - добавить в квиз опциональность инвертора".
  const [hasExistingInverter, setHasExistingInverter] = useState(false);

  // За прямим запитом користувача — "реализовать реальную разницу в
  // логике (второй контроллер меньшего размера для второго этапа) и
  // дать выбрать в квизе с детальной информацией в случае этого
  // кейса". Актуально лише якщо бюджету не вистачить одразу на повну
  // комплектацію — запитується заздалегідь у квизі, на випадок, не
  // постфактум.
  const [scalingStrategy, setScalingStrategy] = useState<'HEADROOM' | 'IDENTICAL_SEGMENTS'>('HEADROOM');

  const [financingNeeded, setFinancingNeeded] = useState(false);
  const [ownFundsPercent, setOwnFundsPercent] = useState(70);
  // За прямим запитом користувача — "В квиз при ветке нужно
  // кредитование добавить вопрос кого представляет пользователь".
  // Ті самі значення, що вже FinancingFilters.tsx на /financing —
  // не вигадано нові.
  const [clientType, setClientType] = useState<'фізичні' | 'ОСББ' | 'бізнес' | null>(null);

  // За прямим запитом користувача — "внести в квиз вопрос - доверять
  // ли рекомендациям". За замовчуванням false — не змінює поведінку
  // підбору компонентів для тих, хто явно не увімкнув.
  const [trustRecommendations, setTrustRecommendations] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clientApi<ProjectGoal[]>('/project-goals').then(setGoals).catch(() => setGoals([]));
    // Гість (не залогінений) — /auth/me поверне 401, ловимо мовчки,
    // UserAvatar сам покаже дефолтну аватарку без photoUrl.
    clientApi<Me>('/auth/me').then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    if (cityQuery.length < 2 || selectedCity) return;
    const timeout = setTimeout(() => {
      clientApi<NpCityOption[]>(`/nova-poshta/cities?q=${encodeURIComponent(cityQuery)}`)
        .then(setCityOptions)
        .catch(() => setCityOptions([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [cityQuery, selectedCity]);

  function toggleGoal(key: string) {
    setSelectedGoals((prev) => (prev.includes(key) ? prev.filter((g) => g !== key) : [...prev, key]));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await clientApi<CalculatorStepResult>('/calculator/start', {
        method: 'POST',
        body: JSON.stringify({
          city: selectedCity?.name,
          cityRef: selectedCity?.ref,
          budgetUsd: budgetUsd ?? (customBudget ? Number(customBudget) : undefined),
          goals: selectedGoals,
          dailyConsumptionKwh: knowsLoad === 'yes' && dailyConsumptionKwh ? Number(dailyConsumptionKwh) : undefined,
          cableRunMeters: cableRunMeters ? Number(cableRunMeters) : undefined,
          hasExistingInverter,
          scalingStrategy,
          financingNeeded,
          ownFundsPercent: financingNeeded ? ownFundsPercent : undefined,
          clientType: financingNeeded ? clientType ?? undefined : undefined,
          trustRecommendations,
          sessionId: getOrCreateSessionId(),
        }),
      });
      router.push(`/${locale}/calculator/${result.estimate.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка розрахунку, спробуйте ще раз');
    } finally {
      setSubmitting(false);
    }
  }

  const canGoNext =
    step === 1 ||
    (step === 2 && (budgetUsd !== null || customBudget !== '')) ||
    (step === 3 && selectedGoals.length > 0) ||
    step === 4 ||
    step === 5 ||
    step === 6;

  // За прямим запитом користувача — "стилизовать заполнение квиза под
  // переписку в мессенджере". Тексти питань винесені в один об'єкт —
  // переюзаються і в "минулих повідомленнях" (bot bubble кожного
  // пройденого кроку), і в активному питанні, щоб не дублювати текст
  // у двох місцях.
  const QUESTION_TEXT: Record<number, string> = {
    1: 'У якому ви місті?',
    2: 'Який бюджет плануєте?',
    3: 'Для чого вам сонячна станція?',
    4: 'Яке у вас споживання?',
    5: 'Потрібен кредит на проєкт?',
    6: 'Довіряти рекомендаціям покупців?',
  };

  // Той самий підхід, що вже "answeredSteps" раніше — текст ВІДПОВІДІ
  // для кожного пройденого кроку, тепер рендериться як user bubble,
  // не рядок у списку.
  const answerText: Record<number, string> = {};
  if (step > 1) answerText[1] = selectedCity?.name || '—';
  if (step > 2) {
    const range = BUDGET_RANGES.find((r) => (r.max ?? r.min * 2) === budgetUsd);
    const strategyPart = scalingStrategy === 'IDENTICAL_SEGMENTS' ? ', два контролери' : '';
    answerText[2] = (range ? range.label : customBudget ? `$${customBudget}` : '—') + strategyPart;
  }
  if (step > 3) {
    const labels = goals.filter((g) => selectedGoals.includes(g.key)).map((g) => g.label);
    answerText[3] = labels.length ? labels.join(', ') : '—';
  }
  if (step > 4) {
    const loadPart = knowsLoad === 'yes' && dailyConsumptionKwh ? `${dailyConsumptionKwh} кВт·год/добу` : knowsLoad === 'no' ? 'порадьте' : 'пропущено';
    const cablePart = cableRunMeters ? `, кабель ${cableRunMeters}м` : '';
    const inverterPart = hasExistingInverter ? ', вже є інвертор' : '';
    answerText[4] = `${loadPart}${cablePart}${inverterPart}`;
  }
  if (step > 5) {
    const clientTypePart = financingNeeded && clientType ? `, ${CLIENT_TYPE_LABEL[clientType]}` : '';
    answerText[5] = financingNeeded ? `так, власних коштів ${ownFundsPercent}%${clientTypePart}` : 'не потрібне';
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col px-4 py-10">
      <div className="mb-6 flex gap-1">
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-sun-500' : 'bg-leaf-800/10'}`} />
        ))}
      </div>

      {/* За прямим запитом користувача — "переписку в мессенджере" —
          історія пройдених кроків тепер справжня послідовність
          bot/user bubbles, не компактний список "Питання: Відповідь". */}
      <div className="mb-4 flex flex-col gap-3">
        {Array.from({ length: step - 1 }, (_, i) => i + 1).map((s) => (
          <div key={s} className="flex flex-col gap-2">
            <BotBubble>{QUESTION_TEXT[s]}</BotBubble>
            <UserBubble photoUrl={me?.photoUrl ?? null}>{answerText[s]}</UserBubble>
          </div>
        ))}
        <BotBubble>{QUESTION_TEXT[step]}</BotBubble>
      </div>

      {/* Активна відповідь — не bubble, а поле вводу під останнім
          повідомленням бота (той самий принцип, що "друкує зараз" у
          месенджерах). */}
      <div className="ml-10 flex flex-col gap-4 rounded-2xl border border-leaf-800/10 bg-white p-4">
      {step === 1 && (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <input
              value={selectedCity ? selectedCity.name : cityQuery}
              onChange={(e) => {
                setSelectedCity(null);
                setCityQuery(e.target.value);
              }}
              placeholder="Почніть вводити назву міста"
              className="w-full rounded-lg border border-leaf-800/20 px-3 py-2"
            />
            {!selectedCity && cityOptions.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-leaf-800/10 bg-white shadow-lg">
                {cityOptions.map((c) => (
                  <li key={c.ref}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCity(c);
                        setCityOptions([]);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-leaf-50"
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {BUDGET_RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => {
                  setBudgetUsd(r.max ?? r.min * 2);
                  setCustomBudget('');
                }}
                className={`rounded-xl border p-4 text-center font-medium ${
                  budgetUsd === (r.max ?? r.min * 2) ? 'border-sun-500 bg-sun-500/10 text-leaf-900' : 'border-leaf-800/20 text-leaf-900/70'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={customBudget}
            onChange={(e) => {
              setCustomBudget(e.target.value);
              setBudgetUsd(null);
            }}
            placeholder="Або вкажіть точну суму, $"
            className="rounded-lg border border-leaf-800/20 px-3 py-2"
          />

          {/* За прямим запитом користувача — "реализовать реальную
              разницу в логике... дать выбрать в квизе с детальной
              информацией в случае этого кейса". Актуально ЛИШЕ якщо
              бюджету не вистачить одразу — питаємо заздалегідь. */}
          <div className="mt-2 flex flex-col gap-2 rounded-xl border border-leaf-800/10 p-3">
            <p className="text-sm text-leaf-900">Якщо бюджету одразу не вистачить на всі компоненти</p>
            <p className="text-xs text-leaf-900/40">Актуально лише якщо доведеться докуповувати систему поетапно</p>
            <button
              type="button"
              onClick={() => setScalingStrategy('HEADROOM')}
              className={`rounded-lg border p-2.5 text-left text-sm ${
                scalingStrategy === 'HEADROOM' ? 'border-sun-500 bg-sun-500/10' : 'border-leaf-800/20'
              }`}
            >
              <span className="font-medium text-leaf-900">Один контролер одразу повного розміру</span>
              <p className="mt-0.5 text-xs text-leaf-900/50">
                Розрахований під фінальну потужність — не доведеться його міняти при розширенні, але він одразу
                дорожчий, ніж потрібно для першого етапу.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setScalingStrategy('IDENTICAL_SEGMENTS')}
              className={`rounded-lg border p-2.5 text-left text-sm ${
                scalingStrategy === 'IDENTICAL_SEGMENTS' ? 'border-sun-500 bg-sun-500/10' : 'border-leaf-800/20'
              }`}
            >
              <span className="font-medium text-leaf-900">Два менших незалежних контролери</span>
              <p className="mt-0.5 text-xs text-leaf-900/50">
                По одному на кожен етап, кожен підібраний саме під свій сегмент — менша плата зараз. Чесно
                попереджаємо: сумарна вартість двох контролерів може вийти як меншою, так і БІЛЬШОЮ за один великий
                — залежить від наявних моделей у каталозі на момент розрахунку.
              </p>
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-leaf-900/50">Можна обрати декілька цілей</p>
          <div className="flex flex-col gap-2">
            {goals.map((g) => (
              <label
                key={g.key}
                className={`flex items-start gap-3 rounded-xl border p-3 ${
                  selectedGoals.includes(g.key) ? 'border-sun-500 bg-sun-500/10' : 'border-leaf-800/20'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedGoals.includes(g.key)}
                  onChange={() => toggleGoal(g.key)}
                  className="mt-1"
                />
                <span className="text-sm text-leaf-900">{g.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-leaf-900/50">Необов&apos;язковий крок — можна пропустити, якщо не знаєте</p>
          <div className="flex gap-3">
            <button
              onClick={() => setKnowsLoad('yes')}
              className={`flex-1 rounded-xl border p-3 font-medium ${knowsLoad === 'yes' ? 'border-sun-500 bg-sun-500/10' : 'border-leaf-800/20'}`}
            >
              Я знаю свою нагрузку
            </button>
            <button
              onClick={() => setKnowsLoad('no')}
              className={`flex-1 rounded-xl border p-3 font-medium ${knowsLoad === 'no' ? 'border-sun-500 bg-sun-500/10' : 'border-leaf-800/20'}`}
            >
              Не знаю, порадьте
            </button>
          </div>
          {knowsLoad === 'yes' && (
            <input
              type="number"
              value={dailyConsumptionKwh}
              onChange={(e) => setDailyConsumptionKwh(e.target.value)}
              placeholder="Споживання, кВт·год/добу"
              className="rounded-lg border border-leaf-800/20 px-3 py-2"
            />
          )}

          {/* За прямим запитом користувача — "нету вводных в квизе"
              для кабелю зниження. Єдина величина, яку ФІЗИЧНО
              неможливо визначити автоматично (залежить від конкретного
              будинку/ділянки) — прямий ввід. Необов'язкове — якщо
              пропущено, calculator.service.ts застосує консервативний
              дефолт із явним попередженням у кошторисі. */}
          <label className="mt-2 flex flex-col gap-1 text-sm text-leaf-900">
            Відстань від місця встановлення до точки підключення споживача (метри)
            <input
              type="number"
              value={cableRunMeters}
              onChange={(e) => setCableRunMeters(e.target.value)}
              placeholder="Наприклад, 15 (необов'язково)"
              className="rounded-lg border border-leaf-800/20 px-3 py-2 font-normal"
            />
            <span className="text-xs text-leaf-900/40">Потрібно для розрахунку довжини та перерізу силового кабелю</span>
          </label>

          {/* За прямим запитом користувача — "Если доп установка
              инвертор может быть не нужен - добавить в квиз
              опциональность инвертора". */}
          <label className="mt-2 flex items-center gap-2 text-sm text-leaf-900">
            <input type="checkbox" checked={hasExistingInverter} onChange={(e) => setHasExistingInverter(e.target.checked)} />
            Це доповнення до вже наявної системи — у мене вже є інвертор
          </label>
        </div>
      )}

      {step === 5 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-leaf-900/50">Необов&apos;язковий крок</p>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={financingNeeded} onChange={(e) => setFinancingNeeded(e.target.checked)} />
            Так, потрібне фінансування
          </label>
          {financingNeeded && (
            <>
              <label className="flex flex-col gap-1 text-sm text-leaf-900/70">
                Частка власних коштів: {ownFundsPercent}%
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={ownFundsPercent}
                  onChange={(e) => setOwnFundsPercent(Number(e.target.value))}
                />
              </label>

              {/* За прямим запитом користувача — "добавить вопрос
                  кого представляет пользователь - физлицо осбб и тд" —
                  показується ЛИШЕ у гілці "потрібне фінансування",
                  бо саме тут ця відповідь застосовується (підбір
                  програм кредитування для бізнес-плану). */}
              <div className="flex flex-col gap-1.5">
                <p className="text-sm text-leaf-900">Кого ви представляєте?</p>
                <div className="flex gap-2">
                  {(Object.keys(CLIENT_TYPE_LABEL) as (keyof typeof CLIENT_TYPE_LABEL)[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setClientType(key)}
                      className={`flex-1 rounded-xl border px-2 py-2.5 text-xs font-medium ${
                        clientType === key ? 'border-sun-500 bg-sun-500/10 text-leaf-900' : 'border-leaf-800/20 text-leaf-900/70'
                      }`}
                    >
                      {CLIENT_TYPE_LABEL[key]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* За прямим запитом користувача — "внести в квиз вопрос -
          доверять ли рекомендациям". Пояснено, ЩО саме означає ця
          опція (не абстрактно) — впливає на підбір моделей серед
          найдешевших підходящих, коли є достатньо відгуків від
          покупців. */}
      {step === 6 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-leaf-900/50">Необов&apos;язковий крок</p>
          <label
            className={`flex items-start gap-3 rounded-xl border p-3 ${trustRecommendations ? 'border-sun-500 bg-sun-500/10' : 'border-leaf-800/20'}`}
          >
            <input
              type="checkbox"
              checked={trustRecommendations}
              onChange={(e) => setTrustRecommendations(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-leaf-900">
              Так, враховувати рейтинг надійності товарів на основі відгуків покупців при підборі компонентів
            </span>
          </label>
          <p className="text-xs text-leaf-900/40">
            Якщо увімкнено — там, де серед декількох найдешевших підходящих моделей є товар з високим рейтингом
            надійності (на основі щонайменше 3 відгуків покупців), обереться саме він, навіть якщо він не найдешевший
            в категорії. Обґрунтування кожного вибору буде видно в результатах розрахунку.
          </p>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex justify-between pt-1">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="rounded-full border border-leaf-800/20 px-5 py-2 text-sm text-leaf-900/70 disabled:opacity-30"
        >
          Назад
        </button>
        {step < 6 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canGoNext}
            className="rounded-full bg-sun-500 px-6 py-2 text-sm font-medium text-leaf-900 disabled:opacity-40"
          >
            Далі
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedGoals.length === 0}
            className="rounded-full bg-sun-500 px-6 py-2 text-sm font-medium text-leaf-900 disabled:opacity-40"
          >
            {submitting ? 'Розраховуємо...' : 'Розрахувати'}
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
