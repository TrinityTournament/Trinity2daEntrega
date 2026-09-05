// ══════════════════════════════════════════════════════════
//  TRINITY — Crear torneo (pages/nav/tournament/crear.html)
// ══════════════════════════════════════════════════════════

const $ = (sel) => document.querySelector(sel);

function setMensaje(texto, tipo) {
    const el = $('#crear-msg');
    el.textContent = texto || '';
    el.classList.remove('msg-error', 'msg-ok');
    if (tipo) el.classList.add(tipo === 'ok' ? 'msg-ok' : 'msg-error');
}

function leerFormato() {
    const cards = document.querySelectorAll('input[name="formato"]');
    const seleccionado = Array.from(cards).find((r) => r.checked);
    if (!seleccionado) return '';
    // El texto visible de la card es lo que espera el backend (ver
    // TournamentService::FORMATO_LABELS).
    return seleccionado.closest('.option-card').querySelector('.option-card-title').textContent.trim();
}

function leerBannerComoDataUrl(inputFile) {
    return new Promise((resolve, reject) => {
        const file = inputFile.files && inputFile.files[0];
        if (!file) return resolve(null);

        if (file.size > 4 * 1024 * 1024) {
            return reject(new Error('El banner no puede pesar más de 4MB.'));
        }

        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('No se pudo leer la imagen del banner.'));
        reader.readAsDataURL(file);
    });
}

async function enviarTorneo(publicar) {
    const btnCrear    = $('#btn-crear');
    const btnBorrador = $('#btn-borrador');

    const titulo       = $('#ct-nombre').value.trim();
    const deporte      = $('#ct-disciplina').value;
    const cupo         = parseInt($('#ct-cupo').value, 10);
    const formato      = leerFormato();
    const fecha        = $('#ct-fecha').value;
    const visibilidad  = $('#ct-visibilidad').value;
    const descripcion  = $('#ct-desc').value.trim();

    if (!titulo || titulo.length < 3) {
        return setMensaje('Ponele un nombre al torneo (mínimo 3 caracteres).', 'error');
    }
    if (!cupo || cupo < 2) {
        return setMensaje('El cupo mínimo es de 2 participantes.', 'error');
    }
    if (!fecha) {
        return setMensaje('Elegí una fecha de inicio.', 'error');
    }

    btnCrear.disabled = true;
    btnBorrador.disabled = true;
    setMensaje(publicar ? 'Creando torneo...' : 'Guardando borrador...', null);

    try {
        let bannerUrl = null;
        try {
            bannerUrl = await leerBannerComoDataUrl($('#ct-banner'));
        } catch (err) {
            setMensaje(err.message, 'error');
            btnCrear.disabled = false;
            btnBorrador.disabled = false;
            return;
        }

        const res = await apiFetch(`${API_BASE_URL}/api/tournaments/create.php`, {
            method: 'POST',
            body: JSON.stringify({
                titulo,
                deporte,
                descripcion,
                formato,
                max_participantes: cupo,
                fecha_inicio: fecha,
                visibilidad,
                banner_url: bannerUrl,
                publicar,
            }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            setMensaje(data.error || 'No se pudo crear el torneo.', 'error');
            btnCrear.disabled = false;
            btnBorrador.disabled = false;
            return;
        }

        setMensaje(
            (data.mensaje || 'Listo.') +
            (data.id ? ` (ID #${data.id})` : ''),
            'ok'
        );

        // NOTA: todavía no redirigimos a "Mis torneos" / panel de organizador
        // porque esas pantallas son maquetado sin datos reales — se conectan
        // en un paso siguiente. Por ahora dejamos la confirmación acá mismo.
        btnCrear.disabled = false;
        btnBorrador.disabled = false;
    } catch (err) {
        console.error('[crear.js]', err);
        setMensaje('No se pudo conectar con el servidor.', 'error');
        btnCrear.disabled = false;
        btnBorrador.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    $('#btn-crear').addEventListener('click', () => enviarTorneo(true));
    $('#btn-borrador').addEventListener('click', () => enviarTorneo(false));
});
