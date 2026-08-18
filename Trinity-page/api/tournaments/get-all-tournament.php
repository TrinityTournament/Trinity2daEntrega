<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Admin: listar todos los torneos
//  Solo accesible para rol 'admin'.
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
    Request::requireMethod('GET');
    Auth::requireRole('admin');

    return (new TournamentService())->allForAdmin();
});
