<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Solicitar convertirse en organizador
//  POST (sin body) — llamar recién al aceptar los términos y
//  condiciones; ese click ES la aceptación.
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../../config.php';

use Trinity\Core\Auth;
use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\OrganizerService;

SessionManager::start();

Controller::handle(function () {
    Request::requireMethod('POST');
    Auth::validateCsrf();
    $user = Auth::requireLogin();

    return (new OrganizerService())->request((int) $user['id']);
});
