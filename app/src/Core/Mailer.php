<?php

namespace Trinity\Core;

final class Mailer
{
    private function __construct()
    {
    }

    public static function send(string $toEmail, string $subject, string $htmlBody): bool
    {
        $apiKey = Env::get('BREVO_KEY', '');

        if (!$apiKey) {
            error_log('[Mailer] BREVO_KEY no configurada — email no enviado.');
            return false;
        }

        $payload = json_encode([
            'sender'      => ['email' => 'trinitysupportteam@gmail.com', 'name' => 'Trinity'],
            'to'          => [['email' => $toEmail]],
            'subject'     => $subject,
            'htmlContent' => $htmlBody,
        ]);

        $ch = curl_init('https://api.brevo.com/v3/smtp/email');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'api-key: ' . $apiKey,
        ]);

        $raw       = curl_exec($ch);
        $curlErr   = curl_error($ch);
        $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $ok = $httpCode >= 200 && $httpCode < 300;

        if (!$ok) {
            error_log(sprintf(
                '[Mailer] FALLÓ. HTTP %s. curl_error="%s". Respuesta: %s',
                $httpCode,
                $curlErr,
                $raw
            ));
        }

        return $ok;
    }
}
