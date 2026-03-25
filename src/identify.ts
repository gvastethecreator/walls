import gsap from 'gsap';
import './styles.css';

const params = new URLSearchParams(window.location.search);
const number = params.get('n') ?? '?';
const badge = document.getElementById('number');
if (!badge) {
  throw new Error('Identify badge not found');
}

badge.textContent = number;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion) {
  gsap.fromTo(
    '.js-identify-number',
    { autoAlpha: 0, scale: 0.92 },
    { autoAlpha: 1, scale: 1, duration: 0.22, ease: 'power2.out' },
  );
  gsap.to('.js-identify-number', {
    scale: 1.04,
    duration: 0.9,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });
}
