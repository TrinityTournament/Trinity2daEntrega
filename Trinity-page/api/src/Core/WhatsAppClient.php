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

        return self::post('/api/whatsapp/broadcast', [
            'phones'  => $phones,
            'message' => $message,
        ], 60);
    }

    private static function post(string $path, array $payload, int $timeout): bool
    {
        // WA_BOT_HOST es "127.0.0.1" en local y "whatsapp" en Docker.
        $host = Env::get('WA_BOT_HOST', '127.0.0.1');
        $port = Env::get('WA_BOT_PORT', '3001');
        $url  = 'http://' . $host . ':' . $port . $path;

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'X-WA-Secret: ' . Env::get('WA_SECRET', ''),
            ],
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_CONNECTTIMEOUT => 3,
        ]);

        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return $code === 200;
    }
}
