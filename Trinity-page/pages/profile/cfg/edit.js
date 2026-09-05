// ══════════════════════════════════════════════════════════
//  TRINITY — Editar perfil (pages/profile/cfg/edit.html)
//  Datos básicos, foto (con recorte), preferencias de
//  deportes/videojuegos y vinculación de cuentas de videojuego.
//
//  NOTA DE ALCANCE: esta pantalla también tiene formularios de
//  contraseña / credenciales / notificaciones / eliminar cuenta
//  ya maquetados en el HTML — esos NO se tocan acá, son parte de
//  otro punto del checklist.
// ══════════════════════════════════════════════════════════

const $ = (sel) => document.querySelector(sel);

const DEPORTES_VALIDOS = ['Fútbol', 'Tenis', 'Basketball', 'Volleyball', 'Natación', 'Atletismo'];
const JUEGOS_VALIDOS   = ['Fortnite', 'Clash Royale', 'Valorant', 'League of Legends', 'Call of Duty', 'Rocket League'];

const state = {
    userId: null,
    nombreActual: '',
    // undefined = sin cambios; string data:URL = nueva foto recortada
    pendingFotoUrl: undefined,
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
    const ok = await loadProfile();
    if (!ok) return;

    wirePreviewForm();
    wirePrefs();
    wireCropper();
    wireGameLinks();
}

