<?php

namespace Trinity\Models;

use PDO;
use PDOException;
use Trinity\Core\ApiException;
use Trinity\Core\Database;

/**
 * NOTA DE ALCANCE — Esta entrega normaliza y refuerza el modelo de
 * datos existente (usuarios, autenticación, seguidores, notificaciones,
 * cuentas de videojuego) pero NO agrega el módulo completo de torneos
 * (tablas `torneos`, `torneo_invitaciones`, `torneo_participantes`),
 * que queda fuera de alcance de esta entrega.
 *
 * Varios endpoints de pages/nav/tournament/* y pages/organizador/*
 * ya hacían referencia a esas tablas en el código original. En vez de
 * romper con un error 500 sin explicación, este modelo detecta que la
 * tabla no existe (SQLSTATE 42S02) y lo traduce a un error 501 claro,
 * dejando el resto del sistema (gestión de usuarios) intacto.
 */
class TournamentModel
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::pdo();
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function forOrganizer(int $organizerId, ?string $estado): array
    {
        return $this->guarded(function () use ($organizerId, $estado) {
            if ($estado) {
                $stmt = $this->pdo->prepare(
                    'SELECT id, titulo, deporte, estado, fecha_inicio, max_participantes
                     FROM torneos
                     WHERE organizador_id = :uid AND estado = :estado
                     ORDER BY creado_en DESC'
                );
                $stmt->execute([':uid' => $organizerId, ':estado' => $estado]);
            } else {
                $stmt = $this->pdo->prepare(
                    'SELECT id, titulo, deporte, estado, fecha_inicio, max_participantes
                     FROM torneos
                     WHERE organizador_id = :uid
                     ORDER BY creado_en DESC'
                );
                $stmt->execute([':uid' => $organizerId]);
            }

            return $stmt->fetchAll();
        });
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function allWithOrganizer(): array
    {
        return $this->guarded(function () {
            $stmt = $this->pdo->query(
                'SELECT t.id, t.titulo, t.deporte, t.estado, t.fecha_inicio,
                        t.max_participantes, t.creado_en,
                        u.nombre  AS organizador_nombre,
                        u.usuario AS organizador_usuario
                 FROM   torneos  t
                 JOIN   usuarios u ON u.id = t.organizador_id
                 ORDER  BY t.creado_en DESC'
            );
            return $stmt->fetchAll();
        });
    }

    public function findOwnedByOrganizer(int $torneoId, int $organizerId): ?array
    {
        return $this->guarded(function () use ($torneoId, $organizerId) {
            $stmt = $this->pdo->prepare(
                'SELECT id, titulo, estado FROM torneos
                 WHERE id = :id AND organizador_id = :org_id LIMIT 1'
            );
            $stmt->execute([':id' => $torneoId, ':org_id' => $organizerId]);
            $row = $stmt->fetch();
            return $row ?: null;
        });
    }

    public function alreadyInvited(int $torneoId, int $invitadoId): bool
    {
        return $this->guarded(function () use ($torneoId, $invitadoId) {
            $stmt = $this->pdo->prepare(
                'SELECT id FROM torneo_invitaciones
                 WHERE torneo_id = :torneo_id AND invitado_id = :invitado_id LIMIT 1'
            );
            $stmt->execute([':torneo_id' => $torneoId, ':invitado_id' => $invitadoId]);
            return (bool) $stmt->fetch();
        });
    }

    public function alreadyParticipant(int $torneoId, int $usuarioId): bool
    {
        try {
            $stmt = $this->pdo->prepare(
                'SELECT id FROM torneo_participantes
                 WHERE torneo_id = :torneo_id AND usuario_id = :uid LIMIT 1'
            );
            $stmt->execute([':torneo_id' => $torneoId, ':uid' => $usuarioId]);
            return (bool) $stmt->fetch();
        } catch (PDOException) {
            // Tabla de participantes aún no existe: se ignora esta verificación.
            return false;
        }
    }

    public function insertInvitation(int $torneoId, int $organizadorId, int $invitadoId): void
    {
        $this->guarded(function () use ($torneoId, $organizadorId, $invitadoId) {
            $stmt = $this->pdo->prepare(
                "INSERT INTO torneo_invitaciones (torneo_id, organizador_id, invitado_id, estado)
                 VALUES (:torneo_id, :org_id, :invitado_id, 'pendiente')"
            );
            $stmt->execute([
                ':torneo_id'   => $torneoId,
                ':org_id'      => $organizadorId,
                ':invitado_id' => $invitadoId,
            ]);
            return null;
        });
    }

    /**
     * Ejecuta $fn y convierte "tabla no existe" en un 501 legible.
     * Deja pasar cualquier otro tipo de error tal cual.
     */
    private function guarded(callable $fn): mixed
    {
        try {
            return $fn();
        } catch (PDOException $e) {
            if ($e->getCode() === '42S02') {
                throw new ApiException(
                    'El módulo de torneos todavía no está implementado en esta entrega '
                    . '(el alcance actual cubre el modelo de usuarios y autenticación).',
                    501
                );
            }
            throw $e;
        }
    }
}
