const express = require('express');
const { sql, connectDB } = require('./db.js');
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
  apis: ['./src/app.js'], // rutas donde buscar comentarios de anotación
};

const swaggerSpecs = swaggerJsdoc(swaggerOptions);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cors());
  
  // Middleware de Swagger
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
  
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
    } catch (err) {
      console.error('Error al verificar token:', err);
      return res.status(401).json({ error: 'Token inválido' });
    }
  };

  // Ruta de salud para testing
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'API funcionando correctamente' });
  });

  // Listar usuarios
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

  // Login de usuario
  app.post('/login', async (req, res) => {
    try {
      const { Correo, Contrasena } = req.body;
      if (!Correo || !Contrasena) {
        return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
      }

      // Consulta directa para testing
      const result = await sql.query`SELECT IdUsuario, Nombre, Correo, ContrasenaHash FROM UsuariosVidal WHERE Correo = ${Correo}`;

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

  // Ruta protegida de ejemplo
  app.get('/perfil', verificarToken, (req, res) => {
    res.json({ usuario: req.usuario });
  });

  return app;
}

module.exports = { createApp, connectDB }; 