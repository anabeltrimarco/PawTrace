const {
  validationResult,
} = require("express-validator");

const {
  User,
} = require("../models");

// ==========================================
// LISTAR USUARIOS
// Solo administrador
// ==========================================

async function listar(
  req,
  res,
  next
) {
  try {
    const usuarios =
      await User.findAll({
        order: [
          ["created_at", "DESC"],
        ],
      });

    return res.json(
      usuarios.map((usuario) =>
        usuario.toSafeJSON()
      )
    );
  } catch (error) {
    next(error);
  }
}

// ==========================================
// OBTENER USUARIO
// El propio usuario o administrador
// ==========================================

async function obtener(
  req,
  res,
  next
) {
  try {
    const usuario =
      await User.findByPk(
        req.params.id
      );

    if (!usuario) {
      return res
        .status(404)
        .json({
          error:
            "Usuario no encontrado.",
        });
    }

    const esAdmin =
      req.usuario?.role ===
        "admin" ||
      req.usuario?.role ===
        "ADMIN";

    const esPropietario =
      String(req.usuario?.id) ===
      String(usuario.id);

    if (
      !esAdmin &&
      !esPropietario
    ) {
      return res
        .status(403)
        .json({
          error:
            "No tenés permiso para ver este usuario.",
        });
    }

    return res.json(
      usuario.toSafeJSON()
    );
  } catch (error) {
    next(error);
  }
}

// ==========================================
// ACTUALIZAR USUARIO
// Propietario o administrador
// ==========================================

async function actualizar(
  req,
  res,
  next
) {
  try {
    const errors =
      validationResult(req);

    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({
          errores:
            errors.array(),
        });
    }

    const usuario =
      await User.findByPk(
        req.params.id
      );

    if (!usuario) {
      return res
        .status(404)
        .json({
          error:
            "Usuario no encontrado.",
        });
    }

    const esAdmin =
      req.usuario?.role ===
        "admin" ||
      req.usuario?.role ===
        "ADMIN";

    const esPropietario =
      String(req.usuario?.id) ===
      String(usuario.id);

    if (
      !esAdmin &&
      !esPropietario
    ) {
      return res
        .status(403)
        .json({
          error:
            "No tenés permiso para modificar este usuario.",
        });
    }

    const {
      fullName,
      nombre,
      phone,
      telefono,
      avatarUrl,
      role,
      rol,
      isActive,
    } = req.body;

    // ======================================
    // DATOS EDITABLES POR EL PROPIO USUARIO
    // ======================================

    const nuevoNombre =
      fullName !== undefined
        ? fullName
        : nombre;

    if (
      nuevoNombre !==
      undefined
    ) {
      usuario.fullName =
        String(
          nuevoNombre
        ).trim();
    }

    const nuevoTelefono =
      phone !== undefined
        ? phone
        : telefono;

    if (
      nuevoTelefono !==
      undefined
    ) {
      usuario.phone =
        nuevoTelefono
          ? String(
              nuevoTelefono
            ).trim()
          : null;
    }

    if (
      avatarUrl !==
      undefined
    ) {
      usuario.avatarUrl =
        avatarUrl
          ? String(
              avatarUrl
            ).trim()
          : null;
    }

    // ======================================
    // SOLO ADMIN
    // ======================================

    if (esAdmin) {
      const nuevoRol =
        role !== undefined
          ? role
          : rol;

      if (
        nuevoRol !==
        undefined
      ) {
        usuario.role =
          nuevoRol;
      }

      if (
        isActive !==
        undefined
      ) {
        usuario.isActive =
          Boolean(
            isActive
          );
      }
    }

    await usuario.save();

    return res.json({
      mensaje:
        "Usuario actualizado correctamente.",

      usuario:
        usuario.toSafeJSON(),
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// ELIMINAR / DESACTIVAR USUARIO
// Propietario o administrador
// ==========================================

async function eliminar(
  req,
  res,
  next
) {
  try {
    const usuario =
      await User.findByPk(
        req.params.id
      );

    if (!usuario) {
      return res
        .status(404)
        .json({
          error:
            "Usuario no encontrado.",
        });
    }

    const esAdmin =
      req.usuario?.role ===
        "admin" ||
      req.usuario?.role ===
        "ADMIN";

    const esPropietario =
      String(req.usuario?.id) ===
      String(usuario.id);

    if (
      !esAdmin &&
      !esPropietario
    ) {
      return res
        .status(403)
        .json({
          error:
            "No tenés permiso para eliminar este usuario.",
        });
    }

    // Mejor desactivar que borrar físicamente,
    // porque puede tener reportes asociados.
    usuario.isActive =
      false;

    await usuario.save();

    return res.json({
      mensaje:
        "Usuario desactivado correctamente.",
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  listar,
  obtener,
  actualizar,
  eliminar,
};