import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { space } from '@/design/tokens';
import { AVAILABLE_LANGUAGES, type Lang } from '@/i18n';
import { useI18n } from '@/i18n/use-i18n';
import { usePrefs } from '@/state/prefs';

/** First-launch language sheet. Only ever reached when more than one language
 *  ships and none has been chosen; the device language is pre-selected and the
 *  user just confirms. With one language the app opens straight on Home. */
export default function LanguageScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { language, setLanguage } = usePrefs();

  const choose = (lang: Lang) => {
    setLanguage(lang);
    router.replace('/');
  };

  return (
    <Screen scroll={false} testID="language">
      <View style={styles.center}>
        <AppText variant="display" align="center" accessibilityRole="header">
          {t('language.choose')}
        </AppText>
        <View style={styles.buttons}>
          {AVAILABLE_LANGUAGES.map((lang) =>
            lang === language ? (
              <Button.Primary key={lang} label={t(`language.${lang}`)} onPress={() => choose(lang)} />
            ) : (
              <Button.Secondary key={lang} label={t(`language.${lang}`)} onPress={() => choose(lang)} />
            ),
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: space.xxl },
  buttons: { gap: space.md },
});
