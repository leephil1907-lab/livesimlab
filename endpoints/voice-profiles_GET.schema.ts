import superjson from "superjson";

export type VoiceProfile = {
  id: string;
  provider: string;
  providerVoiceId: string;
  displayName: string;
  sourceFilename: string;
  authorizationConfirmed: boolean;
  status: string;
  createdAt: Date;
};

export type OutputType = {
  profiles: VoiceProfile[];
};

export const getVoiceProfiles = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch("/_api/voice-profiles", { method: "GET", ...init });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
