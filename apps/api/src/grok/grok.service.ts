import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithRetry } from '../common/fetch-with-retry';
import { PrismaService } from '../prisma/prisma.service';

export interface GrokMatchResult {
  isMatch: boolean;
  confidence: number;
  reasoning: string;
}

export interface GrokRewriteResult {
  title: string;
  excerpt: string;
  content: string;
}

// ТЗ п.31.4 — Grok формулирует ТРЕБОВАНИЯ, не товары/цены (архитектурный
// принцип, тот же, что и для описаний товаров/siblings).
export interface GrokCalculatorRequirements {
  panelsWattTarget: number;
  batteryKwhTarget: number;
  batteryChemistry: 'LIFEPO4' | 'GEL' | 'AGM' | null;
  controllerType: 'PWM' | 'MPPT' | null;
  controllerMinAmps: number;
  // За прямим запитом користувача — "исправь добавлением категории.
  // ...инвертор должен обеспечить мощность если бизнес цель генерация
  // или собственное потребление - то есть в любом случае". Інвертор
  // ЗАВЖДИ потрібен незалежно від конкретної цілі — мінімальна
  // безперервна вихідна потужність, розрахована як МАКСИМУМ з
  // (сумарна потужність панелей — покриває генерацію) і (пікове
  // споживання — покриває власне споживання/резерв), не умовно по
  // одній конкретній цілі.
  inverterWattTarget: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface GrokProjectGoalCandidate {
  key: string;
  label: string;
  description: string;
  defaultTopology: 'OFF_GRID' | 'BACKUP_UPS' | 'GRID_TIE' | 'COMMERCIAL' | null;
  reasoning: string; // почему не дублирует существующие цели
}

// Тонкая обёртка над Grok API (ТЗ п.17) — по аналогии с использованием
// Grok в SilverFinance/Volia. Вызовы логируются (модель, токены — здесь
// упрощённо только факт вызова, полноценный учёт стоимости — задел на
// будущее) для контроля бюджета.
//
// За прямим запитом користувача — "тарифицировать приблизительно в
// токенах и деньгах расходы". Ціни підтверджено через web_search
// (узгоджено між кількома незалежними джерелами — pricepertoken.com,
// aipricing.guru, layer3labs.io, серпень 2026), не вигадано. Значення
// для 'grok-4-fast' конкретно — модель, що реально використовується
// всіма методами GrokService, крім Batch API статей (там 'grok-4.3',
// окрема константа в articles.service.ts, туди цей прайс-лист поки не
// підключено — розділ README).
const PRICING_PER_MILLION_TOKENS: Record<string, { inputUsd: number; outputUsd: number }> = {
  'grok-4-fast': { inputUsd: 0.2, outputUsd: 0.5 },
  'grok-4.3': { inputUsd: 1.25, outputUsd: 2.5 },
};

interface UsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

function calculateCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = PRICING_PER_MILLION_TOKENS[model];
  if (!pricing) return 0; // невідома модель — 0, не вигадуємо довільну ціну
  return (promptTokens / 1_000_000) * pricing.inputUsd + (completionTokens / 1_000_000) * pricing.outputUsd;
}

@Injectable()
export class GrokService {
  private readonly logger = new Logger(GrokService.name);
  private readonly apiUrl = 'https://api.x.ai/v1/chat/completions';
  // Знайдено 19.08.2026 на реальному прогоні: `/v1/chat/completions` +
  // `search_parameters: { mode: 'on' }` (Live Search) повертав `410
  // Gone`: "Live search is deprecated. Please switch to the Agent Tools
  // API". Перевірено через web_fetch офіційну документацію
  // (docs.x.ai/developers/tools/web-search і .../text/comparison) —
  // новий шлях: ОКРЕМИЙ ендпоінт `/v1/responses`, `messages` →
  // `input`, `search_parameters` → `tools: [{ type: 'web_search' }]`,
  // відповідь у `output[].content[].text` замість
  // `choices[0].message.content`. Використовується трьома методами
  // нижче (searchFinancingPrograms, searchVendorCandidates,
  // estimateVendorCatalog) через спільний chatJsonWithWebSearch().
  private readonly responsesApiUrl = 'https://api.x.ai/v1/responses';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private get apiKey(): string | undefined {
    return this.config.get<string>('GROK_API_KEY');
  }

  // ТЗ п.17.1 — сопоставление siblings в серой зоне (0.5-0.85 confidence).
  // Строго structured output, без преамбулы.
  async matchListingToProduct(rawTitle: string, candidateProductName: string): Promise<GrokMatchResult> {
    const prompt = `Two product listings from a solar-equipment marketplace. Determine if they describe the exact same physical product (same model, same power/capacity rating), ignoring packaging/description differences.

Listing A (raw title from parser): "${rawTitle}"
Listing B (canonical catalog name): "${candidateProductName}"

Respond ONLY with JSON, no preamble: {"isMatch": boolean, "confidence": number (0-1), "reasoning": string}`;

    const result = await this.chatJson<GrokMatchResult>(prompt);
    return result ?? { isMatch: false, confidence: 0, reasoning: 'Grok unavailable' };
  }

