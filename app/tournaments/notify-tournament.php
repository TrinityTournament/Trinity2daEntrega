<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Anuncio masivo de torneo (admin)
//  Crea notificaciones in-app + email + WhatsApp opt-in.
//  Seguridad: requiere ADMIN_KEY en el header X-Admin-Key.
//  Modo "test": envía WhatsApp directo a test_phone.
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\Auth;
use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Services\TournamentService;

Controller::handle(function () {
    Auth::requireAdminKey();
    Request::requireMethod('POST');

    $body = Request::body();

    return (new TournamentService())->notify(
        trim((string) ($body['titulo']      ?? '')),
        trim((string) ($body['descripcion'] ?? '')),
        trim((string) ($body['fecha']       ?? '')),
        trim((string) ($body['deporte']     ?? '')),
        trim((string) ($body['target']      ?? 'all')),
        trim((string) ($body['test_phone']  ?? ''))
    );
});
