<?php

namespace Trinity\Core;

/**
 * Excepción de negocio para la capa de API.
 *
 * Cualquier Service puede lanzar esta excepción para comunicar un
 * error "esperado" (validación, permisos, recurso no encontrado, etc.)
 * junto con el código de estado HTTP que corresponde devolver.
 *
 * Controller::handle() la captura y la traduce a una respuesta JSON,
 * evitando repetir try/catch en cada endpoint.
 */
class ApiException extends \RuntimeException
{
    private int $status;

    /** @var array<string,mixed> */
    private array $extra;

    public function __construct(string $message, int $status = 400, array $extra = [])
    {
        parent::__construct($message);
        $this->status = $status;
        $this->extra  = $extra;
    }

    public function getStatus(): int
    {
        return $this->status;
    }

    /** @return array<string,mixed> */
    public function getExtra(): array
    {
        return $this->extra;
    }
}
