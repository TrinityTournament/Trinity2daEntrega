<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Invitar usuario a torneo
//  Body: { torneo_id: int, invitado_id: int }
//
//  NOTA: ver Trinity\Models\TournamentModel — responde 501
//  de forma controlada si el módulo de torneos aún no existe.
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\Auth;
use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\TournamentService;

SessionManager::start();

Controller::handle(function () {
    Request::requireMethod('POST');
    $user = Auth::requireLogin();

    $body = Request::body();

    return (new TournamentService())->invite(
        (int) $user['id'],
        (string) ($user['nombre']  ?? 'Un organizador'),
        (string) ($user['usuario'] ?? ''),
        (int) ($body['torneo_id']   ?? 0),
        (int) ($body['invitado_id'] ?? 0)
    );
});
