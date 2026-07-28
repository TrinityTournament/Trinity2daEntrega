// Esto lo habria puesto en el html directo pero quizá Joaquin me mata.

function toggleFaq(btn) {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen);
}