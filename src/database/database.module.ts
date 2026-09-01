import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'mssql',
                host: configService.get<string>('DB_HOST'),
                port: configService.get<number>('DB_PORT'),
                username: configService.get<string>('DB_USERNAME'),
                password: configService.get<string>('DB_PASSWORD'),
                database: configService.get<string>('DB_DATABASE'),
                options: {
                    encrypt: configService.get<string>('DB_ENCRYPT') === 'true',
                    trustServerCertificate: configService.get<string>('DB_TRUST_SERVER_CERTIFICATE') !== 'false',
                },
                entities: [__dirname + '/../**/*.entity{.ts,.js}'],
                migrations: [__dirname + '/migrations/*{.ts,.js}'],
                synchronize: false,
                logging: configService.get<string>('DB_LOGGING') === 'true',
            }),
        }),
    ],
    exports: [TypeOrmModule],
})
export class DatabaseModule { }
