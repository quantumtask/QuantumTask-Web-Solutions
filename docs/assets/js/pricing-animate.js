(() => {
  const cards = Array.from(document.querySelectorAll('[data-pack-card]'));
  if (!cards.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const revealNow = () => {
    cards.forEach(card => {
      card.classList.add('is-in');
      card.style.transitionDelay = '0ms';
      if (prefersReduced) card.style.transition = 'none';
    });
  };

  if (prefersReduced || !('IntersectionObserver' in window)) {
    revealNow();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Use rAF to ensure styles are applied before we flip to the visible state
        requestAnimationFrame(() => entry.target.classList.add('is-in'));
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.25, rootMargin: '0px 0px -10% 0px' });

  cards.forEach((card, index) => {
    card.style.transitionDelay = `${index * 110}ms`;
    observer.observe(card);
  });
})();