// ══════════════════════════════════════════════════════════
//  CARGA INICIAL
// ══════════════════════════════════════════════════════════
async function loadProfile() {
    let sessionData;
    try {
        const res = await apiFetch(`${API_BASE_URL}/api/auth/check-session.php`);
        if (!res.ok) return false; // apiFetch ya redirigió al login en un 401
        sessionData = await res.json().catch(() => ({}));
        state.userId = sessionData.usuario.id;
    } catch (err) {
        console.error('[edit.js]', err);
        return false;
    }

    try {
        const res  = await apiFetch(`${API_BASE_URL}/api/users/get-profile.php?id=${state.userId}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMsg('preview-msg', data.error || 'No se pudo cargar tu perfil.', 'err');
            return false;
        }

        const u = data.user;
        state.nombreActual = u.nombre || '';

        $('#edit-nombre').value = u.nombre || '';
        $('#edit-usuario').value = u.usuario || '';
        $('#edit-pronombres').value = u.pronouns || '';
        $('#edit-descripcion').value = u.descripcion || '';

        const photoEl = $('#preview-photo');
        if (u.foto_url) {
            photoEl.innerHTML = '';
            const img = document.createElement('img');
            img.src = u.foto_url;
            img.alt = 'Vista previa de tu foto de perfil';
            photoEl.appendChild(img);
        } else {
            photoEl.textContent = (u.nombre || '?').trim().charAt(0).toUpperCase();
        }

        renderPills('pills-deportes', DEPORTES_VALIDOS, u.deportes_seleccionados || []);
        renderPills('pills-videojuegos', JUEGOS_VALIDOS, u.videojuegos_seleccionados || []);

        return true;
    } catch (err) {
        console.error('[edit.js]', err);
        setMsg('preview-msg', 'No se pudo conectar con el servidor.', 'err');
        return false;
    }
}

function setMsg(id, texto, tipo) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = texto || '';
    el.classList.remove('ok', 'err');
    if (tipo) el.classList.add(tipo);
}

// ══════════════════════════════════════════════════════════
//  FORMULARIO PRINCIPAL (nombre / usuario / pronombres / desc / foto)
// ══════════════════════════════════════════════════════════
function wirePreviewForm() {
    $('#preview-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = $('#btn-save-preview');
        btn.disabled = true;
        setMsg('preview-msg', 'Guardando...', null);

        const body = {
            nombre:      $('#edit-nombre').value.trim(),
            usuario:     $('#edit-usuario').value.trim(),
            pronouns:    $('#edit-pronombres').value,
            descripcion: $('#edit-descripcion').value.trim(),
        };
        if (state.pendingFotoUrl !== undefined) {
            body.foto_url = state.pendingFotoUrl;
        }

        try {
            const res  = await apiFetch(`${API_BASE_URL}/api/users/update-profile.php`, {
                method: 'POST',
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setMsg('preview-msg', data.error || 'No se pudo guardar.', 'err');
            } else {
                setMsg('preview-msg', 'Cambios guardados.', 'ok');
                state.pendingFotoUrl = undefined;
            }
        } catch (err) {
            console.error('[edit.js]', err);
            setMsg('preview-msg', 'No se pudo conectar con el servidor.', 'err');
        }
        btn.disabled = false;
    });
}

// ══════════════════════════════════════════════════════════
//  PREFERENCIAS (deportes / videojuegos favoritos)
// ══════════════════════════════════════════════════════════
function renderPills(containerId, validos, seleccionados) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    validos.forEach((nombre) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pill-option' + (seleccionados.includes(nombre) ? ' selected' : '');
        btn.textContent = nombre;
        btn.dataset.value = nombre;
        btn.addEventListener('click', () => btn.classList.toggle('selected'));
        container.appendChild(btn);
    });
}

function wirePrefs() {
    $('#btn-save-prefs').addEventListener('click', async () => {
        const deportes = Array.from(document.querySelectorAll('#pills-deportes .pill-option.selected')).map((b) => b.dataset.value);
        const videojuegos = Array.from(document.querySelectorAll('#pills-videojuegos .pill-option.selected')).map((b) => b.dataset.value);

        const btn = $('#btn-save-prefs');
        btn.disabled = true;
        setMsg('prefs-msg', 'Guardando...', null);

        try {
            const res  = await apiFetch(`${API_BASE_URL}/api/users/update-profile.php`, {
                method: 'POST',
                body: JSON.stringify({ deportes, videojuegos }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setMsg('prefs-msg', data.error || 'No se pudo guardar.', 'err');
            } else {
                setMsg('prefs-msg', 'Preferencias guardadas.', 'ok');
            }
        } catch (err) {
            console.error('[edit.js]', err);
            setMsg('prefs-msg', 'No se pudo conectar con el servidor.', 'err');
        }
        btn.disabled = false;
    });
}

// ══════════════════════════════════════════════════════════
//  RECORTE DE FOTO DE PERFIL (canvas, sin librerías externas)
// ══════════════════════════════════════════════════════════
const EDIT_SIZE   = 320; // tamaño del canvas de edición (cuadrado)
const OUTPUT_SIZE = 400; // resolución de salida de la foto recortada

const cropper = {
    img: null,
    canvas: null,
    ctx: null,
    scale: 1,     // valor del slider de zoom (1..3)
    baseScale: 1, // escala que hace que la imagen cubra el canvas
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
};

function wireCropper() {
    cropper.canvas = $('#cropper-canvas');
    cropper.ctx    = cropper.canvas.getContext('2d');

    $('#input-photo').addEventListener('change', onPhotoSelected);
    $('#cropper-zoom').addEventListener('input', onZoomChange);
    $('#cropper-close').addEventListener('click', closeCropperModal);
    $('#cropper-cancel').addEventListener('click', closeCropperModal);
    $('#cropper-confirm').addEventListener('click', confirmCrop);

    const canvas = cropper.canvas;
    canvas.addEventListener('pointerdown', onDragStart);
    canvas.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
}

function onPhotoSelected(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const TIPOS_OK = ['image/png', 'image/jpeg', 'image/webp'];
    if (!TIPOS_OK.includes(file.type)) {
        alert('Formato no soportado. Usá PNG, JPG o WEBP.');
        e.target.value = '';
        return;
    }
    if (file.size > 8 * 1024 * 1024) {
        alert('La imagen es demasiado pesada. Elegí una de hasta 8MB.');
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const img = new Image();
        img.onload = () => {
            cropper.img = img;
            cropper.scale = 1;
            $('#cropper-zoom').value = '1';
            resetCropperOffset();
            drawCropper();
            openCropperModal();
        };
        img.onerror = () => alert('No se pudo leer esa imagen.');
        img.src = reader.result;
    };
    reader.onerror = () => alert('No se pudo leer ese archivo.');
    reader.readAsDataURL(file);

    e.target.value = ''; // permite volver a elegir el mismo archivo más adelante
}

function resetCropperOffset() {
    const img = cropper.img;
    cropper.baseScale = Math.max(EDIT_SIZE / img.width, EDIT_SIZE / img.height);
    const eff = cropper.baseScale * cropper.scale;
    cropper.offsetX = (EDIT_SIZE - img.width * eff) / 2;
    cropper.offsetY = (EDIT_SIZE - img.height * eff) / 2;
}

function clampOffsets() {
    const img = cropper.img;
    const eff = cropper.baseScale * cropper.scale;
    const drawW = img.width * eff;
    const drawH = img.height * eff;
    cropper.offsetX = Math.min(0, Math.max(EDIT_SIZE - drawW, cropper.offsetX));
    cropper.offsetY = Math.min(0, Math.max(EDIT_SIZE - drawH, cropper.offsetY));
}

function drawCropper() {
    const { ctx, img } = cropper;
    const eff = cropper.baseScale * cropper.scale;
    ctx.clearRect(0, 0, EDIT_SIZE, EDIT_SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(EDIT_SIZE / 2, EDIT_SIZE / 2, EDIT_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, cropper.offsetX, cropper.offsetY, img.width * eff, img.height * eff);
    ctx.restore();
}

function onZoomChange(e) {
    if (!cropper.img) return;
    const c = EDIT_SIZE / 2;
    const oldEff = cropper.baseScale * cropper.scale;
    // mantener fijo el punto central del recorte al hacer zoom
    const imgCx = (c - cropper.offsetX) / oldEff;
    const imgCy = (c - cropper.offsetY) / oldEff;

    cropper.scale = parseFloat(e.target.value);
    const newEff = cropper.baseScale * cropper.scale;
    cropper.offsetX = c - imgCx * newEff;
    cropper.offsetY = c - imgCy * newEff;

    clampOffsets();
    drawCropper();
}

function onDragStart(e) {
    if (!cropper.img) return;
    cropper.dragging = true;
    cropper.lastX = e.clientX;
    cropper.lastY = e.clientY;
    if (cropper.canvas.setPointerCapture) {
        try { cropper.canvas.setPointerCapture(e.pointerId); } catch { /* no-op en entornos sin soporte */ }
    }
}
function onDragMove(e) {
    if (!cropper.dragging) return;
    const dx = e.clientX - cropper.lastX;
    const dy = e.clientY - cropper.lastY;
    cropper.lastX = e.clientX;
    cropper.lastY = e.clientY;
    cropper.offsetX += dx;
    cropper.offsetY += dy;
    clampOffsets();
    drawCropper();
}
function onDragEnd() {
    cropper.dragging = false;
}

function openCropperModal() { $('#cropper-modal').classList.add('open'); }
function closeCropperModal() {
    $('#cropper-modal').classList.remove('open');
    cropper.img = null;
}

function confirmCrop() {
    if (!cropper.img) return;

    const out  = document.createElement('canvas');
    out.width  = OUTPUT_SIZE;
    out.height = OUTPUT_SIZE;
    const octx = out.getContext('2d');

    // Reproducir el mismo recorte del canvas de edición a mayor resolución.
    const ratio = OUTPUT_SIZE / EDIT_SIZE;
    const eff   = cropper.baseScale * cropper.scale;
    octx.drawImage(
        cropper.img,
        cropper.offsetX * ratio,
        cropper.offsetY * ratio,
        cropper.img.width * eff * ratio,
        cropper.img.height * eff * ratio
    );

    const dataUrl = out.toDataURL('image/jpeg', 0.85);

    if (dataUrl.length > 2 * 1024 * 1024) {
        alert('La imagen resultante es demasiado grande. Probá con otra foto.');
        return;
    }

    state.pendingFotoUrl = dataUrl;

    const photoEl = $('#preview-photo');
    photoEl.innerHTML = '';
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = 'Vista previa de tu foto de perfil';
    photoEl.appendChild(img);

    closeCropperModal();
}

// ══════════════════════════════════════════════════════════
//  CUENTAS DE VIDEOJUEGO (Brawl Stars / Clash Royale / Fortnite / Minecraft)
// ══════════════════════════════════════════════════════════
function wireGameLinks() {
    document.querySelectorAll('.gamelink-form').forEach((form) => {
        loadGameAccount(form);
        form.querySelector('[data-role="btn"]').addEventListener('click', () => saveGameAccount(form));
    });
}

async function loadGameAccount(form) {
    const path  = form.dataset.path;
    const field = form.dataset.field;
    const currentEl = form.querySelector('[data-role="current"]');

    try {
        const res  = await apiFetch(`${API_BASE_URL}/api/videogames/${path}/get-account.php`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;

        const value = data[field];
        if (value) {
            currentEl.textContent = `Vinculada: ${value}`;
            currentEl.classList.add('linked');
            form.querySelector('[data-role="input"]').value = value;
        }
    } catch (err) {
        console.error('[edit.js]', err);
    }
}

async function saveGameAccount(form) {
    const path  = form.dataset.path;
    const field = form.dataset.field;
    const input     = form.querySelector('[data-role="input"]');
    const btn       = form.querySelector('[data-role="btn"]');
    const msgEl     = form.querySelector('[data-role="msg"]');
    const currentEl = form.querySelector('[data-role="current"]');

    const value = input.value.trim();
    if (!value) {
        setInlineMsg(msgEl, 'Ingresá un valor.', 'err');
        return;
    }

    btn.disabled = true;
    setInlineMsg(msgEl, 'Vinculando...', null);

    try {
        const res  = await apiFetch(`${API_BASE_URL}/api/videogames/${path}/save-account.php`, {
            method: 'POST',
            body: JSON.stringify({ [field]: value }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setInlineMsg(msgEl, data.error || 'No se pudo vincular.', 'err');
        } else {
            const saved = data[field] || value;
            currentEl.textContent = `Vinculada: ${saved}`;
            currentEl.classList.add('linked');
            input.value = saved;
            setInlineMsg(msgEl, 'Cuenta vinculada correctamente.', 'ok');
        }
    } catch (err) {
        console.error('[edit.js]', err);
        setInlineMsg(msgEl, 'No se pudo conectar con el servidor.', 'err');
    }
    btn.disabled = false;
}

function setInlineMsg(el, texto, tipo) {
    el.textContent = texto || '';
    el.classList.remove('ok', 'err');
    if (tipo) el.classList.add(tipo);
}
