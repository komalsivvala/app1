import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchField } from '@/components/SearchField';
import { SignTile } from '@/components/SignTile';
import { localized } from '@/content';
import { SIGNS, type Sign } from '@/content/questions';
import { normalise } from '@/engine/search';
import { useTheme } from '@/design/theme';
import { layout, space } from '@/design/tokens';
import { useI18n } from '@/i18n/use-i18n';
import { usePrefs } from '@/state/prefs';

type Category = Sign['category'];
const CATEGORIES: readonly Category[] = ['mandatory', 'cautionary', 'informatory'];
type Row = { kind: 'header'; category: Category } | { kind: 'sign'; sign: Sign };

/** Three sections in one 3-column FlashList; headers span the row. Tiles are
 *  memoised so scrolling never re-renders an SVG. */
export default function SignsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { palette } = useTheme();
  const { language } = usePrefs();
  const [query, setQuery] = useState('');

  const rows = useMemo<Row[]>(() => {
    const q = normalise(query);
    const out: Row[] = [];
    for (const category of CATEGORIES) {
      const signs = SIGNS.filter((s) => s.category === category && (q.length === 0 || normalise(`${localized(s.name, language)} ${localized(s.meaning, language)} ${localized(s.alt, language)}`).includes(q)));
      if (signs.length === 0) continue;
      out.push({ kind: 'header', category });
      for (const sign of signs) out.push({ kind: 'sign', sign });
    }
    return out;
  }, [query, language]);

  const renderItem = useCallback(
    ({ item }: { item: Row }) => {
      if (item.kind === 'header') {
        return (
          <View style={styles.sectionHeader}>
            <AppText variant="heading" accessibilityRole="header">
              {t(`signs.category.${item.category}`)}
            </AppText>
            <AppText variant="caption" color="secondary">
              {t(`signs.categoryHint.${item.category}`)}
            </AppText>
          </View>
        );
      }
      const name = localized(item.sign.name, language);
      return (
        <SignTile
          signId={item.sign.id}
          name={name}
          alt={localized(item.sign.alt, language)}
          accessibilityLabel={t('signs.a11yTile', { name, category: t(`signs.category.${item.sign.category}`) })}
          onPress={() => router.push({ pathname: '/signs/[signId]', params: { signId: item.sign.id } })}
        />
      );
    },
    [language, router, t],
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: palette.bg }]} edges={['top', 'left', 'right']} testID="signs">
      <FlashList
        data={rows}
        numColumns={3}
        keyExtractor={(r) => (r.kind === 'header' ? `h-${r.category}` : r.sign.id)}
        getItemType={(r) => r.kind}
        overrideItemLayout={(layoutInfo, r) => {
          if (r.kind === 'header') layoutInfo.span = 3;
        }}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader title={t('signs.title')} />
            <SearchField value={query} onChangeText={setQuery} placeholder={t('signs.search')} accessibilityLabel={t('signs.search')} testID="signs-search" />
            {rows.length === 0 && <AppText color="secondary">{t('signs.empty')}</AppText>}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxxl, maxWidth: layout.maxContentWidth, alignSelf: 'center', width: '100%' },
  header: { paddingTop: space.md, gap: space.md, paddingBottom: space.sm, paddingHorizontal: space.xs },
  sectionHeader: { paddingTop: space.lg, paddingBottom: space.sm, paddingHorizontal: space.xs, gap: 2 },
});
