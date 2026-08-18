<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Torneos propios del organizador
//  Query param: ?estado=en_creacion  (o vacío para todos)
//
//  NOTA: el módulo de torneos (tabla `torneos`) está fuera del
//  alcance de esta entrega — ver Trinity\Models\TournamentModel.
//  Este endpoint responde 501 de forma controlada si la tabla
//  todavía no existe, en vez de un error 500 genérico.
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
    $user = Auth::requireLogin();

    $estado = trim((string) Request::query('estado', ''));
    return (new TournamentService())->myTournaments((int) $user['id'], $estado ?: null);
});
