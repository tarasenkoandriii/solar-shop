'use client';

import { useState } from 'react';
import { clientApi, getOrCreateSessionId } from '../lib/client-api';
import type { ExportPackageResult, ProjectEstimate } from '../lib/api';
import { SchemaDiagram } from './SchemaDiagram';

// ТЗ п.31.10.3/31.6 — «Подробнее»/«Экспортувати»: повний пакет (анотація +
// принципова схема + PDF), доступний окремою дією, не одразу на екрані
// результату. Плюс відправка на Telegram/Email/WhatsApp/Viber.
export function ExportPanel({ estimate }: { estimate: ProjectEstimate }) {
  const [expanded, setExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<ExportPackageResult | null>(null);
  const [channel, setChannel] = useState<'telegram' | 'whatsapp' | 'viber' | 'email'>('email');
  const [contactValue, setContactValue] = useState('');
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [sendError, setSendError] = useState<string | null>(null);
  const [deeplink, setDeeplink] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    try {
      const data = await clientApi<ExportPackageResult>(
        `/calculator/${estimate.id}/export?sessionId=${getOrCreateSessionId()}`,
        { method: 'POST' },
      );
      setResult(data);
      setExpanded(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Помилка формування пакету');
    } finally {
      setExporting(false);
    }
  }

  async function handleSend() {
    setSendStatus('sending');
    setSendError(null);
    setDeeplink(null);
    try {
      const res = await clientApi<{ ok: boolean; deeplink: string | null }>(
        `/calculator/${estimate.id}/send?sessionId=${getOrCreateSessionId()}`,
        { method: 'POST', body: JSON.stringify({ channel, contactValue: contactValue || 'telegram' }) },
      );
      setSendStatus('sent');
      if (res.deeplink) setDeeplink(res.deeplink);
    } catch (err) {
      setSendStatus('error');
      setSendError(err instanceof Error ? err.message : 'Помилка відправки');
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full rounded-full border border-leaf-800 py-3 text-center font-medium text-leaf-800 hover:bg-leaf-800/5 disabled:opacity-50"
      >
        {exporting ? 'Формуємо пакет...' : 'Подробніше / Експортувати повний пакет'}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-leaf-800/10 bg-white p-5">
      {result?.annualKwhEstimate && (
        <p className="rounded-lg bg-leaf-50 p-3 text-sm text-leaf-900/80">
          ☀️ Очікувана річна генерація: приблизно {Math.round(result.annualKwhEstimate)} кВт·год/рік (за даними
          PVGIS, Об&apos;єднаний дослідницький центр Європейської комісії, нахил 35°, орієнтація на південь).
        </p>
      )}

      {(result?.estimate.annotationText ?? estimate.annotationText) && (
        <div>
          <h3 className="mb-2 font-semibold text-leaf-900">Анотація проєкту</h3>
          <div className="whitespace-pre-line text-sm text-leaf-900/80">
            {result?.estimate.annotationText ?? estimate.annotationText}
          </div>
        </div>
      )}

      {result?.principalDiagramSvg && <SchemaDiagram svg={result.principalDiagramSvg} title="Принципова схема (для монтажника)" />}

      <p className="text-xs text-leaf-900/40">
        Схема носить ознайомчий характер, не замінює проєкт від сертифікованого електрика; фінальний монтаж має
        відповідати чинним нормам (ДБН/ПУЕ).
      </p>

      {result?.pdfUrl && (
        <a
          href={result.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-sun-500 py-3 text-center font-medium text-leaf-900 hover:bg-sun-400"
        >
          📄 Завантажити PDF
        </a>
      )}

      <div className="border-t border-leaf-800/10 pt-4">
        <h3 className="mb-3 font-semibold text-leaf-900">Надіслати</h3>
        <div className="mb-3 flex gap-2">
          {(['email', 'telegram', 'whatsapp', 'viber'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setChannel(c)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                channel === c ? 'bg-sun-500 text-leaf-900' : 'border border-leaf-800/20 text-leaf-900/70'
              }`}
            >
              {c === 'email' ? '✉️ Email' : c === 'telegram' ? '✈️ Telegram' : c === 'whatsapp' ? '💬 WhatsApp' : '📞 Viber'}
            </button>
          ))}
        </div>
        {(channel === 'email' || channel === 'whatsapp' || channel === 'viber') && (
          <input
            value={contactValue}
            onChange={(e) => setContactValue(e.target.value)}
            placeholder={channel === 'email' ? 'your@email.com' : 'Телефон +380...'}
            className="mb-3 w-full rounded-lg border border-leaf-800/20 px-3 py-2 text-sm"
          />
        )}
        {channel === 'telegram' && (
          <p className="mb-3 text-xs text-leaf-900/50">Надішлемо файл прямо у ваш чат з ботом (потрібен вхід через Telegram).</p>
        )}
        <button
          onClick={handleSend}
          disabled={sendStatus === 'sending' || !result?.pdfUrl}
          className="w-full rounded-full border border-leaf-800 py-2.5 text-center text-sm font-medium text-leaf-800 hover:bg-leaf-800/5 disabled:opacity-50"
        >
          {sendStatus === 'sending' ? 'Надсилаємо...' : 'Надіслати'}
        </button>
        {sendStatus === 'sent' && !deeplink && <p className="mt-2 text-sm text-green-700">✓ Надіслано</p>}
        {sendStatus === 'sent' && deeplink && (
          <a href={deeplink} target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm text-leaf-700 underline">
            Відкрити {channel === 'whatsapp' ? 'WhatsApp' : 'Viber'} для завершення відправки →
          </a>
        )}
        {sendStatus === 'error' && <p className="mt-2 text-sm text-red-600">{sendError}</p>}
      </div>
    </div>
  );
}
