export const dictionaries = {
  el: {
    welcome: 'Καλώς ήρθατε',
    room: 'Δωμάτιο',
    complaint: {
      category: 'Κατηγορία',
      message: 'Το μήνυμά σας',
      placeholder: 'Περιγράψτε το πρόβλημα…',
      submit: 'Αποστολή',
      sending: 'Αποστολή…',
      sentTitle: 'Ευχαριστούμε.',
      sentBody: 'Το μήνυμά σας στάλθηκε στο προσωπικό.',
      error: 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.',
      categories: {
        cleanliness: 'Καθαριότητα',
        noise: 'Θόρυβος',
        maintenance: 'Βλάβη / Συντήρηση',
        food: 'Φαγητό',
        service: 'Εξυπηρέτηση',
        other: 'Άλλο',
      },
    },
    session: {
      connecting: 'Σύνδεση…',
      invalid: 'Μη έγκυρος κωδικός δωματίου.',
    },
  },
  en: {
    welcome: 'Welcome',
    room: 'Room',
    complaint: {
      category: 'Category',
      message: 'Your message',
      placeholder: 'Describe the issue…',
      submit: 'Send',
      sending: 'Sending…',
      sentTitle: 'Thank you.',
      sentBody: 'Your message was sent to the staff.',
      error: 'Something went wrong. Please try again.',
      categories: {
        cleanliness: 'Cleanliness',
        noise: 'Noise',
        maintenance: 'Maintenance',
        food: 'Food',
        service: 'Service',
        other: 'Other',
      },
    },
    session: {
      connecting: 'Connecting…',
      invalid: 'Invalid room code.',
    },
  },
} as const;

export type Locale = keyof typeof dictionaries;        // 'el' | 'en'
type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };
export type Dictionary = Widen<(typeof dictionaries)['el']>;
export const LOCALES: Locale[] = ['el', 'en'];
export const DEFAULT_LOCALE: Locale = 'el';

export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'el';
}