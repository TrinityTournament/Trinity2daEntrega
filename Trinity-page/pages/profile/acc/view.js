// ══════════════════════════════════════════════════════════
//  TRINITY — Perfil (pages/profile/acc/view.html)
//  Ver perfil propio o ajeno, seguir/dejar de seguir,
//  favoritos y (solo perfil propio) cuentas de videojuego
//  vinculadas con estadísticas reales.
// ══════════════════════════════════════════════════════════

const $ = (sel) => document.querySelector(sel);

// ── Metadata visual para deportes / videojuegos favoritos ──
// Reusamos los mismos banners que ya existen para las cards de
// torneos en el home, así no dependemos de emojis/degradés genéricos.
// Deportes y videojuegos ahora se muestran juntos bajo "Preferencias"
// (una sola fila de 3), así que compartimos un único lookup.
const BANNER_PATH = '../../../assets/cards/tournament-banner/';
const FAVORITOS_META = {
    'Fútbol':       { img: BANNER_PATH + 'FutbolBG.jpg', emoji: '⚽' },
    'Brawl Stars':  { img: BANNER_PATH + 'BSBG.png',    emoji: '🎯' },
    'Clash Royale': { img: BANNER_PATH + 'ClashBG.jpeg', emoji: '⚔️' },
    'Fortnite':     { img: BANNER_PATH + 'FortBG.jpg',  emoji: '🏗️' },
    'Free Fire':    { img: BANNER_PATH + 'FreeBG.png',  emoji: '🔥' },
    'Minecraft':    { img: BANNER_PATH + 'MineBG.jpg',  emoji: '🧱' },
};

// ── Los 4 juegos vinculables (misma info que usa edit.js) ──
const GAMES = [
    { key: 'brawlstars',  label: 'Brawl Stars',  emoji: '🎯', path: 'BRAWLAPI',       idField: 'tag' },
    { key: 'clashroyale', label: 'Clash Royale',  emoji: '⚔️', path: 'ClashRoyaleAPI', idField: 'tag' },
    { key: 'fortnite',    label: 'Fortnite',      emoji: '🏗️', path: 'FortniteAPI',    idField: 'username' },
    { key: 'minecraft',   label: 'Minecraft',     emoji: '🧱', path: 'MinecraftAPI',   idField: 'username' },
];

const state = {
    viewerId: null,
    targetId: null,
    isOwner:  false,
    profile:  null,
    fpTipo:   'seguidos',
    fpOpen:   false,
    gameData: {}, // cache por game.key: { identifier, perfil } — evita re-pedir al abrir el panel
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
    await resolveViewer();

    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id') || params.get('u');
    state.targetId = idParam ? parseInt(idParam, 10) : state.viewerId;

    if (!state.targetId || Number.isNaN(state.targetId)) {
        showError('Iniciá sesión o abrí un perfil desde una búsqueda para verlo.');
        return;
    }

    state.isOwner = !!(state.viewerId && state.viewerId === state.targetId);

    try {
        const res  = await apiFetch(`${API_BASE_URL}/api/users/get-profile.php?id=${state.targetId}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            showError(data.error || 'No se pudo cargar el perfil.');
            return;
        }
        state.profile = data.user;
    } catch (err) {
        console.error('[view.js]', err);
        showError('No se pudo conectar con el servidor.');
        return;
    }

    renderProfile();
    wireFollowButton();
    wireFollowersPopup();
    wireStatsModal();

    if (state.isOwner) {
        loadLinkedAccounts();
    }
}

// ── Sesión del visitante (sin forzar redirect si es invitado) ──
// OJO: no usar apiFetch acá — check-session.php devuelve 401 si
// nadie inició sesión, y apiFetch redirige automáticamente al
// login en un 401. Un perfil público tiene que poder verse sin
// estar logueado, así que usamos fetch() directo como hace nav.js.
async function resolveViewer() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/check-session.php`, {
            credentials: 'include',
        });
        if (res.status === 401) { state.viewerId = null; return; }
        const data = await res.json().catch(() => ({}));
        state.viewerId = data.usuario ? parseInt(data.usuario.id, 10) : null;
    } catch {
        state.viewerId = null;
    }
}

function showError(mensaje) {
    $('#profile-loading').style.display = 'none';
    const errEl = $('#profile-error');
    errEl.textContent = mensaje;
    errEl.hidden = false;
}

