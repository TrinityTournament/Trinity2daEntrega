<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Promover primer administrador
//  POST con header X-Admin-Key: <ADMIN_KEY del .env>
//  Body: { id } | { usuario } | { email }
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\Auth;
use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\AdminService;

SessionManager::start();

Controller::handle(function () {
    Request::requireMethod('POST');
    Auth::requireAdminKey();

    $body = Request::body();

    return (new AdminService())->promoteFirstAdmin(
        isset($body['id']) ? (int) $body['id'] : null,
        $body['usuario'] ?? null,
        $body['email'] ?? null
    );
});
