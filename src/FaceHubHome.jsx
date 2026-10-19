import React from 'react';
import {ArrowRight,Play,ScanFace,Sparkles,Video,AudioLines,Monitor,ShieldCheck,Check,MoveUpRight} from 'lucide-react';
import './facehub-home.css';

const features=[
  {icon:ScanFace,title:'Character transformation',copy:'Shape a distinct on-camera look while keeping your own movement and expressions at the center.'},
  {icon:Video,title:'Camera-first workflow',copy:'Preview your framing before you start a session. Keep the setup simple and the controls close.'},
  {icon:AudioLines,title:'Video and voice, together',copy:'A clear home for compatible voice tools and live media workflows as your setup grows.'}
];
export default function FaceHubHome({onOpenStudio}){
 return <div className="fhHome">
  <div className="fhAnnouncement"><span className="fhPulse"/> CREATOR STUDIO · BUILT FOR LIVE EXPRESSION <a href="#experience">Explore the experience <ArrowRight size={13}/></a></div>
  <header className="fhHeader">
   <a className="fhBrand" href="/" aria-label="Reachmark FaceHub home"><span className="fhBrandMark"><ScanFace size={23}/></span><span><b>Reachmark FaceHub</b><small>LIVE MEDIA STUDIO</small></span></a>
   <nav className="fhLinks"><a href="#experience">The experience</a><a href="#workflow">How it works</a><a href="#tools">Studio tools</a></nav>
   <button className="fhHeaderCta" onClick={onOpenStudio}>Open studio <ArrowRight size={15}/></button>
  </header>
  <main>
   <section className="fhHero">
    <div className="fhHeroCopy">
     <div className="fhEyebrow"><Sparkles size={14}/> YOUR CREATIVE PRESENCE, REIMAGINED</div>
     <h1>A new look.<br/><em>Still your</em> moment.</h1>
     <p className="fhLead">Bring a character to life with a live media workspace built around your camera, your expression, and the way you create.</p>
     <div className="fhHeroActions"><button className="fhPrimary" onClick={onOpenStudio}>Enter the studio <ArrowRight size={17}/></button><a className="fhSecondary" href="#workflow"><span className="fhPlay"><Play size={12} fill="currentColor"/></span> See how it works</a></div>
     <div className="fhProof"><span><Check size={14}/> Camera preview first</span><span><Check size={14}/> Creator-focused tools</span><span><Check size={14}/> You stay in control</span></div>
    </div>
    <div className="fhVisual" aria-label="Illustrative studio preview">
      <div className="fhVisualGlow"/>
      <div className="fhFrameTop"><span><i/> STUDIO PREVIEW</span><span className="fhLiveBadge">LIVE WORKSPACE</span></div>
      <div className="fhPortraitStage">
       <div className="fhOrb fhOrbOne"/><div className="fhOrb fhOrbTwo"/>
       <div className="fhPortrait"><div className="fhHair"/><div className="fhFace"><div className="fhBrow left"/><div className="fhBrow right"/><div className="fhEye left"/><div className="fhEye right"/><div className="fhNose"/><div className="fhMouth"/><div className="fhEar left"/><div className="fhEar right"/></div><div className="fhNeck"/><div className="fhShoulders"/></div>
       <div className="fhScanLine"/>
       <div className="fhTag fhTagA"><ScanFace size={15}/><span>Face tracking</span><b>Ready</b></div>
       <div className="fhTag fhTagB"><span className="fhMiniWave"><i/><i/><i/><i/><i/><i/><i/></span><span>Expression map</span></div>
      </div>
      <div className="fhVisualBottom"><div><small>ACTIVE WORKSPACE</small><b>Character preview</b></div><div className="fhVisualizer"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><span className="fhCornerArrow"><MoveUpRight size={18}/></span></div>
    </div>
    <div className="fhHeroIndex"><span>01 / CREATIVE TOOLS</span><span>MADE FOR THE MOMENT <span className="fhIndexLine"/></span></div>
   </section>
   <section className="fhMarquee" aria-label="Studio capabilities"><span>LIVE EXPRESSION</span><i>✳</i><span>CHARACTER TOOLS</span><i>✳</i><span>CAMERA WORKFLOW</span><i>✳</i><span>CREATOR CONTROL</span><i>✳</i><span>LIVE EXPRESSION</span></section>
   <section className="fhExperience" id="experience">
    <div className="fhSectionIntro"><div><span className="fhEyebrow">01 — THE EXPERIENCE</span><h2>Your creativity.<br/><em>One clear workspace.</em></h2></div><p>Designed to feel approachable from the first preview, with the important controls in reach and room for more advanced tools when you need them.</p></div>
    <div className="fhFeatureGrid" id="tools">{features.map((f,i)=><article className="fhFeature" key={f.title}><div className="fhFeatureTop"><span className="fhFeatureIcon"><f.icon size={20}/></span><span>0{i+1}</span></div><h3>{f.title}</h3><p>{f.copy}</p><a href="/studio" onClick={e=>{e.preventDefault();onOpenStudio()}}>Explore tool <ArrowRight size={14}/></a></article>)}</div>
   </section>
   <section className="fhWorkflow" id="workflow"><div className="fhWorkflowVisual"><div className="fhWorkflowCard"><div className="fhWorkflowCardHead"><span>YOUR SESSION</span><span className="fhStatus"><i/> PREVIEW MODE</span></div><div className="fhWorkflowScreen"><div className="fhWorkflowSilhouette"><div/><span/></div><div className="fhFocusCorners"/></div><div className="fhWorkflowControls"><span><Monitor size={14}/> Camera source</span><span className="fhControlPill">Ready to preview</span></div></div><div className="fhWorkflowCaption"><ShieldCheck size={16}/> Preview before you go live</div></div>
    <div className="fhWorkflowCopy"><span className="fhEyebrow">02 — A SIMPLE FLOW</span><h2>From setup<br/>to <em>your stage.</em></h2><div className="fhSteps"><div><span>01</span><section><b>Choose your look</b><p>Select a character asset you own or have permission to use.</p></section></div><div><span>02</span><section><b>Preview your camera</b><p>Check the framing and make adjustments before starting a live session.</p></section></div><div><span>03</span><section><b>Bring it into your workflow</b><p>Use the studio tools and supported connections available in your setup.</p></section></div></div><button className="fhPrimary" onClick={onOpenStudio}>Open Reachmark FaceHub <ArrowRight size={16}/></button></div>
   </section>
   <section className="fhClosing"><div><span className="fhEyebrow">YOUR NEXT CREATIVE CHAPTER</span><h2>Show up as<br/><em>you imagine.</em></h2></div><button className="fhPrimary" onClick={onOpenStudio}>Step into the studio <ArrowRight size={17}/></button><div className="fhClosingOrb"/></section>
  </main>
  <footer className="fhFooter"><a className="fhBrand" href="/"><span className="fhBrandMark"><ScanFace size={21}/></span><span><b>Reachmark FaceHub</b><small>LIVE MEDIA STUDIO</small></span></a><span>Creative tools. Thoughtful control.</span><span>© 2026 Reachmark FaceHub</span></footer>
 </div>
}