// ══════════════════════════════════════════════════════════
//  RENDER DEL PERFIL
// ══════════════════════════════════════════════════════════
function renderProfile() {
    const u = state.profile;

    document.title = `${u.nombre} (@${u.usuario}) — Trinity`;

    $('#profile-name').textContent = u.nombre;
    $('#profile-username').textContent = `@${u.usuario}`;

    const pronombresEl = $('#profile-pronouns');
    if (u.pronouns) {
        pronombresEl.textContent = u.pronouns;
        pronombresEl.hidden = false;
    }

    const photoEl = $('#profile-photo');
    if (u.foto_url) {
        photoEl.innerHTML = '';
        const img = document.createElement('img');
        img.src = u.foto_url;
        img.alt = `Foto de perfil de ${u.nombre}`;
        photoEl.appendChild(img);
    } else {
        photoEl.textContent = (u.nombre || '?').trim().charAt(0).toUpperCase();
    }

    $('#owner-actions').style.display = state.isOwner ? 'flex' : 'none';
    $('#other-actions').style.display = (!state.isOwner && state.viewerId) ? 'flex' : 'none';

    const followersBtn = $('#btn-followers');
    followersBtn.hidden = false;
    $('#count-seguidos').textContent = u.seguidos ?? 0;
    $('#count-seguidores').textContent = u.seguidores ?? 0;

    const descEl = $('#profile-desc');
    descEl.textContent = u.descripcion || (state.isOwner ? 'Todavía no escribiste una descripción.' : 'Este usuario no escribió una descripción.');

    if (typeof u.torneos_jugados === 'number') {
        $('#profile-stats').hidden = false;
        $('#stat-jugados').textContent = `${u.torneos_jugados} Torneo${u.torneos_jugados === 1 ? '' : 's'}`;
        $('#stat-ganados').textContent = `${u.torneos_ganados} Torneo${u.torneos_ganados === 1 ? '' : 's'} ganado${u.torneos_ganados === 1 ? '' : 's'}`;
    }

    $('#profile-loading').style.display = 'none';
    $('#section-preferencias').hidden = false;
    $('#preferencias-actions').style.display = state.isOwner ? 'flex' : 'none';

    const preferencias = [...(u.deportes_seleccionados || []), ...(u.videojuegos_seleccionados || [])];
    renderFavorites('preferencias-wrap', 'grid-preferencias', preferencias, FAVORITOS_META);
}

function buildFavCard(name, meta) {
    const info = meta[name] || { img: null, emoji: '🎮' };
    const card = document.createElement('article');
    card.className = 'fav-card';
    const artHtml = info.img
        ? `<img class="fav-card-art" src="${info.img}" alt="">`
        : `<div class="fav-card-art" style="background:linear-gradient(135deg,#2b2b2b,#0a0a0a);"></div>`;
    card.innerHTML = `
        ${artHtml}
        <span class="fav-card-label">${info.emoji} ${escapeHtml(name)}</span>
    `;
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => openStatsPanel(name));
    return card;
}

function renderFavorites(wrapId, gridId, items, meta) {
    const wrap = document.getElementById(wrapId);
    const grid = document.getElementById(gridId);
    grid.innerHTML = '';
    wrap.classList.remove('has-more', 'expanded');

    // Ya había una fila extra de una carga anterior (poco probable en
    // esta página, pero por las dudas no queremos duplicarla).
    const prevExtra = wrap.querySelector('.favorites-extra');
    if (prevExtra) prevExtra.remove();

    if (items.length === 0 && !state.isOwner) {
        grid.innerHTML = `<p class="empty-prefs" style="grid-column:1 / -1;">${state.profile.nombre} todavía no eligió favoritos acá.</p>`;
        return;
    }

    const visibles = items.slice(0, 3);
    const extra    = items.slice(3, 6); // como mucho 6 en total (1 deporte + 5 juegos posibles)

    visibles.forEach((name, idx) => {
        const card = buildFavCard(name, meta);
        // La última carta visible avisa (stack + badge) que hay más ocultas.
        if (idx === visibles.length - 1 && extra.length > 0) {
            card.classList.add('has-more');
            const badge = document.createElement('span');
            badge.className = 'fav-card-more-badge';
            badge.textContent = `+${extra.length}`;
            card.appendChild(badge);
        }
        grid.appendChild(card);
    });

    if (state.isOwner) {
        const faltan = Math.max(0, 3 - items.length);
        for (let i = 0; i < faltan; i++) {
            const link = document.createElement('a');
            link.href = '../cfg/edit.html';
            link.className = 'fav-card-empty' + (faltan === 1 ? ' stacked' : '');
            link.innerHTML = '<span class="fav-plus">+</span>';
            grid.appendChild(link);
        }
    }

    if (extra.length > 0) {
        const extraGrid = document.createElement('div');
        extraGrid.className = 'favorites-extra';
        extra.forEach((name) => extraGrid.appendChild(buildFavCard(name, meta)));
        wrap.appendChild(extraGrid);

        wrap.classList.add('has-more');
        // En desktop el :hover ya lo revela solo (CSS puro, sin JS).
        // En celular no hay hover real, así que un tap la deja
        // expandida para siempre — no hace falta lógica para cerrarla.
        wrap.addEventListener('click', () => wrap.classList.add('expanded'));
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ══════════════════════════════════════════════════════════
//  SEGUIR / DEJAR DE SEGUIR
// ══════════════════════════════════════════════════════════
function wireFollowButton() {
    const btn = $('#btn-follow');
    if (!btn) return;

    let siguiendo = !!state.profile.ya_sigue;
    updateFollowButton(btn, siguiendo);

    btn.addEventListener('click', async () => {
        btn.disabled = true;
        const accion = siguiendo ? 'unfollow' : 'follow';
        try {
            const res  = await apiFetch(`${API_BASE_URL}/api/users/follow.php`, {
                method: 'POST',
                body: JSON.stringify({ target_id: state.targetId, accion }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                alert(data.error || 'No se pudo actualizar. Probá de nuevo.');
                btn.disabled = false;
                return;
            }
            siguiendo = !siguiendo;
            updateFollowButton(btn, siguiendo);

            const counter = $('#count-seguidores');
            const actual  = parseInt(counter.textContent, 10) || 0;
            counter.textContent = siguiendo ? actual + 1 : Math.max(0, actual - 1);
        } catch (err) {
            console.error('[view.js]', err);
            alert('No se pudo conectar con el servidor.');
        }
        btn.disabled = false;
    });
}

function updateFollowButton(btn, siguiendo) {
    btn.textContent = siguiendo ? 'Siguiendo' : 'Seguir';
    btn.classList.toggle('following', siguiendo);
}

// ══════════════════════════════════════════════════════════
//  POPUP SEGUIDOS / SEGUIDORES
// ══════════════════════════════════════════════════════════
function wireFollowersPopup() {
    const btn = $('#btn-followers');
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.fpOpen) {
            closeFollowersPopup();
        } else {
            openFollowersPopup(btn);
        }
    });
}

function openFollowersPopup(anchorBtn) {
    closeFollowersPopup();
    state.fpOpen = true;

    const popup = document.createElement('div');
    popup.className = 'fp-popup';
    popup.id = 'fp-popup';
    popup.innerHTML = `
        <div class="fp-tabs">
            <button type="button" class="fp-tab" data-tipo="seguidos">Seguidos <span class="fp-tab-count">${$('#count-seguidos').textContent}</span></button>
            <button type="button" class="fp-tab" data-tipo="seguidores">Seguidores <span class="fp-tab-count">${$('#count-seguidores').textContent}</span></button>
        </div>
        <div class="fp-list" id="fp-list"><div class="fp-spinner"></div></div>
    `;
    document.body.appendChild(popup);

    const rect = anchorBtn.getBoundingClientRect();
    popup.style.top  = `${rect.bottom + 8}px`;
    popup.style.left = `${Math.max(8, rect.left)}px`;

    popup.querySelectorAll('.fp-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            popup.querySelectorAll('.fp-tab').forEach((t) => t.classList.remove('active'));
            tab.classList.add('active');
            state.fpTipo = tab.dataset.tipo;
            loadFollowersList();
        });
    });
    popup.querySelector(`.fp-tab[data-tipo="${state.fpTipo}"]`).classList.add('active');

    setTimeout(() => document.addEventListener('click', onDocClickCloseFp), 0);
    document.addEventListener('keydown', onEscCloseFp);

    loadFollowersList();
}

