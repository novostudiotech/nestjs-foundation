import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialBetterAuthTables1767456600879 implements MigrationInterface {
  name = 'InitialBetterAuthTables1767456600879';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "verification" ("createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "deletedAt" TIMESTAMPTZ, "id" uuid NOT NULL, "identifier" character varying(255) NOT NULL, "value" character varying(255) NOT NULL, "expiresAt" TIMESTAMPTZ NOT NULL, CONSTRAINT "PK_f7e3a90ca384e71d6e2e93bb340" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b2a48be969980ae537091ef582" ON "verification" ("expiresAt") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_896e5902333fa9991d1733e5ee" ON "verification" ("identifier") `
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "deletedAt" TIMESTAMPTZ, "id" uuid NOT NULL, "email" character varying(255) NOT NULL, "name" character varying(255), "emailVerified" boolean NOT NULL DEFAULT false, "image" character varying(2048), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_d0012b9482ca5b4f270e6fdb5e" ON "user" ("email") WHERE "deletedAt" IS NULL`
    );
    await queryRunner.query(
      `CREATE TABLE "session" ("createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "deletedAt" TIMESTAMPTZ, "id" uuid NOT NULL, "userId" uuid NOT NULL, "token" character varying(512) NOT NULL, "expiresAt" TIMESTAMPTZ NOT NULL, "ipAddress" character varying(45), "userAgent" character varying(500), CONSTRAINT "PK_f55da76ac1c3ac420f444d2ff11" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_232f8e85d7633bd6ddfad42169" ON "session" ("token") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5d97cf9773002b16861b4bb8ae" ON "session" ("expiresAt") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3d2f174ef04fb312fdebd0ddc5" ON "session" ("userId") `
    );
    await queryRunner.query(
      `CREATE TABLE "account" ("createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "deletedAt" TIMESTAMPTZ, "id" uuid NOT NULL, "userId" uuid NOT NULL, "accountId" character varying(255) NOT NULL, "providerId" character varying(50) NOT NULL, "accessToken" character varying(2048), "refreshToken" character varying(2048), "accessTokenExpiresAt" TIMESTAMPTZ, "refreshTokenExpiresAt" TIMESTAMPTZ, "scope" character varying(500), "idToken" character varying(2048), "password" character varying(255), CONSTRAINT "PK_54115ee388cdb6d86bb4bf5b2ea" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_f4eb24bfbfcfddd80b90c54d0e" ON "account" ("userId", "providerId", "accountId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_53a0af912032dcc48441566392" ON "account" ("providerId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_60328bf27019ff5498c4b97742" ON "account" ("userId") `
    );
    await queryRunner.query(
      `ALTER TABLE "session" ADD CONSTRAINT "FK_3d2f174ef04fb312fdebd0ddc53" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "account" ADD CONSTRAINT "FK_60328bf27019ff5498c4b977421" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "account" DROP CONSTRAINT "FK_60328bf27019ff5498c4b977421"`
    );
    await queryRunner.query(
      `ALTER TABLE "session" DROP CONSTRAINT "FK_3d2f174ef04fb312fdebd0ddc53"`
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_60328bf27019ff5498c4b97742"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_53a0af912032dcc48441566392"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f4eb24bfbfcfddd80b90c54d0e"`);
    await queryRunner.query(`DROP TABLE "account"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3d2f174ef04fb312fdebd0ddc5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5d97cf9773002b16861b4bb8ae"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_232f8e85d7633bd6ddfad42169"`);
    await queryRunner.query(`DROP TABLE "session"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d0012b9482ca5b4f270e6fdb5e"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_896e5902333fa9991d1733e5ee"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b2a48be969980ae537091ef582"`);
    await queryRunner.query(`DROP TABLE "verification"`);
  }
}
