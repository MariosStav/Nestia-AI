export interface ChatMessage { role: 'user' | 'assistant'; content: string; }

export interface LLMProvider {
  stream(opts: { system: string; messages: ChatMessage[] }): AsyncIterable<string>;
  classify<T>(opts: { system: string; input: string; schema: object; schemaName?: string }): Promise<T>;
}