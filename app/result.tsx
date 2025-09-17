import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as Speech from 'expo-speech';

type Prompt = { l2: string; l1: string };

const LABELS_URL = 'https://wundr-delta.vercel.app/api/labels';
const PROMPTS_URL = 'https://wundr-delta.vercel.app/api/prompts';

const LANGS: Record<string, { code: string; voice: string }> = {
  Spanish: { code: 'es', voice: 'es-ES' },
  French: { code: 'fr', voice: 'fr-FR' },
  German: { code: 'de', voice: 'de-DE' },
  Italian: { code: 'it', voice: 'it-IT' },
  Portuguese: { code: 'pt', voice: 'pt-PT' },
  Japanese: { code: 'ja', voice: 'ja-JP' },
  Chinese: { code: 'zh', voice: 'zh-CN' },
};

function stubTranslate(word: string, to: string) {
  const mini: Record<string, Record<string, string>> = {
    guitar: { es: 'la guitarra', fr: 'la guitare', de: 'die Gitarre' },
    apple: { es: 'la manzana', fr: 'la pomme', de: 'der Apfel' },
  };
  return mini[word?.toLowerCase()]?.[to] ?? word;
}

function voiceLang(target: string) {
  const entry = Object.values(LANGS).find((l) => l.code === target);
  return entry?.voice ?? 'en-US';
}

export default function ResultScreen() {
  const { uri, base64 } = useLocalSearchParams<{ uri: string; base64: string }>();
  const [target, setTarget] = useState<string>('es');
  const [labels, setLabels] = useState<{ label: string; score: number }[]>([]);
  const [object, setObject] = useState('');
  const [loading, setLoading] = useState(true);

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [pLoading, setPLoading] = useState(false);
  const [level, setLevel] = useState<'A1' | 'A2' | 'B1' | 'B2'>('A2');

  // object detection
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

  // AI prompts
  useEffect(() => {
    const run = async () => {
      if (!object) return;
      setPLoading(true);
      try {
        const res = await fetch(PROMPTS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            object,
            L1: 'en',
            L2: target,
            level,
          }),
        });
        const text = await res.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error('Prompt API did not return JSON: ' + text.slice(0, 200));
        }
        setPrompts(Array.isArray(json.prompts) ? json.prompts : []);
      } catch (e) {
        console.warn('Prompt fetch error', e);
        setPrompts([]);
      } finally {
        setPLoading(false);
      }
    };
    run();
  }, [object, target, level]);

  const [l2Word, setL2Word] = useState('');

  useEffect(() => {
    const run = async () => {
      if (!object) return;
      try {
        const res = await fetch("https://wundr-delta.vercel.app/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word: object, target }),
        });
        const json = await res.json();
        setL2Word(json.translated ?? object); // fallback to English
      } catch (e) {
        console.warn("Translate error", e);
        setL2Word(object);
      }
    };
    run();
  }, [object, target]);


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

      {/* 🔤 Language chips */}
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

      {/* 📊 CEFR level selector */}
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

      {/* 📝 Show translated word */}
      {l2Word ? (
        <View style={styles.card}>
          <Text style={styles.l2}>{l2Word}</Text>
          <TouchableOpacity
            onPress={() => Speech.speak(l2Word, { language: voiceLang(target) })}
            style={styles.tts}
          >
            <Text style={{ color: 'white' }}>▶︎</Text>
          </TouchableOpacity>
        </View>
      ) : null}


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
  tts: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    borderRadius: 999,
  },
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
