// ══════════════════════════════════════════
//  TRINITY — LOGIN / REGISTRO / RECUPERAR
//  Conectado a la API real (api/auth, api/verification).
//  Usa apiFetch (assets/js/api.js) para las llamadas: agrega
//  cookies de sesión + header X-CSRF-Token automáticamente.
// ══════════════════════════════════════════

let metodoActual  = null; // 'email' | 'telefono'
let canalActual   = 'whatsapp'; // 'whatsapp' — ya viene marcado como activo en el HTML
let codigoListo   = false; // true cuando el OTP del método activo tiene 6 dígitos

// ── NAVEGACIÓN ENTRE VISTAS ───────────────────────────────
// La navegación entre #card / #registro / #recuperar la maneja el
// propio HTML con anchor links (href="#registro", etc). Acá solo
// escuchamos el cambio de hash para mostrar la card correspondiente
// y resetear el estado del registro cada vez que se entra o se sale
// de esa card.

function irA(hash) {
    window.location.hash = hash;
}

const CARDS = ['card', 'registro', 'recuperar'];

function mostrarCardActiva() {
    let hash = window.location.hash.replace('#', '');
    if (!CARDS.includes(hash)) hash = 'card'; // sin hash (o uno inválido) → login por defecto

    CARDS.forEach(id => {
        document.getElementById(id).classList.toggle('card-activa', id === hash);
    });
}

// ── RESET ─────────────────────────────────────────────────

function resetRegistro() {
    metodoActual = null;
    canalActual  = 'whatsapp'; // único canal disponible por ahora, arranca preseleccionado

    document.querySelectorAll('.metodo-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('visible'));
    document.querySelectorAll('.canal-btn').forEach(b => b.disabled = false);
    document.getElementById('btn-whatsapp').classList.add('active');
    document.getElementById('col-der').classList.remove('visible');
    limpiarOtp('otp-email');
    limpiarOtp('otp-tel');
    actualizarBotonCrearCuenta();

    ['btn-code-email', 'btn-code-tel'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) { btn.disabled = false; btn.textContent = 'Solicitar código'; }
    });
    ['msg-email', 'msg-tel', 'msg-login', 'msg-forgot'].forEach(id => setMensaje(id, ''));
}

function limpiarOtp(groupId) {
    document.querySelectorAll(`#${groupId} input`).forEach(i => {
        i.value = '';
        i.classList.remove('filled');
    });
}

// ── MÉTODO DE VERIFICACIÓN ────────────────────────────────

function seleccionarMetodo(metodo) {
    metodoActual = metodo;

    document.getElementById('btn-email').classList.toggle('active',    metodo === 'email');
    document.getElementById('btn-telefono').classList.toggle('active', metodo === 'telefono');

    document.getElementById('col-der').classList.add('visible');

    document.getElementById('panel-email').classList.toggle('visible',    metodo === 'email');
    document.getElementById('panel-telefono').classList.toggle('visible', metodo === 'telefono');

    if (metodo !== 'telefono') {
        canalActual = 'whatsapp'; // se preserva el default; no hay otro canal aún
        document.querySelectorAll('.canal-btn').forEach(b => b.disabled = false);
        document.getElementById('btn-whatsapp').classList.add('active');
    }

    actualizarBotonCrearCuenta();
}

// ── CANAL ───────────────────────────────────────────────

function seleccionarCanal(canal) {
    canalActual = canal;
    const btnWa = document.getElementById('btn-whatsapp');
    btnWa.classList.toggle('active', canal === 'whatsapp');
}

// ── TOGGLE PASSWORD ───────────────────────────────────────

function togglePassword(id, icon) {
    const input = document.getElementById(id);
    input.type        = input.type === 'password' ? 'text' : 'password';
    icon.style.opacity = input.type === 'text' ? '1' : '0.6';
}

// ── OTP (solo la UX de los casilleros: autoavance y borrado) ─

function otpNext(input, groupId) {
    input.value = input.value.replace(/[^0-9]/g, '');
    if (input.value) {
        input.classList.add('filled');
        const inputs = [...document.querySelectorAll(`#${groupId} input`)];
        const idx    = inputs.indexOf(input);
        if (idx < inputs.length - 1) inputs[idx + 1].focus();
    } else {
        input.classList.remove('filled');
    }
    actualizarBotonCrearCuenta();
}

function leerOtp(groupId) {
    return [...document.querySelectorAll(`#${groupId} input`)].map(i => i.value).join('');
}

