import React,{useEffect,useRef,useState} from 'react';
import {Camera,CameraOff,CheckCircle2,CircleAlert,Link2,MonitorPlay,RefreshCw,Wifi,WifiOff} from 'lucide-react';

const endpoint=import.meta.env.VITE_LIVESIM_OBS_WS_URL||'ws://127.0.0.1:4455';
const mediaPage=import.meta.env.VITE_LIVESIM_OBS_SOURCE_URL||'http://127.0.0.1:8788/obs';

function b64(bytes){let s='';for(const b of new Uint8Array(bytes))s+=String.fromCharCode(b);return btoa(s)}
async function sha256(text){return crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))}
async function authHash(secret,salt,challenge){return b64(await sha256(b64(await sha256(secret+salt))+challenge))}

export default function ObsBridge(){
 const [status,setStatus]=useState('offline'),[version,setVersion]=useState(''),[scene,setScene]=useState(''),[virtualCam,setVirtualCam]=useState(false),[error,setError]=useState(''),[password,setPassword]=useState('');
 const ws=useRef(null);const pending=useRef(new Map());const id=useRef(1);
 const send=(op,d={})=>new Promise((resolve,reject)=>{const requestId=String(id.current++);pending.current.set(requestId,{resolve,reject});ws.current?.send(JSON.stringify({op,d:{...d,requestId}}))});
 const connect=()=>{if(ws.current?.readyState===1)return;setStatus('connecting');setError('');const socket=new WebSocket(endpoint);ws.current=socket;
  socket.onmessage=async e=>{const m=JSON.parse(e.data);if(m.op===0){try{let d={rpcVersion:1};if(m.d.authentication){if(!password){setError('OBS WebSocket password required');socket.close();return}d.authentication=await authHash(password,m.d.authentication.salt,m.d.authentication.challenge)}socket.send(JSON.stringify({op:1,d}));}catch(err){setError(err.message);socket.close()}}
  else if(m.op===2){setStatus('connected');const v=await send(6,{requestType:'GetVersion'}).catch(()=>null);if(v?.d?.responseData?.obsVersion)setVersion(v.d.responseData.obsVersion);const s=await send(6,{requestType:'GetCurrentProgramScene'}).catch(()=>null);if(s?.d?.responseData?.sceneName)setScene(s.d.responseData.sceneName);const st=await send(6,{requestType:'GetVirtualCamStatus'}).catch(()=>null);if(st?.d?.responseData)setVirtualCam(Boolean(st.d.responseData.outputActive))}
  else if(m.op===7){const p=pending.current.get(m.d.requestId);if(!p)return;pending.current.delete(m.d.requestId);if(m.d.requestStatus?.result)p.resolve(m);else p.reject(new Error(m.d.requestStatus?.comment||'OBS request failed'))}};
  socket.onclose=()=>{setStatus('offline');setVirtualCam(false);ws.current=null};socket.onerror=()=>setError('Could not reach OBS WebSocket on localhost:4455')};
 const disconnect=()=>ws.current?.close();
 const refresh=async()=>{if(status!=='connected')return connect();const s=await send(6,{requestType:'GetCurrentProgramScene'}).catch(()=>null);if(s?.d?.responseData?.sceneName)setScene(s.d.responseData.sceneName);const st=await send(6,{requestType:'GetVirtualCamStatus'}).catch(()=>null);if(st?.d?.responseData)setVirtualCam(Boolean(st.d.responseData.outputActive))};
 const ensureLiveSimSource=async()=>{if(status!=='connected')throw new Error('Connect to OBS first');const sceneReply=await send(6,{requestType:'GetCurrentProgramScene'});const sceneName=sceneReply?.d?.responseData?.sceneName;if(!sceneName)throw new Error('OBS has no program scene');const list=await send(6,{requestType:'GetInputList'});const exists=(list?.d?.responseData?.inputs||[]).some(x=>x.inputName==='LiveSim Output');if(!exists){await send(6,{requestType:'CreateInput',requestData:{sceneName,inputName:'LiveSim Output',inputKind:'browser_source',inputSettings:{url:mediaPage,width:1280,height:720,fps:30,reroute_audio:true},sceneItemEnabled:true}})}setScene(sceneName);return true};
 const toggleCam=async()=>{try{await ensureLiveSimSource();if(virtualCam)await send(6,{requestType:'StopVirtualCam'});else await send(6,{requestType:'StartVirtualCam'});await refresh()}catch(e){setError(e.message)}};
 useEffect(()=>()=>ws.current?.close(),[]);
 return <section className="obsBridge">
  <div className="obsHero"><div><span>OBS MEDIA BRIDGE</span><h2>Use OBS as LiveSim's desktop media gateway</h2><p>LiveSim can hand its processed output to OBS, while OBS handles scenes, sources and the operating-system virtual camera.</p></div><div className={'obsState '+status}><i/>{status.toUpperCase()}</div></div>
  <div className="obsGrid">
   <div className="obsCard obsMain"><div className="obsCardHead"><div><span>LOCAL CONTROL</span><b>OBS WebSocket</b></div><MonitorPlay size={20}/></div>
    <div className="obsRows"><div><label>Endpoint</label><code>{endpoint.replace(/^ws:\/\//,'')}</code></div><div><label>WebSocket password</label><input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="off" placeholder="OBS password" /></div><div><label>LiveSim source</label><code>{mediaPage}</code></div><div><label>OBS version</label><strong>{version||'Not detected'}</strong></div><div><label>Program scene</label><strong>{scene||'Not detected'}</strong></div><div><label>Virtual camera</label><strong className={virtualCam?'good':''}>{virtualCam?'Running':'Stopped'}</strong></div></div>
    <div className="obsActions"><button onClick={status==='connected'?disconnect:connect}>{status==='connected'?<><WifiOff size={15}/> Disconnect</>:<><Wifi size={15}/> Connect to OBS</>}</button><button onClick={ensureLiveSimSource} disabled={status!=='connected'}><Link2 size={15}/> Attach LiveSim source</button><button onClick={refresh} disabled={status!=='connected'}><RefreshCw size={15}/> Refresh</button><button className={virtualCam?'danger':''} onClick={toggleCam} disabled={status!=='connected'}>{virtualCam?<><CameraOff size={15}/> Stop virtual camera</>:<><Camera size={15}/> Start virtual camera</>}</button></div>
   </div>
   <aside className="obsCard"><span>ROUTING</span><div className="obsRoute"><b>LiveSim output</b><em>→</em><b>OBS scene</b><em>→</em><b>Virtual Camera</b></div><p>Use OBS scenes to combine DroidCam, laptop camera, LiveSim output, screen capture and audio before exposing the final scene as a webcam.</p><div className="obsChecklist"><div><CheckCircle2 size={15}/> OBS WebSocket enabled</div><div><CheckCircle2 size={15}/> Virtual Camera available</div><div><CheckCircle2 size={15}/> DroidCam can be added as an OBS source</div></div></aside>
  </div>
  <div className="obsNotice"><CircleAlert size={16}/><span>{error||'For security, keep OBS WebSocket bound to localhost. The browser never receives provider credentials.'}</span></div>
  <div className="obsSetup"><b>Setup on the desktop</b><ol><li>Install OBS Studio.</li><li>Enable <strong>WebSocket Server</strong> on port 4455 and set a password.</li><li>Install DroidCam OBS if you want the Android camera as an OBS source.</li><li>Start OBS Virtual Camera, then select it in the supported video application.</li></ol></div>
 </section>
}
