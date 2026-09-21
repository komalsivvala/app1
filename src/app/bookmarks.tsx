import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { QuestionListRow } from '@/components/QuestionListRow';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { localized, questionById } from '@/content';
import type { Question } from '@/content/questions';
import { useDb } from '@/db/provider';
import { bookmarkedIds } from '@/db/queries';
import { useI18n } from '@/i18n/use-i18n';
import { usePrefs } from '@/state/prefs';

/** Every bookmarked question, newest first. A bookmark whose question left
 *  the bank is filtered out here, never crashed on. */
export default function BookmarksScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const db = useDb();
  const { language } = usePrefs();
  const [questions, setQuestions] = useState<readonly Question[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      bookmarkedIds(db).then((rows) => {
        if (!live) return;
        setQuestions(rows.map((r) => questionById(r.question_id)).filter((q): q is Question => q !== undefined));
      });
      return () => {
        live = false;
      };
    }, [db]),
  );

  return (
    <Screen testID="bookmarks">
      <ScreenHeader title={t('bookmarks.title')} back />
      {questions === null ? null : questions.length === 0 ? (
        <AppText color="secondary" testID="bookmarks-empty">
          {t('bookmarks.empty')}
        </AppText>
      ) : (
        <>
          <AppText variant="caption" color="secondary">
            {t('bookmarks.count', { count: questions.length })}
          </AppText>
          <Button.Primary label={t('bookmarks.revise')} onPress={() => router.push({ pathname: '/learn/flashcards', params: { set: 'bookmarks' } })} testID="bookmarks-revise" />
          {questions.map((q, i) => {
            const alt = q.signAlt === null ? null : localized(q.signAlt, language);
            return (
              <QuestionListRow
                key={q.id}
                index={i + 1}
                text={q.signId !== null && alt !== null ? alt : localized(q.text, language)}
                signId={q.signId}
                signAlt={alt}
                onPress={() => router.push({ pathname: '/question/[id]', params: { id: q.id } })}
                testID={`bookmark-row-${i}`}
              />
            );
          })}
        </>
      )}
    </Screen>
  );
}
