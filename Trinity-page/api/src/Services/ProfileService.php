<?php

namespace Trinity\Services;

use PDOException;
use Trinity\Core\ApiException;
use Trinity\Core\SessionManager;
use Trinity\Models\FollowModel;
use Trinity\Models\UserModel;

class ProfileService
{
    private UserModel $users;
    private FollowModel $follows;

    /** Opciones válidas — mismas listas que en el código original. */
    private const DEPORTES_VALIDOS = ['Fútbol', 'Tenis', 'Basketball', 'Volleyball', 'Natación', 'Atletismo'];
    private const JUEGOS_VALIDOS   = ['Fortnite', 'Clash Royale', 'Valorant', 'League of Legends', 'Call of Duty', 'Rocket League'];
    private const PRONOUNS_VALIDOS = ['', 'He/him', 'She/her', 'He/they', 'She/they', 'They/them', 'Any'];

    public function __construct()
    {
        $this->users   = new UserModel();
        $this->follows = new FollowModel();
    }

    /**
     * @return array<string,mixed>
     */
    public function getPublicProfile(int $targetId, ?int $viewerId): array
    {
        if (!$targetId) {
            throw new ApiException('Se requiere el parámetro id.', 400);
        }

        $user = $this->users->publicProfile($targetId);
        if (!$user) {
            throw new ApiException('Usuario no encontrado.', 404);
        }

        $user['deportes_seleccionados'] = $user['deportes_seleccionados']
            ? (json_decode($user['deportes_seleccionados'], true) ?? [])
            : [];
        $user['videojuegos_seleccionados'] = $user['videojuegos_seleccionados']
            ? (json_decode($user['videojuegos_seleccionados'], true) ?? [])
            : [];

        $user['ya_sigue'] = false;
        if ($viewerId && $viewerId !== $targetId) {
            $user['ya_sigue'] = $this->follows->isFollowing($viewerId, $targetId);
        }

        unset($user['email'], $user['telefono'], $user['password']);

        return ['user' => $user];
    }

    /**
     * @param array<string,mixed> $body
     * @return array<string,mixed>
     */
    public function updateProfile(int $userId, array $body): array
    {
        $fields = [];

        if (isset($body['nombre']) && trim((string) $body['nombre']) !== '') {
            $nombre = trim((string) $body['nombre']);
            if (!preg_match('/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ0-9 ]+$/u', $nombre)) {
                throw new ApiException('El nombre solo puede contener letras, números y espacios.', 400);
            }
            $fields['nombre'] = $nombre;
        }

        if (isset($body['usuario']) && trim((string) $body['usuario']) !== '') {
            $usuario = trim((string) $body['usuario']);
            if (!preg_match('/^[a-zA-Z0-9]+$/', $usuario)) {
                throw new ApiException('El usuario solo puede contener letras y números, sin espacios ni caracteres especiales.', 400);
            }
            if ($this->users->existsUsuario($usuario, $userId)) {
                throw new ApiException('El nombre de usuario ya está en uso.', 409);
            }
            $fields['usuario'] = $usuario;
        }

        if (array_key_exists('fecha_nacimiento', $body)) {
            $fields['fecha_nacimiento'] = $body['fecha_nacimiento'] ?: null;
        }

        if (isset($body['tipo'])) {
            if (!in_array($body['tipo'], ['deportes', 'videojuegos'], true)) {
                throw new ApiException('Tipo inválido.', 400);
            }
            $fields['tipo'] = $body['tipo'];
        }

        if (isset($body['deportes'])) {
            $fields['deportes_seleccionados'] = json_encode(
                array_values($this->validarSeleccion($body['deportes'], self::DEPORTES_VALIDOS)),
                JSON_UNESCAPED_UNICODE
            );
        }

        if (isset($body['videojuegos'])) {
            $fields['videojuegos_seleccionados'] = json_encode(
                array_values($this->validarSeleccion($body['videojuegos'], self::JUEGOS_VALIDOS)),
                JSON_UNESCAPED_UNICODE
            );
        }

        if (array_key_exists('pronouns', $body)) {
            $pro = trim((string) ($body['pronouns'] ?? ''));
            if (!in_array($pro, self::PRONOUNS_VALIDOS, true)) {
                throw new ApiException('Pronombres no válidos.', 400);
            }
            $fields['pronouns'] = $pro ?: null;
        }

        if (array_key_exists('descripcion', $body)) {
            $fields['descripcion'] = mb_substr(trim((string) ($body['descripcion'] ?? '')), 0, 500) ?: null;
        }

        if (array_key_exists('notif_whatsapp', $body)) {
            $current = $this->users->findById($userId);
            if (empty($current['telefono'])) {
                throw new ApiException(
                    'Necesitás tener un número de teléfono registrado para activar las notificaciones de WhatsApp.',
                    422
                );
            }
            $fields['notif_whatsapp'] = $body['notif_whatsapp'] ? 1 : 0;
        }

        if (array_key_exists('foto_url', $body)) {
            $foto = $body['foto_url'];
            if ($foto === null || $foto === '') {
                $fields['foto_url'] = null;
            } else {
                if (!preg_match('/^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+\/=]+)$/', (string) $foto)) {
                    throw new ApiException('Formato de imagen inválido.', 400);
                }
                if (strlen((string) $foto) > 2 * 1024 * 1024) {
                    throw new ApiException('La imagen es demasiado grande.', 400);
                }
                $fields['foto_url'] = $foto;
            }
        }

        if (empty($fields)) {
            throw new ApiException('No hay datos para actualizar.', 400);
        }

        try {
            $this->users->updateFields($userId, $fields);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                throw new ApiException('El nombre de usuario ya está en uso.', 409);
            }
            throw new ApiException('Error al actualizar el perfil.', 500);
        }

