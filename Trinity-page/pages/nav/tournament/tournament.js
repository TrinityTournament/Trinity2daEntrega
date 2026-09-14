// ══════════════════════════════════════════════════════════
//  TRINITY — pages/nav/tournament/tournament.html
//  CTA de "Crear torneo" + flujo de verificación para pasar a
//  organizador (teléfono confirmado + términos aceptados →
//  solicitud enviada a los admins por WhatsApp).
// ══════════════════════════════════════════════════════════

const $ = (sel) => document.querySelector(sel);

const state = {
    loggedIn:  false,
    rol:       'participante',
    telefono:  null,
    solicitud: null,
    telefonoPendiente: null,
};

// ── Juegos con cuenta vinculable (coincide con GAMES en acc/view.js) ──
// Fútbol y Free Fire no tienen API de cuenta -> sus cards no abren
// el panel de aviso, navegan directo a buscar.html.
const ACC_GAMES = {
    brawlstars:  { path: 'BRAWLAPI',       idField: 'tag',      label: 'Brawl Stars',  icon: '../../../assets/logosGames/brawl.png' },
    clashroyale: { path: 'ClashRoyaleAPI', idField: 'tag',      label: 'Clash Royale', icon: '../../../assets/logosGames/clash.png' },
    fortnite:    { path: 'FortniteAPI',    idField: 'username', label: 'Fortnite',     icon: '../../../assets/logosGames/fortnite.png' },
    minecraft:   { path: 'MinecraftAPI',   idField: 'username', label: 'Minecraft',    icon: '../../../assets/logosGames/minecraft.png' },
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadEstado();
    wireModal();
    wireGameCards();
    wireAccCheckClose();
}

// No usamos apiFetch acá: esta página es pública, un invitado tiene
// que poder verla sin que lo manden al login (mismo motivo que en
// view.js al revisar el perfil de otro usuario).
async function loadEstado() {
    try {
        const res = await fetch(`${API_BASE_URL}/../app/tournaments/organizer/status.php`, { credentials: 'include' });
        if (res.status === 401) {
            state.loggedIn = false;
        } else {
            const data = await res.json();
            state.loggedIn  = true;
            state.rol       = data.rol;
            state.telefono  = data.telefono;
            state.solicitud = data.solicitud;
        }
    } catch (err) {
        console.error('[tournament.js]', err);
    }
    renderCta();
}

function renderCta() {
    $('#ct-loading').style.display = 'none';
    const box = $('#ct-content');
    box.hidden = false;

    if (!state.loggedIn) {
        box.innerHTML = '<a href="../../../pages/login/login.html" class="btn-crear-torneo">Iniciá sesión para crear un torneo</a>';
        return;
    }

    if (state.rol === 'organizador' || state.rol === 'admin') {
        box.innerHTML = '<a href="crear.html" class="btn-crear-torneo">+ Crear torneo</a>';
        return;
    }

    if (state.solicitud && state.solicitud.estado === 'pendiente') {
        box.innerHTML = '<p class="ct-pending">Tu solicitud para ser organizador está pendiente de aprobación.</p>';
        return;
    }

    box.innerHTML = '<button type="button" class="btn-crear-torneo" id="btn-open-organizer">Convertite en organizador</button>';
    $('#btn-open-organizer').addEventListener('click', openOrganizerModal);
}

// ══════════════════════════════════════════════════════════
//  MODAL
// ══════════════════════════════════════════════════════════
function openOrganizerModal() {
    const tienePhone = !!state.telefono;
    $('#org-step-phone').hidden = tienePhone;
    $('#org-step-terms').hidden = !tienePhone;
    $('#org-step-done').hidden  = true;
    $('#org-otp-block').hidden  = true;

    $('#org-terms-checkbox').checked = false;
    $('#org-btn-submit').disabled    = true;
    setMsg('org-phone-msg', '', null);
    setMsg('org-otp-msg', '', null);
    setMsg('org-terms-msg', '', null);

    $('#organizer-modal').classList.add('open');
}

function closeOrganizerModal() {
    $('#organizer-modal').classList.remove('open');
}

function wireModal() {
    $('#organizer-modal-close').addEventListener('click', closeOrganizerModal);
    $('#organizer-modal').addEventListener('click', (e) => {
        if (e.target.id === 'organizer-modal') closeOrganizerModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeOrganizerModal();
    });

    $('#org-btn-send-code').addEventListener('click', enviarCodigoTelefono);
    $('#org-btn-confirm-code').addEventListener('click', confirmarTelefono);
    $('#org-terms-checkbox').addEventListener('change', (e) => {
        $('#org-btn-submit').disabled = !e.target.checked;
    });
    $('#org-btn-submit').addEventListener('click', enviarSolicitud);
    $('#org-btn-close-done').addEventListener('click', () => {
        closeOrganizerModal();
        loadEstado(); // refresca el CTA (ahora debería mostrar "pendiente")
    });

    wireOtpAutoAdvance('#org-otp');
}

