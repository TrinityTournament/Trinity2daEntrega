<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Enviar código de verificación
//  Soporta dos flujos: 1) email  2) teléfono (WhatsApp)
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\VerificationService;

SessionManager::start();

Controller::handle(function () {
    Request::requireMethod('POST');

    $body             = Request::body();
    $email            = trim((string) ($body['email'] ?? ''));
    $telefono         = trim((string) ($body['telefono'] ?? ''));
    $cambioPassword   = !empty($body['cambio_password']);
    $cambioCredencial = !empty($body['cambio_credencial']);

    $service = new VerificationService();

    if ($email) {
        return $service->sendEmailCode($email, $cambioPassword);
    }
    if ($telefono) {
        return $service->sendPhoneCode($telefono, $cambioCredencial, $cambioPassword);
    }

    throw new \Trinity\Core\ApiException('Se requiere email o teléfono.', 400);
});
