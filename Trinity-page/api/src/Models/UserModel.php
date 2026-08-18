<?php

namespace Trinity\Models;

use PDO;
use PDOException;
use Trinity\Core\Database;

/**
 * Acceso a datos de la tabla `usuarios`. Ningún endpoint debería
 * escribir SQL directo sobre esta tabla — todo pasa por acá.
 */
class UserModel
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::pdo();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM usuarios WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM usuarios WHERE email = :email LIMIT 1');
        $stmt->execute([':email' => $email]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findByTelefono(string $telefono): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM usuarios WHERE telefono = :tel LIMIT 1');
        $stmt->execute([':tel' => $telefono]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findByUsuario(string $usuario): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM usuarios WHERE usuario = :usuario LIMIT 1');
        $stmt->execute([':usuario' => $usuario]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Login por email o teléfono según el formato del identificador.
     */
    public function findByIdentifier(string $identifier): ?array
    {
        $campo = str_contains($identifier, '@') ? 'email' : 'telefono';
        $stmt  = $this->pdo->prepare("SELECT * FROM usuarios WHERE {$campo} = :val LIMIT 1");
        $stmt->execute([':val' => $identifier]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function existsEmail(string $email, ?int $excludeId = null): bool
    {
        return $this->existsBy('email', $email, $excludeId);
    }

    public function existsTelefono(string $telefono, ?int $excludeId = null): bool
    {
        return $this->existsBy('telefono', $telefono, $excludeId);
    }

    public function existsUsuario(string $usuario, ?int $excludeId = null): bool
    {
        return $this->existsBy('usuario', $usuario, $excludeId);
    }

    private function existsBy(string $column, string $value, ?int $excludeId): bool
    {
        $sql = "SELECT id FROM usuarios WHERE {$column} = :val";
        $params = [':val' => $value];

        if ($excludeId !== null) {
            $sql .= ' AND id != :exclude';
            $params[':exclude'] = $excludeId;
        }

        $stmt = $this->pdo->prepare($sql . ' LIMIT 1');
        $stmt->execute($params);
        return (bool) $stmt->fetch();
    }

    /**
     * Crea un usuario mínimo (registro). El resto del perfil se
     * completa después vía updateFields().
     *
     * @throws PDOException si viola una restricción UNIQUE.
     */
    public function create(string $nombre, string $usuario, string $passwordHash, ?string $email, ?string $telefono): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO usuarios (nombre, usuario, password, email, telefono)
             VALUES (:nombre, :usuario, :password, :email, :telefono)'
        );
        $stmt->execute([
            ':nombre'   => $nombre,
            ':usuario'  => $usuario,
            ':password' => $passwordHash,
            ':email'    => $email ?: null,
            ':telefono' => $telefono ?: null,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function updatePassword(int $id, string $passwordHash): void
    {
        $stmt = $this->pdo->prepare('UPDATE usuarios SET password = :pass WHERE id = :id');
        $stmt->execute([':pass' => $passwordHash, ':id' => $id]);
    }

    /**
     * Actualiza un conjunto arbitrario de columnas (whitelist de nombres
     * ya validada por el Service que llama a este método).
     *
     * @param array<string,mixed> $fields columna => valor
     */
    public function updateFields(int $id, array $fields): void
    {
        if (empty($fields)) {
            return;
        }

        $set    = [];
        $params = [':id' => $id];

        foreach ($fields as $column => $value) {
            $placeholder          = ':' . $column;
            $set[]                = "{$column} = {$placeholder}";
            $params[$placeholder] = $value;
        }

        $sql  = 'UPDATE usuarios SET ' . implode(', ', $set) . ' WHERE id = :id';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
    }

    public function delete(int $id): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM usuarios WHERE id = :id');
        $stmt->execute([':id' => $id]);
    }

    /**
     * Listado completo para el panel de administración.
     *
     * @return array<int,array<string,mixed>>
     */
    public function allForAdmin(): array
    {
        $stmt = $this->pdo->query(
            'SELECT id, nombre, usuario, email, telefono, rol,
                    torneos_jugados, torneos_ganados, creado_en
             FROM   usuarios
             ORDER  BY creado_en DESC'
        );

        $usuarios = $stmt->fetchAll();
        foreach ($usuarios as &$u) {
            $u['id'] = (int) $u['id'];
        }
        unset($u);

        return $usuarios;
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function search(string $query, int $limit = 8): array
    {
        $like = '%' . $query . '%';
        $stmt = $this->pdo->prepare(
            'SELECT id, nombre, usuario, foto_url
             FROM   usuarios
             WHERE  usuario LIKE :q OR nombre LIKE :q2
             ORDER BY
                 CASE WHEN usuario LIKE :q3 THEN 0 ELSE 1 END,
                 nombre ASC
             LIMIT :lim'
        );
        $stmt->bindValue(':q', $like);
        $stmt->bindValue(':q2', $like);
        $stmt->bindValue(':q3', $like);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    /**
     * Cambia el rol de un usuario. Devuelve true si efectivamente
     * se modificó una fila (el usuario existía).
     */
    public function setRole(int $id, string $rol): bool
    {
        $stmt = $this->pdo->prepare('UPDATE usuarios SET rol = :rol WHERE id = :id');
        $stmt->execute([':rol' => $rol, ':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Usuarios cuyo listado de deportes preferidos incluye $deporte
     * (usado para segmentar el anuncio masivo de un torneo).
     *
     * @return array<int,array<string,mixed>>
     */
    public function findTargetedBySport(string $deporte): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, email, telefono, notif_whatsapp
             FROM   usuarios
             WHERE  JSON_CONTAINS(deportes_seleccionados, :deporte)'
        );
        $stmt->execute([':deporte' => json_encode($deporte)]);
        return $stmt->fetchAll();
    }

    /**
     * Todos los usuarios con datos de contacto, para un anuncio masivo
     * sin segmentar.
     *
     * @return array<int,array<string,mixed>>
     */
    public function allForBroadcast(): array
    {
        $stmt = $this->pdo->query('SELECT id, email, telefono, notif_whatsapp FROM usuarios');
        return $stmt->fetchAll();
    }

    /**
     * Perfil público (para pages/profile/acc/view.html), con contadores
     * de seguidores/seguidos calculados en la misma consulta.
     */
    public function publicProfile(int $targetId): ?array
    {
        $stmt = $this->pdo->prepare(
            "SELECT
                u.id, u.nombre, u.usuario, u.pronouns, u.descripcion, u.foto_url,
                u.tipo, u.deportes_seleccionados, u.videojuegos_seleccionados,
                u.torneos_jugados, u.torneos_ganados,
                (SELECT COUNT(*) FROM seguidores WHERE seguido_id  = u.id) AS seguidores,
                (SELECT COUNT(*) FROM seguidores WHERE seguidor_id = u.id) AS seguidos
             FROM usuarios u
             WHERE u.id = :id
             LIMIT 1"
        );
        $stmt->execute([':id' => $targetId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }
}
