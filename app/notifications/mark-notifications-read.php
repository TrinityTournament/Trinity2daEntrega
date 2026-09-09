<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Marcar notificaciones como leídas
//  Body: { id: int } → marca una sola | { all: true } → marca todas
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\Auth;
use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\NotificationService;

SessionManager::start();

Controller::handle(function () {
    Request::requireMethod('POST');
    $user = Auth::requireLogin();

    $body = Request::body();
    $id   = !empty($body['id']) ? (int) $body['id'] : null;
    $all  = !empty($body['all']);

    return (new NotificationService())->markRead((int) $user['id'], $id, $all);
});
