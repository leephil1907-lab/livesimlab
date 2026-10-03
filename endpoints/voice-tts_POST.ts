import superjson from "superjson";
import { db } from "../helpers/db";
import { schema, OutputType } from "./voice-tts_POST.schema";

const styleTags: Record<string, string> = {
  "Conversational": "[warm]",
  "Broadcast presenter": "[clear]",
  "Analytical": "[confident]",
  "Calm": "[reassuring]",
};

export async function handle(request: Request) {
  try {
    const apiKey = (process.env as Record<string, string | undefined>).FISH_AUDIO_API_KEY;
    if (!apiKey) return new Response(superjson.stringify({ error: "Fish Audio is not connected." }), { status: 503 });
    const json = superjson.parse(await request.text());
    const input = schema.parse(json);
    const profile = await db.selectFrom("voiceProfiles")
      .select(["provider", "providerVoiceId", "status"])
      .where("providerVoiceId", "=", input.providerVoiceId)
      .executeTakeFirst();
    if (!profile || profile.provider !== "fish-audio" || profile.status !== "ready") {
      return new Response(superjson.stringify({ error: "That voice profile is not available." }), { status: 404 });
    }

    const fishResponse = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        model: "s2.1-pro-free",
      },
      body: JSON.stringify({
        text: `${styleTags[input.style]} ${input.text}`,
        reference_id: input.providerVoiceId,
        format: "mp3",
      }),
    });
    if (!fishResponse.ok) {
      const detail = (await fishResponse.text()).slice(0, 500);
      return new Response(superjson.stringify({ error: `Fish Audio TTS failed (${fishResponse.status}). ${detail}` }), { status: 502 });
    }
    const audioBase64 = Buffer.from(await fishResponse.arrayBuffer()).toString("base64");
    return new Response(superjson.stringify({ mimeType: "audio/mpeg", audioBase64 } satisfies OutputType));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Voice synthesis failed.";
    return new Response(superjson.stringify({ error: message }), { status: 400 });
  }
}