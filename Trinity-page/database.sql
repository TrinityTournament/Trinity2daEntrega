-- ═══════════════════════════════════════════════════════════════════
--  TRINITY — Esquema relacional (MySQL 8.0+ / MariaDB 10.5+)
-- ═══════════════════════════════════════════════════════════════════
--
--  NORMALIZACIÓN (forma normal aplicada por tabla)
--  ------------------------------------------------------------------
--  Todas las tablas cumplen 1FN (atributos atómicos, sin grupos
--  repetitivos), 2FN (no hay dependencias parciales — todas las claves
--  primarias son de un solo atributo) y 3FN (ningún atributo no clave
--  depende de otro atributo no clave; toda la información sobre un
--  usuario vive en `usuarios`, toda invitación vive en su propia fila,
--  etc.).
--
--  Las relaciones N:M se resuelven con tablas de unión dedicadas:
--    · seguidores          → relación N:M usuario-usuario (follows)
--    · cuentas_videojuego  → relación N:M usuario-videojuego
--  en vez de columnas repetidas o listas separadas por comas.
--
--  EXCEPCIÓN DELIBERADA (denormalización controlada):
--  `usuarios.deportes_seleccionados` y `usuarios.videojuegos_seleccionados`
--  guardan un array JSON en vez de vivir en tablas de unión propias
--  (usuario_deporte, usuario_videojuego). Se documenta como decisión
--  consciente: es una lista acotada (≤10 ítems) de un catálogo fijo
--  de opciones que se valida en la capa de aplicación
--  (ver ProfileService::DEPORTES_VALIDOS / JUEGOS_VALIDOS), se lee y
--  escribe siempre en conjunto (nunca se filtra "todos los usuarios
--  que juegan tenis" con una query SQL), y MySQL 8 soporta
--  JSON_CONTAINS() para las pocas consultas que sí necesitan filtrar
--  por ese campo (ver TournamentService::notify / target=deporte).
--  Si en una futura entrega se necesitara reportar/filtrar masivamente
--  por deporte, el camino natural es migrar a una tabla de unión.
--
--  CLAVES FORÁNEAS Y BORRADO EN CASCADA
--  ------------------------------------------------------------------
--  Todas las FK usan ON DELETE CASCADE: si se elimina un usuario
--  (delete-account.php), desaparecen automáticamente sus tokens de
--  reset, sus relaciones de seguimiento, sus cuentas de videojuego
--  vinculadas y sus notificaciones. Esto evita filas huérfanas sin
--  necesidad de borrados manuales en cada endpoint.
-- ═══════════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS trinity
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE trinity;

-- ── TABLA: usuarios ───────────────────────────────────────────────
-- Entidad central. PK autoincremental de un solo atributo (2FN).
-- email/usuario/telefono son NULL-ables pero UNIQUE: el registro
-- mínimo solo exige uno de los dos contactos (ver VerificationService).
CREATE TABLE IF NOT EXISTS usuarios (
    id                          INT UNSIGNED      NOT NULL AUTO_INCREMENT,
    nombre                      VARCHAR(120)      NOT NULL,
    fecha_nacimiento            DATE              NULL,
    usuario                     VARCHAR(60)       NOT NULL,
    tipo                        ENUM('deportes','videojuegos') NULL,
    deportes_seleccionados      JSON              NULL,
    videojuegos_seleccionados   JSON              NULL,
    password                    VARCHAR(255)      NOT NULL,
    email                       VARCHAR(180)      NULL,
    telefono                    VARCHAR(30)       NULL,
    pronouns                    VARCHAR(30)       NULL,
    descripcion                 VARCHAR(500)      NULL,
    foto_url                    MEDIUMTEXT        NULL,
    torneos_jugados             INT UNSIGNED      NOT NULL DEFAULT 0,
    torneos_ganados             INT UNSIGNED      NOT NULL DEFAULT 0,
    notif_whatsapp              TINYINT(1)        NOT NULL DEFAULT 0,
    rol                         ENUM('admin','organizador','participante') NOT NULL DEFAULT 'participante',
    creado_en                   TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_email    (email),
    UNIQUE KEY uq_usuario  (usuario),
    UNIQUE KEY uq_telefono (telefono)
    -- Nota: uq_email / uq_usuario / uq_telefono ya son índices por sí
    -- solas (toda UNIQUE KEY es un índice) — no se agregan índices
    -- adicionales redundantes sobre las mismas columnas.
) ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;

-- ── TABLA: password_resets ────────────────────────────────────────
-- Un token de un solo uso por solicitud de recuperación de contraseña.
-- Relación 1:N con usuarios (un usuario puede tener varios tokens
-- históricos; solo el más reciente y no usado es válido).
CREATE TABLE IF NOT EXISTS password_resets (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id  INT UNSIGNED NOT NULL,
    token       VARCHAR(64)  NOT NULL,
    expira_en   DATETIME     NOT NULL,
    usado       TINYINT(1)   NOT NULL DEFAULT 0,
    creado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_token (token),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ── TABLA: seguidores ─────────────────────────────────────────────
-- Tabla de unión para la relación N:M reflexiva usuario→usuario
-- ("sigue a"). La UNIQUE compuesta evita duplicar el mismo follow.
CREATE TABLE IF NOT EXISTS seguidores (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    seguidor_id INT UNSIGNED NOT NULL,
    seguido_id  INT UNSIGNED NOT NULL,
    creado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_seguidor_seguido (seguidor_id, seguido_id),
    FOREIGN KEY (seguidor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (seguido_id)  REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ── TABLA: codigos_verificacion ───────────────────────────────────
-- NOTA DE DISEÑO: esta tabla existe para persistir códigos OTP de
-- forma auditable (registro, cambio de credencial, cambio de
-- contraseña). La implementación actual de VerificationService
-- guarda el código en la sesión PHP del usuario (igual que el diseño
-- original), suficiente para el alcance de esta entrega y sin
-- infraestructura adicional. La tabla queda modelada y lista para
-- que una futura entrega persista los códigos acá en lugar de en
-- sesión (auditoría, multi-dispositivo, expiración centralizada en
-- DB en vez de en memoria del proceso PHP).
CREATE TABLE IF NOT EXISTS codigos_verificacion (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    destino     VARCHAR(180) NOT NULL,   -- email o telefono
    codigo      VARCHAR(10)  NOT NULL,
    tipo        VARCHAR(40)  NOT NULL,   -- 'registro', 'cambio_credencial', 'cambio_password'
    expira_en   DATETIME     NOT NULL,
    usado       TINYINT(1)   NOT NULL DEFAULT 0,
    creado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ── TABLA: cuentas_videojuego ─────────────────────────────────────
-- Tabla de unión para la relación N:M usuario↔videojuego: un usuario
-- puede vincular varias cuentas (una por juego) y cada juego admite
-- una cuenta vinculada por usuario. 'juego' es un slug fijo
-- ('clashroyale', 'brawlstars', 'fortnite', 'minecraft', ...) para
-- poder sumar más videojuegos sin alterar el esquema.
CREATE TABLE IF NOT EXISTS cuentas_videojuego (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id      INT UNSIGNED NOT NULL,
    juego           VARCHAR(40)  NOT NULL,
    identificador   VARCHAR(60)  NOT NULL,  -- tag de CR, nombre de Fortnite, UUID de Minecraft, etc.
    actualizado_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creado_en       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_usuario_juego (usuario_id, juego),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ── TABLA: notificaciones ─────────────────────────────────────────
-- Relación 1:N usuario→notificaciones. El índice compuesto acelera
-- el caso de uso más frecuente: "notificaciones no leídas de este
-- usuario, más recientes primero" (ver NotificationModel::paginatedForUser).
CREATE TABLE IF NOT EXISTS notificaciones (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    usuario_id  INT UNSIGNED    NOT NULL,
    tipo        VARCHAR(60)     NOT NULL,
    titulo      VARCHAR(200)    NOT NULL,
    mensaje     TEXT            NOT NULL,
    link        VARCHAR(500)    NULL,
    leido       TINYINT(1)      NOT NULL DEFAULT 0,
    creado_en   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_notif_usuario (usuario_id, leido, creado_en),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════════
--  NOTA SOBRE CONTRASEÑAS
--  El campo `usuarios.password` guarda el hash generado por
--  password_hash($plain, PASSWORD_BCRYPT) en PHP. Nunca se guardan
--  contraseñas en texto plano ni se las puede leer de vuelta.
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
--  MÓDULO DE TORNEOS
--  Antes quedaba fuera de alcance (ver TournamentModel, que respondía
--  501 de forma controlada mientras no existían estas tablas). Cubre
--  crear/buscar/inscribirse/invitar. Los brackets/resultados quedan
--  para una entrega futura — por ahora `estado` solo trackea el ciclo
--  de vida general del torneo, no el avance de partidos.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS torneos (
    id                  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    organizador_id      INT UNSIGNED  NOT NULL,
    titulo              VARCHAR(120)  NOT NULL,
    deporte             VARCHAR(60)   NOT NULL,
    descripcion         VARCHAR(1000) NULL,
    formato             ENUM('liga','eliminacion','suizo') NOT NULL,
    max_participantes   INT UNSIGNED  NOT NULL,
    fecha_inicio        DATE          NOT NULL,
    visibilidad         ENUM('publico','privado') NOT NULL DEFAULT 'publico',
    banner_url          MEDIUMTEXT    NULL,
    estado              ENUM('en_creacion','abierto','en_curso','finalizado','cancelado') NOT NULL DEFAULT 'en_creacion',
    creado_en           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_organizador (organizador_id, estado),
    INDEX idx_publico (visibilidad, estado, fecha_inicio),
    FOREIGN KEY (organizador_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS torneo_participantes (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    torneo_id   INT UNSIGNED NOT NULL,
    usuario_id  INT UNSIGNED NOT NULL,
    inscrito_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_torneo_usuario (torneo_id, usuario_id),
    FOREIGN KEY (torneo_id)  REFERENCES torneos(id)  ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS torneo_invitaciones (
    id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    torneo_id      INT UNSIGNED NOT NULL,
    organizador_id INT UNSIGNED NOT NULL,
    invitado_id    INT UNSIGNED NOT NULL,
    estado         ENUM('pendiente','aceptada','rechazada') NOT NULL DEFAULT 'pendiente',
    creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_invitado (invitado_id, estado),
    FOREIGN KEY (torneo_id)      REFERENCES torneos(id)   ON DELETE CASCADE,
    FOREIGN KEY (organizador_id) REFERENCES usuarios(id)  ON DELETE CASCADE,
    FOREIGN KEY (invitado_id)    REFERENCES usuarios(id)  ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
