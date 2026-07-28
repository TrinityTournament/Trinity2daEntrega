// ══════════════════════════════════════════
//  TRINITY — LOGIN (maquetado)
//  Primera entrega: solo cambia la vista de las
//  cards e interactúa visualmente con los formularios.
//  No hay backend: login, registro y recuperar
//  contraseña se conectan recién en la segunda entrega.
// ══════════════════════════════════════════

let metodoActual  = null; // 'email' | 'telefono'
let canalActual   = null; // 'whatsapp'

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
    canalActual  = null;

    document.querySelectorAll('.metodo-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('visible'));
    document.querySelectorAll('.canal-btn').forEach(b => {
        b.classList.remove('active');
        b.disabled = false;
    });
    document.getElementById('col-der').classList.remove('visible');
    limpiarOtp('otp-email');
    limpiarOtp('otp-tel');
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
        canalActual = null;
        document.querySelectorAll('.canal-btn').forEach(b => {
            b.classList.remove('active');
            b.disabled = false;
        });
    }
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
}

function otpBack(event, input, groupId) {
    if (event.key === 'Backspace' && !input.value) {
        const inputs = [...document.querySelectorAll(`#${groupId} input`)];
        const idx    = inputs.indexOf(input);
        if (idx > 0) inputs[idx - 1].focus();
    }
}

// ── INIT ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('m') === 'register') irA('registro');
    mostrarCardActiva();
});

// Cada vez que cambia la card (#card / #registro / #recuperar) mostramos
// solo esa card y reseteamos el estado del registro, así siempre arranca limpio.
window.addEventListener('hashchange', () => {
    mostrarCardActiva();
    resetRegistro();
});
