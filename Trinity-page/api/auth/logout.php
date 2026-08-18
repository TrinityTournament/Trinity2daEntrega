<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Cerrar sesión
//  Destruye la sesión del lado del servidor (no alcanza con
//  que el front borre sessionStorage: la cookie PHPSESSID
//  seguiría siendo válida si no se llama a este endpoint).
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\Auth;
use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;

SessionManager::start();

Controller::handle(function () {
    Request::requireMethod('POST');

    if (SessionManager::isAuthenticated()) {
        Auth::validateCsrf();
        SessionManager::destroy();
    }

    return [];
});
