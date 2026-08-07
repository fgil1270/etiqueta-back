import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateEtiquetaTrazabilidadTable1786143368715 implements MigrationInterface {
    name = 'CreateEtiquetaTrazabilidadTable1786143368715'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "etiqueta_trazabilidad" ("id" int NOT NULL IDENTITY(1,1), "codigo" varchar(255) NOT NULL, "modelo" varchar(255) NOT NULL, "created_at" datetime2 NOT NULL CONSTRAINT "DF_921b3ccfbcfd97a6a20b1def810" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_5ccd1b694cbab4a18541535d467" DEFAULT getdate(), "deleted_at" datetime2, CONSTRAINT "PK_9f952e32b31d5131a4cc6a1b2da" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "etiqueta_trazabilidad"`);
    }

}
