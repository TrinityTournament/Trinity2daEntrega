const $ = (sel) => document.querySelector(sel);

const BANNER_PATH = '../../../assets/cards/tournament-banner/';
const BANNER_POR_DEPORTE = {
    'fútbol':       BANNER_PATH + 'FutbolBG.jpg',
    'futbol':       BANNER_PATH + 'FutbolBG.jpg',
    'brawl stars':  BANNER_PATH + 'BSBG.png',
    'clash royale': BANNER_PATH + 'ClashBG.jpeg',
    'fortnite':     BANNER_PATH + 'FortBG.jpg',
    'free fire':    BANNER_PATH + 'FreeBG.png',
    'minecraft':    BANNER_PATH + 'MineBG.jpg',
};

const state = { page: 1, totalPages: 1 };

document.addEventListener('DOMContentLoaded', init);

function init() {
    const params = new URLSearchParams(window.location.search);
    const disciplina = params.get('disciplina');
    if (disciplina) {
        const select = $('#f-disciplina');
        const target = normalizar(disciplina);
        const match = [...select.options].find((o) => normalizar(o.textContent) === target);
        if (match) select.value = match.value || match.textContent;
    }

    $('#search-form').addEventListener('submit', (e) => {
        e.preventDefault();
        state.page = 1;
        buscar();
    });
    $('#btn-prev-page').addEventListener('click', () => {
        if (state.page > 1) { state.page--; buscar(); }
    });
    $('#btn-next-page').addEventListener('click', () => {
        if (state.page < state.totalPages) { state.page++; buscar(); }
    });

    buscar();
}

function normalizar(str) {
    return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

async function buscar() {
    const grid = $('#results-grid');
    grid.innerHTML = '<div class="loading-spinner" style="margin:3rem auto;"></div>';

    const qs = new URLSearchParams({
        q:          $('#f-texto').value.trim(),
        disciplina: $('#f-disciplina').value,
        formato:    $('#f-formato').value,
        estado:     $('#f-estado').value,
        page:       String(state.page),
    });

    try {
        const res  = await apiFetch(`${API_BASE_URL}/../app/tournaments/search.php?${qs.toString()}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            grid.innerHTML = `<p class="no-tournaments">${escapeHtml(data.error || 'No se pudo cargar la búsqueda.')}</p>`;
            $('#results-count').textContent = '';
            $('#pagination').hidden = true;
            return;
        }

        renderResultados(data);
    } catch (err) {
        console.error('[buscar.js]', err);
        grid.innerHTML = '<p class="no-tournaments">No se pudo conectar con el servidor.</p>';
        $('#pagination').hidden = true;
    }
}

function renderResultados(data) {
    const grid = $('#results-grid');
    const torneos = data.torneos || [];

    $('#results-count').textContent = `${data.total} resultado${data.total === 1 ? '' : 's'}`;

    if (torneos.length === 0) {
        grid.innerHTML = '<p class="no-tournaments">No encontramos torneos con esos filtros. Probá con otra búsqueda.</p>';
        $('#pagination').hidden = true;
        return;
    }

    grid.innerHTML = torneos.map(buildCardHtml).join('');

    state.totalPages = Math.max(1, Math.ceil(data.total / data.per_page));
    $('#pagination').hidden = state.totalPages <= 1;
    $('#pagination-info').textContent = `Página ${state.page} de ${state.totalPages}`;
    $('#btn-prev-page').disabled = state.page <= 1;
    $('#btn-next-page').disabled = state.page >= state.totalPages;
}

function buildCardHtml(t) {
    const banner = BANNER_POR_DEPORTE[normalizar(t.deporte)] || null;
    const bannerStyle = banner
        ? `background-image:linear-gradient(135deg, rgba(192,0,10,.5), rgba(0,0,0,.6)), url('${banner}'); background-size:cover; background-position:center;`
        : `background:linear-gradient(135deg, rgba(192,0,10,.35), rgba(0,0,0,.6));`;

    const cupos = t.max_participantes ? `${t.max_participantes} cupos` : 'Cupos libres';
    const inscritosTxt = t.max_participantes ? `${t.inscritos}/${t.max_participantes} inscritos` : `${t.inscritos} inscritos`;
    const fechaTxt = t.fecha_inicio ? formatearFecha(t.fecha_inicio) : 'Sin fecha aún';

    return `
        <article class="entity-card-wrap">
            <a href="detalle.html?id=${t.id}" class="entity-card">
                <div class="entity-banner" style="${bannerStyle}">
                    <span class="badge badge-${t.estado}">${escapeHtml(t.estado_label)}</span>
                </div>
                <header class="entity-body">
                    <h3 class="entity-name">${escapeHtml(t.titulo)}</h3>
                    <div class="entity-meta">
                        <span>${escapeHtml(t.formato_label)}</span><span>·</span><span>${escapeHtml(cupos)}</span>
                    </div>
                </header>
                <footer class="entity-foot">
                    <span>${escapeHtml(fechaTxt)}</span>
                    <span>${escapeHtml(inscritosTxt)}</span>
                </footer>
            </a>
        </article>
    `;
}

function formatearFecha(fechaSql) {
    const d = new Date(fechaSql.replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) return fechaSql;
    return `Inicia ${d.toLocaleDateString('es-UY', { day: 'numeric', month: 'short' })}`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}
