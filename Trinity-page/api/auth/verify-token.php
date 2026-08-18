<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Verificar token de reset (GET)
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Services\AuthService;

Controller::handle(function () {
    Request::requireMethod('GET');
    return (new AuthService())->verifyResetToken(trim(Request::query('token', '') ?? ''));
});
