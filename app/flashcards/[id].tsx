import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';

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

const VOICES: Record<string, string> = {
  es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', pt: 'pt-PT', ja: 'ja-JP', zh: 'zh-CN',
};

export default function FlashcardDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [card, setCard] = useState<Flashcard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    const raw = await AsyncStorage.getItem(`flashcard:${id}`);
    setCard(raw ? JSON.parse(raw) : null);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const voiceLang = (code: string) => VOICES[code] ?? 'en-US';

  const onDelete = () => {
    Alert.alert('Delete flashcard?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await AsyncStorage.removeItem(`flashcard:${id}`);
          router.back();
        }
      }
    ]);
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 32 }} />;
  if (!card) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Flashcard not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {card.imageUri ? <Image source={{ uri: card.imageUri }} style={styles.hero} /> : null}

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{card.translated}</Text>
          <Text style={styles.meta}>
            {card.object} • {card.target.toUpperCase()} • {card.level}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => Speech.speak(card.translated, { language: voiceLang(card.target) })}
          style={styles.tts}
        >
          <Text style={{ color: 'white' }}>▶︎</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.h2}>Prompts</Text>
      {card.prompts.map((p, i) => (
        <View key={i} style={styles.prompt}>
          <Text style={styles.pL2}>{p.l2}</Text>
          <Text style={styles.pL1}>{p.l1}</Text>
          <TouchableOpacity
            onPress={() => Speech.speak(p.l2, { language: voiceLang(card.target) })}
            style={styles.say}
          >
            <Text style={{ color: 'white' }}>Say it</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
        <Text style={styles.deleteText}>Delete flashcard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12 },
  hero: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, backgroundColor: '#eee' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: '800' },
  meta: { fontSize: 12, color: '#666', marginTop: 2 },
  tts: {
    width: 40, height: 40, borderRadius: 999, backgroundColor: '#111',
    alignItems: 'center', justifyContent: 'center',
  },
  h2: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  prompt: {
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#f0f0f0', gap: 4, marginBottom: 8
  },
  pL2: { fontSize: 16, fontWeight: '600' },
  pL1: { fontSize: 13, color: '#666' },
  say: {
    alignSelf: 'flex-start', marginTop: 6, backgroundColor: '#111',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8
  },
  deleteBtn: {
    marginTop: 8, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#eee'
  },
  deleteText: { color: '#b00020', fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: '#666' },
});
