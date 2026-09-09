<?php
// TRINITY — Fortnite: vincular cuenta
require_once __DIR__ . '/../../config.php';

use Trinity\Core\Auth;
use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\GameAccounts\FortniteService;

SessionManager::start();

Controller::handle(function () {
    Request::requireMethod('POST');
    Auth::validateCsrf();
    $user = Auth::requireLogin();

    $body = Request::body();
    return (new FortniteService())->save((int) $user['id'], (string) ($body['username'] ?? ''));
});
