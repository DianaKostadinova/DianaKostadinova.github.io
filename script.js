// Nav scroll effect + orb parallax
const nav = document.getElementById('nav');
const orb1 = document.querySelector('.orb-1');
const orb2 = document.querySelector('.orb-2');
const orb3 = document.querySelector('.orb-3');

window.addEventListener('scroll', () => {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 60);
    orb1.style.transform = `translateY(${y * 0.2}px)`;
    orb2.style.transform = `translateY(${-y * 0.14}px)`;
    orb3.style.transform = `translateY(${y * 0.1}px) translateX(${y * 0.04}px)`;
}, { passive: true });

// Mobile nav toggle
const hamburger = document.getElementById('hamburger');
hamburger.addEventListener('click', () => nav.classList.toggle('open'));
document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', () => nav.classList.remove('open'));
});

// Scroll reveal
const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            e.target.classList.add('visible');
            observer.unobserve(e.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
