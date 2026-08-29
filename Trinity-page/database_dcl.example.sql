-- ═══════════════════════════════════════════════════════════════════
--  TRINITY — DCL (Data Control Language) — ARCHIVO DE EJEMPLO
--  Usuarios de MySQL con privilegios mínimos, separados por rol.
--
--  Este archivo SÍ se sube al repo (son solo placeholders).
--  Para uso real: copiar a `database_dcl.sql` (ignorado por git),
--  reemplazar los placeholders 'CAMBIAR_...' por contraseñas fuertes,
--  y ejecutar ese archivo — nunca subir el que tiene contraseñas reales.
--
--  Por qué separar usuarios en vez de usar `root` para todo:
--  · La aplicación PHP (api/) NUNCA debería poder ejecutar DROP TABLE,
--    ALTER TABLE ni crear/borrar otros usuarios — solo necesita leer
--    y escribir filas. Si un endpoint tuviera una falla de inyección
--    SQL (mitigada acá con PDO + prepared statements en todos los
--    Models, pero como defensa en profundidad), el daño posible queda
--    acotado a INSERT/UPDATE/DELETE/SELECT sobre la base `trinity`,
--    nunca a comandos DDL ni a otras bases del servidor.
--  · Un usuario de solo lectura permite dar acceso de reportes/lectura
--    sin riesgo de modificar datos.
--  · Un usuario de backup solo necesita LOCK TABLES + SELECT, no
--    privilegios de escritura.
--  · Un usuario de migraciones (DDL) se usa solo manualmente al
--    desplegar/actualizar el esquema, nunca desde el código PHP.
--
--  Ejecutar como root (o un usuario con privilegio GRANT):
--      mysql -u root -p < database.sql
--      mysql -u root -p < database_dcl.sql
--
--  Reemplazar los placeholders 'CAMBIAR_...' por contraseñas fuertes
--  antes de usar esto fuera de un entorno de desarrollo local, y
--  cargar la del usuario de aplicación en el .env como DB_USER/DB_PASS
--  (ver .env.example).
-- ═══════════════════════════════════════════════════════════════════

-- ── 1) USUARIO DE APLICACIÓN (el que usa api/config.php vía PDO) ───
-- Solo DML sobre la base `trinity`. Sin CREATE/ALTER/DROP/GRANT.
CREATE USER IF NOT EXISTS 'trinity_app'@'localhost' IDENTIFIED BY 'APP_PASS';
GRANT SELECT, INSERT, UPDATE, DELETE ON trinity.* TO 'trinity_app'@'localhost';

-- Si la app y MySQL corren en contenedores/hosts distintos, agregar
-- además (o en su lugar) un host específico en vez de 'localhost':
-- CREATE USER IF NOT EXISTS 'trinity_app'@'%' IDENTIFIED BY 'CAMBIAR_APP_PASSWORD';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON trinity.* TO 'trinity_app'@'%';

-- Refuerzo explícito (documentación viva): aunque el GRANT de arriba
-- ya es mínimo, se deja constancia expresa de qué NO puede hacer.
REVOKE CREATE, ALTER, DROP, INDEX, REFERENCES, CREATE VIEW, EVENT, TRIGGER
    ON trinity.* FROM 'trinity_app'@'localhost';

-- ── 2) USUARIO DE SOLO LECTURA (dashboards / reportes) ──────────────
CREATE USER IF NOT EXISTS 'trinity_readonly'@'localhost' IDENTIFIED BY 'READONLY_PASS';
GRANT SELECT ON trinity.* TO 'trinity_readonly'@'localhost';

-- ── 3) USUARIO DE BACKUP (mysqldump) ────────────────────────────────
CREATE USER IF NOT EXISTS 'trinity_backup'@'localhost' IDENTIFIED BY 'BACKUP_PASS';
GRANT SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER ON trinity.* TO 'trinity_backup'@'localhost';

-- ── 4) USUARIO DE MIGRACIONES (DDL manual, nunca desde PHP) ─────────
-- Se usa a mano para correr database.sql / futuras migraciones.
-- No se referencia desde ningún .env de la aplicación.
CREATE USER IF NOT EXISTS 'trinity_migrator'@'localhost' IDENTIFIED BY 'MIGRATOR_PASS';
GRANT CREATE, ALTER, DROP, INDEX, REFERENCES, CREATE VIEW, SELECT, INSERT, UPDATE, DELETE
    ON trinity.* TO 'trinity_migrator'@'localhost';

-- ── APLICAR CAMBIOS ──────────────────────────────────────────────────
FLUSH PRIVILEGES;

-- ── VERIFICACIÓN (opcional, ejecutar a mano para auditar) ───────────
-- SHOW GRANTS FOR 'trinity_app'@'localhost';
-- SHOW GRANTS FOR 'trinity_readonly'@'localhost';
-- SHOW GRANTS FOR 'trinity_backup'@'localhost';
-- SHOW GRANTS FOR 'trinity_migrator'@'localhost';
