import superjson from "superjson";
import { db } from "../helpers/db";
import { schema, OutputType } from "./voice-clone_POST.schema";

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const ALLOWED_AUDIO = new Set(["audio/mpeg", "audio/wav", "audio/x-wav", "audio/wave", "audio/flac", "audio/mp4", "audio/x-m4a", "audio/ogg", "audio/webm"]);

export async function handle(request: Request) {
  try {
    const apiKey = (process.env as Record<string, string | undefined>).FISH_AUDIO_API_KEY;
    if (!apiKey) return new Response(superjson.stringify({ error: "Fish Audio is not connected. Connect the Fish Audio credential in the project settings." }), { status: 503 });

    const form = await request.formData();
    const file = form.get("file");
    const parsed = schema.parse({
      title: form.get("title"),
      authorizationConfirmed: form.get("authorizationConfirmed") === "true",
      sourceFilename: form.get("sourceFilename"),
    });
    if (!parsed.authorizationConfirmed) return new Response(superjson.stringify({ error: "Voice ownership/authorization must be confirmed before cloning." }), { status: 400 });
    if (!(file instanceof File)) return new Response(superjson.stringify({ error: "Upload one audio reference file." }), { status: 400 });
    if (!ALLOWED_AUDIO.has(file.type.toLowerCase())) return new Response(superjson.stringify({ error: "Unsupported audio type. Use MP3, WAV, FLAC, M4A, OGG, or WebM audio." }), { status: 400 });
    if (file.size <= 0 || file.size > MAX_AUDIO_BYTES) return new Response(superjson.stringify({ error: "Audio file must be between 1 byte and 20 MB." }), { status: 400 });

    const fishForm = new FormData();
    fishForm.append("title", parsed.title);
    fishForm.append("description", "Authorized voice for LiveSim Lab simulation research");
    fishForm.append("visibility", "private");
    fishForm.append("type", "tts");
    fishForm.append("train_mode", "fast");
    fishForm.append("enhance_audio_quality", "true");
    fishForm.append("voices", new Blob([await file.arrayBuffer()], { type: file.type }), file.name);

    const fishResponse = await fetch("https://api.fish.audio/model", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fishForm,
    });
    if (!fishResponse.ok) {
      const detail = (await fishResponse.text()).slice(0, 500);
      return new Response(superjson.stringify({ error: `Fish Audio voice creation failed (${fishResponse.status}). ${detail}` }), { status: 502 });
    }
    const fishModel = await fishResponse.json() as { id?: string; _id?: string; title?: string };
    const providerVoiceId = fishModel.id ?? fishModel._id;
    if (!providerVoiceId) return new Response(superjson.stringify({ error: "Fish Audio returned no voice model id." }), { status: 502 });

    const id = crypto.randomUUID();
    await db.insertInto("voiceProfiles").values({
      id,
      provider: "fish-audio",
      providerVoiceId,
      displayName: parsed.title,
      sourceFilename: parsed.sourceFilename,
      authorizationConfirmed: true,
      status: "ready",
    }).execute();

    const output = {
      id,
      provider: "fish-audio" as const,
      providerVoiceId,
      displayName: parsed.title,
      status: "ready" as const,
      authorizationConfirmed: true as const,
    } satisfies OutputType;
    return new Response(superjson.stringify(output));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Voice clone request failed.";
    return new Response(superjson.stringify({ error: message }), { status: 400 });
  }
}