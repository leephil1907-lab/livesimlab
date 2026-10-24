// Motion system for the marketing site: Lenis smooth scroll synced with GSAP
// ScrollTrigger, scroll reveals, split-text headlines, 3D tilt + spotlight cards.
import React, { useEffect, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);
export { gsap, ScrollTrigger };

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Scroll to an element or y-position, via Lenis when active. */
export function scrollToTarget(target, offset = -80) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (window.__lenis) window.__lenis.scrollTo(el ?? 0, { offset, duration: 1.4 });
  else if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth' });
}

/** Smooth scrolling for public pages. Exposes window.__lenis for the router. */
export function useSmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const tick = time => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      window.__lenis = null;
    };
  }, []);
}

/**
 * Wire up motion inside a scope element:
 *  [data-split]            → words rise from a mask (use <Split/>)
 *  [data-reveal]           → fade/rise on enter
 *  [data-reveal-group]     → children stagger in
 *  [data-tilt]             → 3D tilt toward the cursor + spotlight (--mx/--my)
 *  [data-parallax="0.2"]   → vertical parallax while scrolling
 */
export function useMotion(scopeRef, deps = []) {
  useIsoLayoutEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return undefined;
    const reduced = prefersReducedMotion();
    const ctx = gsap.context(() => {
      if (reduced) return;
      scope.querySelectorAll('[data-split]:not([data-split="manual"])').forEach(el => {
        gsap.from(el.querySelectorAll('.split-word > span'), {
          yPercent: 110, rotate: 4, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.06,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });
      scope.querySelectorAll('[data-reveal]').forEach(el => {
        gsap.from(el, {
          y: 48, opacity: 0, duration: 1.1, ease: 'expo.out', delay: Number(el.dataset.delay || 0), clearProps: 'transform,opacity',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        });
      });
      scope.querySelectorAll('[data-reveal-group]').forEach(group => {
        gsap.from(group.children, {
          y: 56, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09, clearProps: 'transform,opacity',
          scrollTrigger: { trigger: group, start: 'top 86%', once: true },
        });
      });
      scope.querySelectorAll('[data-parallax]').forEach(el => {
        gsap.to(el, {
          yPercent: -100 * Number(el.dataset.parallax || 0.15), ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });
    }, scope);

    // Tilt + spotlight (pointer devices only).
    const cleanups = [];
    if (window.matchMedia('(hover: hover)').matches) {
      scope.querySelectorAll('[data-tilt]').forEach(el => {
        const max = Number(el.dataset.tilt || 6);
        const move = e => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          el.style.setProperty('--mx', `${x * 100}%`);
          el.style.setProperty('--my', `${y * 100}%`);
          if (!reduced) {
            el.style.setProperty('--ry', `${(x - 0.5) * max}deg`);
            el.style.setProperty('--rx', `${(0.5 - y) * max}deg`);
          }
        };
        const leave = () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);
        cleanups.push(() => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); });
      });
    }
    requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => { ctx.revert(); cleanups.forEach(fn => fn()); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Headline split into masked words. lines: [{ text, className }] or strings. */
export function Split({ as: Tag = 'h2', lines, className = '', id, manual = false }) {
  return (
    <Tag className={className} data-split={manual ? 'manual' : ''} id={id} aria-label={lines.map(l => (typeof l === 'string' ? l : l.text)).join(' ')}>
      {lines.map((line, li) => {
        const { text, className: lc } = typeof line === 'string' ? { text: line } : line;
        return (
          <span key={li} className={`split-line ${lc || ''}`} aria-hidden="true">
            {text.split(' ').map((w, wi) => (
              <React.Fragment key={wi}><span className="split-word"><span>{w}</span></span>{' '}</React.Fragment>
            ))}
          </span>
        );
      })}
    </Tag>
  );
}
