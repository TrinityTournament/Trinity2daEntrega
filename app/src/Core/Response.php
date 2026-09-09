<?php

namespace Trinity\Core;

/**
 * Reemplaza a la antigua función global json_response().
 */
final class Response
{
    private function __construct()
    {
    }

    /**
     * @param array<string,mixed> $data
     */
    public static function json(array $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }
}
