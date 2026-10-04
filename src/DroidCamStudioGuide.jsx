import React,{useEffect,useState} from 'react';
import {Camera,CheckCircle2,ExternalLink,RefreshCw,Usb,Wifi} from 'lucide-react';

const PLUGIN='https://github.com/dev47apps/droidcam-obs-plugin';
const GUIDE='https://www.droidcam.app/obs/';

export default function DroidCamStudioGuide(){
 const [cameraCount,setCameraCount]=useState(null);
 const [checking,setChecking]=useState(false);
 const [permission,setPermission]=useState('unknown');
 const scan=async()=>{
  setChecking(true);
  try{
   if(!navigator.mediaDevices?.enumerateDevices) throw new Error('mediaDevices unavailable');
   const before=await navigator.mediaDevices.enumerateDevices();
   const cams=before.filter(d=>d.kind==='videoinput');
   setCameraCount(cams.length);
   if(cams.some(d=>/droidcam/i.test(d.label))) setPermission('ready');
   else if(cams.length) setPermission('available');
   else setPermission('none');
  }catch{setCameraCount(null);setPermission('blocked')}
  finally{setChecking(false)}
 };
 useEffect(()=>{scan()},[]);
 return <section className="droidGuide" aria-label="DroidCam OBS camera bridge">
  <div className="droidHead"><div><span className="kicker">CAMERA BRIDGE / OBS</span><h3>DroidCam → OBS → LiveSim</h3><p>Use DroidCam as the phone camera source, bring it into OBS, then use OBS as the production handoff into LiveSim. LiveSim never claims the phone is connected unless a camera source is observable.</p></div><Camera size={20}/></div>
  <div className="droidGrid">
   <article><span className="stepNo">01</span><b>Install the OBS source</b><p>Install the official DroidCam OBS plugin on the desktop running OBS. Restart OBS after installation.</p><a href={PLUGIN} target="_blank" rel="noreferrer">Plugin repository <ExternalLink size={12}/></a></article>
   <article><span className="stepNo">02</span><b>Connect your phone</b><p>Open DroidCam on Android or iOS. USB is preferred for the most stable path; Wi‑Fi is available when both devices share a network.</p><div className="droidModes"><span><Usb size={12}/> USB</span><span><Wifi size={12}/> Wi‑Fi</span></div></article>
   <article><span className="stepNo">03</span><b>Add DroidCam in OBS</b><p>In OBS, add a <strong>DroidCam OBS</strong> source and select the phone. Confirm the preview is moving before opening LiveSim.</p><a href={GUIDE} target="_blank" rel="noreferrer">Official OBS guide <ExternalLink size={12}/></a></article>
   <article><span className="stepNo">04</span><b>Verify the handoff</b><p>LiveSim checks browser-visible camera devices where available. The native OBS plugin itself is verified inside OBS, not by pretending a browser probe can inspect native plugins.</p><button onClick={scan} disabled={checking}><RefreshCw size={12} className={checking?'spin':''}/> {checking?'Scanning…':'Scan camera devices'}</button></article>
  </div>
  <div className={'droidStatus '+permission} role="status" aria-live="polite">
   {permission==='ready'?<CheckCircle2 size={15}/>:<Camera size={15}/>}<span><b>{permission==='ready'?'DroidCam-labelled camera visible':permission==='available'?'Camera input available':permission==='none'?'No browser camera input detected':permission==='blocked'?'Camera access unavailable':'Camera check ready'}</b><small>{cameraCount===null?'Use OBS to verify the native DroidCam source.':`${cameraCount} video input${cameraCount===1?'':'s'} visible to this browser.`}</small></span>
  </div>
 </section>
}
