<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Verificar código y crear cuenta
//  Registro mínimo: nombre, usuario, password, email/tel + código.
//  fecha_nacimiento, tipo y deportes quedan NULL — se completan
//  después desde el perfil.
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\VerificationService;

SessionManager::start();

Controller::handle(function () {
    Request::requireMethod('POST');

    $body = Request::body();

    return (new VerificationService())->verifyAndRegister(
        trim((string) ($body['nombre']   ?? '')),
        trim((string) ($body['usuario']  ?? '')),
        (string) ($body['password'] ?? ''),
        trim((string) ($body['email']    ?? '')),
        trim((string) ($body['telefono'] ?? '')),
        trim((string) ($body['code']     ?? ''))
    );
});
