<?php

namespace Trinity\Models;

use PDO;
use Trinity\Core\Database;

class GameAccountModel
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::pdo();
    }

    public function getIdentificador(int $userId, string $juego): ?string
    {
        $stmt = $this->pdo->prepare(
            'SELECT identificador FROM cuentas_videojuego
             WHERE usuario_id = :uid AND juego = :juego LIMIT 1'
        );
        $stmt->execute([':uid' => $userId, ':juego' => $juego]);
        $row = $stmt->fetch();
        return $row ? $row['identificador'] : null;
    }

    /**
     * Upsert: vincula o actualiza el identificador de la cuenta del juego.
     */
    public function upsert(int $userId, string $juego, string $identificador): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO cuentas_videojuego (usuario_id, juego, identificador)
             VALUES (:uid, :juego, :identificador)
             ON DUPLICATE KEY UPDATE identificador = VALUES(identificador)'
        );
        $stmt->execute([':uid' => $userId, ':juego' => $juego, ':identificador' => $identificador]);
    }
}
