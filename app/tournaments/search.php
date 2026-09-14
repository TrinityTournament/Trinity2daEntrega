<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Búsqueda pública de torneos
//  GET ?q=&disciplina=&formato=&estado=&page=
//  No requiere sesión — usado por pages/nav/tournament/buscar.html
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Services\TournamentService;

header('Cache-Control: no-store');

Controller::handle(function () {
    Request::requireMethod('GET');

    return (new TournamentService())->searchPublic(
        trim((string) Request::query('q', '')),
        trim((string) Request::query('disciplina', '')),
        trim((string) Request::query('formato', '')),
        trim((string) Request::query('estado', '')),
        (int) Request::query('page', '1')
    );
});
