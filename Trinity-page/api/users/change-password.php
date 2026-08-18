<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Cambiar contraseña (logueado + código OTP)
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

    $body     = Request::body();
    $email    = trim((string) ($body['email'] ?? ''));
    $telefono = trim((string) ($body['telefono'] ?? ''));
    $code     = trim((string) ($body['code'] ?? ''));
    $newPass  = (string) ($body['nueva_password'] ?? '');

    $verifKey = $email ?: ($telefono ? preg_replace('/[^0-9]/', '', $telefono) : '');

    return (new ProfileService())->changePasswordWithCode((int) $user['id'], $verifKey, $code, $newPass);
});
