#!/bin/bash

# ===============================
#
# TRINITY - Gestión de usuarios del sistema Linux. :p
# Ejecutar como root, no sean babosos.
#
# ===============================

set -euo pipefail

# ==-> Verificar root
if [[ $EUID -ne 0 ]]; then
    echo "✘ Este script debe ejecutarse como root."
    echo "  Usá 'sudo bash $0'"
    exit 1
fi

# ==-> Colores
# Red Green Yellow
# Cyan Bold REset
R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'
C='\033[0;36m'; B='\033[1m';    RE='\033[0m'

separador() { echo -e "${R}────────────────────────────────────────${RE}"; }

# ==================================================
# FUNCIONES
# ==================================================

listar_usuarios() {
    clear
    echo -e "\n${B}  Usuarios del sistema (UID ≥ 1000 + root)${RE}"
    separador
    echo -e "${B}$(printf "    %-20s %-8s %-8s %-30s" "USUARIO" "UID" "GID" "SHELL")${RE}"
    separador
    awk -F: '($3 >= 1000 && $3 != 65534) || $3 == 0 {
        status = ""
        cmd = "passwd -S " $1 " 2>/dev/null | awk \"{print \\$2}\""
        cmd | getline st
        close(cmd)
        if (st == "L" || st == "LK") status = " [BLOQUEADO]"
        printf "  %-20s %-8s %-8s %-30s%s\n", $1, $3, $4, $7, status
    }' /etc/passwd
    separador
    read -rp $'\n   Presioná Enter para volver.'
}

crear_usuario() {
    clear
    echo -e "\n${B}  Crear usuario nuevo${RE}"
    separador

    read -rp "  Nombre de usuario: " NUEVO_USER
    NUEVO_USER="${NUEVO_USER// /_}"

    if [[ -z "$NUEVO_USER" ]]; then
        echo -e "${R}  Nombre vacío. Cancelado.${RE}"; sleep 2; return
    fi

    if id "$NUEVO_USER" &>/dev/null; then
        echo -e "${Y}  El usuario '$NUEVO_USER' ya existe.${RE}"; sleep 2; return
    fi

    read -rsp "  Contraseña: " PASS; echo
    read -rsp "  Confirmar contraseña: " PASS2; echo

    if [[ "$PASS" != "$PASS2" ]]; then
        echo -e "${R}  Las contraseñas no coinciden.${RE}"; sleep 2; return
    fi

    useradd -m -s /bin/bash "$NUEVO_USER"
    echo "$NUEVO_USER:$PASS" | chpasswd

    echo -e "\n${G}  ✔ Usuario '$NUEVO_USER' creado correctamente.${RE}"
    sleep 2
}

bloquear_usuario() {
    clear
    echo -e "\n${B}  Bloquear usuario${RE}"
    separador
    read -rp "  Usuario a bloquear: " TARGET

    if [[ -z "$TARGET" ]]; then return; fi

    if ! id "$TARGET" &>/dev/null; then
        echo -e "${R}  Usuario '$TARGET' no existe.${RE}"; sleep 2; return
    fi

    if [[ "$TARGET" == "root" ]]; then
        echo -e "${R}  No podés bloquear root.${RE}"; sleep 2; return
    fi

    usermod -L "$TARGET"
    echo -e "\n${G}  ✔ Usuario '$TARGET' bloqueado.${RE}"
    sleep 2
}

desbloquear_usuario() {
    clear
    echo -e "\n${B}  Desbloquear usuario${RE}"
    separador
    read -rp "  Usuario a desbloquear: " TARGET

    if [[ -z "$TARGET" ]]; then return; fi

    if ! id "$TARGET" &>/dev/null; then
        echo -e "${R}  Usuario '$TARGET' no existe.${RE}"; sleep 2; return
    fi

    usermod -U "$TARGET"
    echo -e "\n${G}  ✔ Usuario '$TARGET' desbloqueado.${RE}"
    sleep 2
}

eliminar_usuario() {
    clear
    echo -e "\n${B}  Eliminar usuario${RE}"
    separador
    read -rp "  Usuario a eliminar: " TARGET

    if [[ -z "$TARGET" ]]; then return; fi

    if ! id "$TARGET" &>/dev/null; then
        echo -e "${R}  Usuario '$TARGET' no existe.${RE}"; sleep 2; return
    fi

    if [[ "$TARGET" == "root" ]]; then
        echo -e "${R}  No podés eliminar root.${RE}"; sleep 2; return
    fi

    read -rp "  ¿Eliminar también el HOME? (s/N): " BORRAR_HOME

    echo
    echo -e "${R}  ⚠ Estás por eliminar al usuario '$TARGET'${RE}"
    read -rp "  ¿Confirmar? (s/N): " CONFIRMAR

    if [[ "${CONFIRMAR,,}" != "s" ]]; then
        echo "  Cancelado."; sleep 1; return
    fi

    if [[ "${BORRAR_HOME,,}" == "s" ]]; then
        userdel -r "$TARGET"
    else
        userdel "$TARGET"
    fi

    echo -e "\n${G}  ✔ Usuario '$TARGET' eliminado.${RE}"
    sleep 2
}

# ==================================================
# MENÚ PRINCIPAL
# ==================================================

while true; do
    clear
    echo -e "${B}${R}"
    echo "  ████████╗██████╗ ██╗███╗   ██╗██╗████████╗██╗   ██╗"
    echo "  ╚══██╔══╝██╔══██╗██║████╗  ██║██║╚══██╔══╝╚██╗ ██╔╝"
    echo "     ██║   ██████╔╝██║██╔██╗ ██║██║   ██║    ╚████╔╝ "
    echo "     ██║   ██╔══██╗██║██║╚██╗██║██║   ██║     ╚██╔╝  "
    echo "     ██║   ██║  ██║██║██║ ╚████║██║   ██║      ██║   "
    echo "     ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝      ╚═╝  "
    echo -e "${RE}"
    echo -e "${B}  Gestión de usuarios del sistema${RE}"
    separador
    echo -e "  ${C}1)${RE} Listar usuarios del sistema"
    echo -e "  ${C}2)${RE} Crear usuario nuevo"
    echo -e "  ${C}3)${RE} Bloquear usuario"
    echo -e "  ${C}4)${RE} Desbloquear usuario"
    echo -e "  ${C}5)${RE} Eliminar usuario"
    echo -e "  ${C}0)${RE} Salir"
    separador
    read -rp "  Opción: " OPCION

    case "$OPCION" in
        1) listar_usuarios ;;
        2) crear_usuario ;;
        3) bloquear_usuario ;;
        4) desbloquear_usuario ;;
        5) eliminar_usuario ;;
        0) echo -e "\n${G}  Hasta luego.${RE}\n"; exit 0 ;;
        *) echo -e "\n${Y}  Opción inválida.${RE}"; sleep 1 ;;
    esac
done
