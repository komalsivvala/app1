import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { QuestionListRow } from '@/components/QuestionListRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { localized } from '@/content';
import { QUESTIONS, type Question } from '@/content/questions';
import { useDb } from '@/db/provider';
import { listStatus, questionStatuses, type QuestionStatus } from '@/db/stats';
import { useTheme } from '@/design/theme';
import { layout, space } from '@/design/tokens';
import { TOPICS, type TopicId } from '@/engine/exam-config';
import { useI18n } from '@/i18n/use-i18n';
import { usePrefs } from '@/state/prefs';

export default function TopicListScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const db = useDb();
  const { palette } = useTheme();
  const { language } = usePrefs();
  const { topic } = useLocalSearchParams<{ topic: string }>();
  const topicId = (TOPICS as readonly string[]).includes(topic ?? '') ? (topic as TopicId) : null;
  const [statuses, setStatuses] = useState<Map<string, QuestionStatus>>(new Map());

  useFocusEffect(
    useCallback(() => {
      let live = true;
      questionStatuses(db).then((m) => {
        if (live) setStatuses(m);
      });
      return () => {
        live = false;
      };
    }, [db]),
  );

  const questions = useMemo(() => QUESTIONS.filter((q) => q.topic === topicId), [topicId]);

  const renderItem = useCallback(
    ({ item, index }: { item: Question; index: number }) => {
      const status = listStatus(statuses.get(item.id));
      // A sign question's stem is the same five words for all 68; its
      // description is what tells them apart in a list.
      const alt = item.signAlt === null ? null : localized(item.signAlt, language);
      return (
        <QuestionListRow
          index={index + 1}
          text={item.signId !== null && alt !== null ? alt : localized(item.text, language)}
          signId={item.signId}
          signAlt={alt}
          status={status}
          statusLabel={t(`learn.status.${status}`)}
          onPress={() => router.push({ pathname: '/question/[id]', params: { id: item.id, topic: item.topic } })}
          testID={`question-row-${index}`}
        />
      );
    },
    [statuses, language, t, router],
  );

  if (topicId === null) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: palette.bg }]}>
        <AppText color="danger">{t('question.missing')}</AppText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: palette.bg }]} edges={['top', 'left', 'right']} testID="learn-topic">
      <FlashList
        data={questions}
        keyExtractor={(q) => q.id}
        renderItem={renderItem}
        extraData={statuses}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader title={t(`topics.${topicId}`)} back />
            <AppText variant="caption" color="secondary">
              {t('learn.count', { count: questions.length })}
            </AppText>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: space.gutter, paddingBottom: space.xxxl, maxWidth: layout.maxContentWidth, alignSelf: 'center', width: '100%' },
  header: { paddingTop: space.md, gap: space.sm, paddingBottom: space.sm },
});