// Muestra "Crear cuenta" solo cuando el OTP del método activo está
// completo (6 dígitos) — evita un submit prematuro sin código.
function actualizarBotonCrearCuenta() {
    const btn = document.getElementById('btn-crear-cuenta');
    if (!btn) return;

    const groupId = metodoActual === 'email' ? 'otp-email' : metodoActual === 'telefono' ? 'otp-tel' : null;
    codigoListo    = !!groupId && leerOtp(groupId).length === 6;
    btn.style.display = codigoListo ? '' : 'none';
}

function otpBack(event, input, groupId) {
    if (event.key === 'Backspace' && !input.value) {
        const inputs = [...document.querySelectorAll(`#${groupId} input`)];
        const idx    = inputs.indexOf(input);
        if (idx > 0) inputs[idx - 1].focus();
    }
}

// ── HELPERS DE UI ──────────────────────────────────────────

function setMensaje(id, texto, tipo = '') {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = texto;
    el.className = 'msg' + (tipo ? ` msg-${tipo}` : '');
}

async function leerError(res) {
    try {
        const data = await res.json();
        return data.error || 'Ocurrió un error inesperado.';
    } catch {
        return 'Ocurrió un error inesperado.';
    }
}

// Deshabilita un botón y muestra una cuenta regresiva, para no
// permitir reenvíos en cadena del mismo código.
function iniciarCooldown(btn, segundos = 45) {
    const textoOriginal = 'Solicitar código';
    let restante = segundos;
    btn.disabled = true;
    btn.textContent = `Reenviar (${restante}s)`;

    const timer = setInterval(() => {
        restante--;
        if (restante <= 0) {
            clearInterval(timer);
            btn.disabled = false;
            btn.textContent = textoOriginal;
        } else {
            btn.textContent = `Reenviar (${restante}s)`;
        }
    }, 1000);
}

// ── LOGIN ───────────────────────────────────────────────────

async function manejarLogin(e) {
    e.preventDefault();
    setMensaje('msg-login', '');

    const identifier = document.getElementById('login-identifier').value.trim();
    const password    = document.getElementById('password-login').value;

    if (!identifier || !password) {
        setMensaje('msg-login', 'Completá usuario y contraseña.', 'error');
        return;
    }

    const btn = document.getElementById('btn-login');
    btn.disabled = true;
    btn.textContent = 'Ingresando…';

    try {
        const res = await apiFetch(`${API_BASE_URL}/api/auth/login.php`, {
            method: 'POST',
            body: JSON.stringify({ identifier, password }),
        });

        if (!res.ok) {
            setMensaje('msg-login', await leerError(res), 'error');
            return;
        }

        const data = await res.json();
        sessionStorage.setItem('trinity_user', JSON.stringify(data.usuario));
        if (window.setCsrfToken) setCsrfToken(data.csrf_token);

        window.location.href = '../../index.html';
    } catch (err) {
        setMensaje('msg-login', 'No se pudo conectar con el servidor.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Iniciar sesión';
    }
}

// ── REGISTRO: SOLICITAR CÓDIGO ───────────────────────────────

async function solicitarCodigoEmail() {
    const email = document.getElementById('email-registro').value.trim();
    setMensaje('msg-email', '');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setMensaje('msg-email', 'Ingresá un email válido.', 'error');
        return;
    }

    const btn = document.getElementById('btn-code-email');
    btn.disabled = true;

    try {
        const res = await apiFetch(`${API_BASE_URL}/api/verification/send-code.php`, {
            method: 'POST',
            body: JSON.stringify({ email }),
        });

        if (!res.ok) {
            setMensaje('msg-email', await leerError(res), 'error');
            btn.disabled = false;
            return;
        }

        setMensaje('msg-email', 'Código enviado. Revisá tu correo.', 'ok');
        iniciarCooldown(btn);
    } catch {
        setMensaje('msg-email', 'No se pudo conectar con el servidor.', 'error');
        btn.disabled = false;
    }
}

async function solicitarCodigoTelefono() {
    const telefono = document.getElementById('telefono-registro').value.trim();
    setMensaje('msg-tel', '');

    if (!telefono || telefono.replace(/[^0-9]/g, '').length < 7) {
        setMensaje('msg-tel', 'Ingresá un número de teléfono válido.', 'error');
        return;
    }
    if (!canalActual) {
        setMensaje('msg-tel', 'Elegí un canal (WhatsApp) para recibir el código.', 'error');
        return;
    }

    const btn = document.getElementById('btn-code-tel');
    btn.disabled = true;

    try {
        const res = await apiFetch(`${API_BASE_URL}/api/verification/send-code.php`, {
            method: 'POST',
            body: JSON.stringify({ telefono }),
        });

        if (!res.ok) {
            setMensaje('msg-tel', await leerError(res), 'error');
            btn.disabled = false;
            return;
        }

        setMensaje('msg-tel', 'Código enviado por WhatsApp.', 'ok');
        iniciarCooldown(btn);
    } catch {
        setMensaje('msg-tel', 'No se pudo conectar con el servidor.', 'error');
        btn.disabled = false;
    }
}

