import { parseCookies, unseal } from "./_lib/security.js";

export default function handler(req,res){
  const session=unseal(parseCookies(req).livesim_session);
  if(req.method==="GET"){
    return res.status(200).json({
      ok:true,
      service:"livesim-live-control",
      sessionActive:Boolean(session),
      sessionId:session?.id||null,
      transport:session?.destination?({
        google:"obs-virtual-camera",
        zoom:"obs-virtual-camera-or-native-production-studio",
        tiktok:"content-posting-only",
        whatsapp:"external-web-client",
        telegram:"external-web-client"
      }[session.destination]||"custom-transport"):null,
      capabilities:{
        gpuFaceSwap:Boolean(process.env.LIVESIM_GPU_WORKER_URL),
        obsVirtualCamera:true,
        googleOutgoingMedia:false,
        whatsappCallApi:false,
        zoomNativeProductionStudio:true
      }
    });
  }
  return res.status(405).json({error:"GET required."});
}
