// ══════════════════════════════════════════
// TRINITY — Carrusel de videojuegos (Home)
// En PC el scroll es solo con las flechas (no hay drag con mouse).
// En teléfono el deslizar (swipe) sigue funcionando porque es el
// scroll nativo del navegador (overflow-x en .cards-scroll)
// ══════════════════════════════════════════

// Scroll de las flechas del carrusel de juegos.
// Se deja como función global (fuera de una IIFE) a propósito, porque
// los botones del carrusel la llaman directamente desde el HTML con
// onclick="scrollCards('tournaments', 1)" / onclick="scrollCards('tournaments', -1)".
function scrollCards(sectionId, direction) {
  const track = document.getElementById(`scroll-${sectionId}`);
  if (!track) return;
  const card = track.querySelector('.card');
  const step = card ? card.getBoundingClientRect().width + 20 : 300;
  track.scrollBy({ left: step * direction, behavior: 'smooth' });
}