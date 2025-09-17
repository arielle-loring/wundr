import AsyncStorage from '@react-native-async-storage/async-storage';

export type Flashcard = {
  id: string;
  object: string;
  target: string;
  level: string;
  translated: string;
  prompts: { l2: string; l1: string }[];
  createdAt: number;
};

export async function saveFlashcard(card: Flashcard) {
  try {
    await AsyncStorage.setItem(`flashcard:${card.id}`, JSON.stringify(card));
  } catch (e) {
    console.warn("Save flashcard failed", e);
  }
}

export async function getFlashcard(id: string): Promise<Flashcard | null> {
  try {
    const raw = await AsyncStorage.getItem(`flashcard:${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
