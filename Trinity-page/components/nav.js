// ══════════════════════════════════════════
//  TRINITY — Nav compartido
//  Inyecta el nav en todas las páginas.
// ══════════════════════════════════════════

// Detecta automáticamente la ruta base a partir de dónde se cargó este script,
// así no depende de cómo se llame la carpeta del proyecto (Trinity-page,
// Trinity1erEntrega, etc.). Si por algún motivo no se puede detectar, usa
// cadena vacía (equivalente a rutas relativas a la raíz del sitio).
const navBaseURI = (() => {
    const script = document.currentScript
        || document.querySelector('script[src*="components/nav.js"]');
    if (!script) return '';
    return script.src.replace(/\/components\/nav\.js.*$/, '');
})();

// ── INYECTAR NAV ──────────────────────────

(function injectNav() {
    const nav = document.createElement('nav');
    nav.className = 'site-nav';
    nav.innerHTML = `
        <a href="${navBaseURI}/index.html" class="nav-logo">TRINITY</a>

        <button class="hamburger" id="hamburger">
            <span></span><span></span><span></span>
        </button>

        <ul class="nav-links">
            <li><a href="${navBaseURI}/pages/nav/tournament/tournament.html">Torneos</a></li>
            <li><a href="${navBaseURI}/pages/nav/ranking/ranking.html">Rankings</a></li>
            <li><a href="${navBaseURI}/pages/nav/news/news.html">Noticias</a></li>
            <li><a href="${navBaseURI}/pages/nav/contact/contact.html">Contacto</a></li>
        </ul>

        <div class="nav-actions">

            <!-- BUSCADOR DE USUARIOS -->
            <div class="nav-search" id="nav-search">
                <div class="nav-search-input-wrap">
                    <svg class="nav-search-icon" viewBox="0 0 20 20" fill="none">
                        <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.8"/>
                        <path d="M13.5 13.5L17 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                    <input
                        type="text"
                        id="nav-search-input"
                        class="nav-search-input"
                        placeholder="Buscar usuarios..."
                        autocomplete="off"
                    >
                </div>
                <div class="nav-search-results" id="nav-search-results"></div>
            </div>

            <!-- GUEST -->
            <div id="nav-guest">
                <a href="${navBaseURI}/pages/login/login.html" class="btn-login">Iniciar sesión</a>
                <a href="${navBaseURI}/pages/login/login.html?m=register" class="btn-register">Registrarse</a>
            </div>

            <!-- USER LOGUEADO -->
            <div class="user-menu" id="nav-user">
                <div class="user-trigger" id="user-trigger">
                    <div class="user-avatar" id="nav-avatar">?</div>
                    <span class="user-name" id="nav-username">Usuario</span>
                    <span class="user-chevron">▼</span>
                </div>
                <div class="user-dropdown" id="user-dropdown">
                    <div class="dropdown-header">
                        <div class="dropdown-avatar" id="dropdown-avatar">?</div>
                        <span class="dropdown-username" id="dropdown-username">Usuario</span>
                    </div>
                    <a href="${navBaseURI}/pages/profile/acc/view.html" class="dropdown-item">&nbsp; Perfil</a>
                    <a href="${navBaseURI}/pages/admin/index.html" class="dropdown-item dropdown-item--admin" id="nav-admin-link" style="display:none;">&nbsp; Admin</a>
                    <a href="${navBaseURI}/pages/profile/cfg/edit.html" class="dropdown-item">&nbsp; Configuración</a>
                    <div class="dropdown-divider"></div>
                    <button class="dropdown-item danger" id="nav-logout-btn">↩&nbsp; Cerrar sesión</button>
                </div>
            </div>
        </div>

        <!-- MOBILE MENU -->
        <div class="mobile-menu" id="mobile-menu">
            <!-- Buscador de usuarios en móvil -->
            <div class="mobile-search">
                <div class="nav-search-input-wrap" style="width:100%;max-width:100%;">
                    <svg class="nav-search-icon" viewBox="0 0 20 20" fill="none">
                        <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.8"/>
                        <path d="M13.5 13.5L17 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                    <input
                        type="text"
                        id="mobile-search-input"
                        class="nav-search-input"
                        placeholder="Buscar usuarios..."
                        autocomplete="off"
                    >
                </div>
                <div class="nav-search-results" id="mobile-search-results" style="position:static;width:100%;margin-top:4px;"></div>
            </div>
            <a href="${navBaseURI}/pages/nav/tournament/tournament.html">Torneos</a>
            <a href="${navBaseURI}/pages/nav/ranking/ranking.html">Rankings</a>
            <a href="${navBaseURI}/pages/nav/news/news.html">Noticias</a>
            <a href="${navBaseURI}/pages/nav/contact/contact.html">Contacto</a>
            <!-- Solo visible cuando NO hay sesión -->
            <div class="mobile-auth" id="mobile-auth">
                <a href="${navBaseURI}/pages/login/login.html" class="btn-login">Iniciar sesión</a>
                <a href="${navBaseURI}/pages/login/login.html?m=register" class="btn-register">Registrarse</a>
            </div>
        </div>
    `;

    // Insertar al inicio del body, envuelto en <header>
    const header = document.createElement('header');
    header.appendChild(nav);
    document.body.insertBefore(header, document.body.firstChild);

    // Eventos
    document.getElementById('hamburger').addEventListener('click', toggleHamburger); // 🍔 can i have
    document.getElementById('user-trigger').addEventListener('click', toggleDropdown); // a cheeseburger plz
    document.getElementById('nav-logout-btn').addEventListener('click', logout);

    // Cerrar dropdown al clickear fuera
    document.addEventListener('click', e => {
        const menu = document.getElementById('nav-user');
        if (menu && !menu.contains(e.target)) {
            document.getElementById('user-trigger')?.classList.remove('open');
            document.getElementById('user-dropdown')?.classList.remove('open');
        }
    });

    // Cerrar hamburger al clickear fuera
    document.addEventListener('click', e => {
        const ham  = document.getElementById('hamburger');
        const menu = document.getElementById('mobile-menu');
        if (ham && menu && !ham.contains(e.target) && !menu.contains(e.target)) {
            menu.classList.remove('open');
        }
    });

    // Búsqueda de usuarios (desktop + mobile)
    wireSearch('nav-search-input', 'nav-search-results');
    wireSearch('mobile-search-input', 'mobile-search-results');

    // Pintar de inmediato con el último estado conocido (evita parpadeo
    // "Iniciar sesión" -> "Usuario" mientras responde el servidor)...
    const saved = sessionStorage.getItem('trinity_user');
    if (saved) {
        try { setNavLoggedIn(JSON.parse(saved)); } catch {}
    }

    // ...y siempre confirmamos contra el servidor, que es la fuente de
    // verdad real (la cookie de sesión pudo expirar, o el usuario pudo
    // cerrar sesión desde otra pestaña).
    refreshSessionFromServer();
})();

