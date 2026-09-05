// ══════════════════════════════════════════════════════════
//  TRINITY — Perfil (pages/profile/acc/view.html)
//  Ver perfil propio o ajeno, seguir/dejar de seguir,
//  favoritos y (solo perfil propio) cuentas de videojuego
//  vinculadas con estadísticas reales.
// ══════════════════════════════════════════════════════════

const $ = (sel) => document.querySelector(sel);

// ── Metadata visual para deportes / videojuegos favoritos ──
// (no hay assets propios para estos, así que usamos degradé + emoji,
//  siguiendo el mismo patrón que ya tenía la maqueta estática)
const DEPORTES_META = {
    'Fútbol':     { emoji: '⚽', gradient: 'linear-gradient(135deg,#1d6e3a,#0a2e16)' },
    'Tenis':      { emoji: '🎾', gradient: 'linear-gradient(135deg,#8a9a1d,#2e3608)' },
    'Basketball': { emoji: '🏀', gradient: 'linear-gradient(135deg,#b5560d,#3a1b04)' },
    'Volleyball': { emoji: '🏐', gradient: 'linear-gradient(135deg,#1d5f8a,#082433)' },
    'Natación':   { emoji: '🏊', gradient: 'linear-gradient(135deg,#0d8a9a,#04333a)' },
    'Atletismo':  { emoji: '🏃', gradient: 'linear-gradient(135deg,#7a5a1d,#2e2108)' },
};
const JUEGOS_META = {
    'Fortnite':          { emoji: '🏗️', gradient: 'linear-gradient(135deg,#0a3d62,#04101c)' },
    'Clash Royale':      { emoji: '⚔️', gradient: 'linear-gradient(135deg,#7a0010,#1a0000)' },
    'Valorant':          { emoji: '🔫', gradient: 'linear-gradient(135deg,#8a1d2e,#1a0004)' },
    'League of Legends': { emoji: '🛡️', gradient: 'linear-gradient(135deg,#0d3a6e,#04122e)' },
    'Call of Duty':      { emoji: '🎯', gradient: 'linear-gradient(135deg,#2b3b1d,#0a1006)' },
    'Rocket League':     { emoji: '🚀', gradient: 'linear-gradient(135deg,#8a4a0d,#2e1704)' },
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
    $('#section-deportes').hidden = false;
    $('#section-videojuegos').hidden = false;
    $('#deportes-actions').style.display = state.isOwner ? 'flex' : 'none';
    $('#videojuegos-actions').style.display = state.isOwner ? 'flex' : 'none';

    renderFavorites('grid-deportes', u.deportes_seleccionados || [], DEPORTES_META);
    renderFavorites('grid-videojuegos', u.videojuegos_seleccionados || [], JUEGOS_META);
}

function renderFavorites(containerId, items, meta) {
    const grid = document.getElementById(containerId);
    grid.innerHTML = '';

    if (items.length === 0 && !state.isOwner) {
        grid.innerHTML = `<p class="empty-prefs" style="grid-column:1 / -1;">${state.profile.nombre} todavía no eligió favoritos acá.</p>`;
        return;
    }

    items.slice(0, 3).forEach((name) => {
        const info = meta[name] || { emoji: '🎮', gradient: 'linear-gradient(135deg,#2b2b2b,#0a0a0a)' };
        const card = document.createElement('article');
        card.className = 'fav-card';
        card.innerHTML = `
            <div class="fav-card-art" style="background:${info.gradient};"></div>
            <span class="fav-card-label">${info.emoji} ${escapeHtml(name)}</span>
        `;
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
        if (!identifier) return null;

        let statsPerfil = null;
        try {
            const statsRes  = await apiFetch(`${API_BASE_URL}/api/videogames/${game.path}/get-stats.php?${game.idField}=${encodeURIComponent(identifier)}`);
            const statsData = await statsRes.json().catch(() => ({}));
            if (statsRes.ok) statsPerfil = statsData.perfil;
        } catch { /* mostramos igual la cuenta vinculada aunque falle el stats */ }

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
