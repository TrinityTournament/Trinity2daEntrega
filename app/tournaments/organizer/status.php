<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Estado de la solicitud de organizador del usuario
//  GET — usado por tournament.html para decidir qué mostrar en
//  "Crear torneo": ir directo, pedir verificación, o avisar que
//  ya hay una solicitud pendiente.
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../../config.php';

use Trinity\Core\Auth;
use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\OrganizerService;

SessionManager::start();
header('Cache-Control: no-store');

Controller::handle(function () {
    Request::requireMethod('GET');
    $user = Auth::requireLogin();

    return (new OrganizerService())->status((int) $user['id']);
});