function onDocClickCloseFp(e) {
    const popup = document.getElementById('fp-popup');
    if (popup && !popup.contains(e.target)) closeFollowersPopup();
}
function onEscCloseFp(e) {
    if (e.key === 'Escape') closeFollowersPopup();
}

function closeFollowersPopup() {
    const popup = document.getElementById('fp-popup');
    if (popup) popup.remove();
    state.fpOpen = false;
    document.removeEventListener('click', onDocClickCloseFp);
    document.removeEventListener('keydown', onEscCloseFp);
}

async function loadFollowersList() {
    const list = document.getElementById('fp-list');
    if (!list) return;
    list.innerHTML = '<div class="fp-spinner"></div>';

    try {
        const res  = await apiFetch(`${API_BASE_URL}/api/users/get-followers.php?user_id=${state.targetId}&tipo=${state.fpTipo}&page=1`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            list.innerHTML = `<p class="fp-empty">${data.error || 'No se pudo cargar la lista.'}</p>`;
            return;
        }
        if (!data.users || data.users.length === 0) {
            list.innerHTML = `<p class="fp-empty">${state.fpTipo === 'seguidos' ? 'No sigue a nadie todavía.' : 'Todavía no tiene seguidores.'}</p>`;
            return;
        }
        list.innerHTML = '';
        data.users.forEach((u) => {
            const a = document.createElement('a');
            a.className = 'fp-user';
            a.href = `view.html?id=${u.id}`;
            const avatarInner = u.foto_url
                ? `<img src="${u.foto_url}" alt="">`
                : (u.nombre || '?').trim().charAt(0).toUpperCase();
            a.innerHTML = `
                <div class="fp-avatar">${avatarInner}</div>
                <div class="fp-info">
                    <p class="fp-name">${escapeHtml(u.nombre)}</p>
                    <p class="fp-username">@${escapeHtml(u.usuario)}</p>
                </div>
            `;
            list.appendChild(a);
        });
    } catch (err) {
        console.error('[view.js]', err);
        list.innerHTML = '<p class="fp-empty">No se pudo conectar con el servidor.</p>';
    }
}

// ══════════════════════════════════════════════════════════
//  CUENTAS DE VIDEOJUEGO VINCULADAS (solo perfil propio)
//  Nota: get-account.php siempre opera sobre la sesión actual,
//  el backend no permite pedir la cuenta vinculada de otro
//  usuario — por eso esta sección solo se muestra en tu perfil.
// ══════════════════════════════════════════════════════════
async function loadLinkedAccounts() {
    const section = $('#gamelink-section');
    const grid    = $('#gamelink-grid');
    grid.innerHTML = '';

    const results = await Promise.all(GAMES.map(fetchGameCard));
    const linked = results.filter(Boolean);

    if (linked.length === 0) return; // nada vinculado: no mostramos la sección vacía

    section.hidden = false;
    linked.forEach((html) => {
        const div = document.createElement('div');
        div.innerHTML = html;
        grid.appendChild(div.firstElementChild);
    });
}

async function fetchGameCard(game) {
    try {
        const accRes  = await apiFetch(`${API_BASE_URL}/api/videogames/${game.path}/get-account.php`);
        const accData = await accRes.json().catch(() => ({}));
        if (!accRes.ok) return null;

        const identifier = accData[game.idField];
        if (!identifier) {
            state.gameData[game.key] = { identifier: null, perfil: null };
            return null;
        }

        let statsPerfil = null;
        try {
            const statsRes  = await apiFetch(`${API_BASE_URL}/api/videogames/${game.path}/get-stats.php?${game.idField}=${encodeURIComponent(identifier)}`);
            const statsData = await statsRes.json().catch(() => ({}));
            if (statsRes.ok) statsPerfil = statsData.perfil;
        } catch { /* mostramos igual la cuenta vinculada aunque falle el stats */ }

        state.gameData[game.key] = { identifier, perfil: statsPerfil };
        return buildGameCardHtml(game, identifier, statsPerfil);
    } catch {
        return null;
    }
}

