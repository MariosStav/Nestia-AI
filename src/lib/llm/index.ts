import { openaiProvider } from './openai';
import type { LLMProvider } from './types';

export const llm: LLMProvider = openaiProvider;