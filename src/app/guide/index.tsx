import { Linking, StyleSheet, View } from 'react-native';

import { Accordion } from '@/components/Accordion';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { localized } from '@/content';
import guide from '@/content/guide.json';
import { useTheme } from '@/design/theme';
import { space } from '@/design/tokens';
import { useI18n } from '@/i18n/use-i18n';
import { usePrefs } from '@/state/prefs';

/** Static, offline reference. Every fee and rule shows the date it was last
 *  verified and a verify-on-the-portal note — stale numbers in an app are
 *  worse than none (PRD R10). The values live in src/content/guide.json. */
export default function GuideScreen() {
  const { t, lang } = useI18n();
  const { language } = usePrefs();
  const { palette } = useTheme();
  const fmt = new Intl.DateTimeFormat(lang, { dateStyle: 'long' });

  return (
    <Screen testID="guide">
      <ScreenHeader title={t('guide.title')} back />
      <AppText color="secondary">{t('guide.intro')}</AppText>
      {guide.sections.map((section, i) => {
        const title = localized(section.title, language);
        const latest = section.items.map((it) => it.lastVerified).sort().at(-1) ?? '';
        return (
          <Accordion key={section.id} title={title} expandLabel={t('guide.expand', { section: title })} collapseLabel={t('guide.collapse', { section: title })} initiallyOpen={i === 0} testID={`guide-${section.id}`}>
            {section.items.map((item) => (
              <View key={item.id} style={[styles.item, { borderBottomColor: palette.border }]}>
                <AppText variant="caption" color="secondary">
                  {localized(item.label, language)}
                </AppText>
                <AppText>{localized(item.value, language)}</AppText>
              </View>
            ))}
            <View style={styles.verify}>
              <AppText variant="caption" color="secondary">
                {t('guide.verified', { date: fmt.format(new Date(`${latest}T00:00:00`)) })} · {t('guide.verifyNote')}
              </AppText>
            </View>
          </Accordion>
        );
      })}
      <Button.Primary label={t('guide.openPortal')} onPress={() => Linking.openURL(guide.officialPortal.url)} />
      <Button.Secondary label={t('guide.openState')} onPress={() => Linking.openURL(guide.statePortal.url)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { gap: 2, paddingBottom: space.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  verify: { paddingTop: space.xs },
});
