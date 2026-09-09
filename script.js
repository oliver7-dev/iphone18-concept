(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const revealTargets = Array.from(document.querySelectorAll(".reveal, .camera-stage"));

  if (reduceMotion) {
    revealTargets.forEach((el) => el.classList.add("in-view"));
  }

  const hero = document.getElementById("hero");
  const screen = hero ? hero.querySelector(".device-screen") : null;
  const plate = hero ? hero.querySelector(".device-camera-plate") : null;
  const lenses = hero ? hero.querySelectorAll(".lens") : [];

  let ticking = false;

  function updateReveals() {
    const vh = window.innerHeight;
    revealTargets.forEach((el) => {
      const rect = el.getBoundingClientRect();
      // "open" once the element is comfortably inside the viewport,
      // "close" again once it has scrolled back out either edge
      const visible = rect.top < vh * 0.82 && rect.bottom > vh * 0.1;
      el.classList.toggle("in-view", visible);
    });
  }

  function updateHero() {
    if (!hero || reduceMotion) return;
    const rect = hero.getBoundingClientRect();
    const scrollable = hero.offsetHeight - window.innerHeight;
    const scrolled = -rect.top;
    const progress = Math.min(Math.max(scrolled / scrollable, 0), 1);

    const screenProgress = Math.min(progress / 0.6, 1);
    const scaleY = 0.06 + screenProgress * 0.94;
    if (screen) screen.style.transform = `scaleY(${scaleY})`;

    const camProgress = Math.min(Math.max((progress - 0.1) / 0.6, 0), 1);
    const rotate = -14 + camProgress * 14;
    const tx = -6 + camProgress * 6;
    const ty = -4 + camProgress * 4;
    if (plate) plate.style.transform = `rotate(${rotate}deg) translate(${tx}px, ${ty}px)`;
    lenses.forEach((lens) => {
      lens.style.transform = `scale(${0.2 + camProgress * 0.8})`;
    });

    hero.classList.toggle("is-open", progress > 0.15);
  }

  function onFrame() {
    ticking = false;
    updateReveals();
    updateHero();
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(onFrame);
      ticking = true;
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  // run once on load so anything already in view on arrival is open
  onFrame();
})();
