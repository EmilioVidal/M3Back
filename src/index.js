const express= require('express');
const { sql, connectDB } = require('./db.js');
require('dotenv').config();
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Configuración de Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Usuarios',
      version: '1.0.0',
      description: 'API para gestión de usuarios con autenticación',
      contact: {
        name: 'API Support'
      },
    },
    servers: [
        {
          url: 'https://tu-servicio.azurewebsites.net',
          description: 'Servidor de producción'
        },
        {
          url: 'http://localhost:3000',
          description: 'Servidor de desarrollo'
        }
      ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./src/index.js'], // rutas donde buscar comentarios de anotación
};

const swaggerSpecs = swaggerJsdoc(swaggerOptions);

async function main() {
  await connectDB();

  const app = express();
  app.use(express.json());
  app.use(cors());
  
  // Middleware de Swagger
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
  
  /**
   * @swagger
   * components:
   *   schemas:
   *     Usuario:
   *       type: object
   *       required:
   *         - Nombre
   *         - Correo
   *         - Contrasena
   *       properties:
   *         IdUsuario:
   *           type: integer
   *           description: ID del usuario
   *         Nombre:
   *           type: string
   *           description: Nombre completo del usuario
   *         Correo:
   *           type: string
   *           format: email
   *           description: Email del usuario
   *         ContrasenaHash:
   *           type: string
   *           description: Hash de la contraseña del usuario
   *       example:
   *         IdUsuario: 1
   *         Nombre: Juan Pérez
   *         Correo: juan@example.com
   */

  /**
   * @swagger
   * /usuarios:
   *   get:
   *     summary: Listar todos los usuarios
   *     tags: [Usuarios]
   *     responses:
   *       200:
   *         description: Lista de todos los usuarios
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Usuario'
   *       500:
   *         description: Error del servidor
   */
  // Ejemplo: listar usuarios
  app.get('/usuarios', async (req, res) => {
    try {
      const result = await sql.query`SELECT * FROM UsuariosVidal`;
      res.json(result.recordset);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * @swagger
   * /usuarios/{id}:
   *   get:
   *     summary: Obtener un usuario por ID
   *     tags: [Usuarios]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: ID del usuario
   *     responses:
   *       200:
   *         description: Usuario encontrado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Usuario'
   *       404:
   *         description: Usuario no encontrado
   *       500:
   *         description: Error del servidor
   */
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

  /**
   * @swagger
   * /crearusuario:
   *   post:
   *     summary: Crear un nuevo usuario
   *     tags: [Usuarios]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - Nombre
   *               - Correo
   *               - Contrasena
   *             properties:
   *               Nombre:
   *                 type: string
   *               Correo:
   *                 type: string
   *                 format: email
   *               Contrasena:
   *                 type: string
   *                 format: password
   *     responses:
   *       201:
   *         description: Usuario creado exitosamente
   *       400:
   *         description: Faltan campos requeridos
   *       500:
   *         description: Error del servidor
   */
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

  /**
   * @swagger
   * /actualizarusuario/{id}:
   *   put:
   *     summary: Actualizar un usuario existente
   *     tags: [Usuarios]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: ID del usuario
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               Nombre:
   *                 type: string
   *               Correo:
   *                 type: string
   *                 format: email
   *               Contrasena:
   *                 type: string
   *                 format: password
   *     responses:
   *       200:
   *         description: Usuario actualizado exitosamente
   *       400:
   *         description: No hay campos para actualizar
   *       404:
   *         description: Usuario no encontrado
   *       500:
   *         description: Error del servidor
   */
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

  /**
   * @swagger
   * /eliminarusuario/{id}:
   *   delete:
   *     summary: Eliminar un usuario
   *     tags: [Usuarios]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: ID del usuario
   *     responses:
   *       200:
   *         description: Usuario eliminado exitosamente
   *       404:
   *         description: Usuario no encontrado
   *       500:
   *         description: Error del servidor
   */
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

  /**
   * @swagger
   * /login:
   *   post:
   *     summary: Iniciar sesión de usuario
   *     tags: [Autenticación]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - Correo
   *               - Contrasena
   *             properties:
   *               Correo:
   *                 type: string
   *                 format: email
   *               Contrasena:
   *                 type: string
   *                 format: password
   *     responses:
   *       200:
   *         description: Login exitoso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 token:
   *                   type: string
   *                 usuario:
   *                   type: object
   *       400:
   *         description: Faltan datos requeridos
   *       401:
   *         description: Credenciales inválidas
   *       500:
   *         description: Error del servidor
   */
  // Login de usuario
  app.post('/login', async (req, res) => {
    try {
      const { Correo, Contrasena } = req.body;
      if (!Correo || !Contrasena) {
        return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
      }

      // Obtener usuario por correo (usar stored procedure o consulta directa)
      // Opción 1: Usando stored procedure
      const request = new sql.Request();
      request.input('Correo', sql.NVarChar, Correo);
      const result = await request.execute('LoginUsuario');
      
      // Opción 2: Consulta directa (descomenta si no tienes el stored procedure)
      // const result = await sql.query`SELECT IdUsuario, Nombre, Correo, ContrasenaHash FROM UsuariosVidal WHERE Correo = ${Correo}`;

      if (result.recordset.length === 0) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const usuario = result.recordset[0];
      
      // Verificar contraseña con bcrypt
      const match = await bcrypt.compare(Contrasena, usuario.ContrasenaHash);
      if (!match) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // Generar token JWT
      const token = jwt.sign(
        { 
          id: usuario.IdUsuario,
          nombre: usuario.Nombre,
          correo: usuario.Correo
        },
        process.env.JWT_SECRET || 'clave_secreta_por_defecto',
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login exitoso',
        token,
        usuario: {
          id: usuario.IdUsuario,
          nombre: usuario.Nombre,
          correo: usuario.Correo
        }
      });
    } catch (err) {
      console.error('Error en login:', err);
      res.status(500).json({ error: err.message });
    }
  });
  
  // Middleware para proteger rutas
  const verificarToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
      return res.status(403).json({ error: 'Token no proporcionado' });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'clave_secreta_por_defecto');
      req.usuario = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido' });
    }
  };

  /**
   * @swagger
   * /perfil:
   *   get:
   *     summary: Obtener perfil de usuario autenticado
   *     tags: [Autenticación]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Perfil de usuario
   *       401:
   *         description: Token inválido
   *       403:
   *         description: Token no proporcionado
   */
  // Ruta protegida de ejemplo
  app.get('/perfil', verificarToken, (req, res) => {
    res.json({ usuario: req.usuario });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () =>
    console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`)
  );
}

main();
