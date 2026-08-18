<?php

namespace Trinity\Core;

/**
 * Envuelve el acceso a la request HTTP entrante ($_SERVER, $_GET, php://input).
 */
final class Request
{
    /** @var array<string,mixed>|null */
    private static ?array $bodyCache = null;

    private function __construct()
    {
    }

    public static function method(): string
    {
        return $_SERVER['REQUEST_METHOD'] ?? 'GET';
    }

    /**
     * Corta la ejecución con 405 si el método no coincide.
     */
    public static function requireMethod(string ...$methods): void
    {
        if (!in_array(self::method(), $methods, true)) {
            throw new ApiException('Método no permitido.', 405);
        }
    }

    /**
     * Body JSON de la request, decodificado como array asociativo.
     *
     * @return array<string,mixed>
     */
    public static function body(): array
    {
        if (self::$bodyCache === null) {
            $raw = file_get_contents('php://input');
            $decoded = json_decode($raw ?: '', true);
            self::$bodyCache = is_array($decoded) ? $decoded : [];
        }

        return self::$bodyCache;
    }

    public static function query(string $key, ?string $default = null): ?string
    {
        return isset($_GET[$key]) ? (string) $_GET[$key] : $default;
    }

    public static function header(string $name): ?string
    {
        $key = 'HTTP_' . str_replace('-', '_', strtoupper($name));
        return $_SERVER[$key] ?? null;
    }
}