function buildGameCardHtml(game, identifier, perfil) {
    let rows = `<p class="gamelink-id">${escapeHtml(identifier)}</p>`;

    if (perfil) {
        switch (game.key) {
            case 'brawlstars':
                rows += statRow('Trofeos', perfil.trofeos) + statRow('Nivel', perfil.nivel) + (perfil.club ? statRow('Club', perfil.club.nombre) : '');
                break;
            case 'clashroyale':
                rows += statRow('Trofeos', perfil.trofeos) + statRow('Victorias', perfil.victorias) + (perfil.clan ? statRow('Clan', perfil.clan) : '');
                break;
            case 'fortnite': {
                const o = perfil.overall;
                rows += o ? statRow('Partidas', o.matches) + statRow('Victorias', o.wins) + statRow('K/D', o.kd) : '';
                break;
            }
            case 'minecraft':
                rows += statRow('Nombre', perfil.nombre);
                break;
        }
    } else {
        rows += '<p class="gamelink-err">No se pudieron cargar las estadísticas ahora mismo.</p>';
    }

    return `
        <article class="gamelink-card">
            <header class="gamelink-card-header">
                <span class="gamelink-emoji">${game.emoji}</span>
                <h3>${game.label}</h3>
            </header>
            ${rows}
        </article>
    `;
}

function statRow(label, value) {
    if (value === null || value === undefined || value === '') return '';
    return `<p class="gamelink-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></p>`;
}

// ══════════════════════════════════════════════════════════
//  PANEL DE ESTADÍSTICAS (al clickear una carta de Preferencias)
//
//  Se abre igual que el cropper de edit.js: toggle de la clase
//  "open" en un .modal-overlay ya presente en el HTML.
// ══════════════════════════════════════════════════════════
function openStatsModal() { document.getElementById('stats-modal').classList.add('open'); }
function closeStatsModal() { document.getElementById('stats-modal').classList.remove('open'); }

function wireStatsModal() {
    document.getElementById('stats-modal-close').addEventListener('click', closeStatsModal);
    document.getElementById('stats-modal').addEventListener('click', (e) => {
        if (e.target.id === 'stats-modal') closeStatsModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeStatsModal();
    });
}

function statsPanelHeader(emoji, titulo, subtitulo) {
    const u = state.profile;
    const avatarInner = u.foto_url
        ? `<img src="${u.foto_url}" alt="">`
        : (u.nombre || '?').trim().charAt(0).toUpperCase();
    return `
        <header class="stats-panel-header">
            <div class="stats-panel-user">
                <div class="stats-panel-avatar">${avatarInner}</div>
                <div>
                    <p class="stats-panel-username">${escapeHtml(u.nombre)}</p>
                    ${subtitulo ? `<p class="stats-panel-usersub">${subtitulo}</p>` : ''}
                </div>
            </div>
            <p class="stats-panel-title">${emoji} Estadísticas</p>
        </header>
    `;
}

async function openStatsPanel(name) {
    const content = document.getElementById('stats-modal-content');
    content.innerHTML = '<div class="loading-spinner" style="margin:3rem auto;"></div>';
    openStatsModal();

    try {
        if (name === 'Fútbol') return void (content.innerHTML = renderFutbolPanel());
        if (name === 'Minecraft') return void (content.innerHTML = await renderMinecraftPanel());
        if (name === 'Free Fire') return void (content.innerHTML = renderNoDisponiblePanel(
            '🔥 Free Fire',
            'Todavía no hay integración con la API de Free Fire — por ahora este juego solo se puede marcar como favorito.'
        ));

        const gameMap = { 'Brawl Stars': 'brawlstars', 'Clash Royale': 'clashroyale', 'Fortnite': 'fortnite' };
        const key = gameMap[name];
        if (key) {
            content.innerHTML = await renderVideojuegoPanel(key, name);
            return;
        }

        content.innerHTML = renderNoDisponiblePanel(name, 'No hay un panel disponible para esto todavía.');
    } catch (err) {
        console.error('[view.js]', err);
        content.innerHTML = renderNoDisponiblePanel(name, 'No se pudo cargar la información. Probá de nuevo.');
    }
}

function renderNoDisponiblePanel(titulo, mensaje) {
    return `
        ${statsPanelHeader('', titulo, null)}
        <div class="stats-panel-empty">${escapeHtml(mensaje)}</div>
    `;
}

