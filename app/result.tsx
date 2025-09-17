import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

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

const LABELS_URL = 'https://wundr-delta.vercel.app/api/labels';
const PROMPTS_URL = 'https://wundr-delta.vercel.app/api/prompts';
const TRANSLATE_URL = 'https://wundr-delta.vercel.app/api/translate';

// Supported languages
const LANGS: Record<string, { code: string; voice: string }> = {
  Spanish: { code: 'es', voice: 'es-ES' },
  French: { code: 'fr', voice: 'fr-FR' },
  German: { code: 'de', voice: 'de-DE' },
  Italian: { code: 'it', voice: 'it-IT' },
  Portuguese: { code: 'pt', voice: 'pt-PT' },
  Japanese: { code: 'ja', voice: 'ja-JP' },
  Chinese: { code: 'zh', voice: 'zh-CN' },
};

function voiceLang(target: string) {
  const entry = Object.values(LANGS).find((l) => l.code === target);
  return entry?.voice ?? 'en-US';
}

async function getFlashcard(id: string): Promise<Flashcard | null> {
  try {
    const raw = await AsyncStorage.getItem(`flashcard:${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveFlashcard(card: Flashcard) {
  await AsyncStorage.setItem(`flashcard:${card.id}`, JSON.stringify(card));
}

export default function ResultScreen() {
  const { uri, base64 } = useLocalSearchParams<{ uri: string; base64: string }>();

  const [target, setTarget] = useState<string>('es');
  const [labels, setLabels] = useState<{ label: string; score: number }[]>([]);
  const [object, setObject] = useState('');
  const [loading, setLoading] = useState(true);

  const [l2Word, setL2Word] = useState('');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [pLoading, setPLoading] = useState(false);
  const [level, setLevel] = useState<'A1' | 'A2' | 'B1' | 'B2'>('A2');

  const [fromCache, setFromCache] = useState(false);
  const [alreadySaved, setAlreadySaved] = useState(false);

  // 1) Detect labels once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(LABELS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, includeText: false }),
        });
        const json = await res.json();
        setLabels(json.labels ?? []);
        if (json.labels?.[0]?.label) setObject(json.labels[0].label);
      } catch (e) {
        console.warn('Label error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [base64]);

  // 2) Load cached card if present; otherwise fetch translate/prompts (but DO NOT save automatically)
  useEffect(() => {
    const run = async () => {
      if (!object) return;
      const id = `${target}-${object}-${level}`;

      // Check if card exists → use it and mark as saved
      const cached = await getFlashcard(id);
      if (cached) {
        setL2Word(cached.translated);
        setPrompts(cached.prompts);
        setFromCache(true);
        setAlreadySaved(true);
        return;
      }

      // Not cached → fetch APIs (opt-in save later)
      setFromCache(false);
      setAlreadySaved(false);
      setPLoading(true);
      try {
        const tRes = await fetch(TRANSLATE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: object, target }),
        });
        const tJson = await tRes.json();
        const translated = tJson?.translated ?? object;

        const pRes = await fetch(PROMPTS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ object, L1: 'en', L2: target, level }),
        });
        const pJson = await pRes.json();

        setL2Word(translated);
        setPrompts(Array.isArray(pJson.prompts) ? pJson.prompts : []);
      } catch (e) {
        console.warn('Translate/Prompt fetch error', e);
        setL2Word(object);
        setPrompts([]);
      } finally {
        setPLoading(false);
      }
    };
    run();
  }, [object, target, level]);

  const canSave = useMemo(
    () => !!object && !!l2Word && prompts.length > 0 && !alreadySaved,
    [object, l2Word, prompts, alreadySaved]
  );

  const onSave = async () => {
    if (!canSave) return;
    try {
      const id = `${target}-${object}-${level}`;
      const card: Flashcard = {
        id,
        object,
        target,
        level,
        translated: l2Word,
        prompts,
        imageUri: (uri as string) ?? '',
        createdAt: Date.now(),
      };
      await saveFlashcard(card);
      setAlreadySaved(true);
      Alert.alert('Saved', 'Flashcard added to your deck.');
      router.push('/flashcards');  
    } catch (e) {
      Alert.alert('Oops', 'Could not save flashcard.');
      console.warn('Save flashcard failed', e);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {uri ? <Image source={{ uri: uri as string }} style={styles.img} /> : null}

      <Text style={styles.h1}>Detected objects</Text>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <View style={styles.rowWrap}>
          {labels.length === 0 && (
            <Text style={{ color: '#666' }}>Nothing confident enough—type below.</Text>
          )}
          {labels.map(({ label, score }) => (
            <TouchableOpacity
              key={label}
              onPress={() => setObject(label)}
              style={[styles.chip, object === label && styles.chipOn]}
            >
              <Text style={[styles.chipText, object === label && styles.chipTextOn]}>
                {label} {(score * 100).toFixed(0)}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.h1}>Or type the object</Text>
      <TextInput
        style={styles.input}
        value={object}
        onChangeText={setObject}
        placeholder="e.g., guitar"
        autoCapitalize="none"
      />

      {/* Language chips */}
      <View style={styles.rowWrap}>
        {Object.entries(LANGS).map(([name, { code }]) => (
          <TouchableOpacity
            key={code}
            onPress={() => setTarget(code)}
            style={[styles.chip, target === code && styles.chipOn]}
          >
            <Text style={[styles.chipText, target === code && styles.chipTextOn]}>{name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* CEFR level selector */}
      <View style={styles.row}>
        {(['A1', 'A2', 'B1', 'B2'] as const).map((l) => (
          <TouchableOpacity
            key={l}
            onPress={() => setLevel(l)}
            style={[styles.chip, level === l && styles.chipOn]}
          >
            <Text style={[styles.chipText, level === l && styles.chipTextOn]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Translated word */}
      {!!l2Word && (
        <View style={styles.card}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.l2}>{l2Word}</Text>
            {fromCache ? <Text style={styles.badge}>from flashcards</Text> : null}
          </View>
          <TouchableOpacity
            onPress={() => Speech.speak(l2Word, { language: voiceLang(target) })}
            style={styles.tts}
          >
            <Text style={{ color: 'white' }}>▶︎</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Save button */}
      <TouchableOpacity
        disabled={!canSave}
        onPress={onSave}
        style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
      >
        <Text style={styles.saveBtnText}>
          {alreadySaved ? 'Saved ✓' : 'Save flashcard'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.h2}>Speak prompts</Text>
      {pLoading && <ActivityIndicator />}
      {prompts.map((p, i) => (
        <View key={i} style={styles.prompt}>
          <Text style={styles.pL2}>{p.l2}</Text>
          <Text style={styles.pL1}>{p.l1}</Text>
          <TouchableOpacity
            onPress={() => Speech.speak(p.l2, { language: voiceLang(target) })}
            style={styles.say}
          >
            <Text style={{ color: 'white' }}>Say it</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12 },
  img: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12 },
  h1: { fontSize: 18, fontWeight: '600', marginTop: 8 },
  h2: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  row: { flexDirection: 'row', gap: 8 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 999,
  },
  chipOn: { backgroundColor: '#111', borderColor: '#111' },
  chipText: { color: '#111' },
  chipTextOn: { color: 'white' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#eee',
    padding: 12,
    borderRadius: 12,
  },
  l2: { fontSize: 20, fontWeight: '700' },
  badge: { marginTop: 2, color: '#666', fontSize: 12 },
  tts: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    borderRadius: 999,
  },
  saveBtn: {
    backgroundColor: '#111',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: 'white', fontWeight: '600' },
  prompt: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    gap: 4,
    marginBottom: 8,
  },
  pL2: { fontSize: 16, fontWeight: '600' },
  pL1: { fontSize: 13, color: '#666' },
  say: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: '#111',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