  // ТЗ п.26.3 — первичная генерация shortDescription/description для товаров
  // автосозданных парсером в DRAFT (не копировать формулировки источника дословно).
  async generateProductDescription(
    rawTitle: string,
    specs: Record<string, unknown>,
  ): Promise<{ shortDescription: string; description: string } | null> {
    const prompt = `Write a product description for a solar-equipment e-commerce catalog, in Ukrainian. Do not copy any external source verbatim — write original wording. Do not invent specs not given below.

Product title: "${rawTitle}"
Known specs: ${JSON.stringify(specs)}

Respond ONLY with JSON: {"shortDescription": "1-2 sentences", "description": "longer markdown description with use-case guidance"}`;

    return this.chatJson(prompt);
  }

  // ТЗ п.17.2 — рерайт + перевод статей на целевые локали. Промпт винесено
  // в окремий метод (buildArticleRewritePrompt) — той самий текст тепер
  // потрібен і тут (синхронний шлях), і в ArticlesService для Batch API
  // (asинхронний шлях, "используй grok batch job для экономии средств") —
  // без дублювання рядка промпту в двох місцях.
  async rewriteAndTranslateArticle(originalText: string, targetLocale: string): Promise<GrokRewriteResult | null> {
    const prompt = this.buildArticleRewritePrompt(originalText, targetLocale);

    // Знайдено 18.08.2026 на реальному прогоні: дефолтний timeoutMs у
    // fetchWithRetry (10с) — достатньо для короткого структурованого
    // JSON (напр. вимог калькулятора), але критично замало для генерації
    // ПОВНОЇ статті в markdown ("length at least as long as original") —
    // LLM фізично не встигає, `AbortError: This operation was aborted`
    // повторювався щоразу (з ретраями — по 2-3 спроби на кожен виклик,
    // кожна по 10с). Явний довший таймаут саме для цього виклику.
    return this.chatJson(prompt, 90_000);
  }

  // За прямим запитом користувача — "явно проблема локализации статей".
  // Знайдено ЙМОВІРНУ причину при перегляді промпту: `present it in
  // locale "${targetLocale}"` передавав СИРИЙ ISO-код напряму в
  // природномовну інструкцію — "uk" є ЗАГАЛЬНОВІДОМИМ скороченням
  // United Kingdom (Британія), не лише кодом української локалі. LLM
  // цілком могла (і, судячи з реального скріншоту — UK-заголовки статей
  // лишались англійськими — саме так і зробила) інтерпретувати "locale
  // uk" як "залиш британською англійською", а не "переклади українською".
  // Виправлено — явний маппінг код→людська назва мови, сформульовано
  // однозначно ("Translate ... into Ukrainian", не голий код).
  private static readonly LOCALE_LANGUAGE_NAMES: Record<string, string> = {
    uk: 'Ukrainian',
    ru: 'Russian',
    en: 'English',
  };

  buildArticleRewritePrompt(originalText: string, targetLocale: string): string {
    const languageName = GrokService.LOCALE_LANGUAGE_NAMES[targetLocale] ?? targetLocale;
    return `Rewrite the following article about solar energy in your own words (do not copy verbatim, avoid copyright issues), keeping technical terms and units accurate. Translate/present the result in ${languageName} (locale code: "${targetLocale}") — the ENTIRE output (title, excerpt, content) must be written in ${languageName}, regardless of what language the original is in. Neutral expert tone, markdown formatting preserved, length at least as long as original.

Original:
${originalText}

Respond ONLY with JSON: {"title": string, "excerpt": string, "content": string (markdown)} — all three fields in ${languageName}.`;
  }

  // За прямим запитом користувача — "добавить скоринг статьи и
  // сортировку по нему - релевантность теме и интересные факты есть ли
  // в ней". Один агрегований показник (0-100) — LLM явно проінструктовано
  // враховувати ОБИДВА критерії при формуванні ЄДИНОГО числа, не
  // повертати два окремих (простіше для сортування/відображення "великою
  // кольоровою цифрою", як прямо попросив користувач). Аналізує
  // ОРИГІНАЛЬНИЙ текст (до перекладу) — окремий, не per-locale
  // batch-запит на статтю (розділ README про реалізацію в
  // ArticlesService).
  buildArticleScorePrompt(originalText: string): string {
    return `Rate the following article for a Ukrainian solar/renewable-energy equipment shop's news section, on a 0-100 scale. Consider TWO factors together: (1) relevance — how directly it relates to solar photovoltaic energy specifically (not just energy/batteries in general — pure grid/EV/wind news scores lower even if well-written); (2) interest value — does it contain concrete, notable facts, figures, or developments (not just generic/vague statements).

Article:
${originalText}

Respond ONLY with JSON: {"score": number (0-100 integer), "reasoning": string (one short sentence explaining the score)}.`;
  }

