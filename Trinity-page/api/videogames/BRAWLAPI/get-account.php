<?php
// TRINITY — Brawl Stars: obtener cuenta vinculada
require_once __DIR__ . '/../../config.php';

use Trinity\Core\Auth;
use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\GameAccounts\BrawlStarsService;

SessionManager::start();

Controller::handle(function () {
    Request::requireMethod('GET');
    $user = Auth::requireLogin();
    return (new BrawlStarsService())->getAccount((int) $user['id']);
});
