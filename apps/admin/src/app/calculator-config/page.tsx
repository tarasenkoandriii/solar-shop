'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { TariffRate, PowerRangeThreshold, ScalingThreshold, DocumentTypeSetting } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

// "Спецификация и бизнес план чекбоксами всегда ✅ checked" — той
// самий захист, що вже на backend-рівні (CalculatorSettingsService.
// ALWAYS_ENABLED_DOC_KEYS) — тут лише візуальне відображення того
// самого правила, не єдине джерело захисту.
const ALWAYS_ENABLED_DOC_KEYS = ['SPEC', 'BUSINESS_PLAN'];

// ТЗ п.31.11.1a/31.11.6/31.12.6 — тарифи для окупності + пороги діапазонів
// потужності + поріг HEADROOM, з кнопками "Оцінити через ІІ".
export default function CalculatorConfigPage() {
  const [tariffs, setTariffs] = useState<TariffRate[] | null>(null);
  const [powerThresholds, setPowerThresholds] = useState<PowerRangeThreshold[] | null>(null);
  const [scalingThresholds, setScalingThresholds] = useState<ScalingThreshold[] | null>(null);
  const [docTypes, setDocTypes] = useState<DocumentTypeSetting[] | null>(null);
  const [suggestingPower, setSuggestingPower] = useState(false);
  const [suggestingScaling, setSuggestingScaling] = useState(false);
  const { dict } = useAdminLocale();
  const d = dict.pages.calculatorConfig;

  async function load() {
    setTariffs(await apiFetch<TariffRate[]>('/admin/calculator-settings/tariffs'));
    setPowerThresholds(await apiFetch<PowerRangeThreshold[]>('/admin/calculator-settings/power-range-thresholds'));
    setScalingThresholds(await apiFetch<ScalingThreshold[]>('/admin/calculator-settings/scaling-thresholds'));
    setDocTypes(await apiFetch<DocumentTypeSetting[]>('/admin/calculator-settings/document-types'));
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleDocType(key: string, enabled: boolean) {
    await apiFetch('/admin/calculator-settings/document-types', { method: 'POST', body: JSON.stringify({ key, enabled }) });
    load();
  }

  async function saveTariff(key: string, label: string, rateUahPerKwh: number) {
    await apiFetch('/admin/calculator-settings/tariffs', { method: 'POST', body: JSON.stringify({ key, label, rateUahPerKwh }) });
    load();
  }

  async function suggestPower() {
    setSuggestingPower(true);
    try {
      await apiFetch('/admin/calculator-settings/power-range-thresholds/suggest-ai', { method: 'POST' });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
    } finally {
      setSuggestingPower(false);
    }
  }

  async function suggestScaling() {
    setSuggestingScaling(true);
    try {
      await apiFetch('/admin/calculator-settings/scaling-thresholds/suggest-ai', { method: 'POST' });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
    } finally {
      setSuggestingScaling(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>

      <section className="mb-8">
        <h2 className="mb-3 font-medium text-leaf-900 dark:text-white">{d.tariffsTitle}</h2>
        {!tariffs ? (
          <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(tariffs.length > 0 ? tariffs : [
              { id: 'new-green', key: 'GREEN_TARIFF', label: d.fallbackGreenTariff, rateUahPerKwh: '6.03', sourceUrl: null, updatedAt: '' },
              { id: 'new-retail', key: 'RETAIL_AVERAGE', label: d.fallbackRetailAverage, rateUahPerKwh: '4.32', sourceUrl: null, updatedAt: '' },
            ]).map((t) => (
              <TariffRow key={t.key} tariff={t} onSave={saveTariff} perKwhLabel={d.perKwh} saveLabel={dict.common.save} />
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-leaf-900 dark:text-white">{d.powerRangeTitle}</h2>
          <button onClick={suggestPower} disabled={suggestingPower} className="rounded-full bg-sun-500 px-4 py-1.5 text-xs font-medium text-leaf-900 disabled:opacity-50">
            {suggestingPower ? '...' : d.suggestViaAi}
          </button>
        </div>
        {powerThresholds && powerThresholds.length > 0 ? (
          <table className="w-full text-sm">
            <tbody>
              {powerThresholds.map((t) => (
                <tr key={t.id} className="border-b border-leaf-800/5 dark:border-white/5">
                  <td className="py-1.5 text-leaf-900 dark:text-white">{t.tag}</td>
                  <td className="text-leaf-900 dark:text-white">
                    {t.minPanelsWattW} – {t.maxPanelsWattW ?? '∞'} {d.wattUnit}
                  </td>
                  <td className="text-xs text-leaf-900/50 dark:text-white/50">{t.aiSuggestion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-leaf-900/50 dark:text-white/50">{d.notConfiguredThresholds}</p>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-leaf-900 dark:text-white">{d.headroomTitle}</h2>
          <button onClick={suggestScaling} disabled={suggestingScaling} className="rounded-full bg-sun-500 px-4 py-1.5 text-xs font-medium text-leaf-900 disabled:opacity-50">
            {suggestingScaling ? '...' : d.suggestViaAi}
          </button>
        </div>
        {scalingThresholds && scalingThresholds.length > 0 ? (
          scalingThresholds.map((t) => (
            <div key={t.id} className="text-sm text-leaf-900 dark:text-white">
              <p>
                {t.category}: {t.headroomMaxPricePercent}{d.overpaymentNote}
              </p>
              {t.aiSuggestion && <p className="text-xs text-leaf-900/50 dark:text-white/50">{t.aiSuggestion}</p>}
            </div>
          ))
        ) : (
          <p className="text-sm text-leaf-900/50 dark:text-white/50">{d.notConfigured}</p>
        )}
      </section>

      {/* За прямим запитом користувача — "На вкладке Налаштування
          добавить секцію Налаштування документообігу, тот же список
          что в четвертой вкладке калькулятора... Если checked в
          налаштуваннях то давать вибирати на клієнтському сайті,
          якщо ні то grayed + not checked". */}
      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-leaf-900 dark:text-white">{d.docTypesTitle}</h2>
        <p className="mb-3 text-xs text-leaf-900/50 dark:text-white/50">{d.docTypesIntro}</p>
        {docTypes ? (
          <div className="flex flex-col gap-2">
            {docTypes.map((dt) => {
              const alwaysOn = ALWAYS_ENABLED_DOC_KEYS.includes(dt.key);
              return (
                <label key={dt.key} className={`flex items-center gap-2 text-sm ${alwaysOn ? 'text-leaf-900/50 dark:text-white/50' : 'text-leaf-900 dark:text-white'}`}>
                  <input
                    type="checkbox"
                    checked={alwaysOn ? true : dt.enabled}
                    disabled={alwaysOn}
                    onChange={(e) => toggleDocType(dt.key, e.target.checked)}
                  />
                  {d.docTypeLabels[dt.key] ?? dt.key}
                  {alwaysOn && <span className="text-xs text-leaf-900/30 dark:text-white/30">{d.alwaysAvailable}</span>}
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
        )}
      </section>
    </div>
  );
}

function TariffRow({
  tariff,
  onSave,
  perKwhLabel,
  saveLabel,
}: {
  tariff: TariffRate;
  onSave: (key: string, label: string, rate: number) => void;
  perKwhLabel: string;
  saveLabel: string;
}) {
  const [rate, setRate] = useState(tariff.rateUahPerKwh);
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-48 text-leaf-900 dark:text-white">{tariff.label}</span>
      <input
        type="number"
        step="0.01"
        value={rate}
        onChange={(e) => setRate(e.target.value)}
        className="w-24 rounded-lg border border-leaf-800/20 px-2 py-1 dark:border-white/20 dark:bg-leaf-900 dark:text-white"
      />
      <span className="text-leaf-900/50 dark:text-white/50">{perKwhLabel}</span>
      <button onClick={() => onSave(tariff.key, tariff.label, Number(rate))} className="text-xs text-leaf-700 underline dark:text-sun-500">
        {saveLabel}
      </button>
    </div>
  );
}