// ── SESIÓN (fuente de verdad: el servidor) ─

async function refreshSessionFromServer() {
    try {
        const res = await fetch(`${navBaseURI}/api/auth/check-session.php`, {
            credentials: 'include',
        });

        if (res.status === 401) {
            sessionStorage.removeItem('trinity_user');
            setNavLoggedOut();
            return;
        }

        const data = await res.json();
        if (data.usuario) {
            sessionStorage.setItem('trinity_user', JSON.stringify(data.usuario));
            setNavLoggedIn(data.usuario);
        }
    } catch {
        // Sin conexión al backend: dejamos el estado optimista que ya
        // se pintó desde sessionStorage, sin romper la navegación.
    }
}

function setNavLoggedOut() {
    const guestEl    = document.getElementById('nav-guest');
    const userEl     = document.getElementById('nav-user');
    const mobileAuth = document.getElementById('mobile-auth');
    if (guestEl)    guestEl.style.display  = '';
    if (userEl)     userEl.classList.remove('active');
    if (mobileAuth) mobileAuth.style.display = '';
}

// ── BUSCADOR DE USUARIOS ───────────────────

function wireSearch(inputId, resultsId) {
    const input   = document.getElementById(inputId);
    const results = document.getElementById(resultsId);
    if (!input || !results) return;

    let timer   = null;
    let lastReq = 0;

    input.addEventListener('input', () => {
        const q = input.value.trim();
        clearTimeout(timer);

        if (q.length < 2) {
            results.innerHTML = '';
            results.classList.remove('open');
            return;
        }

        timer = setTimeout(() => runSearch(q), 250); // debounce
    });

    document.addEventListener('click', e => {
        if (!results.contains(e.target) && e.target !== input) {
            results.classList.remove('open');
        }
    });

    async function runSearch(q) {
        const reqId = ++lastReq;
        try {
            const res  = await fetch(`${navBaseURI}/api/users/search-users.php?q=${encodeURIComponent(q)}`, {
                credentials: 'include',
            });
            const data = await res.json();
            if (reqId !== lastReq) return; // llegó una búsqueda más nueva antes

            const usuarios = data.users || [];
            results.innerHTML = usuarios.length
                ? usuarios.map(u => `
                    <a class="search-result-item" href="${navBaseURI}/pages/profile/acc/view.html?id=${u.id}">
                        <span class="search-result-avatar">${
                            u.foto_url
                                ? `<img src="${u.foto_url}" alt="">`
                                : (u.usuario || '?')[0].toUpperCase()
                        }</span>
                        <span>
                            <div class="search-result-name">${escapeHtml(u.nombre)}</div>
                            <div class="search-result-user">@${escapeHtml(u.usuario)}</div>
                        </span>
                    </a>`).join('')
                : `<p class="search-empty">Sin resultados para "<strong>${escapeHtml(q)}</strong>"</p>`;
            results.classList.add('open');
        } catch {
            // Búsqueda falló silenciosamente: no bloqueamos la navegación.
        }
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

// ── AUTH ──────────────────────────────────

function setNavLoggedIn(u) {
    const guestEl    = document.getElementById('nav-guest');
    const userEl     = document.getElementById('nav-user');
    const mobileAuth = document.getElementById('mobile-auth');
    if (guestEl)    guestEl.style.display  = 'none';
    if (userEl)     userEl.classList.add('active');
    if (mobileAuth) mobileAuth.style.display = 'none';

    const letra = (u.usuario?.[0] || u.nombre?.[0] || '?').toUpperCase();

    const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    setTxt('nav-username',      u.usuario || u.nombre);
    setTxt('dropdown-username', u.usuario || u.nombre);

    const navAvatar      = document.getElementById('nav-avatar');
    const dropdownAvatar = document.getElementById('dropdown-avatar');
    if (u.foto_url) {
        if (navAvatar)      navAvatar.innerHTML      = `<img src="${u.foto_url}" alt="Foto">`;
        if (dropdownAvatar) dropdownAvatar.innerHTML = `<img src="${u.foto_url}" alt="Foto">`;
    } else {
        if (navAvatar)      navAvatar.textContent      = letra;
        if (dropdownAvatar) dropdownAvatar.textContent = letra;
    }

    // Mostrar link de Admin solo si el usuario tiene rol admin
    const adminLink = document.getElementById('nav-admin-link');
    if (adminLink) adminLink.style.display = u.rol === 'admin' ? '' : 'none';
}

async function logout() {
    try {
        // Necesitamos el csrf_token vigente: se pide justo antes de
        // cerrar sesión para no depender de que assets/js/api.js esté
        // cargado en esta página.
        const tokenRes = await fetch(`${navBaseURI}/api/auth/csrf-token.php`, { credentials: 'include' });
        const { csrf_token } = await tokenRes.json();

        await fetch(`${navBaseURI}/api/auth/logout.php`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'X-CSRF-Token': csrf_token || '' },
        });
    } catch {
        // Si el logout del servidor falla igual limpiamos el estado local.
    }

    sessionStorage.removeItem('trinity_user');
    window.location.href = `${navBaseURI}/index.html`;
}

function toggleDropdown() {
    document.getElementById('user-trigger').classList.toggle('open');
    document.getElementById('user-dropdown').classList.toggle('open');
}

function toggleHamburger() {
    document.getElementById('mobile-menu').classList.toggle('open');
}