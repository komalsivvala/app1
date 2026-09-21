/**
 * Jest (component tests) setup. Native modules that cannot run in Node are
 * replaced with the smallest honest fake.
 */
jest.mock('expo-sqlite/kv-store', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItemSync: (k: string) => store.get(k) ?? null,
      setItemSync: (k: string, v: string) => void store.set(k, v),
      removeItemSync: (k: string) => store.delete(k),
    },
  };
});

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-IN', regionCode: 'IN' }],
}));

jest.mock('@expo-google-fonts/inter', () => ({
  useFonts: () => [true, null],
  Inter_400Regular: 1,
  Inter_500Medium: 2,
  Inter_600SemiBold: 3,
}));
