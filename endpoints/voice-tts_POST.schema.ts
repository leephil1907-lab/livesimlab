import superjson from "superjson";
import { z } from "zod";

export const schema = z.object({
  providerVoiceId: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(3000),
  style: z.enum(["Conversational", "Broadcast presenter", "Analytical", "Calm"]),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  mimeType: "audio/mpeg";
  audioBase64: string;
};

export const postVoiceTts = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/voice-tts`, {
    method: "POST",
    body: superjson.stringify(validatedInput),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};