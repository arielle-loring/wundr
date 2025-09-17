// lib/generatePrompts.ts

export function generatePrompts(object: string, lang: 'es' | 'fr') {
  const translations: Record<string, Record<'es' | 'fr', string>> = {
    guitar: { es: "la guitarra", fr: "la guitare" },
    apple: { es: "la manzana", fr: "la pomme" },
    book: { es: "el libro", fr: "le livre" },
    // fallback
    default: { es: object, fr: object },
  };

  const word =
    translations[object.toLowerCase()]?.[lang] ??
    translations.default[lang];

  if (lang === "es") {
    return [
      { l2: `¿Tienes ${word}?`, l1: `Do you have a ${object}?` },
      { l2: `¿Puedes usar ${word}?`, l1: `Can you use the ${object}?` },
      { l2: `¿Qué opinas de ${word}?`, l1: `What do you think about ${object}?` },
      { l2: `¿Cuándo usaste ${word} por última vez?`, l1: `When did you last use the ${object}?` },
    ];
  } else {
    return [
      { l2: `As-tu ${word} ?`, l1: `Do you have a ${object}?` },
      { l2: `Peux-tu utiliser ${word} ?`, l1: `Can you use the ${object}?` },
      { l2: `Que penses-tu de ${word} ?`, l1: `What do you think about the ${object}?` },
      { l2: `Quand as-tu utilisé ${word} pour la dernière fois ?`, l1: `When did you last use the ${object}?` },
    ];
  }
}
