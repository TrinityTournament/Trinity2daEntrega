<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Bootstrap de la API
//
//  1. Registra el autoloader de las clases propias (namespace
//     Trinity\...) que viven en src/ (dentro de esta misma carpeta).
//  2. Carga variables de entorno desde .env (vlucas/phpdotenv),
//     con fallback a variables ya presentes en el entorno
//     (Apache SetEnv / Docker env_file).
//
//  Todo endpoint bajo app/ debe empezar con:
//      require_once __DIR__ . '/../config.php';   (o la ruta
//      relativa que corresponda según su profundidad)
//
//  UBICACIÓN: esta carpeta (app/) vive AFUERA de Trinity-page,
//  como hermana suya (no anidada). No tiene su propio vendor/ ni
//  .env — reutiliza los de Trinity-page, que es donde vive el
//  composer.json real. Si el nombre de esa carpeta cambia, hay
//  que actualizar las dos rutas de abajo.
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
// vendor/ vive dentro de Trinity-page (hermana de app/), no acá.
require_once __DIR__ . '/../Trinity-page/vendor/autoload.php';

// ── CARGAR .env ────────────────────────────────────────────
// El .env real también vive en Trinity-page, no en app/.
// En Docker las variables llegan por env_file/environment y ya
// están presentes; createImmutable + safeLoad no las pisa.
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../Trinity-page');
$dotenv->safeLoad();
