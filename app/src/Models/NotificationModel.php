<?php

namespace Trinity\Models;

use PDO;
use Trinity\Core\Database;

class NotificationModel
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::pdo();
    }

    public function create(int $userId, string $tipo, string $titulo, string $mensaje, ?string $link = null): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, link)
             VALUES (:uid, :tipo, :titulo, :mensaje, :link)'
        );
        $stmt->execute([
            ':uid'     => $userId,
            ':tipo'    => $tipo,
            ':titulo'  => $titulo,
            ':mensaje' => $mensaje,
            ':link'    => $link,
        ]);
    }

    public function countUnread(int $userId): int
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) FROM notificaciones WHERE usuario_id = :uid AND leido = 0'
        );
        $stmt->execute([':uid' => $userId]);
        return (int) $stmt->fetchColumn();
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function paginatedForUser(int $userId, int $page, int $limit): array
    {
        $offset = ($page - 1) * $limit;

        // CONVERT_TZ asegura que el timestamp salga en UTC real,
        // así el 'Z' agregado es correcto y JS no suma offset.
        $stmt = $this->pdo->prepare(
            "SELECT id, tipo, titulo, mensaje, link, leido,
                    DATE_FORMAT(
                        CONVERT_TZ(creado_en, @@session.time_zone, '+00:00'),
                        '%Y-%m-%dT%TZ'
                    ) AS creado_en
             FROM   notificaciones
             WHERE  usuario_id = :uid
             ORDER  BY creado_en DESC
             LIMIT  :limit OFFSET :offset"
        );
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll();
        foreach ($rows as &$n) {
            $n['id']    = (int) $n['id'];
            $n['leido'] = (bool) $n['leido'];
        }
        unset($n);

        return $rows;
    }

    public function markAllRead(int $userId): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE notificaciones SET leido = 1 WHERE usuario_id = :uid AND leido = 0'
        );
        $stmt->execute([':uid' => $userId]);
    }

    public function markOneRead(int $notificationId, int $userId): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE notificaciones SET leido = 1 WHERE id = :id AND usuario_id = :uid'
        );
        $stmt->execute([':id' => $notificationId, ':uid' => $userId]);
    }
}
