<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Bootstrap de la API
//
//  1. Registra el autoloader de las clases propias (namespace
//     Trinity\...) que viven en api/src/.
//  2. Carga variables de entorno desde .env (vlucas/phpdotenv),
//     con fallback a variables ya presentes en el entorno
//     (Apache SetEnv / Docker env_file).
//
//  Todo endpoint bajo api/ debe empezar con:
//      require_once __DIR__ . '/../config.php';   (o la ruta
//      relativa que corresponda según su profundidad)
// ══════════════════════════════════════════════════════════

// ── AUTOLOADER PROPIO (namespace Trinity\...) ─────────────
spl_autoload_register(function (string $class): void {
    $prefix  = 'Trinity\\';
    $baseDir = __DIR__ . '/src/';

    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $file     = $baseDir . str_replace('\\', '/', $relative) . '.php';

    if (is_file($file)) {
        require $file;
    }
});

// ── AUTOLOADER DE COMPOSER (Dotenv, etc.) ─────────────────
require_once __DIR__ . '/../vendor/autoload.php';

// ── CARGAR .env ────────────────────────────────────────────
// En Docker las variables llegan por env_file/environment y ya
// están presentes; createImmutable + safeLoad no las pisa.
$dotenv = Dotenv\Dotenv::createImmutable(dirname(__DIR__));
$dotenv->safeLoad();
