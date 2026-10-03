import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  title: z.string().trim().min(1).max(80),
  authorizationConfirmed: z.boolean(),
  sourceFilename: z.string().trim().min(1).max(255),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  id: string;
  provider: "fish-audio";
  providerVoiceId: string;
  displayName: string;
  status: "ready";
  authorizationConfirmed: true;
};

export const postVoiceClone = async (body: InputType, file: File, init?: RequestInit): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const form = new FormData();
  form.append("title", validatedInput.title);
  form.append("authorizationConfirmed", String(validatedInput.authorizationConfirmed));
  form.append("sourceFilename", validatedInput.sourceFilename);
  form.append("file", file, file.name);
  const result = await fetch(`/_api/voice-clone`, { method: "POST", body: form, ...init });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};