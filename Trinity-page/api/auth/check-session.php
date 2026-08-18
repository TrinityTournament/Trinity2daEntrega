<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Verificar sesión activa
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\AuthService;

SessionManager::start();

Controller::handle(function () {
    Request::requireMethod('GET');
    return (new AuthService())->checkSession();
});
