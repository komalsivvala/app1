import { AVAILABLE_LANGUAGES } from '@/i18n';
import { useI18n } from '@/i18n/use-i18n';
import { usePrefs } from '@/state/prefs';

import { Segmented } from './Segmented';

/** Renders NOTHING while one language ships (PRD A1). Comes back by itself
 *  when content-config.json lists a second language. */
export function LanguageToggle() {
  const { language, setLanguage } = usePrefs();
  const { t } = useI18n();
  if (AVAILABLE_LANGUAGES.length < 2) return null;
  return (
    <Segmented
      accessibilityLabel={t('settings.language')}
      value={language}
      onChange={setLanguage}
      options={AVAILABLE_LANGUAGES.map((l) => ({ value: l, label: t(`language.${l}`) }))}
    />
  );
}
