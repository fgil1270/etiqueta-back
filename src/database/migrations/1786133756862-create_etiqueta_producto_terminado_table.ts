import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateEtiquetaProductoTerminadoTable1786133756862 implements MigrationInterface {
    name = 'CreateEtiquetaProductoTerminadoTable1786133756862'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "etiqueta_producto_terminado" ("id" int NOT NULL IDENTITY(1,1), "codigo" varchar(255) NOT NULL, "modelo" varchar(255) NOT NULL, "created_at" datetime2 NOT NULL CONSTRAINT "DF_4176a6ae81b2c7a0189fba3ae78" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_93ea8c6add233a50980e37f730f" DEFAULT getdate(), "deleted_at" datetime2, CONSTRAINT "PK_a5d987aaba9ba40fc6a02491eb8" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "etiqueta_producto_terminado"`);
    }

}