// ── Brawl Stars / Clash Royale / Fortnite (cuenta vinculada real) ──
async function renderVideojuegoPanel(key, name) {
    const game = GAMES.find((g) => g.key === key);
    const meta = FAVORITOS_META[name];

    if (!state.isOwner) {
        return `
            ${statsPanelHeader(meta.emoji, name, null)}
            <div class="stats-panel-body">
                <div class="stats-panel-cover"><img src="${meta.img}" alt=""></div>
                <div class="stats-panel-empty" style="text-align:left;">
                    Este usuario no comparte sus estadísticas de ${escapeHtml(name)} de forma pública.
                </div>
            </div>
        `;
    }

    let data = state.gameData[key];
    if (!data) {
        data = await fetchGameDataFresh(game);
    }

    if (!data || !data.identifier) {
        return `
            ${statsPanelHeader(meta.emoji, name, null)}
            <div class="stats-panel-body">
                <div class="stats-panel-cover"><img src="${meta.img}" alt=""></div>
                <div class="stats-panel-empty" style="text-align:left;">
                    Todavía no vinculaste tu cuenta de ${escapeHtml(name)}.
                    <br><a href="../cfg/edit.html">Vincularla ahora →</a>
                </div>
            </div>
        `;
    }

    if (!data.perfil) {
        return `
            ${statsPanelHeader(meta.emoji, name, escapeHtml(data.identifier))}
            <div class="stats-panel-body">
                <div class="stats-panel-cover"><img src="${meta.img}" alt=""></div>
                <div class="stats-panel-empty" style="text-align:left;">No se pudieron cargar las estadísticas ahora mismo. Probá de nuevo más tarde.</div>
            </div>
        `;
    }

    const cta = `
        <div class="stats-panel-cta">
            Participá en torneos semanales de tus juegos favoritos. Inscribite, competí y escalá posiciones en el ranking de Trinity.
        </div>
    `;

    let bodyHtml;
    if (key === 'brawlstars')       bodyHtml = renderBrawlStarsBody(data.perfil);
    else if (key === 'clashroyale') bodyHtml = renderClashRoyaleBody(data.perfil);
    else                            bodyHtml = renderFortniteBody(data.perfil);

    const html = `
        ${statsPanelHeader(meta.emoji, name, escapeHtml(data.identifier))}
        <div class="stats-panel-body">
            <div class="stats-panel-cover"><img src="${meta.img}" alt=""></div>
            <div>${bodyHtml}${cta}</div>
        </div>
    `;

    // Fortnite necesita wiring de tabs después de insertar al DOM — lo
    // hacemos en un microtask para no bloquear el render inicial.
    if (key === 'fortnite') setTimeout(wireFortniteTabs, 0);

    return html;
}

async function fetchGameDataFresh(game) {
    try {
        const accRes  = await apiFetch(`${API_BASE_URL}/api/videogames/${game.path}/get-account.php`);
        const accData = await accRes.json().catch(() => ({}));
        if (!accRes.ok) return null;

        const identifier = accData[game.idField];
        if (!identifier) {
            const empty = { identifier: null, perfil: null };
            state.gameData[game.key] = empty;
            return empty;
        }

        let perfil = null;
        try {
            const statsRes  = await apiFetch(`${API_BASE_URL}/api/videogames/${game.path}/get-stats.php?${game.idField}=${encodeURIComponent(identifier)}`);
            const statsData = await statsRes.json().catch(() => ({}));
            if (statsRes.ok) perfil = statsData.perfil;
        } catch { /* seguimos igual, mostramos que está vinculada aunque falle el stats */ }

        const result = { identifier, perfil };
        state.gameData[game.key] = result;
        return result;
    } catch {
        return null;
    }
}

function statBox(icon, label, value) {
    if (value === null || value === undefined || value === '') return '';
    return `
        <div class="stats-panel-box">
            <div class="stats-panel-box-icon">${icon}</div>
            <div class="stats-panel-box-label">${escapeHtml(label)}</div>
            <div class="stats-panel-box-value">${escapeHtml(String(value))}</div>
        </div>
    `;
}

function renderBrawlStarsBody(p) {
    return `
        <div class="stats-panel-grid">
            ${statBox('🏆', 'Trofeos', p.trofeos)}
            ${statBox('⭐', 'Máx. trofeos', p.maxTrofeos)}
            ${statBox('🎖️', 'Nivel', p.nivel)}
            ${statBox('⚔️', 'Victorias 3v3', p.victorias3v3)}
            ${statBox('🥇', 'Victorias solo', p.victoriasSolo)}
            ${statBox('🥈', 'Victorias dúo', p.victoriasDuo)}
            ${statBox('🎯', 'Rango', p.rangoNombre)}
            ${statBox('📈', 'Elo', p.elo)}
            ${p.club ? statBox('👥', 'Club', p.club.nombre) : ''}
        </div>
    `;
}

function renderClashRoyaleBody(p) {
    const mazoHtml = (p.mazo || []).map((carta) => `
        <div class="stats-panel-card">
            <img src="${carta.imagen}" alt="${escapeHtml(carta.nombre)}">
            <span class="stats-panel-card-level">Nv. ${escapeHtml(String(carta.nivel))}</span>
        </div>
    `).join('');

    return `
        <div class="stats-panel-grid">
            ${statBox('🏆', 'Trofeos', p.trofeos)}
            ${statBox('🎁', 'Donaciones', p.donaciones)}
            ${statBox('👑', 'Victorias', p.victorias)}
            ${statBox('💀', 'Derrotas', p.derrotas)}
        </div>
        ${mazoHtml ? `
        <div class="stats-panel-deck-wrap">
            <div>
                <p class="stats-panel-box-label" style="margin-bottom:0.5rem;">Mazo actual</p>
                <div class="stats-panel-deck">${mazoHtml}</div>
            </div>
            ${p.arena ? `
            <div class="stats-panel-arena">
                ${p.arena.imagen ? `<img src="${p.arena.imagen}" alt="">` : ''}
                <span class="stats-panel-arena-name">${escapeHtml(p.arena.nombre)}</span>
            </div>` : ''}
        </div>` : ''}
    `;
}

