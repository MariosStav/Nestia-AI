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
   admin: {
      complaintsTitle: 'Παράπονα',
      subtitle: 'Αιτήματα και παράπονα επισκεπτών σε πραγματικό χρόνο.',
      empty: 'Κανένα παράπονο ακόμα.',
      room: 'Δωμάτιο',
      signOut: 'Αποσύνδεση',
      status: { open: 'Ανοιχτό', acknowledged: 'Σε εξέλιξη', resolved: 'Επιλύθηκε', dismissed: 'Απορρίφθηκε' },
      actions: { acknowledge: 'Ανάληψη', resolve: 'Επίλυση', reopen: 'Επαναφορά' },
    },

    auth: {
      title: 'Είσοδος προσωπικού',
      subtitle: 'Συνδεθείτε για να δείτε τα αιτήματα των επισκεπτών.',
      email: 'Email',
      password: 'Κωδικός',
      signIn: 'Είσοδος',
      signingIn: 'Σύνδεση…',
      error: 'Λάθος στοιχεία. Δοκιμάστε ξανά.',
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

    auth: {
      title: 'Staff sign in',
      subtitle: 'Sign in to view guest requests.',
      email: 'Email',
      password: 'Password',
      signIn: 'Sign in',
      signingIn: 'Signing in…',
      error: 'Invalid credentials. Please try again.',
    },

    admin: {
      complaintsTitle: 'Complaints',
      subtitle: 'Guest requests and complaints, in real time.',
      empty: 'No complaints yet.',
      room: 'Room',
      signOut: 'Sign out',
      status: { open: 'Open', acknowledged: 'In progress', resolved: 'Resolved', dismissed: 'Dismissed' },
      actions: { acknowledge: 'Take', resolve: 'Resolve', reopen: 'Reopen' },
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