        foreach ($fields as $column => $value) {
            SessionManager::setUserField($column, $value);
        }
        if (isset($body['deportes'])) {
            SessionManager::setUserField('deportes', array_values($body['deportes']));
        }
        if (isset($body['videojuegos'])) {
            SessionManager::setUserField('videojuegos', array_values($body['videojuegos']));
        }

        return [];
    }

    /**
     * @param mixed[] $items
     * @param string[] $opcionesValidas
     * @return string[]
     */
    private function validarSeleccion(mixed $items, array $opcionesValidas): array
    {
        if (!is_array($items)) {
            throw new ApiException('Formato de preferencias inválido.', 400);
        }
        if (count($items) > 10) {
            throw new ApiException('Demasiadas preferencias seleccionadas.', 400);
        }
        foreach ($items as $item) {
            if (!is_string($item) || !in_array($item, $opcionesValidas, true)) {
                throw new ApiException('Selección inválida.', 400);
            }
        }
        return $items;
    }

    /**
     * @return array<string,mixed>
     */
    public function checkEmailAvailable(int $userId, string $email): array
    {
        if (!$email) {
            throw new ApiException('Se requiere un email.', 400);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ApiException('El email no tiene un formato válido.', 400);
        }
        if ($this->users->existsEmail($email, $userId)) {
            throw new ApiException('Este email ya está vinculado a otra cuenta.', 409);
        }
        return [];
    }

    /**
     * @return array<string,mixed>
     */
    public function updateEmail(int $userId, string $email): array
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ApiException('El email no tiene un formato válido.', 400);
        }
        if ($this->users->existsEmail($email, $userId)) {
            throw new ApiException('Este email ya está vinculado a otra cuenta.', 409);
        }

        try {
            $this->users->updateFields($userId, ['email' => $email]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                throw new ApiException('Este email ya está registrado.', 409);
            }
            throw new ApiException('Error al actualizar el email.', 500);
        }

        SessionManager::setUserField('email', $email);
        return [];
    }

    /**
     * @return array<string,mixed>
     */
    public function updatePhone(int $userId, string $telefono, string $code): array
    {
        $telNorm = preg_replace('/[^0-9]/', '', $telefono);
        if (strlen($telNorm) < 7) {
            throw new ApiException('Número de teléfono inválido.', 400);
        }

        $stored = SessionManager::getVerificationCode($telNorm);
        if (!$stored) {
            throw new ApiException('No hay un código pendiente para este número.', 400);
        }
        if (time() > $stored['expiresAt']) {
            SessionManager::clearVerificationCode($telNorm);
            throw new ApiException('El código ha expirado. Solicitá uno nuevo.', 400);
        }
        if ($stored['code'] !== $code) {
            throw new ApiException('Código incorrecto. Intentá de nuevo.', 400);
        }

        SessionManager::clearVerificationCode($telNorm);

        if ($this->users->existsTelefono($telNorm, $userId)) {
            throw new ApiException('Este número ya está vinculado a otra cuenta.', 409);
        }

        try {
            $this->users->updateFields($userId, ['telefono' => $telNorm]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                throw new ApiException('Este número ya está registrado.', 409);
            }
            throw new ApiException('Error al actualizar el teléfono.', 500);
        }

        SessionManager::setUserField('telefono', $telNorm);
        return [];
    }

    /**
     * @return array<string,mixed>
     */
    public function changePasswordWithCode(int $userId, string $verifKey, string $code, string $newPassword): array
    {
        if (!$verifKey || !$code || !$newPassword) {
            throw new ApiException('Faltan datos.', 400);
        }
        if (strlen($newPassword) < 6) {
            throw new ApiException('La contraseña debe tener al menos 6 caracteres.', 400);
        }

        $stored = SessionManager::getVerificationCode($verifKey);
        if (!$stored) {
            throw new ApiException('No hay un código pendiente. Solicitá uno nuevo.', 400);
        }
        if (time() > $stored['expiresAt']) {
            SessionManager::clearVerificationCode($verifKey);
            throw new ApiException('El código expiró. Solicitá uno nuevo.', 400);
        }
        if ($stored['code'] !== $code) {
            throw new ApiException('Código incorrecto.', 400);
        }

        SessionManager::clearVerificationCode($verifKey);

        $hash = password_hash($newPassword, PASSWORD_BCRYPT);
        try {
            $this->users->updatePassword($userId, $hash);
        } catch (PDOException) {
            throw new ApiException('Error al actualizar la contraseña.', 500);
        }

        return [];
    }

    /**
     * @return array<string,mixed>
     */
    public function deleteAccount(int $userId): array
    {
        try {
            $this->users->delete($userId);
        } catch (PDOException) {
            throw new ApiException('Error al eliminar la cuenta.', 500);
        }

        SessionManager::destroy();
        return [];
    }
}
