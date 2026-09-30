import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/**
 * Cliente de Prisma compartido por toda la aplicación.
 * Usa DATABASE_URL (en Supabase, el pooler en modo transacción, puerto 6543).
 * La conexión se abre de forma perezosa con la primera consulta.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    const connectionString = config.get<string>('DATABASE_URL');
    if (!connectionString) {
      new Logger(PrismaService.name).warn(
        'DATABASE_URL no está definida: las consultas a la base de datos fallarán.',
      );
    }
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  /** true si la base de datos responde a una consulta trivial. */
  async estaDisponible(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error(`La base de datos no responde: ${String(error)}`);
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