// ── REGISTRO: CREAR CUENTA (verifica el código) ──────────────

async function crearCuenta() {
    if (!codigoListo) return;

    const nombre   = document.getElementById('nombre').value.trim();
    const usuario  = document.getElementById('usuario').value.trim();
    const password = document.getElementById('password-registro').value;
    const email    = metodoActual === 'email'    ? document.getElementById('email-registro').value.trim()    : '';
    const telefono = metodoActual === 'telefono' ? document.getElementById('telefono-registro').value.trim() : '';
    const code     = leerOtp(metodoActual === 'email' ? 'otp-email' : 'otp-tel');

    const msgId = metodoActual === 'email' ? 'msg-email' : 'msg-tel';
    setMensaje(msgId, '');

    if (!nombre || !usuario || !password) {
        setMensaje(msgId, 'Completá nombre, usuario y contraseña antes de confirmar el código.', 'error');
        return;
    }
    if (password.length < 6) {
        setMensaje(msgId, 'La contraseña debe tener al menos 6 caracteres.', 'error');
        return;
    }

    const btn = document.getElementById('btn-crear-cuenta');
    btn.disabled = true;
    btn.textContent = 'Creando cuenta…';

    try {
        const res = await apiFetch(`${API_BASE_URL}/api/verification/verify-code.php`, {
            method: 'POST',
            body: JSON.stringify({ nombre, usuario, password, email, telefono, code }),
        });

        if (!res.ok) {
            setMensaje(msgId, await leerError(res), 'error');
            btn.disabled = false;
            btn.textContent = 'Crear cuenta';
            return;
        }

        // Cuenta creada: iniciamos sesión automáticamente para no
        // pedirle al usuario que vuelva a escribir sus credenciales.
        const loginRes = await apiFetch(`${API_BASE_URL}/api/auth/login.php`, {
            method: 'POST',
            body: JSON.stringify({ identifier: email || telefono, password }),
        });

        if (loginRes.ok) {
            const data = await loginRes.json();
            sessionStorage.setItem('trinity_user', JSON.stringify(data.usuario));
            if (window.setCsrfToken) setCsrfToken(data.csrf_token);
        }

        window.location.href = '../../index.html';
    } catch {
        setMensaje(msgId, 'No se pudo conectar con el servidor.', 'error');
        btn.disabled = false;
        btn.textContent = 'Crear cuenta';
    }
}

// ── RECUPERAR CONTRASEÑA ──────────────────────────────────────

async function manejarRecuperar(e) {
    e.preventDefault();

    const email = document.getElementById('forgot-email').value.trim();
    if (!email) {
        setMensaje('msg-forgot', 'Ingresá tu email.', 'error');
        return;
    }

    const btn = document.getElementById('btn-recuperar');
    btn.disabled = true;
    btn.textContent = 'Enviando…';

    try {
        const res = await apiFetch(`${API_BASE_URL}/api/auth/request-reset.php`, {
            method: 'POST',
            body: JSON.stringify({ email }),
        });

        // Siempre mostramos el mismo mensaje exista o no la cuenta
        // (así no se puede usar este formulario para descubrir emails
        // registrados) — el backend hace lo mismo del lado servidor.
        if (res.ok) {
            setMensaje('msg-forgot', 'Si el email existe, te enviamos un link para restablecer tu contraseña.', 'ok');
        } else {
            setMensaje('msg-forgot', await leerError(res), 'error');
        }
    } catch {
        setMensaje('msg-forgot', 'No se pudo conectar con el servidor.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar link →';
    }
}

// ── INIT ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('m') === 'register') irA('registro');
    mostrarCardActiva();

    document.getElementById('form-login').addEventListener('submit', manejarLogin);
    document.getElementById('form-recuperar').addEventListener('submit', manejarRecuperar);
});

// Cada vez que cambia la card (#card / #registro / #recuperar) mostramos
// solo esa card y reseteamos el estado del registro, así siempre arranca limpio.
window.addEventListener('hashchange', () => {
    mostrarCardActiva();
    resetRegistro();
});