function renderFortniteBody(p) {
    const modos = [
        { key: 'solo',   label: 'Solitario' },
        { key: 'duo',    label: 'Dúo' },
        { key: 'squad',  label: 'Escuadrón' },
    ].filter((m) => p[m.key]);

    if (modos.length === 0) {
        return '<div class="stats-panel-empty" style="text-align:left;">No hay estadísticas por modo disponibles para esta cuenta.</div>';
    }

    const tabsHtml = modos.map((m, i) => `
        <button type="button" class="stats-panel-tab${i === 0 ? ' active' : ''}" data-modo="${m.key}">${m.label}</button>
    `).join('');

    const panelsHtml = modos.map((m, i) => {
        const s = p[m.key];
        const derrotas = (typeof s.matches === 'number' && typeof s.wins === 'number') ? s.matches - s.wins : null;
        const horas = typeof s.minutesPlayed === 'number' ? Math.round(s.minutesPlayed / 60) : null;
        return `
            <div class="stats-panel-fortnite-modo" data-modo="${m.key}" style="${i === 0 ? '' : 'display:none;'}">
                <div class="stats-panel-grid">
                    ${statBox('🎮', 'Partidas jugadas', s.matches)}
                    ${statBox('🏆', 'Victorias', s.wins)}
                    ${statBox('💀', 'Derrotas', derrotas)}
                    ${statBox('⚔️', 'K/D', s.kd)}
                    ${statBox('📊', '% Victoria', s.winRate != null ? `${s.winRate}%` : null)}
                    ${statBox('⏱️', 'Horas jugadas', horas)}
                </div>
            </div>
        `;
    }).join('');

    return `<div class="stats-panel-tabs">${tabsHtml}</div>${panelsHtml}`;
}

function wireFortniteTabs() {
    const tabs = document.querySelectorAll('.stats-panel-tab[data-modo]');
    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            tabs.forEach((t) => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.stats-panel-fortnite-modo').forEach((panel) => {
                panel.style.display = panel.dataset.modo === tab.dataset.modo ? '' : 'none';
            });
        });
    });
}

// ══════════════════════════════════════════════════════════
//  FÚTBOL — sin API externa, carga manual (rol/número/equipo).
//  A futuro esta card se actualizaría sola con partidos de
//  torneos de Trinity, pero ese sistema todavía no existe.
// ══════════════════════════════════════════════════════════
const ROLES_FUTBOL = ['Arquero', 'Defensor', 'Mediocampista', 'Delantero'];

function renderFutbolPanel() {
    const u = state.profile;
    const meta = FAVORITOS_META['Fútbol'];

    if (!state.isOwner) {
        const rows = [];
        if (u.futbol_rol) rows.push(['Rol', u.futbol_rol]);
        if (u.futbol_numero) rows.push(['Número', `#${u.futbol_numero}`]);
        if (u.futbol_equipo) rows.push(['Equipo', u.futbol_equipo]);

        return `
            ${statsPanelHeader(meta.emoji, 'Fútbol', null)}
            <div class="stats-panel-body">
                <div class="stats-panel-cover"><img src="${meta.img}" alt=""></div>
                <div>
                    ${rows.length > 0
                        ? `<div class="stats-panel-readonly">${rows.map(([label, value]) => `
                            <div class="stats-panel-readonly-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>
                          `).join('')}</div>`
                        : `<div class="stats-panel-empty" style="text-align:left;">${escapeHtml(u.nombre)} todavía no cargó esta información.</div>`
                    }
                </div>
            </div>
        `;
    }

    const rolOptions = ROLES_FUTBOL.map((r) =>
        `<option value="${r}" ${u.futbol_rol === r ? 'selected' : ''}>${r}</option>`
    ).join('');

    setTimeout(wireFutbolForm, 0);

    return `
        ${statsPanelHeader(meta.emoji, 'Fútbol', null)}
        <div class="stats-panel-body">
            <div class="stats-panel-cover"><img src="${meta.img}" alt=""></div>
            <div>
                <form class="stats-panel-form" id="futbol-form">
                    <div class="two-col">
                        <div class="field">
                            <label class="field-label" for="futbol-rol">Rol</label>
                            <select id="futbol-rol">
                                <option value="">— Elegir —</option>
                                ${rolOptions}
                            </select>
                        </div>
                        <div class="field">
                            <label class="field-label" for="futbol-numero">Número</label>
                            <input type="number" id="futbol-numero" class="field-input" min="1" max="99" value="${u.futbol_numero ?? ''}">
                        </div>
                    </div>
                    <div class="field">
                        <label class="field-label" for="futbol-equipo">Equipo (si perteneciste a alguno)</label>
                        <input type="text" id="futbol-equipo" class="field-input" value="${escapeHtml(u.futbol_equipo || '')}" placeholder="Ej: Los Pibardos FC">
                    </div>
                    <button type="submit" class="btn-primary" id="futbol-save-btn">Guardar</button>
                    <p class="msg" id="futbol-msg"></p>
                </form>
                <div class="stats-panel-note">
                    Esta card se va a poder actualizar sola más adelante con tus partidos recientes de torneos en Trinity.
                </div>
            </div>
        </div>
    `;
}

