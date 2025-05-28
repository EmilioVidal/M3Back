const request = require('supertest');
const { createApp } = require('../src/app');

// Mock de la base de datos para testing
jest.mock('../src/db.js', () => ({
  sql: {
    query: jest.fn()
  },
  connectDB: jest.fn()
}));

const { sql } = require('../src/db.js');

describe('API Tests', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    test('Debería retornar status OK', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'OK',
        message: 'API funcionando correctamente'
      });
    });
  });

  describe('GET /usuarios', () => {
    test('Debería retornar lista de usuarios', async () => {
      const mockUsers = [
        { IdUsuario: 1, Nombre: 'Juan', Correo: 'juan@test.com' },
        { IdUsuario: 2, Nombre: 'María', Correo: 'maria@test.com' }
      ];

      sql.query.mockResolvedValue({ recordset: mockUsers });

      const response = await request(app)
        .get('/usuarios')
        .expect(200);

      expect(response.body).toEqual(mockUsers);
      expect(sql.query).toHaveBeenCalledTimes(1);
    });

    test('Debería manejar errores de base de datos', async () => {
      sql.query.mockRejectedValue(new Error('Error de conexión'));

      const response = await request(app)
        .get('/usuarios')
        .expect(500);

      expect(response.body).toEqual({ error: 'Error de conexión' });
    });
  });

  describe('GET /usuarios/:id', () => {
    test('Debería retornar un usuario específico', async () => {
      const mockUser = { IdUsuario: 1, Nombre: 'Juan', Correo: 'juan@test.com' };
      sql.query.mockResolvedValue({ recordset: [mockUser] });

      const response = await request(app)
        .get('/usuarios/1')
        .expect(200);

      expect(response.body).toEqual(mockUser);
    });

    test('Debería retornar 404 si el usuario no existe', async () => {
      sql.query.mockResolvedValue({ recordset: [] });

      const response = await request(app)
        .get('/usuarios/999')
        .expect(404);

      expect(response.body).toEqual({ error: 'Usuario no encontrado' });
    });
  });

  describe('POST /crearusuario', () => {
    test('Debería crear un usuario con datos válidos', async () => {
      sql.query.mockResolvedValue({ rowsAffected: [1] });

      const newUser = {
        Nombre: 'Test User',
        Correo: 'test@example.com',
        Contrasena: 'password123'
      };

      const response = await request(app)
        .post('/crearusuario')
        .send(newUser)
        .expect(201);

      expect(response.body).toEqual({ message: 'Usuario creado' });
      expect(sql.query).toHaveBeenCalledTimes(1);
    });

    test('Debería retornar error 400 si faltan campos', async () => {
      const incompleteUser = {
        Nombre: 'Test User'
        // Faltan Correo y Contrasena
      };

      const response = await request(app)
        .post('/crearusuario')
        .send(incompleteUser)
        .expect(400);

      expect(response.body).toEqual({ error: 'Faltan campos requeridos' });
      expect(sql.query).not.toHaveBeenCalled();
    });
  });

  describe('POST /login', () => {
    test('Debería retornar error si faltan credenciales', async () => {
      const response = await request(app)
        .post('/login')
        .send({ Correo: 'test@example.com' }) // Falta Contrasena
        .expect(400);

      expect(response.body).toEqual({ error: 'Correo y contraseña son requeridos' });
    });

    test('Debería retornar error si el usuario no existe', async () => {
      sql.query.mockResolvedValue({ recordset: [] });

      const response = await request(app)
        .post('/login')
        .send({
          Correo: 'noexiste@example.com',
          Contrasena: 'password123'
        })
        .expect(401);

      expect(response.body).toEqual({ error: 'Credenciales inválidas' });
    });
  });

  describe('GET /perfil', () => {
    test('Debería retornar error 403 sin token', async () => {
      const response = await request(app)
        .get('/perfil')
        .expect(403);

      expect(response.body).toEqual({ error: 'Token no proporcionado' });
    });

    test('Debería retornar error 401 con token inválido', async () => {
      const response = await request(app)
        .get('/perfil')
        .set('Authorization', 'Bearer token_invalido')
        .expect(401);

      expect(response.body).toEqual({ error: 'Token inválido' });
    });
  });
}); 