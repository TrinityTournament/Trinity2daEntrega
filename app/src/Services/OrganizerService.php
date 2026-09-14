<?php

namespace Trinity\Services;

use Trinity\Core\ApiException;
use Trinity\Core\WhatsAppClient;
use Trinity\Models\OrganizerRequestModel;
use Trinity\Models\UserModel;

/**
 * Flujo para pasar de 'participante' a 'organizador':
 *   1. El usuario ya tiene que tener un teléfono verificado en su
 *      cuenta (si no, se lo manda primero a Credenciales — ver
 *      wireCredentials() en edit.js, se reusa tal cual).
 *   2. Acepta los términos y condiciones (request() se llama recién
 *      ahí, así que "llamar a request()" ES "aceptar los términos").
 *   3. Se les avisa por WhatsApp a todos los admins con teléfono
 *      cargado, con instrucciones para responder /aprobar N o
 *      /rechazar N.
 *   4. El bot de WhatsApp (WhatsApp/main.js) detecta ese comando y
 *      llama a resolveByPhone() vía api/tournaments/organizer/resolve.php,
 *      autenticado con el mismo WA_SECRET que ya usa el resto del sistema.
 */
class OrganizerService
{
    private UserModel $users;
    private OrganizerRequestModel $requests;

    public function __construct()
    {
        $this->users    = new UserModel();
        $this->requests = new OrganizerRequestModel();
    }

    /**
     * @return array{id:int, estado:string}
     */
    public function request(int $userId): array
    {
        $user = $this->users->findById($userId);
        if (!$user) {
            throw new ApiException('Usuario no encontrado.', 404);
        }

        $rol = $user['rol'] ?? 'participante';
        if (in_array($rol, ['organizador', 'admin'], true)) {
            throw new ApiException('Ya tenés permisos para crear torneos.', 409);
        }

        if (empty($user['telefono'])) {
            throw new ApiException(
                'Necesitás un teléfono verificado en tu cuenta antes de solicitar ser organizador.',
                400
            );
        }

        $pendiente = $this->requests->findPendienteDeUsuario($userId);
        if ($pendiente) {
            throw new ApiException('Ya tenés una solicitud pendiente de aprobación.', 409);
        }

        $id = $this->requests->create($userId);

        $adminPhones = $this->users->adminPhones();
        if (!empty($adminPhones)) {
            $msg = "🛡️ *TRINITY* — Nueva solicitud de organizador\n\n"
                 . "Usuario: {$user['nombre']} (@{$user['usuario']})\n\n"
                 . "Para aprobar, respondé:\n/aprobar {$id}\n\n"
                 . "Para rechazar:\n/rechazar {$id}";
            WhatsAppClient::broadcast($adminPhones, $msg);
        }

        return ['id' => $id, 'estado' => 'pendiente'];
    }

    /**
     * @return array{rol:string, solicitud: array{id:int,estado:string,creado_en:string}|null}
     */
    public function status(int $userId): array
    {
        $user = $this->users->findById($userId);
        if (!$user) {
            throw new ApiException('Usuario no encontrado.', 404);
        }

        $ultima = $this->requests->findUltimaDeUsuario($userId);

        return [
            'rol'       => $user['rol'] ?? 'participante',
            'telefono'  => $user['telefono'] ?? null,
            'solicitud' => $ultima ? [
                'id'        => (int) $ultima['id'],
                'estado'    => $ultima['estado'],
                'creado_en' => $ultima['creado_en'],
            ] : null,
        ];
    }

    /**
     * Llamado por resolve.php cuando el bot detecta /aprobar o /rechazar.
     * Devuelve el texto que el bot le contesta al admin en WhatsApp.
     */
    public function resolveByPhone(string $telefono, string $accion, int $solicitudId): string
    {
        if (!in_array($accion, ['aprobar', 'rechazar'], true)) {
            return '⚠️ Comando no reconocido.';
        }

        $telNorm = preg_replace('/[^0-9]/', '', $telefono);
        $admin   = $this->users->findByTelefono($telNorm);

        if (!$admin || ($admin['rol'] ?? '') !== 'admin') {
            return '⛔ No tenés permisos de administrador en Trinity.';
        }

        $solicitud = $this->requests->find($solicitudId);
        if (!$solicitud) {
            return "⚠️ No encontré la solicitud #{$solicitudId}.";
        }
        if ($solicitud['estado'] !== 'pendiente') {
            return "⚠️ La solicitud #{$solicitudId} ya había sido " . $solicitud['estado'] . '.';
        }

        $nuevoEstado = $accion === 'aprobar' ? 'aprobado' : 'rechazado';
        $this->requests->resolver($solicitudId, $nuevoEstado, (int) $admin['id']);

        $solicitante = $this->users->findById((int) $solicitud['usuario_id']);
        $usuarioTag  = $solicitante ? '@' . $solicitante['usuario'] : "usuario #{$solicitud['usuario_id']}";

        if ($nuevoEstado === 'aprobado') {
            $this->users->setRole((int) $solicitud['usuario_id'], 'organizador');
            if ($solicitante && !empty($solicitante['telefono'])) {
                WhatsAppClient::send(
                    $solicitante['telefono'],
                    '🎉 *TRINITY* — ¡Tu solicitud para ser organizador fue aprobada! Ya podés crear torneos.'
                );
            }
            return "✅ Aprobado. {$usuarioTag} ya puede crear torneos.";
        }

        if ($solicitante && !empty($solicitante['telefono'])) {
            WhatsAppClient::send(
                $solicitante['telefono'],
                '❌ *TRINITY* — Tu solicitud para ser organizador fue rechazada. Podés volver a solicitarlo más adelante.'
            );
        }
        return "❌ Rechazado. Se avisó a {$usuarioTag}.";
    }
}
