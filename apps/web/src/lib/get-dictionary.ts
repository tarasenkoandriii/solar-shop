import type { Locale } from './i18n';
import uk from '../dictionaries/uk.json';
import ru from '../dictionaries/ru.json';
import en from '../dictionaries/en.json';

const dictionaries = { uk, ru, en };

export type Dictionary = typeof uk;

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.uk;
}
