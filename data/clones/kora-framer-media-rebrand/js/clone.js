// Entrance reveals. Stagger 80ms, measured from the source.
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    e.target.classList.add('in');
  });
}, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

document.querySelectorAll('.sec').forEach((sec) => {
  [...sec.querySelectorAll('.b')].forEach((el, i) => {
    el.style.setProperty('--d', Math.min(i, 8) * 80 + 'ms');
    io.observe(el);
  });
});

// Each breakpoint is a fixed-width canvas. Scale it to whatever width the
// viewer actually has, and take the SCALED height, or every section below is
// pushed down by the unscaled remainder.
function fitStages() {
  const w = window.innerWidth;
  const ref = w >= 1200 ? 1440 : w >= 700 ? 810 : 390;
  const prop = w >= 1200 ? '--absh-lg' : w >= 700 ? '--absh-md' : '--absh';
  const k = w / ref;
  document.querySelectorAll('.abs-sec').forEach((sec) => {
    const stage = sec.querySelector('.stage');
    if (!stage) return;
    const cs = getComputedStyle(sec);
    const h = parseFloat(cs.getPropertyValue(prop))
           || parseFloat(cs.getPropertyValue('--absh')) || 0;
    stage.style.transform = `scale(${k})`;
    sec.style.height = (h * k) + 'px';
  });
}
fitStages();
window.addEventListener('resize', fitStages);

document.querySelectorAll('.shot-show').forEach((show) => {
  const slides = [...show.querySelectorAll('.slide')];
  if (slides.length < 2) return;
  const iv = parseInt(getComputedStyle(show).getPropertyValue('--iv')) || 4000;
  let k = 0;
  setInterval(() => {
    slides[k].classList.remove('on');
    k = (k + 1) % slides.length;
    slides[k].classList.add('on');
  }, iv);
});

document.querySelectorAll('.marquee-track').forEach((t) => {
  t.style.setProperty('--marquee-count', t.children.length);
});
