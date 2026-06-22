export interface ChatMessage { role: 'user' | 'assistant'; content: string; }

export type QueryType =
  | 'hotel_specific'
  | 'complaint_or_request'
  | 'general_common_sense'
  | 'local_or_current_web'
  | 'unclear';

export interface MessageClassification {
  query_type: QueryType;
  is_complaint: boolean;
  needs_ticket: boolean;
  category: 'cleanliness' | 'noise' | 'maintenance' | 'food' | 'service' | 'other';
  urgency: 'low' | 'medium' | 'high';
  sentiment: 'positive' | 'neutral' | 'negative';
  // 'el' = Greek, 'en' = English, 'auto' = uncertain → fall back to session locale
  detected_language: 'el' | 'en' | 'auto';
  reason: string;
}

export interface WebSource {
  title?: string;
  url?: string;
}

export interface WebAnswer {
  content: string;
  sources: WebSource[];
}

export interface LLMProvider {
  stream(opts: { system: string; messages: ChatMessage[] }): AsyncIterable<string>;
  classify<T>(opts: { system: string; input: string; schema: object; schemaName?: string }): Promise<T>;
  classifyMessage(text: string): Promise<MessageClassification>;
  generateWebAnswer(opts: { system: string; query: string }): Promise<WebAnswer>;
}
