(() => {
  const section = document.querySelector('[data-pack-section]');
  const cards = Array.from(document.querySelectorAll('[data-pack-card]'));
  if (!section || !cards.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let revealed = false;
  const setDelays = () => cards.forEach((card, index) => { card.style.transitionDelay = `${index * 110}ms`; });

  const reveal = () => {
    if (revealed) return;
    revealed = true;
    setDelays();
    requestAnimationFrame(() => {
      cards.forEach(card => {
        card.classList.add('is-in');
        if (prefersReduced) card.style.transition = 'none';
      });
    });
    observer?.disconnect();
  };

  if (prefersReduced || !('IntersectionObserver' in window)) {
    reveal();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) reveal();
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });

  const checkInView = () => {
    if (revealed) return;
    const rect = section.getBoundingClientRect();
    const viewH = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top <= viewH * 0.95 && rect.bottom >= 0) reveal();
  };

  observer.observe(section);
  setDelays();
  checkInView();
  window.addEventListener('load', checkInView, { once: true });
  // absolute fallback in case observers never fire
  setTimeout(checkInView, 1200);
})();
