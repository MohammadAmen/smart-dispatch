const ARABIC_MARKS = /[\u064B-\u065F\u0670\u0640]/g;

const LETTERS: Record<string, string> = {
  ا: "a",
  أ: "a",
  إ: "a",
  آ: "a",
  ء: "",
  ب: "b",
  ت: "t",
  ث: "th",
  ج: "j",
  ح: "h",
  خ: "kh",
  د: "d",
  ذ: "dh",
  ر: "r",
  ز: "z",
  س: "s",
  ش: "sh",
  ص: "s",
  ض: "d",
  ط: "t",
  ظ: "z",
  ع: "a",
  غ: "gh",
  ف: "f",
  ق: "q",
  ك: "k",
  ل: "l",
  م: "m",
  ن: "n",
  ه: "h",
  ة: "a",
  و: "w",
  ي: "y",
  ى: "a",
  ؤ: "w",
  ئ: "y",
};

const KNOWN_ENGLISH: Record<string, string> = {
  عمان: "Amman",
  دمشق: "Damascus",
  حلب: "Aleppo",
  حمص: "Homs",
  حماه: "Hama",
  حماة: "Hama",
  اللاذقيه: "Latakia",
  اللاذقية: "Latakia",
  اربد: "Irbid",
  الزرقاء: "Zarqa",
  العقبه: "Aqaba",
  العقبة: "Aqaba",
  شعلان: "Shaalan",
  مزه: "Mazzeh",
  مركز: "Core",
  شمال: "North",
  غرب: "West",
  شرق: "East",
  مطار: "Airport",
  مستودع: "Depot",
  مالكي: "Malki",
  كفرسوسه: "Kafar Souseh",
  كفرسوسة: "Kafar Souseh",
  جرمانا: "Jaramana",
  قدسيا: "Qudsaya",
  دمر: "Dummar",
};

export const GEO_ZONE_NAMES: Record<string, { city: string; area: string }> = {
  core: { city: "Amman", area: "Core" },
  north: { city: "Amman", area: "North" },
  west: { city: "Amman", area: "West" },
  east: { city: "Amman", area: "East" },
  airport: { city: "Amman", area: "Airport" },
  depot: { city: "Amman", area: "Depot" },
};

function normalizeArabicKey(value: string): string {
  let next = value.replace(ARABIC_MARKS, "").trim();
  next = next.replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
  next = next.replace(/^ال/, "");
  next = next.replace(/\s+/g, "");
  return next;
}

function transliterate(value: string): string {
  let latin = "";
  for (const char of value) {
    if (LETTERS[char] !== undefined) {
      latin += LETTERS[char];
      continue;
    }
    if (/[A-Za-z]/.test(char)) {
      latin += char;
    }
  }
  return latin;
}

export function toEnglishName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const known = KNOWN_ENGLISH[normalizeArabicKey(trimmed)];
  if (known) {
    return known;
  }

  if (/[A-Za-z]/.test(trimmed) && !/[\u0600-\u06FF]/.test(trimmed)) {
    return trimmed;
  }

  return transliterate(trimmed);
}

export function firstTwoLetters(value: string): string {
  const letters = toEnglishName(value)
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  const pair = letters.slice(0, 2);
  return pair.padEnd(2, "X");
}

export function makeZoneCode(city: string, area: string): string {
  return `${firstTwoLetters(city)}${firstTwoLetters(area)}`;
}

export function geoZoneCode(geo: string): string {
  const mapped = GEO_ZONE_NAMES[geo];
  if (!mapped) {
    return geo.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4).padEnd(4, "X");
  }
  return makeZoneCode(mapped.city, mapped.area);
}
