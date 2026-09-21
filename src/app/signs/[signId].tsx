import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { QuestionListRow } from '@/components/QuestionListRow';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SignArt } from '@/components/SignArt';
import { localized, questionById } from '@/content';
import { SIGNS } from '@/content/questions';
import { space } from '@/design/tokens';
import { useI18n } from '@/i18n/use-i18n';
import { usePrefs } from '@/state/prefs';

/** Large artwork, name and meaning, then every question that shows this sign. */
export default function SignDetailScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { language } = usePrefs();
  const { signId } = useLocalSearchParams<{ signId: string }>();
  const sign = useMemo(() => SIGNS.find((s) => s.id === signId), [signId]);
  const questions = useMemo(() => (sign?.questionIds ?? []).map((id) => questionById(id)).filter((q) => q !== undefined), [sign]);

  if (sign === undefined) {
    return (
      <Screen testID="sign-missing">
        <ScreenHeader title={t('signs.title')} back />
        <AppText color="danger">{t('question.missing')}</AppText>
      </Screen>
    );
  }

  return (
    <Screen testID="sign-detail">
      <ScreenHeader title={t(`signs.category.${sign.category}`)} back />
      <View style={styles.hero}>
        <SignArt signId={sign.id} alt={localized(sign.alt, language)} size={220} testID="sign-detail-art" />
        <AppText variant="title" align="center" accessibilityRole="header">
          {localized(sign.name, language)}
        </AppText>
        <AppText align="center" color="secondary">
          {localized(sign.meaning, language)}
        </AppText>
      </View>
      <Card>
        <AppText variant="heading">{t('signs.questions')}</AppText>
        {questions.length === 0 ? (
          <AppText color="secondary">{t('signs.noQuestions')}</AppText>
        ) : (
          questions.map((q, i) => (
            <QuestionListRow
              key={q.id}
              index={i + 1}
              text={localized(q.options[q.answerIndex], language)}
              statusLabel={t(`topics.${q.topic}`)}
              onPress={() => router.push({ pathname: '/question/[id]', params: { id: q.id } })}
              testID={`sign-question-${i}`}
            />
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({ hero: { alignItems: 'center', gap: space.md, paddingVertical: space.md } });
