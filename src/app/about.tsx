import Constants from 'expo-constants';
import { Linking } from 'react-native';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatRow } from '@/components/StatRow';
import { links } from '@/config/links';
import { CONTENT } from '@/content/questions';
import { useI18n } from '@/i18n/use-i18n';

export default function AboutScreen() {
  const { t } = useI18n();
  const appVersion = Constants.expoConfig?.version ?? '—';

  return (
    <Screen testID="about">
      <ScreenHeader title={t('about.title')} back />

      <Banner text={t('about.disclaimer')} />

      <Card>
        <StatRow label={t('about.version')} value={appVersion} />
        <StatRow label={t('about.contentVersion')} value={CONTENT.contentVersion} />
      </Card>

      <Card onPress={() => Linking.openURL(links.sourceQuestionBank)} accessibilityLabel={t('about.source.label')} accessibilityHint={t('a11y.externalLink')}>
        <AppText variant="heading">{t('about.source.label')}</AppText>
        <AppText variant="caption" color="secondary">
          {t('about.source.attribution')}
        </AppText>
        <AppText variant="caption" color="accent">
          {t('about.source.link')}
        </AppText>
      </Card>

      <Card onPress={() => Linking.openURL(links.privacyPolicy)} accessibilityLabel={t('about.privacy.link')} accessibilityHint={t('a11y.externalLink')}>
        <AppText variant="heading">{t('about.privacy.label')}</AppText>
        <AppText variant="caption" color="secondary">
          {t('about.privacy.summary')}
        </AppText>
        <AppText variant="caption" color="accent">
          {t('about.privacy.link')}
        </AppText>
      </Card>

      {links.supportEmail !== null && (
        <Card onPress={() => Linking.openURL(`mailto:${links.supportEmail}`)} accessibilityLabel={t('about.contact')}>
          <AppText variant="heading">{t('about.contact')}</AppText>
        </Card>
      )}
    </Screen>
  );
}