function wireFutbolForm() {
    const form = document.getElementById('futbol-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('futbol-save-btn');
        const msgEl = document.getElementById('futbol-msg');
        btn.disabled = true;
        setInlinePanelMsg(msgEl, 'Guardando...', null);

        const numeroVal = document.getElementById('futbol-numero').value;
        const body = {
            futbol_rol:    document.getElementById('futbol-rol').value,
            futbol_numero: numeroVal === '' ? null : parseInt(numeroVal, 10),
            futbol_equipo: document.getElementById('futbol-equipo').value.trim(),
        };

        try {
            const res  = await apiFetch(`${API_BASE_URL}/api/users/update-profile.php`, {
                method: 'POST',
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setInlinePanelMsg(msgEl, data.error || 'No se pudo guardar.', 'err');
            } else {
                state.profile.futbol_rol = body.futbol_rol || null;
                state.profile.futbol_numero = body.futbol_numero;
                state.profile.futbol_equipo = body.futbol_equipo || null;
                setInlinePanelMsg(msgEl, 'Guardado.', 'ok');
            }
        } catch (err) {
            console.error('[view.js]', err);
            setInlinePanelMsg(msgEl, 'No se pudo conectar con el servidor.', 'err');
        }
        btn.disabled = false;
    });
}

function setInlinePanelMsg(el, texto, tipo) {
    el.textContent = texto || '';
    el.classList.remove('ok', 'err');
    if (tipo) el.classList.add(tipo);
}

// ══════════════════════════════════════════════════════════
//  MINECRAFT — la API de Mojang solo confirma usuario/UUID
//  (getAccount/stats no traen "estadísticas" reales). El resto
//  del panel (estilo, estrategia, especialidad, modos) es
//  carga manual del usuario. El skin se renderiza con crafatar.com
//  (imagen estática, sin dependencias) con un botón opcional
//  para pasar a un visor 3D interactivo real (skinview3d, vía CDN).
// ══════════════════════════════════════════════════════════
const ESTILOS_MC        = ['Defensa', 'Estratega', 'Agresivo', 'Sigilo'];
const ESPECIALIDADES_MC = ['Redstone', 'Minería', 'Construcción', 'PvP', 'Exploración', 'Agricultura'];
const MODOS_MC          = ['Skyblock', 'Bedwars', 'Lucky Blocks', 'Survival', 'Creativo', 'SMP', 'Parkour'];

async function renderMinecraftPanel() {
    const u = state.profile;
    const meta = FAVORITOS_META['Minecraft'];

    // El UUID (necesario para el skin) solo se puede obtener si sos
    // el dueño del perfil — get-account.php siempre opera sobre la
    // sesión actual, no hay forma de pedir la cuenta de otro usuario.
    let mcAccount = null;
    if (state.isOwner) {
        const game = GAMES.find((g) => g.key === 'minecraft');
        let data = state.gameData.minecraft;
        if (!data) data = await fetchGameDataFresh(game);
        if (data && data.perfil) mcAccount = data.perfil; // { nombre, uuid }
    }

    if (state.isOwner) setTimeout(() => wireMinecraftPanel(mcAccount), 0);

    return `
        ${statsPanelHeader(meta.emoji, 'Minecraft', mcAccount ? escapeHtml(mcAccount.nombre) : null)}
        <div class="stats-panel-body">
            <div>${renderMinecraftSkinSection(mcAccount)}</div>
            <div>${state.isOwner ? renderMinecraftPrefsForm(u) : renderMinecraftPrefsReadonly(u)}</div>
        </div>
    `;
}

function renderMinecraftSkinSection(mcAccount) {
    if (!mcAccount || !mcAccount.uuid) {
        return `
            <div class="stats-panel-cover" style="display:flex;align-items:center;justify-content:center;">
                <span style="font-size:12px;color:var(--text-muted);text-align:center;padding:1rem;">
                    ${state.isOwner
                        ? 'Vinculá tu cuenta de Minecraft en Configuración para ver tu skin.'
                        : 'Este usuario no vinculó su cuenta de Minecraft públicamente.'}
                </span>
            </div>
        `;
    }
    return `
        <div class="stats-panel-cover" id="mc-skin-cover">
            <img src="https://crafatar.com/renders/body/${mcAccount.uuid}?overlay" alt="Skin de ${escapeHtml(mcAccount.nombre)}">
        </div>
        <div class="stats-panel-skin-actions">
            <button type="button" id="mc-btn-body" class="active">Cuerpo</button>
            <button type="button" id="mc-btn-head">Cabeza</button>
            <button type="button" id="mc-btn-3d">Habilitar 3D</button>
        </div>
    `;
}

