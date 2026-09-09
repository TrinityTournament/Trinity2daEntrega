// ══════════════════════════════════════════════════════════
//  TRINITY — Editar perfil (pages/profile/cfg/edit.html)
//  Datos básicos, foto (con recorte), preferencias de
//  deportes/videojuegos, vinculación de cuentas de videojuego,
//  y credenciales (email / teléfono).
//
//  NOTA DE ALCANCE: contraseña / notificaciones / eliminar cuenta
//  ya están maquetados en el HTML pero NO se tocan acá — son parte
//  de otro punto del checklist.
// ══════════════════════════════════════════════════════════

const $ = (sel) => document.querySelector(sel);

const DEPORTES_VALIDOS = ['Fútbol'];
const JUEGOS_VALIDOS   = ['Brawl Stars', 'Clash Royale', 'Fortnite', 'Free Fire', 'Minecraft'];

// Prefijos que ofrece el <select> de país, ordenados de más a menos
// dígitos — así al separar un teléfono guardado (ej. "59899123456")
// probamos primero "598" antes que otros que también podrían calzar.
const PREFIJOS_TELEFONO = ['598', '54', '55', '56', '57', '51', '52', '34', '1'];

function splitPhone(telefonoCompleto) {
    const digits = String(telefonoCompleto || '').replace(/\D/g, '');
    for (const prefijo of PREFIJOS_TELEFONO) {
        if (digits.startsWith(prefijo)) {
            return { prefijo, numero: digits.slice(prefijo.length) };
        }
    }
    return { prefijo: '598', numero: digits };
}

const state = {
    userId: null,
    nombreActual: '',
    emailActual: '',
    telefonoActual: '', // dígitos completos (con prefijo), tal como está en la BD
    telefonoPendiente: null,
    pwdChangeMethod: null, // { type: 'email'|'telefono', value: string } tras enviar el código
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
    wireCredentials();
    wirePasswordChange();
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
        state.emailActual = sessionData.usuario.email || '';
        state.telefonoActual = sessionData.usuario.telefono || '';

        $('#edit-email').value = state.emailActual;
        if (state.telefonoActual) {
            const { prefijo, numero } = splitPhone(state.telefonoActual);
            $('#edit-telefono-prefijo').value = prefijo;
            $('#edit-telefono').value = numero;
        }
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

// ══════════════════════════════════════════════════════════
//  CREDENCIALES (email / teléfono)
//
//  El email se guarda directo. El teléfono requiere un código
//  de verificación por WhatsApp (send-code.php → update-credentials.php),
//  igual que el resto de los flujos de verificación del sitio.
//
//  Ambos campos se precargan con el valor real del usuario
//  (agregado a check-session.php: antes solo devolvía el email).
// ══════════════════════════════════════════════════════════
function wireCredentials() {
    const form = $('#credentials-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleCredentialsSubmit();
    });

    $('#btn-confirm-telefono').addEventListener('click', confirmTelefonoCode);
    $('#btn-cancel-telefono').addEventListener('click', cancelTelefonoOtp);

    wireOtpAutoAdvance('#otp-telefono-cred');
}

