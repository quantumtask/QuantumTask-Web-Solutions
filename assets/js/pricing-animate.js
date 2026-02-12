(() => {
  const cards = Array.from(document.querySelectorAll('[data-pack-card]'));
  if (!cards.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const revealAll = () => {
    cards.forEach((card, index) => {
      card.style.transitionDelay = `${index * 110}ms`;
      card.classList.add('is-in');
      if (prefersReduced) card.style.transition = 'none';
    });
  };

  if (prefersReduced || !('IntersectionObserver' in window)) {
    revealAll();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });

  cards.forEach((card, index) => {
    card.style.transitionDelay = `${index * 110}ms`;
    observer.observe(card);
  });

  // Fallback if observers never fire or cards load above the fold
  const checkVisible = () => {
    if (cards.some(c => c.classList.contains('is-in'))) return;
    const first = cards[0].getBoundingClientRect();
    const viewH = window.innerHeight || document.documentElement.clientHeight;
    if (first.top <= viewH && first.bottom >= 0) revealAll();
  };
  window.addEventListener('load', checkVisible, { once: true });
  setTimeout(checkVisible, 1200);
})();
