<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Obtener notificaciones del usuario logueado
//  GET ?page=1&limit=20
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\Auth;
use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\NotificationService;

SessionManager::start();

Controller::handle(function () {
    Request::requireMethod('GET');
    $user = Auth::requireLogin();

    $page  = max(1, (int) Request::query('page', '1'));
    $limit = min(50, max(1, (int) Request::query('limit', '20')));

    return (new NotificationService())->list((int) $user['id'], $page, $limit);
});
