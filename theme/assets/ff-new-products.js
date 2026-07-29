(() => {
  const roots = document.querySelectorAll('[data-ff-new]');
  if (!roots.length) return;

  roots.forEach((root) => {
    root.querySelectorAll('[data-ff-new-col]').forEach((col) => {
      const slides = Array.from(col.querySelectorAll('[data-ff-new-slide]'));
      const dots = Array.from(col.querySelectorAll('[data-ff-new-dot]'));
      const caption = col.querySelector('[data-ff-new-caption]');
      if (slides.length < 2) return;

      const interval = Math.max(2500, Number(col.getAttribute('data-ff-new-interval') || 4500));
      let index = slides.findIndex((s) => s.classList.contains('is-active'));
      if (index < 0) index = 0;
      let timer = null;

      const show = (next) => {
        slides[index]?.classList.remove('is-active');
        dots[index]?.classList.remove('is-active');
        index = (next + slides.length) % slides.length;
        slides[index]?.classList.add('is-active');
        dots[index]?.classList.add('is-active');
        if (caption) {
          const title = slides[index]?.getAttribute('data-ff-new-title') || '';
          caption.textContent = title;
        }
      };

      const play = () => {
        stop();
        timer = window.setInterval(() => show(index + 1), interval);
      };

      const stop = () => {
        if (timer) window.clearInterval(timer);
        timer = null;
      };

      dots.forEach((dot, i) => {
        dot.addEventListener('click', () => {
          show(i);
          play();
        });
      });

      col.addEventListener('mouseenter', stop);
      col.addEventListener('mouseleave', play);
      col.addEventListener('focusin', stop);
      col.addEventListener('focusout', play);

      play();
    });
  });
})();

