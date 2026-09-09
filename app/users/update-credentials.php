<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Actualizar credenciales (email sin código, o
//  teléfono con código OTP enviado previamente por send-code.php)
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\Auth;
use Trinity\Core\ApiException;
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

    $service = new ProfileService();

    if ($email && !$telefono) {
        return $service->updateEmail((int) $user['id'], $email);
    }
    if ($telefono && $code) {
        return $service->updatePhone((int) $user['id'], $telefono, $code);
    }

    throw new ApiException('Datos insuficientes. Se requiere email o (telefono + code).', 400);
});
