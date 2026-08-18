<?php

namespace Trinity\Services;

use PDOException;
use Trinity\Core\ApiException;
use Trinity\Core\Env;
use Trinity\Core\Mailer;
use Trinity\Core\SessionManager;
use Trinity\Core\WhatsAppClient;
use Trinity\Models\UserModel;

class VerificationService
{
    private UserModel $users;

    public function __construct()
    {
        $this->users = new UserModel();
    }

    /**
     * Envía un código de 6 dígitos por email. Soporta dos flujos:
     * registro (el email NO debe existir) y cambio de contraseña
     * (el email SÍ debe existir).
     *
     * @return array<string,mixed>
     */
    public function sendEmailCode(string $email, bool $cambioPassword): array
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ApiException('El email no es válido.', 400);
        }

        $existente = $this->users->findByEmail($email);

        if ($cambioPassword) {
            if (!$existente) {
                throw new ApiException('No encontramos una cuenta con ese email.', 404);
            }
        } elseif ($existente) {
            throw new ApiException('Este email ya está registrado. Iniciá sesión.', 409);
        }

        $code = $this->generateCode();
        SessionManager::setVerificationCode($email, $code, 600);

        $html = "
            <div style='font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0c1120;border-radius:12px;color:#f0f4ff;'>
                <h1 style='font-size:28px;margin-bottom:8px;'>TRINITY</h1>
                <p style='color:#6b7a9f;margin-bottom:24px;'>Verificación de cuenta</p>
                <h2 style='font-size:20px;margin-bottom:16px;'>Tu código de verificación</h2>
                <div style='background:#1a6fff;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px;'>
                    <span style='font-size:36px;font-weight:700;letter-spacing:12px;'>{$code}</span>
                </div>
                <p style='color:#6b7a9f;font-size:14px;'>Expira en 10 minutos. Si no solicitaste este código, ignorá este mensaje.</p>
            </div>
        ";

        if (!Mailer::send($email, 'Tu código de verificación de Trinity', $html)) {
            throw new ApiException('No se pudo enviar el correo. Intentá nuevamente.', 500);
        }

        return [];
    }

    /**
     * Envía un código de 6 dígitos por WhatsApp. Soporta registro,
     * cambio de contraseña y cambio de credencial (nuevo teléfono
     * desde el perfil, mientras esté logueado).
     *
     * @return array<string,mixed>
     */
    public function sendPhoneCode(string $telefono, bool $cambioCredencial, bool $cambioPassword): array
    {
        $telNorm = preg_replace('/[^0-9]/', '', $telefono);
        if (strlen($telNorm) < 7) {
            throw new ApiException('Número de teléfono inválido.', 400);
        }

        $existente = $this->users->findByTelefono($telNorm);

        if ($existente) {
            if ($cambioCredencial || $cambioPassword) {
                $propioId = (int) (SessionManager::user()['id'] ?? 0);
                if (!$propioId || (int) $existente['id'] !== $propioId) {
                    if ($cambioPassword) {
                        throw new ApiException('Ese número no está vinculado a tu cuenta.', 409);
                    }
                    throw new ApiException('Este número ya está vinculado a otra cuenta.', 409);
                }
                // Si es el propio usuario, se permite reenviar el código.
            } else {
                throw new ApiException('Este número ya está registrado. Iniciá sesión.', 409);
            }
        } elseif ($cambioPassword) {
            throw new ApiException('No encontramos una cuenta con ese teléfono.', 404);
        }

        $code = $this->generateCode();
        SessionManager::setVerificationCode($telNorm, $code, 600);

        $waText = $cambioPassword
            ? "*TRINITY*\n\nTu codigo para cambiar tu contraseña es: *{$code}*\n\n⏱ Expira en 10 minutos.\nSi no fuiste vos, ignorá este mensaje."
            : "*TRINITY*\n\nTu codigo de inicio es: *{$code}*\n\n⏱ Expira en 10 minutos.";

        if (!WhatsAppClient::send($telNorm, $waText)) {
            throw new ApiException('No se pudo enviar el código por WhatsApp. ¿El bot está activo?', 503);
        }

        return [];
    }

    /**
     * Verifica el código pendiente y crea la cuenta (registro mínimo).
     * fecha_nacimiento, tipo y deportes quedan NULL — se completan
     * después desde el perfil.
     *
     * @return array<string,mixed>
     */
    public function verifyAndRegister(
        string $nombre,
        string $usuario,
        string $password,
        string $email,
        string $telefono,
        string $code
    ): array {
        if (!preg_match('/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ0-9 ]+$/u', $nombre)) {
            throw new ApiException('El nombre solo puede contener letras, números y espacios.', 400);
        }
        if (!preg_match('/^[a-zA-Z0-9]+$/', $usuario)) {
            throw new ApiException('El usuario solo puede contener letras y números, sin espacios ni caracteres especiales.', 400);
        }
        if (!$code || !$nombre || !$usuario || !$password) {
            throw new ApiException('Faltan datos obligatorios.', 400);
        }
        if (!$email && !$telefono) {
            throw new ApiException('Se requiere email o teléfono.', 400);
        }

        $sessionKey = $email ?: $telefono;
        $stored     = SessionManager::getVerificationCode($sessionKey);

        if (!$stored) {
            throw new ApiException('No hay un código pendiente para este contacto.', 400);
        }
        if (time() > $stored['expiresAt']) {
            SessionManager::clearVerificationCode($sessionKey);
            throw new ApiException('El código ha expirado. Solicitá uno nuevo.', 400);
        }
        if ($stored['code'] !== $code) {
            throw new ApiException('Código incorrecto.', 400);
        }

        SessionManager::clearVerificationCode($sessionKey);

        if (
            $this->users->existsUsuario($usuario)
            || ($email && $this->users->existsEmail($email))
            || ($telefono && $this->users->existsTelefono($telefono))
        ) {
            throw new ApiException('El usuario, email o teléfono ya están registrados.', 409);
        }

        $passwordHash = password_hash($password, PASSWORD_BCRYPT);

        try {
            $this->users->create($nombre, $usuario, $passwordHash, $email ?: null, $telefono ?: null);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                throw new ApiException('El usuario, email o teléfono ya están registrados.', 409);
            }
            throw new ApiException('Error al guardar los datos del usuario.', 500);
        }

        if ($telefono) {
            $waMsg = "¡Bienvenido/a a *TRINITY*, {$nombre}! 🎉\n\n"
                   . "Tu cuenta fue creada exitosamente.\n"
                   . "Entrá a la plataforma y completá tu perfil para empezar a competir.\n\n"
                   . '🌐 ' . Env::get('APP_URL', '');
            WhatsAppClient::send($telefono, $waMsg);
        }

        return [];
    }

    private function generateCode(): string
    {
        return str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
    }
}
