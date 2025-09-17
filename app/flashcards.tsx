import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { useFocusEffect } from '@react-navigation/native';

type Prompt = { l2: string; l1: string };
type Flashcard = {
  id: string;
  object: string;
  target: string;
  level: string;
  translated: string;
  prompts: Prompt[];
  imageUri: string;
  createdAt: number;
};

function voiceLang(target: string) {
  const LANGS: Record<string, string> = {
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    it: 'it-IT',
    pt: 'pt-PT',
    ja: 'ja-JP',
    zh: 'zh-CN',
  };
  return LANGS[target] ?? 'en-US';
}

export default function FlashcardsScreen() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const fKeys = keys.filter((k) => k.startsWith('flashcard:'));
      const stores = await AsyncStorage.multiGet(fKeys);
      const parsed = stores
        .map(([_, v]) => (v ? JSON.parse(v) : null))
        .filter(Boolean) as Flashcard[];
      parsed.sort((a, b) => b.createdAt - a.createdAt);
      setCards(parsed);
    } catch (e) {
      console.warn('Load flashcards failed', e);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  const deleteOne = async (id: string) => {
    await AsyncStorage.removeItem(`flashcard:${id}`);
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const confirmDeleteOne = (id: string) => {
    Alert.alert('Delete flashcard?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteOne(id) },
    ]);
  };

  const clearAll = async () => {
    const keys = await AsyncStorage.getAllKeys();
    const fKeys = keys.filter((k) => k.startsWith('flashcard:'));
    await AsyncStorage.multiRemove(fKeys);
    setCards([]);
  };

  const confirmClearAll = () => {
    Alert.alert('Clear all flashcards?', 'This will permanently remove your deck.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear all', style: 'destructive', onPress: clearAll },
    ]);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1, marginTop: 40 }} />;

  if (cards.length === 0)
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No flashcards yet — scan and tap “Save flashcard”.</Text>
      </View>
    );

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
        <TouchableOpacity onPress={confirmClearAll} style={styles.clearBtn}>
          <Text style={styles.clearBtnText}>Clear all</Text>
        </TouchableOpacity>
      </View>

      {cards.map((c) => (
        <View key={c.id} style={styles.card}>
          <View style={styles.topRow}>
            <View style={styles.left}>
              {c.imageUri ? <Image source={{ uri: c.imageUri }} style={styles.thumb} /> : null}
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.l2}>{c.translated}</Text>
                <Text style={styles.meta}>
                  {c.object} • {c.target.toUpperCase()} • {c.level}
                </Text>
              </View>
            </View>
            <View style={styles.right}>
              <TouchableOpacity
                onPress={() => Speech.speak(c.translated, { language: voiceLang(c.target) })}
                style={styles.tts}
              >
                <Text style={{ color: 'white' }}>▶︎</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDeleteOne(c.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.h2}>Prompts</Text>
          {c.prompts.map((p, i) => (
            <View key={i} style={styles.prompt}>
              <Text style={styles.pL2}>{p.l2}</Text>
              <Text style={styles.pL1}>{p.l1}</Text>
              <TouchableOpacity
                onPress={() => Speech.speak(p.l2, { language: voiceLang(c.target) })}
                style={styles.say}
              >
                <Text style={{ color: 'white' }}>Say it</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: '#666' },

  card: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'white',
    gap: 8,
  },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  right: { flexDirection: 'row', gap: 8 },

  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#eee' },
  l2: { fontSize: 20, fontWeight: '700' },
  meta: { fontSize: 12, color: '#666' },

  tts: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    borderRadius: 999,
  },
  deleteBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  deleteText: { color: '#b00020', fontWeight: '600' },

  h2: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  prompt: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    gap: 4,
    marginTop: 6,
  },
  pL2: { fontSize: 15, fontWeight: '600' },
  pL1: { fontSize: 12, color: '#666' },

  say: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#111',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  clearBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
  },
  clearBtnText: { color: '#333', fontWeight: '600' },
});
