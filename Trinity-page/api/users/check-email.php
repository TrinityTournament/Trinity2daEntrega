<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Verificar disponibilidad de email (logueado)
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\Auth;
use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\ProfileService;

SessionManager::start();

Controller::handle(function () {
    Request::requireMethod('POST');
    $user = Auth::requireLogin();

    $body = Request::body();
    return (new ProfileService())->checkEmailAvailable((int) $user['id'], trim((string) ($body['email'] ?? '')));
});
