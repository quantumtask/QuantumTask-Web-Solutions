(() => {
  const section = document.querySelector('[data-pack-section]');
  const cards = Array.from(document.querySelectorAll('[data-pack-card]'));
  if (!section || !cards.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const revealNow = () => {
    cards.forEach((card, index) => {
      card.style.transitionDelay = `${index * 110}ms`;
      card.classList.add('is-in');
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
        cards.forEach((card, index) => {
          card.style.transitionDelay = `${index * 110}ms`;
        });
        requestAnimationFrame(() => cards.forEach(card => card.classList.add('is-in')));
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -15% 0px' });

  observer.observe(section);
})();
