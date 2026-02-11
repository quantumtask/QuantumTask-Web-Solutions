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
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  cards.forEach((card, index) => {
    card.style.transitionDelay = `${index * 110}ms`;
    observer.observe(card);
  });
})();
