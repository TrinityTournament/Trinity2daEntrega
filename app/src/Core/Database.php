<?php

namespace Trinity\Core;

use PDO;
use PDOException;

/**
 * Punto único de acceso a la base de datos (patrón Singleton).
 *
 * Reemplaza a la antigua función global db(). Todos los Models
 * reciben la instancia de PDO a través de Database::pdo().
 */
final class Database
{
    private static ?PDO $instance = null;

    private function __construct()
    {
        // No instanciable — solo métodos estáticos.
    }

    public static function pdo(): PDO
    {
        if (self::$instance === null) {
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=%s',
                Env::get('DB_HOST', 'localhost'),
                Env::get('DB_PORT', '3306'),
                Env::get('DB_NAME', 'trinity'),
                'utf8mb4'
            );

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            try {
                self::$instance = new PDO(
                    $dsn,
                    Env::get('DB_USER', 'root'),
                    Env::get('DB_PASS', ''),
                    $options
                );
            } catch (PDOException $e) {
                error_log('[Database] Conexión fallida: ' . $e->getMessage());
                throw new ApiException('Error de conexión a la base de datos.', 500);
            }
        }

        return self::$instance;
    }
}
