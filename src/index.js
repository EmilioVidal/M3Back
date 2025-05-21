const express= require('express');
const { sql, connectDB } = require('./db.js');
require('dotenv').config();
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');

async function main() {
  await connectDB();

  const app = express();
  app.use(express.json());
  app.use(cors());

  // Ejemplo: listar usuarios
  app.get('/usuarios', async (req, res) => {
    try {
      const result = await sql.query`SELECT * FROM UsuariosVidal`; 
      res.json(result.recordset);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Obtener usuario por ID
  app.get('/usuarios/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await sql.query`SELECT * FROM UsuariosVidal WHERE IdUsuario = ${id}`;
      if (result.recordset.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
      res.json(result.recordset[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Crear usuario
  app.post('/crearusuario', async (req, res) => {
    try {
      const { Nombre, Correo, Contrasena } = req.body;
      if (!Nombre || !Correo || !Contrasena) return res.status(400).json({ error: 'Faltan campos requeridos' });
      const hash = await bcrypt.hash(Contrasena, 10);
      await sql.query`INSERT INTO UsuariosVidal (Nombre, Correo, ContrasenaHash) VALUES (${Nombre}, ${Correo}, ${hash})`;
      res.status(201).json({ message: 'Usuario creado' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Actualizar usuario
  app.put('/actualizarusuario/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { Nombre, Correo, Contrasena } = req.body;
      
      // Verificar si el usuario existe
      const checkUser = await sql.query`SELECT * FROM UsuariosVidal WHERE IdUsuario = ${id}`;
      if (checkUser.recordset.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Construir la consulta dinámicamente
      let updateFields = [];
      
      if (Nombre) {
        updateFields.push(`Nombre = '${Nombre.replace(/'/g, "''")}'`);
      }
      if (Correo) {
        updateFields.push(`Correo = '${Correo.replace(/'/g, "''")}'`);
      }
      if (Contrasena) {
        const hash = await bcrypt.hash(Contrasena, 10);
        updateFields.push(`ContrasenaHash = '${hash.replace(/'/g, "''")}'`);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No hay campos para actualizar' });
      }

      const updateQuery = `UPDATE UsuariosVidal SET ${updateFields.join(', ')} WHERE IdUsuario = ${id}`;
      console.log('Update Query:', updateQuery); // Para debugging
      const result = await sql.query(updateQuery);

      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json({ message: 'Usuario actualizado' });
    } catch (err) {
      console.error('Error al actualizar usuario:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Eliminar usuario
  app.delete('/eliminarusuario/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await sql.query`DELETE FROM UsuariosVidal WHERE IdUsuario = ${id}`;
      if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
      res.json({ message: 'Usuario eliminado' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () =>
    console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`)
  );
}

main();
