const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

describe('Utilidades Tests', () => {
  describe('Bcrypt', () => {
    test('Debería hashear una contraseña correctamente', async () => {
      const password = 'miPassword123';
      const hash = await bcrypt.hash(password, 10);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    test('Debería verificar una contraseña correctamente', async () => {
      const password = 'miPassword123';
      const hash = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await bcrypt.compare('passwordIncorrecto', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('JWT', () => {
    const secret = 'test_secret';
    const payload = {
      id: 1,
      nombre: 'Test User',
      correo: 'test@example.com'
    };

    test('Debería generar un token JWT válido', () => {
      const token = jwt.sign(payload, secret, { expiresIn: '1h' });
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // Header.Payload.Signature
    });

    test('Debería verificar un token JWT válido', () => {
      const token = jwt.sign(payload, secret, { expiresIn: '1h' });
      const decoded = jwt.verify(token, secret);
      
      expect(decoded.id).toBe(payload.id);
      expect(decoded.nombre).toBe(payload.nombre);
      expect(decoded.correo).toBe(payload.correo);
    });

    test('Debería fallar con token inválido', () => {
      const invalidToken = 'token.invalido.aqui';
      
      expect(() => {
        jwt.verify(invalidToken, secret);
      }).toThrow();
    });

    test('Debería fallar con secret incorrecto', () => {
      const token = jwt.sign(payload, secret, { expiresIn: '1h' });
      
      expect(() => {
        jwt.verify(token, 'secret_incorrecto');
      }).toThrow();
    });
  });

  describe('Validaciones', () => {
    test('Debería validar formato de email', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      expect(emailRegex.test('test@example.com')).toBe(true);
      expect(emailRegex.test('usuario@dominio.co')).toBe(true);
      expect(emailRegex.test('email_invalido')).toBe(false);
      expect(emailRegex.test('sin@dominio')).toBe(false);
      expect(emailRegex.test('@dominio.com')).toBe(false);
    });

    test('Debería validar longitud de contraseña', () => {
      const minLength = 6;
      
      expect('password123'.length >= minLength).toBe(true);
      expect('123456'.length >= minLength).toBe(true);
      expect('12345'.length >= minLength).toBe(false);
      expect(''.length >= minLength).toBe(false);
    });
  });
}); 