import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { QuestionListRow } from '@/components/QuestionListRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchField } from '@/components/SearchField';
import { localized, questionById } from '@/content';
import { getSearchIndex } from '@/content/search-index';
import { useTheme } from '@/design/theme';
import { layout, space } from '@/design/tokens';
import { search, type SearchHit } from '@/engine/search';
import { useI18n } from '@/i18n/use-i18n';
import { usePrefs } from '@/state/prefs';

export default function SearchScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { palette } = useTheme();
  const { language } = usePrefs();
  const [query, setQuery] = useState('');
  // The index is built on this screen's first query, then memoised for the process.
  const hits = useMemo(() => (query.trim().length === 0 ? [] : search(getSearchIndex(), query)), [query]);

  const renderItem = useCallback(
    ({ item, index }: { item: SearchHit; index: number }) => {
      const q = questionById(item.id);
      if (q === undefined) return null;
      const alt = q.signAlt === null ? null : localized(q.signAlt, language);
      const label = q.signId !== null && alt !== null ? alt : localized(q.text, language);
      return <QuestionListRow index={index + 1} text={label} signId={q.signId} signAlt={alt} statusLabel={t(`topics.${q.topic}`)} onPress={() => router.push({ pathname: '/question/[id]', params: { id: q.id } })} testID={`search-result-${index}`} />;
    },
    [language, router, t],
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: palette.bg }]} edges={['top', 'left', 'right']} testID="learn-search">
      <FlashList
        data={hits}
        keyExtractor={(h) => h.id}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader title={t('learn.search.placeholder')} back />
            <SearchField value={query} onChangeText={setQuery} placeholder={t('learn.search.placeholder')} accessibilityLabel={t('learn.search.a11y')} autoFocus testID="search-input" />
            {query.trim().length > 0 && (
              <AppText variant="caption" color="secondary" testID="search-count">
                {hits.length === 0 ? t('learn.search.empty') : t('learn.search.results', { count: hits.length })}
              </AppText>
            )}
            {query.trim().length === 0 && <AppText color="secondary">{t('learn.search.hint')}</AppText>}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: space.gutter, paddingBottom: space.xxxl, maxWidth: layout.maxContentWidth, alignSelf: 'center', width: '100%' },
  header: { paddingTop: space.md, gap: space.md, paddingBottom: space.sm },
});
