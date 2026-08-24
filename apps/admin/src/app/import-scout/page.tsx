'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { ProductProfitRow, ProductSalesRow, ImportScoutResult, ImportScoutSearchResponse, Product } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

const SOURCE_LABEL: Record<string, string> = {
  ALIEXPRESS: 'AliExpress',
  ALIBABA: 'Alibaba',
  '1688': '1688.com',
};

// За прямим запитом користувача — реалізація doc/TZ_ImportScout.md
// розділ 6. Дві таблиці кандидатів (розділ 3.1/3.2) + ручний вибір
// (розділ 3.3) + картки результатів з чесними попередженнями (розділ
// 2.4/6 — бейдж "непідтверджено" для urlVerified=false, окреме
// попередження про агента-посередника для джерела 1688).
export default function ImportScoutPage() {
  const [byProfit, setByProfit] = useState<ProductProfitRow[] | null>(null);
  const [bySales, setBySales] = useState<ProductSalesRow[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [manualProductId, setManualProductId] = useState('');
  const [resultsByProduct, setResultsByProduct] = useState<Record<string, ImportScoutResult[]>>({});
  const [searchingId, setSearchingId] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<Record<string, string>>({});
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const { dict } = useAdminLocale();
  const d = dict.pages.importScout;

  async function load() {
    const [profit, sales, allProducts] = await Promise.all([
      apiFetch<ProductProfitRow[]>('/admin/orders-profit/top-products-by-profit'),
      apiFetch<ProductSalesRow[]>('/admin/orders-profit/top-products-by-sales'),
      apiFetch<Product[]>('/products/admin/all'),
    ]);
    setByProfit(profit);
    setBySales(sales);
    setProducts(allProducts);
  }

  useEffect(() => {
    load();
  }, []);

  async function loadResults(productId: string) {
    const results = await apiFetch<ImportScoutResult[]>(`/admin/import-scout/product/${productId}`);
    setResultsByProduct((prev) => ({ ...prev, [productId]: results }));
    setExpandedProductId(productId);
  }

  async function handleSearch(productId: string) {
    setSearchingId(productId);
    setSearchError((prev) => ({ ...prev, [productId]: '' }));
    try {
      const response = await apiFetch<ImportScoutSearchResponse>('/admin/import-scout/search', {
        method: 'POST',
        body: JSON.stringify({ productId }),
      });
      if (response.error) {
        setSearchError((prev) => ({ ...prev, [productId]: response.error! }));
      }
      setResultsByProduct((prev) => ({ ...prev, [productId]: response.results }));
      setExpandedProductId(productId);
    } catch (err) {
      setSearchError((prev) => ({ ...prev, [productId]: err instanceof Error ? err.message : d.searchError }));
    } finally {
      setSearchingId(null);
    }
  }

  function resultsFor(productId: string) {
    return resultsByProduct[productId];
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
      <p className="mb-6 max-w-2xl text-sm text-leaf-900/50 dark:text-white/50">
        {d.intro}
      </p>

      <div className="mb-8">
        <h2 className="mb-3 font-medium text-leaf-900 dark:text-white">{d.topByProfitTitle}</h2>
        {!byProfit ? (
          <p className="text-sm text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
        ) : byProfit.length === 0 ? (
          <p className="text-sm text-leaf-900/50 dark:text-white/50">{d.noProfitData}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-leaf-800/10 text-left text-leaf-900/50 dark:border-white/10 dark:text-white/50">
                <th className="py-2">{dict.pages.productsList.colName}</th>
                <th>{d.profit}</th>
                <th>{d.soldUnits}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {byProfit.map((r) => (
                <tr key={r.productId} className="border-b border-leaf-800/5 dark:border-white/5">
                  <td className="py-2 text-leaf-900 dark:text-white">{r.productName}</td>
                  <td className="font-medium text-green-700 dark:text-green-400">${r.totalProfitUsd.toFixed(2)}</td>
                  <td className="text-leaf-900/60 dark:text-white/60">{r.unitsSold}</td>
                  <td className="text-right">
                    <button
                      onClick={() => handleSearch(r.productId)}
                      disabled={searchingId === r.productId}
                      className="rounded-full bg-sun-500 px-3 py-1 text-xs font-medium text-leaf-900 disabled:opacity-50"
                    >
                      {searchingId === r.productId ? '...' : d.check}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mb-8">
        <h2 className="mb-3 font-medium text-leaf-900 dark:text-white">{d.topBySalesTitle}</h2>
        {!bySales ? (
          <p className="text-sm text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
        ) : bySales.length === 0 ? (
          <p className="text-sm text-leaf-900/50 dark:text-white/50">{d.noSalesData}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-leaf-800/10 text-left text-leaf-900/50 dark:border-white/10 dark:text-white/50">
                <th className="py-2">{dict.pages.productsList.colName}</th>
                <th>{d.soldUnits}</th>
                <th>{d.orders}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {bySales.map((r) => (
                <tr key={r.productId} className="border-b border-leaf-800/5 dark:border-white/5">
                  <td className="py-2 text-leaf-900 dark:text-white">{r.productName}</td>
                  <td className="text-leaf-900/70 dark:text-white/70">{r.unitsSold}</td>
                  <td className="text-leaf-900/60 dark:text-white/60">{r.ordersCount}</td>
                  <td className="text-right">
                    <button
                      onClick={() => handleSearch(r.productId)}
                      disabled={searchingId === r.productId}
                      className="rounded-full bg-sun-500 px-3 py-1 text-xs font-medium text-leaf-900 disabled:opacity-50"
                    >
                      {searchingId === r.productId ? '...' : d.check}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mb-8 rounded-xl border border-leaf-800/10 p-4 dark:border-white/10">
        <h2 className="mb-3 font-medium text-leaf-900 dark:text-white">{d.manualCheckTitle}</h2>
        <div className="flex gap-2">
          <select
            value={manualProductId}
            onChange={(e) => setManualProductId(e.target.value)}
            className="flex-1 rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
          >
            <option value="">{d.selectProduct}</option>
            {products?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => manualProductId && handleSearch(manualProductId)}
            disabled={!manualProductId || searchingId === manualProductId}
            className="rounded-full bg-sun-500 px-4 py-2 text-sm font-medium text-leaf-900 disabled:opacity-50"
          >
            {searchingId === manualProductId ? '...' : d.check}
          </button>
          <button
            onClick={() => manualProductId && loadResults(manualProductId)}
            disabled={!manualProductId}
            className="rounded-full border border-leaf-800/20 px-4 py-2 text-sm text-leaf-900/70 disabled:opacity-50 dark:border-white/20 dark:text-white/70"
          >
            {d.previousResults}
          </button>
        </div>
      </div>

      {expandedProductId && (
        <div>
          <h2 className="mb-3 font-medium text-leaf-900 dark:text-white">
            {d.resultsTitle} {products?.find((p) => p.id === expandedProductId)?.name ?? expandedProductId}
          </h2>
          {searchError[expandedProductId] && (
            <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{searchError[expandedProductId]}</p>
          )}
          {!resultsFor(expandedProductId) ? (
            <p className="text-sm text-leaf-900/50 dark:text-white/50">{d.loadingResults}</p>
          ) : resultsFor(expandedProductId).length === 0 ? (
            <p className="text-sm text-leaf-900/50 dark:text-white/50">{d.nothingFound}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {resultsFor(expandedProductId).map((r) => (
                <div key={r.id} className="rounded-xl border border-leaf-800/10 p-4 dark:border-white/10">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-medium text-leaf-900 dark:text-white">
                      {SOURCE_LABEL[r.source] ?? r.source} — {r.title}
                    </p>
                    {!r.urlVerified && (
                      <span
                        title={d.unverifiedTitle}
                        className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                      >
                        {d.unverifiedBadge}
                      </span>
                    )}
                  </div>

                  <p className="mb-1 text-sm text-leaf-900/70 dark:text-white/70">
                    {r.priceMinUsd !== null
                      ? `$${Number(r.priceMinUsd).toFixed(2)}${r.priceMaxUsd && r.priceMaxUsd !== r.priceMinUsd ? `–$${Number(r.priceMaxUsd).toFixed(2)}` : ''}`
                      : r.priceRawCny !== null
                        ? `¥${Number(r.priceRawCny).toFixed(2)} ${d.cnyNotConverted}`
                        : d.priceNotSpecified}
                    {r.moq !== null && ` · MOQ: ${r.moq}`}
                    {r.ourCostPriceUsdSnapshot !== null && r.priceMinUsd !== null && (
                      <span className="text-leaf-900/40 dark:text-white/40">
                        {' '}
                        · {d.ourCostLabel} ${Number(r.ourCostPriceUsdSnapshot).toFixed(2)}, {d.differenceLabel} $
                        {(Number(r.ourCostPriceUsdSnapshot) - Number(r.priceMinUsd)).toFixed(2)}
                      </span>
                    )}
                  </p>

                  {r.supplierName && (
                    <p className="mb-1 text-xs text-leaf-900/50 dark:text-white/50">
                      {d.supplierLabel} {r.supplierName}
                      {r.supplierYearsOnPlatform !== null && ` (${r.supplierYearsOnPlatform} ${d.yearsOnPlatform})`}
                    </p>
                  )}

                  {r.source === '1688' && (
                    <p className="mb-2 rounded-lg bg-orange-50 p-2 text-xs text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                      {d.agentWarning}
                    </p>
                  )}

                  <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-leaf-700 underline dark:text-sun-500">
                    {d.openSource}
                  </a>
                </div>
              ))}
              <p className="mt-2 text-xs text-leaf-900/40 dark:text-white/40">{d.finalNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
