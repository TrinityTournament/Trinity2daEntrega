<?php

namespace Trinity\Core;

/**
 * Acceso centralizado a variables de entorno (.env vía vlucas/phpdotenv,
 * con fallback a variables de entorno reales del sistema/Apache).
 */
final class Env
{
    private function __construct()
    {
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        $value = $_ENV[$key] ?? getenv($key);

        if ($value === false || $value === null || $value === '') {
            return $default;
        }

        return (string) $value;
    }
}