function renderMinecraftPrefsForm(u) {
    return `
        <form class="stats-panel-form" id="mc-form">
            <p class="stats-panel-box-label" style="margin-bottom:0.75rem;">Preferencias</p>
            <div class="two-col">
                <div class="field">
                    <label class="field-label" for="mc-estilo">Estilo de juego</label>
                    <select id="mc-estilo">
                        <option value="">— Elegir —</option>
                        ${ESTILOS_MC.map((e) => `<option value="${e}" ${u.mc_estilo === e ? 'selected' : ''}>${e}</option>`).join('')}
                    </select>
                </div>
                <div class="field">
                    <label class="field-label" for="mc-especialidad">Especialidad</label>
                    <select id="mc-especialidad">
                        <option value="">— Elegir —</option>
                        ${ESPECIALIDADES_MC.map((e) => `<option value="${e}" ${u.mc_especialidad === e ? 'selected' : ''}>${e}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="field">
                <label class="field-label" for="mc-estrategia">Estrategia</label>
                <input type="text" id="mc-estrategia" class="field-input" maxlength="255" value="${escapeHtml(u.mc_estrategia || '')}" placeholder="Contanos tu filosofía de juego...">
            </div>
            <div class="field">
                <label class="field-label">Modos de juego favoritos (hasta 3)</label>
                <div class="pill-select pill-select-mini" id="mc-modos-pills"></div>
            </div>
            <button type="submit" class="btn-primary" id="mc-save-btn">Guardar</button>
            <p class="msg" id="mc-msg"></p>
        </form>
    `;
}

function renderMinecraftPrefsReadonly(u) {
    const rows = [];
    if (u.mc_estilo) rows.push(['Estilo de juego', u.mc_estilo]);
    if (u.mc_especialidad) rows.push(['Especialidad', u.mc_especialidad]);
    if (u.mc_estrategia) rows.push(['Estrategia', u.mc_estrategia]);
    if (u.mc_modos && u.mc_modos.length > 0) rows.push(['Modos favoritos', u.mc_modos.join(', ')]);

    if (rows.length === 0) {
        return `<div class="stats-panel-empty" style="text-align:left;">${escapeHtml(u.nombre)} todavía no cargó sus preferencias de Minecraft.</div>`;
    }
    return `
        <div class="stats-panel-readonly">
            ${rows.map(([label, value]) => `
                <div class="stats-panel-readonly-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>
            `).join('')}
        </div>
    `;
}

function wireMinecraftPanel(mcAccount) {
    wireMinecraftSkinToggle(mcAccount);
    wireMinecraftForm();
}

function wireMinecraftSkinToggle(mcAccount) {
    const btnBody = document.getElementById('mc-btn-body');
    if (!btnBody || !mcAccount) return; // no hay cuenta vinculada, nada que togglear

    const btnHead = document.getElementById('mc-btn-head');
    const btn3d   = document.getElementById('mc-btn-3d');
    const uuid    = mcAccount.uuid;

    function setActive(btn) {
        [btnBody, btnHead, btn3d].forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
    }
    function renderFlat(view) {
        document.getElementById('mc-skin-cover').innerHTML =
            `<img src="https://crafatar.com/renders/${view}/${uuid}?overlay" alt="Skin de ${escapeHtml(mcAccount.nombre)}">`;
    }

    btnBody.addEventListener('click', () => { setActive(btnBody); renderFlat('body'); });
    btnHead.addEventListener('click', () => { setActive(btnHead); renderFlat('head'); });
    btn3d.addEventListener('click', async () => {
        setActive(btn3d);
        await load3dSkinViewer(uuid);
    });
}

let skinview3dLoading = null;
function loadSkinview3dScript() {
    if (window.skinview3d) return Promise.resolve();
    if (!skinview3dLoading) {
        skinview3dLoading = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/skinview3d@3.4.2/bundles/skinview3d.bundle.js';
            script.onload = resolve;
            script.onerror = () => { skinview3dLoading = null; reject(new Error('No se pudo cargar skinview3d')); };
            document.head.appendChild(script);
        });
    }
    return skinview3dLoading;
}

async function load3dSkinViewer(uuid) {
    const cover = document.getElementById('mc-skin-cover');
    if (!cover) return;
    cover.innerHTML = '<div class="loading-spinner" style="margin:auto;"></div>';

    try {
        await loadSkinview3dScript();
        cover.innerHTML = '<canvas id="mc-skin-canvas"></canvas>';
        const canvas = document.getElementById('mc-skin-canvas');
        const viewer = new window.skinview3d.SkinViewer({
            canvas,
            width:  200,
            height: 266,
            skin:   `https://crafatar.com/skins/${uuid}`,
        });
        viewer.autoRotate = true;
    } catch (err) {
        console.error('[view.js] visor 3D:', err);
        // Si falla (sin internet al CDN, etc.) volvemos al render estático de siempre.
        cover.innerHTML = `<img src="https://crafatar.com/renders/body/${uuid}?overlay" alt="">`;
    }
}

function wireMinecraftForm() {
    const form = document.getElementById('mc-form');
    if (!form) return;

    const pillsContainer = document.getElementById('mc-modos-pills');
    const seleccionados = new Set(state.profile.mc_modos || []);
    MODOS_MC.forEach((modo) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pill-option' + (seleccionados.has(modo) ? ' selected' : '');
        btn.textContent = modo;
        btn.dataset.value = modo;
        btn.addEventListener('click', () => {
            if (!btn.classList.contains('selected') && pillsContainer.querySelectorAll('.selected').length >= 3) {
                return; // ya hay 3 elegidos, no se puede sumar otro
            }
            btn.classList.toggle('selected');
        });
        pillsContainer.appendChild(btn);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('mc-save-btn');
        const msgEl = document.getElementById('mc-msg');
        btn.disabled = true;
        setInlinePanelMsg(msgEl, 'Guardando...', null);

        const modos = Array.from(pillsContainer.querySelectorAll('.selected')).map((b) => b.dataset.value);
        const body = {
            mc_estilo:       document.getElementById('mc-estilo').value,
            mc_especialidad: document.getElementById('mc-especialidad').value,
            mc_estrategia:   document.getElementById('mc-estrategia').value.trim(),
            mc_modos:        modos,
        };

        try {
            const res  = await apiFetch(`${API_BASE_URL}/api/users/update-profile.php`, {
                method: 'POST',
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setInlinePanelMsg(msgEl, data.error || 'No se pudo guardar.', 'err');
            } else {
                Object.assign(state.profile, body);
                setInlinePanelMsg(msgEl, 'Guardado.', 'ok');
            }
        } catch (err) {
            console.error('[view.js]', err);
            setInlinePanelMsg(msgEl, 'No se pudo conectar con el servidor.', 'err');
        }
        btn.disabled = false;
    });
}
