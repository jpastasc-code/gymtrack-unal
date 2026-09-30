import { ConfigService } from '@nestjs/config';
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWTPayload,
} from 'jose';
import {
  TokenInvalidoError,
  VerificadorToken,
} from './verificador-token.service';

const URL_SUPABASE = 'https://proyecto.supabase.co';
const EMISOR = `${URL_SUPABASE}/auth/v1`;
const SECRETO = 'secreto-de-prueba-con-al-menos-32-caracteres';
const SUB = '00000000-0000-4000-a000-000000000001';

function crearVerificador(env: Record<string, string | undefined>) {
  return new VerificadorToken({
    get: (clave: string) => env[clave],
  } as unknown as ConfigService);
}

function firmarHS256(payload: JWTPayload, opciones: { exp?: string } = {}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(opciones.exp ?? '1h')
    .sign(new TextEncoder().encode(SECRETO));
}

describe('VerificadorToken', () => {
  describe('con el secreto JWT heredado (HS256)', () => {
    const verificador = crearVerificador({
      SUPABASE_URL: URL_SUPABASE,
      SUPABASE_JWT_SECRET: SECRETO,
    });
    const base = { sub: SUB, iss: EMISOR, aud: 'authenticated' };

    it('acepta un token válido del proyecto', async () => {
      const token = await firmarHS256({ ...base, email: 'a@gymtrack.test' });
      await expect(verificador.verificar(token)).resolves.toMatchObject({
        sub: SUB,
        email: 'a@gymtrack.test',
      });
    });

    it('rechaza un token expirado', async () => {
      const token = await firmarHS256(base, { exp: '-1m' });
      await expect(verificador.verificar(token)).rejects.toBeInstanceOf(
        TokenInvalidoError,
      );
    });

    it('rechaza un token de otro proyecto (emisor distinto)', async () => {
      const token = await firmarHS256({
        ...base,
        iss: 'https://otro.supabase.co/auth/v1',
      });
      await expect(verificador.verificar(token)).rejects.toThrow(
        TokenInvalidoError,
      );
    });

    it('rechaza un token que no es de un usuario autenticado', async () => {
      const token = await firmarHS256({ ...base, aud: 'anon' });
      await expect(verificador.verificar(token)).rejects.toThrow(
        TokenInvalidoError,
      );
    });

    it('rechaza texto que no es un JWT', async () => {
      await expect(verificador.verificar('no-es-un-token')).rejects.toThrow(
        'El token no tiene un formato válido.',
      );
    });
  });

  describe('con claves de firma asimétricas (ES256 / JWKS)', () => {
    it('acepta un token firmado con la clave publicada y rechaza otra clave', async () => {
      const propia = await generateKeyPair('ES256');
      const ajena = await generateKeyPair('ES256');
      const jwk = { ...(await exportJWK(propia.publicKey)), kid: 'clave-1' };

      const verificador = crearVerificador({ SUPABASE_URL: URL_SUPABASE });
      // Sustituye la descarga remota del JWKS por las claves locales de la prueba.
      (verificador as any).jwks = createLocalJWKSet({ keys: [jwk] });

      const firmar = (clave: CryptoKey) =>
        new SignJWT({ sub: SUB })
          .setProtectedHeader({ alg: 'ES256', kid: 'clave-1' })
          .setIssuer(EMISOR)
          .setAudience('authenticated')
          .setExpirationTime('1h')
          .sign(clave);

      await expect(
        verificador.verificar(await firmar(propia.privateKey)),
      ).resolves.toMatchObject({ sub: SUB });
      await expect(
        verificador.verificar(await firmar(ajena.privateKey)),
      ).rejects.toThrow(TokenInvalidoError);
    });
  });

  it('sin SUPABASE_URL rechaza todo con un mensaje claro', async () => {
    const verificador = crearVerificador({});
    await expect(verificador.verificar('x.y.z')).rejects.toThrow(
      'La autenticación no está configurada.',
    );
  });
});
