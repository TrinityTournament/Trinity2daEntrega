<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Router para el servidor embebido de PHP
//
//  El servidor embebido (`php -S`) NO lee .htaccess ni entiende
//  ErrorDocument/mod_rewrite — eso es exclusivo de Apache. Por
//  eso, al pedir una URL que no existe, PHP muestra su propia
//  página "Not Found" en vez de pages/errors/404.html.
//
//  Este router hace que el server embebido se comporte igual
//  que Apache con el .htaccess del proyecto: si el archivo
//  pedido existe lo sirve normal, y si no, muestra el 404
//  personalizado con status code 404 real.
//
//  USO (desde la raíz del proyecto):
//    php -S localhost:8000 router.php
// ══════════════════════════════════════════════════════════

$uri  = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$file = __DIR__ . $uri;

// Archivo real en disco (asset, .php, .css, .js, etc.) -> que lo
// sirva el propio servidor embebido, tal cual haría con cualquier
// archivo estático o script PHP.
if ($uri !== '/' && file_exists($file) && !is_dir($file)) {
    return false;
}

// Raíz del sitio.
if ($uri === '/') {
    readfile(__DIR__ . '/index.html');
    return true;
}

// Pedido a una carpeta que sí existe pero sin archivo -> también 404,
// no tiene sentido listar directorios.
http_response_code(404);
readfile(__DIR__ . '/pages/errors/404.html');
return true;