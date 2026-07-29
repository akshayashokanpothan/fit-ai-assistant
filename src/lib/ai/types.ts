export interface GenerateTextInput {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
}

export interface GenerateTextOutput {
  text: string;
}

export interface GenerateStructuredInput<T = unknown> {
  system: string;
  prompt: string;
  schemaDescription: string; // human-readable description of expected JSON shape
  exampleShape?: T;
}

export interface GenerateStructuredOutput<T = unknown> {
  data: T;
  raw: string;
}

export interface AnalyzeImageInput {
  imageBase64: string;
  mediaType: string;
  instruction: string;
}

export interface AnalyzeImageOutput {
  text: string;
}

/**
 * Internal AI provider abstraction. Application/orchestration code must
 * only ever depend on this interface — never on a vendor SDK directly.
 */
export interface AIProvider {
  id: "mock" | "anthropic" | "openai" | "gemini";
  generateText(input: GenerateTextInput): Promise<GenerateTextOutput>;
  generateStructuredOutput<T = unknown>(
    input: GenerateStructuredInput<T>
  ): Promise<GenerateStructuredOutput<T>>;
  analyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageOutput>;
}
