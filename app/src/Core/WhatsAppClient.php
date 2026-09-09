<?php

namespace Trinity\Core;

/**
 * Reemplaza a whatsapp_send() y whatsapp_broadcast(). Habla por HTTP
 * con el bot de Node (carpeta /WhatsApp) que expone /api/whatsapp/send
 * y /api/whatsapp/broadcast.
 */
final class WhatsAppClient
{
    private function __construct()
    {
    }

    public static function send(string $phone, string $message): bool
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);
        if (strlen($phone) < 7) {
            return false;
        }

        if (!self::isConnected()) {
            error_log('[WhatsAppClient] Envío cancelado: el bot no está conectado.');
            return false;
        }

        return self::post('/api/whatsapp/send', [
            'phone'   => $phone,
            'message' => $message,
        ], 5);
    }

    /**
     * @param string[] $phones
     */
    public static function broadcast(array $phones, string $message): bool
    {
        if (empty($phones)) {
            return false;
        }

        if (!self::isConnected()) {
            error_log('[WhatsAppClient] Broadcast cancelado: el bot no está conectado.');
            return false;
        }

        return self::post('/api/whatsapp/broadcast', [
            'phones'  => $phones,
            'message' => $message,
        ], 60);
    }

    /**
     * GET /api/whatsapp/status → {"connected": true|false}
     * Se llama antes de cada send()/broadcast() para fallar rápido y con
     * un mensaje claro si el bot todavía no inició sesión en WhatsApp,
     * en vez de esperar el POST completo y recién ahí enterarnos por el 503.
     */
    public static function isConnected(): bool
    {
        $url = self::baseUrl() . '/api/whatsapp/status';

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => self::headers(),
            CURLOPT_TIMEOUT        => 5,
            CURLOPT_CONNECTTIMEOUT => 3,
        ]);

        $raw       = curl_exec($ch);
        $curlErrno = curl_errno($ch);
        $curlErr   = curl_error($ch);
        $code      = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($curlErrno !== 0 || $code !== 200 || $raw === false) {
            error_log(sprintf(
                '[WhatsAppClient] No se pudo verificar el estado del bot en %s. curl_errno=%s curl_error="%s" http_code=%s',
                $url,
                $curlErrno,
                $curlErr,
                $code
            ));
            return false;
        }

        $data = json_decode($raw, true);
        return is_array($data) && ($data['connected'] ?? false) === true;
    }

    private static function baseUrl(): string
    {
        // Si WA_BOT_URL está seteada (túnel público: ngrok, Cloudflare
        // Tunnel, etc.) se usa tal cual, con su propio esquema (https)
        // y sin necesidad de puerto explícito.
        $full = trim(Env::get('WA_BOT_URL', ''));
        if ($full !== '') {
            return rtrim($full, '/');
        }

        // Sin WA_BOT_URL: modo local/Docker de siempre.
        // WA_BOT_HOST es "127.0.0.1" en local y "whatsapp" en Docker.
        $host = Env::get('WA_BOT_HOST', '127.0.0.1');
        $port = Env::get('WA_BOT_PORT', '3001');
        return 'http://' . $host . ':' . $port;
    }

    private static function post(string $path, array $payload, int $timeout): bool
    {
        $url = self::baseUrl() . $path;

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => self::headers(true),
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_CONNECTTIMEOUT => 3,
        ]);

        $raw      = curl_exec($ch);
        $curlErrno = curl_errno($ch);
        $curlErr   = curl_error($ch);
        $code      = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $ok = $curlErrno === 0 && $code === 200;

        if (!$ok) {
            error_log(sprintf(
                '[WhatsAppClient] FALLÓ POST %s. curl_errno=%s curl_error="%s" http_code=%s respuesta=%s',
                $url,
                $curlErrno,
                $curlErr,
                $code,
                $raw === false ? '(sin respuesta)' : $raw
            ));
        }

        return $ok;
    }

    /**
     * Headers compartidos por status/send/broadcast. $withContentType
     * se omite en el GET de status, que no manda body.
     *
     * @return string[]
     */
    private static function headers(bool $withContentType = false): array
    {
        $headers = [
            'X-WA-Secret: ' . Env::get('WA_SECRET', ''),
            // Evita la página intersticial de ngrok (plan free) que
            // intercepta pedidos que no sean del navegador con el
            // header correcto. Inofensivo si no se usa ngrok.
            'ngrok-skip-browser-warning: true',
        ];
        if ($withContentType) {
            array_unshift($headers, 'Content-Type: application/json');
        }
        return $headers;
    }
}
