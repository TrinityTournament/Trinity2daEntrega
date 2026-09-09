<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Actualizar perfil
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
    Auth::validateCsrf();
    $user = Auth::requireLogin();

    return (new ProfileService())->updateProfile((int) $user['id'], Request::body());
});
