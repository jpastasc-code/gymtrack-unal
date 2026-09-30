import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';

/** Datos del token de Supabase Auth que usa el API. */
export interface PayloadSupabase extends JWTPayload {
  /** UUID del usuario en auth.users (= usuario.id). */
  sub: string;
  email?: string;
  role?: string;
}

export class TokenInvalidoError extends Error {}

/**
 * Verifica los tokens de acceso que emite Supabase Auth.
 *
 * - Proyectos con claves de firma asimétricas (ES256/RS256): se validan con las claves
 *   públicas del proyecto (JWKS), sin compartir secretos.
 * - Proyectos con el secreto JWT heredado (HS256): se validan con SUPABASE_JWT_SECRET.
 *
 * En ambos casos se exige el emisor del proyecto y la audiencia "authenticated".
 */
@Injectable()
export class VerificadorToken {
  private readonly logger = new Logger(VerificadorToken.name);
  private readonly emisor: string | undefined;
  private readonly jwks: JWTVerifyGetKey | undefined;
  private readonly secreto: Uint8Array | undefined;

  constructor(config: ConfigService) {
    const url = config.get<string>('SUPABASE_URL')?.replace(/\/+$/, '');
    const secreto = config.get<string>('SUPABASE_JWT_SECRET');
    if (!url) {
      this.logger.warn(
        'SUPABASE_URL no está definida: todas las rutas protegidas responderán 401.',
      );
      return;
    }
    this.emisor = `${url}/auth/v1`;
    this.jwks = createRemoteJWKSet(
      new URL(`${this.emisor}/.well-known/jwks.json`),
    );
    this.secreto = secreto ? new TextEncoder().encode(secreto) : undefined;
  }

  async verificar(token: string): Promise<PayloadSupabase> {
    if (!this.emisor || !this.jwks) {
      throw new TokenInvalidoError('La autenticación no está configurada.');
    }
    let alg: string | undefined;
    try {
      alg = decodeProtectedHeader(token).alg;
    } catch {
      throw new TokenInvalidoError('El token no tiene un formato válido.');
    }

    const opciones = { issuer: this.emisor, audience: 'authenticated' };
    try {
      const { payload } =
        alg?.startsWith('HS') && this.secreto
          ? await jwtVerify(token, this.secreto, opciones)
          : await jwtVerify(token, this.jwks, opciones);
      if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
        throw new TokenInvalidoError('El token no identifica a un usuario.');
      }
      return payload as PayloadSupabase;
    } catch (error) {
      if (error instanceof TokenInvalidoError) throw error;
      throw new TokenInvalidoError(
        'La sesión no es válida o ya expiró. Inicia sesión de nuevo.',
      );
    }
  }
}
