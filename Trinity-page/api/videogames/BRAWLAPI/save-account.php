<?php
// TRINITY — Brawl Stars: vincular cuenta
// POST { tag: '#VOYUUUO' } → { ok: true, tag }
require_once __DIR__ . '/../../config.php';

use Trinity\Core\Auth;
use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\GameAccounts\BrawlStarsService;

SessionManager::start();

Controller::handle(function () {
    Request::requireMethod('POST');
    Auth::validateCsrf();
    $user = Auth::requireLogin();

    $body = Request::body();
    return (new BrawlStarsService())->save((int) $user['id'], (string) ($body['tag'] ?? ''));
});
