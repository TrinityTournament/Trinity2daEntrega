// ══════════════════════════════════════════
//  TRINITY — Restablecer contraseña
//  Lee ?token= de la URL, lo valida contra el backend y,
//  si es válido, permite fijar una nueva contraseña.
// ══════════════════════════════════════════

function togglePassword(id, icon) {
    const input = document.getElementById(id);
    input.type        = input.type === 'password' ? 'text' : 'password';
    icon.style.opacity = input.type === 'text' ? '1' : '0.6';
}

function mostrarCard(id) {
    ['card-verificando', 'card-form', 'card-invalido', 'card-exito'].forEach(cardId => {
        document.getElementById(cardId).style.display = cardId === id ? '' : 'none';
    });
}

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

const token = new URLSearchParams(window.location.search).get('token') || '';

async function verificarToken() {
    if (!token) {
        mostrarCard('card-invalido');
        return;
    }

    try {
        const res  = await apiFetch(`${API_BASE_URL}/api/auth/verify-token.php?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        mostrarCard(data.valido ? 'card-form' : 'card-invalido');
    } catch {
        mostrarCard('card-invalido');
    }
}

async function manejarSubmit(e) {
    e.preventDefault();

    const nueva     = document.getElementById('nueva-password').value;
    const confirmar = document.getElementById('confirmar-password').value;

    if (nueva.length < 6) {
        setMensaje('msg-reset', 'La contraseña debe tener al menos 6 caracteres.', 'error');
        return;
    }
    if (nueva !== confirmar) {
        setMensaje('msg-reset', 'Las contraseñas no coinciden.', 'error');
        return;
    }

    const btn = document.getElementById('btn-reset');
    btn.disabled = true;
    btn.textContent = 'Guardando…';

    try {
        const res = await apiFetch(`${API_BASE_URL}/api/auth/do-reset.php`, {
            method: 'POST',
            body: JSON.stringify({ token, nueva_password: nueva }),
        });

        if (!res.ok) {
            setMensaje('msg-reset', await leerError(res), 'error');
            btn.disabled = false;
            btn.textContent = 'Restablecer contraseña';
            return;
        }

        mostrarCard('card-exito');
    } catch {
        setMensaje('msg-reset', 'No se pudo conectar con el servidor.', 'error');
        btn.disabled = false;
        btn.textContent = 'Restablecer contraseña';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    verificarToken();
    document.getElementById('form-nueva-password').addEventListener('submit', manejarSubmit);
});