  // ТЗ п.31.4 — квиз/уточнение → структурированные ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ,
  // не названия товаров и не цены (backend резолвит их против каталога).
  async extractCalculatorRequirements(input: {
    city?: string;
    budgetUsd?: number;
    goals: string[]; // ProjectGoal.label текстом, для контекста промпта
    dailyConsumptionKwh?: number;
    refinementText?: string;
    previousRequirements?: GrokCalculatorRequirements;
    // За прямим запитом користувача — контекст для логування витрат
    // (GrokUsageLog). Необов'язковий (не ламає жоден інший виклик
    // цього методу, якщо такий колись з'явиться без контексту) —
    // якщо не передано, витрати цього конкретного виклику просто не
    // логуються, не падає з помилкою.
    usageContext?: { userId?: string | null; sessionId?: string | null; projectEstimateId?: string | null };
  }): Promise<GrokCalculatorRequirements | null> {
    const prompt = `You are a solar-equipment sizing assistant for a Ukrainian solar shop calculator. Based on the input below, propose TECHNICAL REQUIREMENTS only — never suggest specific products, brands, or prices, the backend will resolve requirements against a real catalog.

City: ${input.city ?? 'not specified'}
Budget (USD): ${input.budgetUsd ?? 'not specified'}
Project goals: ${input.goals.join(', ') || 'not specified'}
Daily consumption (kWh/day, if explicitly provided by user — most reliable signal): ${input.dailyConsumptionKwh ?? 'NOT PROVIDED — estimate from goals+budget instead, and lower confidenceLevel accordingly'}
${input.refinementText ? `User's refinement request (iterate on top of previous requirements, keep full prior context in mind): "${input.refinementText}"` : ''}
${input.previousRequirements ? `Previous requirements (adjust based on refinement above, do not restart from scratch): ${JSON.stringify(input.previousRequirements)}` : ''}

Respond ONLY with JSON: {"panelsWattTarget": number, "batteryKwhTarget": number, "batteryChemistry": "LIFEPO4"|"GEL"|"AGM"|null, "controllerType": "PWM"|"MPPT"|null, "controllerMinAmps": number, "inverterWattTarget": number (continuous output power in watts — an inverter is ALWAYS required regardless of the specific goal: size it to cover the LARGER of total panel wattage (covers energy generation/export use cases) and estimated peak household consumption load (covers own-consumption/backup use cases) — never omit or set to zero), "confidenceLevel": "high"|"medium"|"low", "reasoning": string (Ukrainian, 1-2 sentences explaining the sizing logic)}`;

    return this.chatJsonWithUsage<GrokCalculatorRequirements>(prompt, {
      ...input.usageContext,
      purpose: input.refinementText ? 'calculator_refine' : 'calculator_requirements',
    });
  }

  // ТЗ п.31.10.2 — аннотация на основе УЖЕ РЕЗОЛВЛЕННОГО recommendedSpec
  // (реальные товары/мощности/цены), не абстрактных данных.
  async generateProjectAnnotation(input: {
    city?: string;
    goals: string[];
    topology: string;
    specSummary: string; // текстовое резюме резолвленной спецификации (товары/мощности)
    totalUsd: number;
    annualKwhEstimate?: number | null;
    usageContext?: { userId?: string | null; sessionId?: string | null; projectEstimateId?: string | null };
  }): Promise<string | null> {
    const prompt = `Write a project summary annotation in Ukrainian (markdown) for a solar-equipment project estimate, based ONLY on the already-resolved specification below — do not invent numbers beyond what's given.

City: ${input.city ?? 'не вказано'}
Project goals: ${input.goals.join(', ')}
System topology: ${input.topology}
Resolved specification: ${input.specSummary}
Total price (USD): ${input.totalUsd}
${input.annualKwhEstimate ? `Annual PV generation estimate (from PVGIS, real climatological data — cite it): ~${Math.round(input.annualKwhEstimate)} kWh/year (за даними PVGIS, Об'єднаний дослідницький центр Європейської комісії, стандартні припущення: нахил 35°, орієнтація на південь)` : ''}

Explain: what this configuration is suited for (project goals), why this power/capacity was chosen, what's included and what's not (e.g. mounting/cabling separate if not in the estimate), which topology this is built for. 3-5 short paragraphs.

Respond ONLY with the markdown text, no JSON wrapper, no preamble.`;

    if (!this.apiKey) {
      this.logger.warn('GROK_API_KEY not configured — skipping annotation generation');
      return null;
    }

    const model = 'grok-4-fast';
    try {
      const res = await fetchWithRetry(this.apiUrl, {
        method: 'POST',
        retries: 2,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        choices: { message: { content: string } }[];
        usage?: { prompt_tokens: number; completion_tokens: number };
      };
      if (data.usage) {
        await this.logUsage(model, data.usage.prompt_tokens, data.usage.completion_tokens, {
          ...input.usageContext,
          purpose: 'calculator_annotation',
        });
      }
      return data.choices[0]?.message?.content?.trim() ?? null;
    } catch (err) {
      this.logger.error('Annotation generation failed', err as Error);
      return null;
    }
  }

  // ТЗ п.31.1.2 — предложение новых ProjectGoal, с обязательным контекстом
  // текущего справочника (чтобы не предлагать дубли).
  async suggestProjectGoals(
    existingGoals: { key: string; label: string; description: string | null; defaultTopology: string | null }[],
    brief?: string,
  ): Promise<GrokProjectGoalCandidate[] | null> {
    const prompt = `You maintain a reference list of "project goals" for a solar-equipment sizing calculator. Suggest 2-4 NEW goal candidates that do NOT duplicate or overlap in meaning with the existing list below.

Existing active goals:
${JSON.stringify(existingGoals, null, 2)}

${brief ? `Admin's brief: "${brief}"` : 'No specific brief — propose goals you think are missing from the current coverage.'}

Respond ONLY with JSON object: {"candidates": [{"key": "LATIN_SNAKE_CASE_UNIQUE", "label": "Ukrainian checkbox text", "description": "Ukrainian explanation for admin/prompt context", "defaultTopology": "OFF_GRID"|"BACKUP_UPS"|"GRID_TIE"|"COMMERCIAL"|null, "reasoning": "why this doesn't duplicate existing goals"}]}`;

    const result = await this.chatJson<{ candidates: GrokProjectGoalCandidate[] }>(prompt);
    return result?.candidates ?? null;
  }

  // ТЗ п.31.10.1a — разовый ИИ-аудит готового SVG-шаблона схемы. Grok
  // получает СОДЕРЖИМОЕ шаблона (структуру, не рисует заново), проверяет
  // логическую последовательность — НЕ исправляет, только текстовый отчёт.
  async auditSchemaTemplate(svgContent: string, topology: string): Promise<string | null> {
    const prompt = `You are reviewing a fixed SVG diagram template for a solar power system topology "${topology}". Check the logical/electrical sequence for typical mistakes: correct order panels→controller→battery→inverter→load for this topology, no obviously reversed arrow directions, block count matches the topology. Do NOT redraw or suggest a replacement SVG — only report findings.

SVG content:
${svgContent}

Respond in Ukrainian, plain text (not JSON): either a list of concerns, or a confirmation that no obvious problems were found. Be concise.`;

    if (!this.apiKey) return null;
    try {
      const res = await fetchWithRetry(this.apiUrl, {
        method: 'POST',
        retries: 2,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ model: 'grok-4-fast', messages: [{ role: 'user', content: prompt }] }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { choices: { message: { content: string } }[] };
      return data.choices[0]?.message?.content?.trim() ?? null;
    } catch (err) {
      this.logger.error('Schema audit failed', err as Error);
      return null;
    }
  }

  // ТЗ п.31.11.6 — предложить границы SMALL/MEDIUM/LARGE по агрегатам
  // каталога (перцентили/кластеры мощности), backend уже всё посчитал —
  // Grok только интерпретирует и обосновывает, не придумывает цифры с нуля.
  async suggestPowerRangeThresholds(stats: {
    percentiles: Record<string, number>;
    clusters: number[];
  }): Promise<{ small: number; medium: number; large: number; reasoning: string } | null> {
    const prompt = `You size solar-panel systems for a Ukrainian shop. Based on the aggregated statistics below (percentiles and natural clusters of total panel wattage across the published catalog), propose three human-understandable power boundaries in Watts: SMALL/MEDIUM boundary, MEDIUM/LARGE boundary, LARGE/COMMERCIAL boundary (open-ended above).

Statistics: ${JSON.stringify(stats)}

Respond ONLY with JSON: {"small": number (Вт, верхня межа SMALL), "medium": number (верхня межа MEDIUM), "large": number (верхня межа LARGE), "reasoning": string (Ukrainian, explain the natural breaks you used)}`;

    return this.chatJson(prompt);
  }

  // ТЗ п.31.12.6 — порог "незначительной переплаты" для HEADROOM-стратегии,
  // по реальным ценовым шагам между соседними моделями каталога.
  async suggestScalingThreshold(
    category: string,
    priceSteps: number[],
  ): Promise<{ thresholdPercent: number; reasoning: string } | null> {
    const prompt = `You help decide when it's worth buying a slightly more powerful component "with headroom" for future expansion, vs a cheaper exact-fit one. Below are real percentage price differences between adjacent models (sorted by power/current rating) in category "${category}" of a solar-equipment catalog.

Price step percentages: ${JSON.stringify(priceSteps)}

Propose a threshold percentage: price steps below it are "worth it" (small enough overpay to justify future-proofing), above it are "not worth it" (jump too expensive).

Respond ONLY with JSON: {"thresholdPercent": number, "reasoning": string (Ukrainian, 1-2 sentences)}`;

    return this.chatJson(prompt);
  }

  // ТЗ п.32.1 — Grok с веб-поиском ищет кандидатов программ кредитования по
  // темам-затравкам, НЕ публикует их сам (только структурированные поля,
  // upsert со status: DRAFT делает backend). Тот же принцип, что и везде:
  // финансовая информация с ошибкой — риск ввести человека в заблуждение,
  // поэтому даже находки ИИ идут в модерацию, не публикуются напрямую.
  async searchFinancingPrograms(seedTopics: string[]): Promise<
    | {
        name: string;
        eligibility: string;
        description: string;
        url: string;
        discoverySourceUrl: string | null;
        minLoanUsd: number | null;
        maxLoanUsd: number | null;
      }[]
    | { error: string }
  > {
    const prompt = `Search the web for Ukrainian solar-equipment financing/lending/grant programs (bank loans, government programs, energy-efficiency funds). Use these seed topics as starting points: ${seedTopics.join(', ')}.

For each distinct program you find, extract structured fields. Do not invent programs or numbers — only report what you find via search, and prefer official sources (bank websites, government program pages) over aggregators.

Respond ONLY with JSON object: {"programs": [{"name": string, "eligibility": string (Ukrainian: "фізичні особи"/"ОСББ/ЖБК"/"бізнес" or combination), "description": string (Ukrainian, brief), "url": string (official program page), "discoverySourceUrl": string|null (if found via a secondary source, not the official page itself), "minLoanUsd": number|null, "maxLoanUsd": number|null}]}`;

    // ТЗ п.32.1 — веб-поиск включён (более дорогой вызов, чем обычная
    // генерация — учтено в rate limiting на уровне контроллера/крона).
    // Знайдено 19.08.2026: раніше промпт ще й просив ІІ знайти imageUrl
    // через цей самий текстовий веб-пошук — структурно неможливо (Live
    // Search/Agent Tools віддає моделі текстові сніпети результатів
    // пошуку, не HTML-розмітку сторінки, тому og:image фізично не
    // "видно"), завжди повертало null. Отримання картинки перенесено в
    // FinancingService.fetchOgImage() — прямий детермінований HTTP-запит
    // на вже відому url програми, не залежить від того, що "бачить"
    // модель через пошук.
    const result = await this.chatJsonWithWebSearch<{
      programs: {
        name: string;
        eligibility: string;
        description: string;
        url: string;
        discoverySourceUrl: string | null;
        minLoanUsd: number | null;
        maxLoanUsd: number | null;
      }[];
    }>(prompt, { purpose: 'financing_program_search' });
    if ('error' in result) return result;
    return result.programs ?? [];
  }

  // За прямим запитом користувача — реалізація doc/TZ_ImportScout.md
  // (розділ 2.3/2.4/5). Той самий принцип, що вже searchFinancingPrograms
  // вище — Grok сам не приймає рішень, лише повертає структуровані
  // знахідки, backend валідує (URL regex, розділ ImportScoutService).
  // ЯВНО просить переклад title українською/англійською незалежно від
  // мови джерела (ТЗ розділ 2.4 — 1688 переважно китайською) і, за
  // можливості, ціну в юанях окремо (priceRawCny) — конвертація в USD
  // відбувається ДЕТЕРМІНОВАНИМ кроком бекенду (CurrencyService.
  // convertCnyToUsd), не покладається на LLM для валютного розрахунку.
  async searchImportOffers(
    query: {
      productName: string;
      brand: string | null;
      model: string | null;
      keySpecs: string;
    },
    requestedByUserId?: string,
  ): Promise<
    | {
        source: 'ALIEXPRESS' | 'ALIBABA' | '1688';
        title: string;
        priceMinUsd: number | null;
        priceMaxUsd: number | null;
        priceRawCny: number | null;
        moq: number | null;
        sourceUrl: string;
        supplierName: string | null;
        supplierYearsOnPlatform: number | null;
      }[]
    | { error: string }
  > {
    const prompt = `Search AliExpress.com, Alibaba.com, and 1688.com for offers of this product or its close equivalent: "${query.productName}"${query.brand ? `, brand: ${query.brand}` : ''}${query.model ? `, model: ${query.model}` : ''}. Key specifications: ${query.keySpecs}.

For each distinct offer found, extract structured fields. Prefer direct links to a SPECIFIC product page (not a category/search listing page). If the source is 1688.com (Chinese-language site), TRANSLATE the title to Ukrainian or English — do not leave it in Chinese. If the price on 1688.com is in Chinese Yuan (CNY), report it in the priceRawCny field (do not attempt currency conversion yourself, leave priceMinUsd/priceMaxUsd null for that offer if you only have the CNY price). Do not invent offers — only report what you find via search.

Respond ONLY with JSON object: {"offers": [{"source": "ALIEXPRESS"|"ALIBABA"|"1688", "title": string (translated if needed), "priceMinUsd": number|null, "priceMaxUsd": number|null, "priceRawCny": number|null, "moq": number|null (minimum order quantity, if stated), "sourceUrl": string, "supplierName": string|null, "supplierYearsOnPlatform": number|null}]}`;

    const result = await this.chatJsonWithWebSearch<{
      offers: {
        source: 'ALIEXPRESS' | 'ALIBABA' | '1688';
        title: string;
        priceMinUsd: number | null;
        priceMaxUsd: number | null;
        priceRawCny: number | null;
        moq: number | null;
        sourceUrl: string;
        supplierName: string | null;
        supplierYearsOnPlatform: number | null;
      }[];
    }>(prompt, { userId: requestedByUserId, purpose: 'import_scout_search' });
    if ('error' in result) return result;
    return result.offers ?? [];
  }

  // ТЗ п.31.11.4 — генерация черновика манифеста бизнес-плана под конкретную
  // комбинацию тегов (цели+диапазон мощности) + свободный бриф админа.
  async generateBusinessPlanManifest(input: {
    goalTags: string[];
    powerRangeTag: string | null;
    brief?: string;
  }): Promise<string | null> {
    const prompt = `Draft a business-plan document manifest (structure of sections + boilerplate text + instructions for an LLM that will later fill in the text parts) for a solar-equipment loan application business plan, in Ukrainian, markdown format.

Target project goals: ${input.goalTags.join(', ') || 'universal / any goals'}
Target power range: ${input.powerRangeTag ?? 'universal / any size'}
${input.brief ? `Admin's brief: "${input.brief}"` : ''}

The manifest should define: document sections (e.g. "Резюме проєкту", "Технічний опис системи", "Кошторис", "Прогноз окупності", "Рекомендації щодо кредитування"), boilerplate disclaimers, and instructions for how an LLM should fill each text section using already-resolved project data (never invent numbers).

Respond with the manifest content as markdown text only, no JSON wrapper, no preamble.`;

    if (!this.apiKey) return null;
    try {
      const res = await fetchWithRetry(this.apiUrl, {
        method: 'POST',
        retries: 2,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ model: 'grok-4-fast', messages: [{ role: 'user', content: prompt }] }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { choices: { message: { content: string } }[] };
      return data.choices[0]?.message?.content?.trim() ?? null;
    } catch (err) {
      this.logger.error('Manifest generation failed', err as Error);
      return null;
    }
  }

  // ТЗ п.31.11.1 — заполнение текстовых секций бизнес-плана по манифесту +
  // уже резолвленным данным проекта (тот же принцип: не придумывать цифры).
  async fillBusinessPlanContent(input: {
    manifestContent: string;
    projectSummary: string;
  }): Promise<string | null> {
    const prompt = `Using the manifest below as the structural guide (sections, boilerplate, instructions), write the actual business-plan document text for THIS specific project, in Ukrainian, markdown. Use ONLY the resolved project data given — never invent numbers, prices, or facts beyond what's provided.

Manifest (structure/instructions):
${input.manifestContent}

Resolved project data:
${input.projectSummary}

Respond with the filled-in markdown document only, no JSON wrapper.`;

    if (!this.apiKey) return null;
    try {
      const res = await fetchWithRetry(this.apiUrl, {
        method: 'POST',
        retries: 2,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ model: 'grok-4-fast', messages: [{ role: 'user', content: prompt }] }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { choices: { message: { content: string } }[] };
      return data.choices[0]?.message?.content?.trim() ?? null;
    } catch (err) {
      this.logger.error('Business plan content fill failed', err as Error);
      return null;
    }
  }

  // За запитом користувача — ІІ-пошук нових постачальників (крім ручного
  // додавання) на сторінці /admin/vendors. Той самий патерн, що
  // searchFinancingPrograms() вище — реальний веб-пошук через
  // chatJsonWithWebSearch() (/v1/responses + tools: web_search),
  // дорожчий виклик, ніж звичайна генерація.
  // excludeNames — уже існуючі постачальники в базі, щоб ІІ не
  // пропонував дублікати.
  async searchVendorCandidates(
    country: string,
    category: string | undefined,
    city: string | undefined,
    excludeNames: string[],
  ): Promise<{ name: string; website: string; notes: string }[] | { error: string }> {
    const prompt = `Search the web for online stores/retailers selling solar energy equipment (solar panels, batteries/energy storage, charge controllers) in ${country}${city ? `, specifically serving/located in or near ${city}` : ''}${category ? `, with a focus on ${category === 'SOLAR_PANEL' ? 'solar panels' : category === 'BATTERY' ? 'batteries/energy storage' : 'charge controllers'}` : ''}.

Do NOT include any of these already-known vendors: ${excludeNames.join(', ') || '(none yet)'}.

For each distinct real online store you find (not marketplaces like Amazon/eBay, not manufacturers-only sites without direct sales — actual retailers with a catalog), extract: name, website (main domain), and a short note on what they seem to specialize in. Only report stores you actually found via search — do not invent any.

Respond ONLY with JSON: {"vendors": [{"name": string, "website": string, "notes": string}]}`;

    const result = await this.chatJsonWithWebSearch<{ vendors: { name: string; website: string; notes: string }[] }>(prompt, {
      purpose: 'vendor_candidate_search',
    });
    if ('error' in result) return result;
    return result.vendors ?? [];
  }

  // Другий ІІ-запит (за запитом користувача — "показати кількість товарів
  // потенційно і які категорії є на сайті") — окремий виклик на
  // конкретного кандидата, не разом із пошуком вище (пошук по країні міг
  // би повернути кілька кандидатів, дорого й повільно одразу оцінювати
  // каталог кожного — тому лише за явним запитом адміна на одного
  // конкретного кандидата).
  async estimateVendorCatalog(
    website: string,
  ): Promise<{ estimatedProductCount: number | null; categories: string[]; notes: string } | { error: string }> {
    const prompt = `Search the web for the online store at ${website}. Try to estimate how many solar energy products (solar panels, batteries, charge controllers combined) they have in their catalog, and which of these three categories they actually carry: solar panels, batteries/energy storage, charge controllers.

Base this on what you can actually find via search (category pages, product listing counts, sitemap hints) — do not invent precise numbers, a rough estimate or range is fine, and say so in the notes if the exact count isn't determinable.

Respond ONLY with JSON: {"estimatedProductCount": number|null, "categories": string[] (subset of ["SOLAR_PANEL","BATTERY","CONTROLLER"]), "notes": string (Ukrainian, brief, mention if this is a rough estimate)}`;

    const result = await this.chatJsonWithWebSearch<{ estimatedProductCount: number | null; categories: string[]; notes: string }>(
      prompt,
      { purpose: 'vendor_catalog_estimate' },
    );
    return result;
  }

  // Спільний хелпер для чотирьох методів, яким потрібен реальний веб-
  // пошук (searchFinancingPrograms, searchVendorCandidates,
  // estimateVendorCatalog, searchImportOffers) — /v1/responses +
  // tools: [{type: 'web_search'}], не /v1/chat/completions +
  // search_parameters (застаріле, 410 Gone). Повертає { error }
  // замість null при будь-якій невдачі — той самий принцип "реальна
  // причина замість generic-повідомлення", що вже застосований у
  // chatJson-викликах вище після знахідки 19.08.2026.
  //
  // За прямим запитом користувача — "chatJsonWithWebSearch() взагалі
  // не викликає logUsage()... Исправь". Знайдено через офіційну
  // документацію xAI (не здогадано): /v1/responses повертає usage у
  // ІНШОМУ форматі за /v1/chat/completions —
  // `input_tokens`/`output_tokens` (не `prompt_tokens`/
  // `completion_tokens`, як у chatJsonWithUsage() вище) — саме ця
  // різниця в назвах полів і є причиною, чому це не було зроблено
  // одразу. Той самий патерн, що вже chatJsonWithUsage() — logContext
  // тепер ОБОВ'ЯЗКОВИЙ параметр (не опційний) — усі 4 виклики мають
  // явно вказати purpose, не мовчки пропустити логування.
  private async chatJsonWithWebSearch<T>(
    prompt: string,
    logContext: { userId?: string | null; sessionId?: string | null; projectEstimateId?: string | null; purpose: string },
    timeoutMs = 30_000,
  ): Promise<T | { error: string }> {
    if (!this.apiKey) return { error: 'GROK_API_KEY не задано на бекенді' };

    const model = 'grok-4-fast';
    try {
      const res = await fetchWithRetry(this.responsesApiUrl, {
        method: 'POST',
        retries: 2,
        timeoutMs,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model,
          input: [{ role: 'user', content: prompt }],
          tools: [{ type: 'web_search' }],
          // Знайдено 19.08.2026 на реальному прогоні: `response_format` —
          // поле лише /v1/chat/completions. На /v1/responses точнісінько
          // те саме значення переноситься під `text.format` (сама
          // помилка API назвала точний шлях поля, не довелось гадати).
          text: { format: { type: 'json_object' } },
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        this.logger.error(`Grok Responses API error ${res.status}: ${detail}`);
        return { error: `xAI повернув статус ${res.status}: ${detail.slice(0, 300)}` };
      }
      const data = (await res.json()) as {
        output?: { type: string; content?: { type: string; text?: string }[] }[];
        usage?: { input_tokens: number; output_tokens: number };
      };

      if (data.usage) {
        await this.logUsage(model, data.usage.input_tokens, data.usage.output_tokens, logContext);
      } else {
        this.logger.warn(`Grok /v1/responses для "${logContext.purpose}" не містила поля usage — витрати не залоговано.`);
      }

      const message = data.output?.find((o) => o.type === 'message');
      const textItem = message?.content?.find((c) => c.type === 'output_text');
      const raw = textItem?.text;
      if (!raw) {
        return { error: `Відповідь xAI не містить output_text: ${JSON.stringify(data).slice(0, 300)}` };
      }
      return JSON.parse(raw.replace(/```json|```/g, '').trim()) as T;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Grok web search call failed', err as Error);
      return { error: message };
    }
  }

  private async chatJson<T>(prompt: string, timeoutMs = 10_000): Promise<T | null> {
    if (!this.apiKey) {
      this.logger.warn('GROK_API_KEY not configured — skipping Grok call');
      return null;
    }

    try {
      const res = await fetchWithRetry(this.apiUrl, {
        method: 'POST',
        retries: 2,
        timeoutMs,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: 'grok-4-fast',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) {
        this.logger.error(`Grok API error ${res.status}`);
        return null;
      }

      const data = (await res.json()) as { choices: { message: { content: string } }[] };
      const raw = data.choices[0]?.message?.content ?? '{}';
      return JSON.parse(raw.replace(/```json|```/g, '').trim()) as T;
    } catch (err) {
      this.logger.error('Grok call failed', err as Error);
      return null;
    }
  }

  // За прямим запитом користувача — "тарифицировать приблизительно в
  // токенах и деньгах расходы, показать и привязывать к telegram id".
  // Окремий метод, не зміна chatJson() — свідомо не чіпає жоден з
  // існуючих викликів (suggestProjectGoals/auditSchemaTemplate тощо),
  // лише ті два місця, що реально частина "ітеративної схеми
  // спілкування по створенню проєкту" (розділ README): один
  // JSON-response запит, той самий формат, що chatJson(), плюс
  // читання стандартного OpenAI-сумісного поля `usage` з відповіді й
  // запис у GrokUsageLog. Якщо usage відсутнє у відповіді (малоймовірно,
  // але не гарантовано контрактом) — лог просто не пишеться, не
  // вигадуємо приблизні числа.
  private async chatJsonWithUsage<T>(
    prompt: string,
    logContext: { userId?: string | null; sessionId?: string | null; projectEstimateId?: string | null; purpose: string },
    timeoutMs = 10_000,
  ): Promise<T | null> {
    if (!this.apiKey) {
      this.logger.warn('GROK_API_KEY not configured — skipping Grok call');
      return null;
    }

    const model = 'grok-4-fast';
    try {
      const res = await fetchWithRetry(this.apiUrl, {
        method: 'POST',
        retries: 2,
        timeoutMs,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) {
        this.logger.error(`Grok API error ${res.status}`);
        return null;
      }

      const data = (await res.json()) as {
        choices: { message: { content: string } }[];
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      };

      if (data.usage) {
        await this.logUsage(model, data.usage.prompt_tokens, data.usage.completion_tokens, logContext);
      } else {
        this.logger.warn(`Grok response for "${logContext.purpose}" не містила поля usage — витрати не залоговано.`);
      }

      const raw = data.choices[0]?.message?.content ?? '{}';
      return JSON.parse(raw.replace(/```json|```/g, '').trim()) as T;
    } catch (err) {
      this.logger.error('Grok call failed', err as Error);
      return null;
    }
  }

  private async logUsage(
    model: string,
    promptTokens: number,
    completionTokens: number,
    context: { userId?: string | null; sessionId?: string | null; projectEstimateId?: string | null; purpose: string },
  ): Promise<void> {
    const estimatedCostUsd = calculateCostUsd(model, promptTokens, completionTokens);
    try {
      await this.prisma.client.grokUsageLog.create({
        data: {
          userId: context.userId ?? undefined,
          sessionId: context.sessionId ?? undefined,
          projectEstimateId: context.projectEstimateId ?? undefined,
          purpose: context.purpose,
          model,
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          estimatedCostUsd,
        },
      });
    } catch (err) {
      // Логування витрат — допоміжна функція, не повинна ламати основний
      // потік (розрахунок проєкту), якщо запис у БД чомусь провалиться.
      this.logger.error('Не вдалося залогувати GrokUsageLog', err as Error);
    }
  }
}
