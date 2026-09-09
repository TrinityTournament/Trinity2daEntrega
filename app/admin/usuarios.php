<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Admin: gestión de usuarios
//  GET  → lista todos los usuarios
//  PATCH { id, rol } → cambia el rol de un usuario
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\ApiException;
use Trinity\Core\Auth;
use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\AdminService;

SessionManager::start();

Controller::handle(function () {
    $user = Auth::requireRole('admin');
    $service = new AdminService();

    if (Request::method() === 'GET') {
        return $service->listUsers();
    }

    if (Request::method() === 'PATCH') {
        $body = Request::body();
        return $service->changeRole(
            (int) $user['id'],
            (int) ($body['id'] ?? 0),
            trim((string) ($body['rol'] ?? ''))
        );
    }

    throw new ApiException('Método no permitido.', 405);
});
