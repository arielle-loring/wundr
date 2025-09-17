import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import * as Speech from 'expo-speech';

type Prompt = { l2: string; l1: string };

function stubTranslate(word: string, to: string) {
  // super naive demo; we’ll replace with real translation next step
  const mini: Record<string, Record<string, string>> = {
    guitar: { es: 'la guitarra', fr: 'la guitare' },
    apple: { es: 'la manzana', fr: 'la pomme' }
  };
  return mini[word?.toLowerCase()]?.[to] ?? word;
}

function stubPrompts(object: string, to: string): Prompt[] {
  const noun = stubTranslate(object, to);
  const es = to === 'es';
  return es ? [
    { l2: `¿Puedes usar ${noun}?`, l1: `Can you use the ${object}?` },
    { l2: `¿Tienes ${noun} en casa?`, l1: `Do you have a ${object} at home?` },
    { l2: `¿Quién usa ${noun} muy bien?`, l1: `Who uses a ${object} very well?` },
    { l2: `¿Cuándo empezaste con ${noun}?`, l1: `When did you start with the ${object}?` },
    { l2: `Enséñame cómo elegir ${noun}.`, l1: `Teach me how to choose a ${object}.` },
    { l2: `Completa: "Quiero practicar con una ______".`, l1: `Fill in: "I want to practice with a ______".` },
  ] : [
    { l2: `Peux-tu utiliser ${noun} ?`, l1: `Can you use the ${object}?` },
    { l2: `As-tu ${noun} chez toi ?`, l1: `Do you have a ${object} at home?` },
    { l2: `Qui utilise ${noun} très bien ?`, l1: `Who uses a ${object} very well?` },
    { l2: `Quand as-tu commencé avec ${noun} ?`, l1: `When did you start with the ${object}?` },
    { l2: `Apprends-moi à choisir ${noun}.`, l1: `Teach me how to choose a ${object}.` },
    { l2: `Complète : "Je veux pratiquer avec une ______".`, l1: `Fill in: "I want to practice with a ______".` },
  ];
}

export default function ResultScreen() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const [object, setObject] = useState('guitar');
  const [target, setTarget] = useState<'es' | 'fr'>('es');
  const prompts = stubPrompts(object, target);
  const l2Word = stubTranslate(object, target);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {uri ? <Image source={{ uri }} style={styles.img} /> : null}

      <Text style={styles.h1}>What is this object?</Text>
      <TextInput
        style={styles.input}
        value={object}
        onChangeText={setObject}
        placeholder="Type label (e.g., guitar)"
        autoCapitalize="none"
      />

      <View style={styles.row}>
        <TouchableOpacity onPress={() => setTarget('es')} style={[styles.chip, target==='es' && styles.chipOn]}>
          <Text style={[styles.chipText, target==='es' && styles.chipTextOn]}>Spanish</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTarget('fr')} style={[styles.chip, target==='fr' && styles.chipOn]}>
          <Text style={[styles.chipText, target==='fr' && styles.chipTextOn]}>French</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.l2}>{l2Word}</Text>
        <TouchableOpacity onPress={() => Speech.speak(l2Word)} style={styles.tts}>
          <Text style={{ color: 'white' }}>▶︎</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.h2}>Speak prompts</Text>
      {prompts.map((p, i) => (
        <View key={i} style={styles.prompt}>
          <Text style={styles.pL2}>{p.l2}</Text>
          <Text style={styles.pL1}>{p.l1}</Text>
          <TouchableOpacity onPress={() => Speech.speak(p.l2)} style={styles.say}><Text style={{ color: 'white' }}>Say it</Text></TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12 },
  img: { width: '100%', aspectRatio: 16/9, borderRadius: 12 },
  h1: { fontSize: 18, fontWeight: '600', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16 },
  row: { flexDirection: 'row', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 999 },
  chipOn: { backgroundColor: '#111', borderColor: '#111' },
  chipText: { color: '#111' },
  chipTextOn: { color: 'white' },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#eee', padding: 12, borderRadius: 12 },
  l2: { fontSize: 20, fontWeight: '700' },
  tts: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111', borderRadius: 999 },
  h2: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  prompt: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#f0f0f0', gap: 4, marginBottom: 8 },
  pL2: { fontSize: 16, fontWeight: '600' },
  pL1: { fontSize: 13, color: '#666' },
  say: { alignSelf: 'flex-start', marginTop: 6, backgroundColor: '#111', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }
});
