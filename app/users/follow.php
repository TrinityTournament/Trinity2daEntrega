<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Seguir / dejar de seguir un usuario
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\Auth;
use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\SocialService;

SessionManager::start();

Controller::handle(function () {
    Request::requireMethod('POST');
    Auth::validateCsrf();
    $user = Auth::requireLogin();

    $body = Request::body();

    return (new SocialService())->toggleFollow(
        (int) $user['id'],
        (int) ($body['target_id'] ?? 0),
        trim((string) ($body['accion'] ?? ''))
    );
});
