import { parseCookies, unseal } from "./_lib/security.js";

const platforms = {
  zoom: {
    name:"Zoom",
    kind:"meeting",
    transport:"obs-or-native-ps",
    directMedia:true,
    requirements:"OBS Virtual Camera/Audio or native Zoom Production Studio SDK"
  },
  google: {
    name:"Google Meet",
    kind:"meeting",
    transport:"obs-virtual-camera",
    directMedia:false,
    requirements:"Join the Meet client and select LiveSim/OBS media"
  },
  whatsapp: {
    name:"WhatsApp",
    kind:"calling",
    transport:"obs-virtual-camera",
    directMedia:false,
    requirements:"WhatsApp Web/Desktop; select LiveSim/OBS camera and audio"
  },
  telegram: {
    name:"Telegram",
    kind:"calling",
    transport:"obs-virtual-camera",
    directMedia:false,
    requirements:"Telegram Desktop/Web; select LiveSim/OBS camera and audio where exposed"
  },
  tiktok: {
    name:"TikTok",
    kind:"publishing",
    transport:"recorded-content-posting",
    directMedia:false,
    requirements:"Content Posting authorization; LIVE ingest is not represented by this adapter"
  },
  rtmp: {
    name:"Custom RTMP",
    kind:"stream",
    transport:"rtmp",
    directMedia:true,
    requirements:"A valid RTMP endpoint and stream key"
  },
  webrtc: {
    name:"Custom WebRTC",
    kind:"stream",
    transport:"webrtc",
    directMedia:true,
    requirements:"A compatible WebRTC/WHIP endpoint"
  }
};

export default function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({error:"GET required."});
  const session=unseal(parseCookies(req).livesim_session);
  return res.status(200).json({
    ok:true,
    service:"livesim-live-control",
    sessionActive:Boolean(session),
    sessionId:session?.id||null,
    activeDestination:session?.destination||null,
    platforms,
    pipeline:{
      browserTracking:true,
      neuralFaceSwap:Boolean(process.env.LIVESIM_GPU_WORKER_URL),
      voiceTTS:Boolean(process.env.LIVESIM_VOICE_WORKER_URL),
      obsBridge:true,
      virtualCamera:true,
      nativeZoomProductionStudio:"desktop-sdk-required"
    }
  });
}