async function handleCredentialsSubmit() {
    const btn = $('#btn-save-credentials');
    btn.disabled = true;
    setMsg('credentials-msg', '', null);

    const newEmail = $('#edit-email').value.trim();
    const prefix   = $('#edit-telefono-prefijo').value;
    const numero   = $('#edit-telefono').value.trim();

    let emailCambiado = false;

    if (newEmail && newEmail !== state.emailActual) {
        try {
            const res  = await apiFetch(`${API_BASE_URL}/api/users/update-credentials.php`, {
                method: 'POST',
                body: JSON.stringify({ email: newEmail }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setMsg('credentials-msg', data.error || 'No se pudo actualizar el email.', 'err');
                btn.disabled = false;
                return;
            }
            state.emailActual = newEmail;
            emailCambiado = true;
        } catch (err) {
            console.error('[edit.js]', err);
            setMsg('credentials-msg', 'No se pudo conectar con el servidor.', 'err');
            btn.disabled = false;
            return;
        }
    }

    if (numero) {
        const telefonoCompleto = prefix + numero.replace(/\D/g, '');
        if (telefonoCompleto === state.telefonoActual) {
            // No cambió nada respecto al que ya tenía guardado — no
            // tiene sentido re-enviar un código para confirmar el mismo número.
            setMsg('credentials-msg', emailCambiado ? 'Email actualizado.' : 'No hay cambios para guardar.', emailCambiado ? 'ok' : null);
            btn.disabled = false;
            return;
        }
        try {
            const res  = await apiFetch(`${API_BASE_URL}/api/verification/send-code.php`, {
                method: 'POST',
                body: JSON.stringify({ telefono: telefonoCompleto, cambio_credencial: true }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setMsg('credentials-msg', data.error || 'No se pudo enviar el código.', 'err');
                btn.disabled = false;
                return;
            }
            state.telefonoPendiente = telefonoCompleto;
            $('#telefono-otp-block').hidden = false;
            setMsg(
                'credentials-msg',
                (emailCambiado ? 'Email actualizado. ' : '') + 'Te enviamos un código por WhatsApp para confirmar el número.',
                'ok'
            );
            btn.disabled = false;
            return;
        } catch (err) {
            console.error('[edit.js]', err);
            setMsg('credentials-msg', 'No se pudo conectar con el servidor.', 'err');
            btn.disabled = false;
            return;
        }
    }

    setMsg('credentials-msg', emailCambiado ? 'Cambios guardados.' : 'No hay cambios para guardar.', emailCambiado ? 'ok' : null);
    btn.disabled = false;
}

async function confirmTelefonoCode() {
    const code = Array.from(document.querySelectorAll('#otp-telefono-cred input')).map((i) => i.value).join('');
    if (code.length !== 6) {
        setMsg('credentials-msg', 'Ingresá el código completo de 6 dígitos.', 'err');
        return;
    }

    const btn = $('#btn-confirm-telefono');
    btn.disabled = true;

    try {
        const res  = await apiFetch(`${API_BASE_URL}/api/users/update-credentials.php`, {
            method: 'POST',
            body: JSON.stringify({ telefono: state.telefonoPendiente, code }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMsg('credentials-msg', data.error || 'Código incorrecto.', 'err');
        } else {
            setMsg('credentials-msg', 'Teléfono confirmado y guardado.', 'ok');
            state.telefonoActual = state.telefonoPendiente;
            $('#telefono-otp-block').hidden = true;
            document.querySelectorAll('#otp-telefono-cred input').forEach((i) => { i.value = ''; });
            state.telefonoPendiente = null;
        }
    } catch (err) {
        console.error('[edit.js]', err);
        setMsg('credentials-msg', 'No se pudo conectar con el servidor.', 'err');
    }
    btn.disabled = false;
}

function cancelTelefonoOtp() {
    $('#telefono-otp-block').hidden = true;
    document.querySelectorAll('#otp-telefono-cred input').forEach((i) => { i.value = ''; });
    state.telefonoPendiente = null;
    setMsg('credentials-msg', '', null);
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
//  CAMBIAR CONTRASEÑA (2 pasos: enviar código, confirmar)
//
//  El usuario solo elige destino (Email/WhatsApp); el valor real
//  (state.emailActual / state.telefonoActual) ya se conoce desde
//  check-session.php, no hace falta pedirlo de nuevo.
// ══════════════════════════════════════════════════════════
function wirePasswordChange() {
    $('#pwd-paso1').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handlePwdPaso1();
    });

    $('#pwd-paso2').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handlePwdPaso2();
    });

    $('#btn-pwd-cancel').addEventListener('click', () => {
        document.querySelectorAll('#otp-pwd input').forEach((i) => { i.value = ''; });
        $('#pwd-nueva').value = '';
        $('#pwd-confirm').value = '';
        setMsg('pwd-paso2-msg', '', null);
    });

    wireOtpAutoAdvance('#otp-pwd');
}

async function handlePwdPaso1() {
    const btn = $('#btn-pwd-send');
    btn.disabled = true;
    setMsg('pwd-paso1-msg', 'Enviando...', null);

    const destino = $('#pwd-destino').value;
    let body;

    if (destino === 'email') {
        if (!state.emailActual) {
            setMsg('pwd-paso1-msg', 'No encontramos un email en tu cuenta.', 'err');
            btn.disabled = false;
            return;
        }
        body = { email: state.emailActual, cambio_password: true };
        state.pwdChangeMethod = { type: 'email', value: state.emailActual };
    } else {
        if (!state.telefonoActual) {
            setMsg('pwd-paso1-msg', 'No tenés un número de WhatsApp registrado. Agregalo primero en "Credenciales".', 'err');
            btn.disabled = false;
            return;
        }
        body = { telefono: state.telefonoActual, cambio_password: true };
        state.pwdChangeMethod = { type: 'telefono', value: state.telefonoActual };
    }

    try {
        const res  = await apiFetch(`${API_BASE_URL}/api/verification/send-code.php`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMsg('pwd-paso1-msg', data.error || 'No se pudo enviar el código.', 'err');
        } else {
            setMsg('pwd-paso1-msg', destino === 'email' ? 'Te enviamos un código a tu email.' : 'Te enviamos un código por WhatsApp.', 'ok');
        }
    } catch (err) {
        console.error('[edit.js]', err);
        setMsg('pwd-paso1-msg', 'No se pudo conectar con el servidor.', 'err');
    }
    btn.disabled = false;
}

async function handlePwdPaso2() {
    if (!state.pwdChangeMethod) {
        setMsg('pwd-paso2-msg', 'Primero pedí un código de verificación arriba.', 'err');
        return;
    }

    const code    = Array.from(document.querySelectorAll('#otp-pwd input')).map((i) => i.value).join('');
    const nueva   = $('#pwd-nueva').value;
    const confirm = $('#pwd-confirm').value;

    if (code.length !== 6) {
        setMsg('pwd-paso2-msg', 'Ingresá el código completo de 6 dígitos.', 'err');
        return;
    }
    if (nueva.length < 6) {
        setMsg('pwd-paso2-msg', 'La contraseña debe tener al menos 6 caracteres.', 'err');
        return;
    }
    if (nueva !== confirm) {
        setMsg('pwd-paso2-msg', 'Las contraseñas no coinciden.', 'err');
        return;
    }

    const btn = $('#btn-pwd-confirm');
    btn.disabled = true;
    setMsg('pwd-paso2-msg', 'Actualizando...', null);

    const body = { code, nueva_password: nueva };
    body[state.pwdChangeMethod.type] = state.pwdChangeMethod.value;

    try {
        const res  = await apiFetch(`${API_BASE_URL}/api/users/change-password.php`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMsg('pwd-paso2-msg', data.error || 'No se pudo actualizar la contraseña.', 'err');
        } else {
            setMsg('pwd-paso2-msg', 'Contraseña actualizada correctamente.', 'ok');
            document.querySelectorAll('#otp-pwd input').forEach((i) => { i.value = ''; });
            $('#pwd-nueva').value = '';
            $('#pwd-confirm').value = '';
            state.pwdChangeMethod = null;
        }
    } catch (err) {
        console.error('[edit.js]', err);
        setMsg('pwd-paso2-msg', 'No se pudo conectar con el servidor.', 'err');
    }
    btn.disabled = false;
}
