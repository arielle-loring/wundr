import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';

type Prompt = { l2: string; l1: string };
type Flashcard = {
  id: string;             // `${target}-${object}-${level}`
  object: string;
  target: string;         // 'es', 'fr', ...
  level: string;
  translated: string;     // L2 word
  prompts: Prompt[];
  imageUri: string;
  createdAt: number;
};

const LANG_NAMES: Record<string, string> = {
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ja: 'Japanese',
  zh: 'Chinese',
};

const GAP = 10;
const H_PAD = 16;
const COLS = 3;
const SCREEN_W = Dimensions.get('window').width;
const TILE_W = Math.floor((SCREEN_W - H_PAD * 2 - GAP * (COLS - 1)) / COLS);

function chunk<T>(arr: T[], size = 3): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function FlashcardsIndex() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const fKeys = keys.filter((k) => k.startsWith('flashcard:'));
      const stores = await AsyncStorage.multiGet(fKeys);
      const parsed = (stores
        .map(([_, v]) => (v ? JSON.parse(v) : null))
        .filter(Boolean) as Flashcard[])
        .sort((a, b) => b.createdAt - a.createdAt);
      setCards(parsed);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const sections = useMemo(() => {
    const byLang: Record<string, Flashcard[]> = {};
    for (const c of cards) {
      const title = LANG_NAMES[c.target] ?? c.target.toUpperCase();
      (byLang[title] ??= []).push(c);
    }
    return Object.keys(byLang)
      .sort()
      .map((title) => ({
        title,
        data: chunk(byLang[title], COLS), // <<—— MUST be `data`, an array of rows
      }));
  }, [cards]);

  if (loading) return <ActivityIndicator style={{ marginTop: 32 }} />;

  if (cards.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No flashcards yet — save some from Scan → Result.</Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(row, idx) => {
        // row is Flashcard[] (one grid row); build a stable key
        const firstId = row?.[0]?.id ?? 'row';
        return `${firstId}-${idx}`;
      }}
      contentContainerStyle={styles.listWrap}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionTitle}>{section.title}</Text>
      )}
      renderItem={({ item: row }) => (
        <View style={styles.row}>
          {row.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={styles.tile}
              activeOpacity={0.8}
              onPress={() => router.push(`/flashcards/${encodeURIComponent(card.id)}`)}
            >
              {card.imageUri ? (
                <Image source={{ uri: card.imageUri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, { backgroundColor: '#eee' }]} />
              )}
              <Text style={styles.tileText} numberOfLines={1}>
                {card.translated}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Fillers to keep 3 columns aligned if last row < 3 */}
          {row.length < COLS &&
            Array.from({ length: COLS - row.length }).map((_, i) => (
              <View key={`f-${i}`} style={[styles.tile, { opacity: 0 }]} />
            ))}
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
      SectionSeparatorComponent={() => <View style={{ height: 14 }} />}
    />
  );
}

const styles = StyleSheet.create({
  listWrap: { paddingHorizontal: H_PAD, paddingVertical: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, marginLeft: 2 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: GAP,
  },
  tile: {
    width: TILE_W,
    alignItems: 'center',
  },
  thumb: {
    width: TILE_W,
    height: TILE_W,
    borderRadius: 10,
    backgroundColor: '#f2f2f2',
  },
  tileText: { marginTop: 6, maxWidth: TILE_W, fontSize: 13, color: '#111' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: '#666' },
});
