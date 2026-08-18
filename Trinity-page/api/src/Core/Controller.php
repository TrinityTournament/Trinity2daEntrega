<?php

namespace Trinity\Core;

/**
 * Ejecuta la lógica de un endpoint y traduce el resultado (o la
 * excepción) a una respuesta JSON. Evita repetir try/catch y
 * http_response_code en cada uno de los archivos de api/.
 */
final class Controller
{
    private function __construct()
    {
    }

    /**
     * @param callable():array<string,mixed> $handler Debe devolver el
     *        array de datos a serializar. Puede lanzar ApiException
     *        para errores de negocio (400/401/403/404/409...).
     */
    public static function handle(callable $handler): void
    {
        try {
            $data = $handler();
            Response::json(($data ?? []) + ['ok' => $data['ok'] ?? true]);
        } catch (ApiException $e) {
            $payload = ['error' => $e->getMessage()] + $e->getExtra();
            Response::json($payload, $e->getStatus());
        } catch (\Throwable $e) {
            error_log('[api] ' . get_class($e) . ': ' . $e->getMessage());
            Response::json(['error' => 'Error interno del servidor.'], 500);
        }
    }
}