async function enviarCodigoTelefono() {
    const prefix = $('#org-telefono-prefijo').value;
    const numero = $('#org-telefono').value.trim();
    if (!numero) {
        setMsg('org-phone-msg', 'Ingresá tu número.', 'err');
        return;
    }
    const telefonoCompleto = prefix + numero.replace(/\D/g, '');

    const btn = $('#org-btn-send-code');
    btn.disabled = true;
    setMsg('org-phone-msg', 'Enviando...', null);

    try {
        const res  = await apiFetch(`${API_BASE_URL}/../app/verification/send-code.php`, {
            method: 'POST',
            body: JSON.stringify({ telefono: telefonoCompleto, cambio_credencial: true }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMsg('org-phone-msg', data.error || 'No se pudo enviar el código.', 'err');
        } else {
            state.telefonoPendiente = telefonoCompleto;
            $('#org-otp-block').hidden = false;
            setMsg('org-phone-msg', 'Te enviamos un código por WhatsApp.', 'ok');
        }
    } catch (err) {
        console.error('[tournament.js]', err);
        setMsg('org-phone-msg', 'No se pudo conectar con el servidor.', 'err');
    }
    btn.disabled = false;
}

async function confirmarTelefono() {
    const code = Array.from(document.querySelectorAll('#org-otp input')).map((i) => i.value).join('');
    if (code.length !== 6) {
        setMsg('org-otp-msg', 'Ingresá el código completo de 6 dígitos.', 'err');
        return;
    }

    const btn = $('#org-btn-confirm-code');
    btn.disabled = true;
    setMsg('org-otp-msg', 'Confirmando...', null);

    try {
        const res  = await apiFetch(`${API_BASE_URL}/../app/users/update-credentials.php`, {
            method: 'POST',
            body: JSON.stringify({ telefono: state.telefonoPendiente, code }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMsg('org-otp-msg', data.error || 'Código incorrecto.', 'err');
        } else {
            state.telefono = state.telefonoPendiente;
            $('#org-step-phone').hidden = true;
            $('#org-step-terms').hidden = false;
        }
    } catch (err) {
        console.error('[tournament.js]', err);
        setMsg('org-otp-msg', 'No se pudo conectar con el servidor.', 'err');
    }
    btn.disabled = false;
}

async function enviarSolicitud() {
    const btn = $('#org-btn-submit');
    btn.disabled = true;
    setMsg('org-terms-msg', 'Enviando...', null);

    try {
        const res  = await apiFetch(`${API_BASE_URL}/../app/tournaments/organizer/request.php`, { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMsg('org-terms-msg', data.error || 'No se pudo enviar la solicitud.', 'err');
            btn.disabled = false;
            return;
        }
        state.solicitud = { id: data.id, estado: 'pendiente' };
        $('#org-step-terms').hidden = true;
        $('#org-step-done').hidden  = false;
    } catch (err) {
        console.error('[tournament.js]', err);
        setMsg('org-terms-msg', 'No se pudo conectar con el servidor.', 'err');
        btn.disabled = false;
    }
}

function setMsg(id, texto, tipo) {
    const el = document.getElementById(id);
    el.textContent = texto || '';
    el.classList.remove('ok', 'err');
    if (tipo) el.classList.add(tipo);
}

function wireOtpAutoAdvance(containerSel) {
    const inputs = Array.from(document.querySelectorAll(`${containerSel} input`));
    inputs.forEach((input, idx) => {
        input.addEventListener('input', () => {
            if (input.value && idx < inputs.length - 1) inputs[idx + 1].focus();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && idx > 0) inputs[idx - 1].focus();
        });
    });
}

// ══════════════════════════════════════════════════════════
//  AVISO: cuenta vinculada / confirmación (grilla de juegos)
//
//  Al clickear una card con data-game-id de un juego vinculable
//  (brawlstars/clashroyale/fortnite/minecraft) interceptamos la
//  navegación y mostramos este panel en vez de ir directo a
//  buscar.html. Fútbol y Free Fire no tienen cuenta que vincular,
//  así que sus cards navegan normal (no están en ACC_GAMES).
// ══════════════════════════════════════════════════════════
function wireGameCards() {
    document.querySelectorAll('#gamesGrid .game-card').forEach((card) => {
        const gameId = card.dataset.gameId;
        if (!gameId || !ACC_GAMES[gameId]) return; // sin API de cuenta -> navegación normal
        card.addEventListener('click', (e) => {
            e.preventDefault();
            openAccCheck(gameId, card.getAttribute('href'));
        });
    });
}

function wireAccCheckClose() {
    $('#accCheckClose').addEventListener('click', closeAccCheck);
}

function closeAccCheck() {
    $('#accCheckPanel').hidden = true;
}

async function openAccCheck(gameId, destino) {
    const panel = $('#accCheckPanel');
    const body  = $('#accCheckBody');
    const game  = ACC_GAMES[gameId];

    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    body.innerHTML = '<div class="loading-spinner" style="margin:0.5rem auto;"></div>';

    if (!state.loggedIn) {
        body.innerHTML = accCheckWarn(
            `Iniciá sesión y vinculá tu cuenta de ${game.label} para poder inscribirte en sus torneos.`,
            '../../../pages/login/login.html', 'Iniciar sesión'
        );
        return;
    }

    try {
        const accRes     = await apiFetch(`${API_BASE_URL}/../app/videogames/${game.path}/get-account.php`);
        const accData     = await accRes.json().catch(() => ({}));
        const identifier  = accRes.ok ? accData[game.idField] : null;

        if (!identifier) {
            body.innerHTML = accCheckWarn(
                `Todavía no vinculaste tu cuenta de ${game.label}.`,
                '../profile/cfg/edit.html', 'Vincular ahora'
            );
            return;
        }

        let perfil = null;
        try {
            const statsRes  = await apiFetch(`${API_BASE_URL}/../app/videogames/${game.path}/get-stats.php?${game.idField}=${encodeURIComponent(identifier)}`);
            const statsData = await statsRes.json().catch(() => ({}));
            if (statsRes.ok) perfil = statsData.perfil;
        } catch { /* mostramos igual la confirmación aunque falle el stats */ }

        body.innerHTML = accCheckConfirm(gameId, game, identifier, perfil);
        const btn = document.getElementById('acc-check-continue-btn');
        if (btn) btn.addEventListener('click', () => { window.location.href = destino; });
    } catch (err) {
        console.error('[tournament.js]', err);
        body.innerHTML = '<p class="acc-check-warn">No se pudo conectar con el servidor.</p>';
    }
}

function accCheckWarn(mensaje, href, linkTexto) {
    return `<p class="acc-check-warn">${escapeHtml(mensaje)} <a href="${href}">${escapeHtml(linkTexto)} →</a></p>`;
}

function accCheckConfirm(gameId, game, identifier, perfil) {
    const nombreMostrado = (perfil && perfil.nombre) ? perfil.nombre : identifier;
    const stats = renderAccStats(gameId, perfil, nombreMostrado);

    return `
        <div class="acc-check-id">
            <div class="acc-check-id-icon"><img src="${game.icon}" alt=""></div>
            <div>
                <p class="acc-check-id-label">Nametag del juego</p>
                <p class="acc-check-id-value">${escapeHtml(nombreMostrado)}</p>
            </div>
        </div>
        <div class="acc-check-stats">${stats}</div>
        <button type="button" class="acc-check-continue" id="acc-check-continue-btn">Continuar</button>
    `;
}

function accBox(label, value, icon) {
    if (value === null || value === undefined || value === '') return '';
    const iconHtml = icon ? `<div class="acc-check-box-icon">${icon}</div>` : '';
    return `
        <div class="acc-check-box">
            ${iconHtml}
            <div class="acc-check-box-label">${escapeHtml(label)}</div>
            <div class="acc-check-box-value">${escapeHtml(String(value))}</div>
        </div>
    `;
}

// Minecraft es un caso aparte: el nombre ya se ve arriba en el nametag
// (no lo repetimos en una caja), y en vez de stats mostramos solo la
// cabeza 3D de la skin (endpoint /head/, no /avatar/) suelta, sin caja
// ni etiqueta alrededor.
function renderAccStats(gameId, p, nombreMostrado) {
    if (!p) return '<p class="acc-check-warn">No se pudieron cargar las estadísticas ahora mismo.</p>';

    if (gameId === 'minecraft') {
        if (!p.uuid) return '';
        const src = `https://mc-heads.net/head/${encodeURIComponent(p.uuid)}/90`;
        return `<img class="acc-check-mc-head" src="${src}" alt="Cabeza de ${escapeHtml(nombreMostrado)}">`;
    }

    return renderAccBoxes(gameId, p);
}

function renderAccBoxes(gameId, p) {
    switch (gameId) {
        case 'brawlstars':
            return accBox('Trofeos', p.trofeos, '🏆') + accBox('Máx. trofeos', p.maxTrofeos, '⭐') + accBox('Nivel', p.nivel, '🎖️')
                 + accBox('Victorias 3v3', p.victorias3v3, '⚔️') + accBox('Victorias solo', p.victoriasSolo, '🥇') + accBox('Victorias dúo', p.victoriasDuo, '🥈');
        case 'clashroyale':
            return accBox('Trofeos', p.trofeos, '🏆') + accBox('Donaciones', p.donaciones, '🎁')
                 + accBox('Victorias', p.victorias, '⚔️') + accBox('Derrotas', p.derrotas, '💀');
        case 'fortnite': {
            const o = p.overall;
            return o ? accBox('Partidas', o.matches, '🎮') + accBox('Victorias', o.wins, '🏆') + accBox('K/D', o.kd, '⚔️') : '';
        }
        default:
            return '';
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}