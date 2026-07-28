// ══════════════════════════════════════════
//  TRINITY — Footer compartido
//  Inyecta el footer en todas las páginas.
// ══════════════════════════════════════════

// Igual que en nav.js: detecta la ruta base a partir de dónde se cargó
// este script, para no depender del nombre de la carpeta del proyecto.
const footerBaseURI = (() => {
    const script = document.currentScript || document.querySelector('script[src*="components/footer.js"]');
    if (!script) return '';
    return script.src.replace(/\/components\/footer\.js.*$/, '');
})();

(function injectFooter() {
    const footer = document.createElement('footer');
    footer.innerHTML = `
        <div class="footer-brand">
            <a href="${footerBaseURI}/index.html" class="nav-logo">TRINITY</a>
            <p class="footer-desc">La plataforma que impulsa la competencia. Organizá, participá y seguí tus torneos favoritos.</p>
            <p class="footer-copy">©${new Date().getFullYear()} Trinity. Todos los derechos reservados.</p>
        </div>

        <div class="footer-col">
            <h4>Plataforma</h4>
            <a href="${footerBaseURI}/pages/nav/tournament/tournament.html">Torneos</a>
            <a href="${footerBaseURI}/pages/nav/ranking/ranking.html">Rankings</a>
            <a href="${footerBaseURI}/pages/nav/news/news.html">Noticias</a>
            <a href="${footerBaseURI}/pages/nav/contact/contact.html">Calendarios</a>
        </div>

        <div class="footer-col">
            <h4>Comunidad</h4>
            <a href="${footerBaseURI}/pages/about-us/aboutUs.html">Nosotros</a>
            <a href="${footerBaseURI}/pages/nav/contact/contact.html">Contacto</a>
            <a href="#">Preguntas frecuentes</a>
        </div>

        <div class="footer-col">
            <h4>Legal</h4>
            <a href="#">Términos y condiciones</a>
            <a href="#">Privacidad</a>
        </div>
    `;
    document.body.appendChild(footer); // Insertar al final del body, antes de los scripts
})();