<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Ejecutar reset de contraseña
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Services\AuthService;

Controller::handle(function () {
    Request::requireMethod('POST');
    $body = Request::body();
    return (new AuthService())->resetPassword(
        trim((string) ($body['token'] ?? '')),
        trim((string) ($body['nueva_password'] ?? ''))
    );
});
