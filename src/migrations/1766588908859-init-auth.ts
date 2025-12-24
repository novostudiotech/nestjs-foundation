import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitAuth1766588908859 implements MigrationInterface {
  name = 'InitAuth1766588908859';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "verification" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "identifier" character varying NOT NULL, "value" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_f7e3a90ca384e71d6e2e93bb340" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('user', 'admin')`);
    await queryRunner.query(
      `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "username" character varying NOT NULL, "displayUsername" character varying, "email" character varying NOT NULL, "isEmailVerified" boolean NOT NULL DEFAULT false, "role" "public"."user_role_enum" NOT NULL DEFAULT 'user', "firstName" character varying, "lastName" character varying, "image" character varying, "bio" character varying, "twoFactorEnabled" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_070157ac5f9096d1a00bab15aa" ON "user" ("username") WHERE "deletedAt" IS NULL`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_25dca47b418c43ad4bdbe4fbb9" ON "user" ("displayUsername") WHERE "deletedAt" IS NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_d0012b9482ca5b4f270e6fdb5e" ON "user" ("email") WHERE "deletedAt" IS NULL`
    );
    await queryRunner.query(
      `CREATE TABLE "twoFactor" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "userId" uuid NOT NULL, "secret" character varying, "backupCodes" character varying, CONSTRAINT "PK_6e6e22172b1e7437f77cbfed056" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "session" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "userId" uuid NOT NULL, "token" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "ipAddress" character varying, "userAgent" character varying, CONSTRAINT "PK_f55da76ac1c3ac420f444d2ff11" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "passkey" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "name" character varying, "userId" uuid NOT NULL, "publicKey" character varying NOT NULL, "credentialID" character varying NOT NULL, "counter" integer NOT NULL, "deviceType" character varying NOT NULL, "backedUp" boolean NOT NULL, "transports" character varying NOT NULL, CONSTRAINT "PK_783e2060d8025abd6a6ca45d2c7" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "account" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "userId" uuid NOT NULL, "accountId" character varying NOT NULL, "providerId" character varying NOT NULL, "accessToken" character varying, "refreshToken" character varying, "accessTokenExpiresAt" TIMESTAMP, "refreshTokenExpiresAt" TIMESTAMP, "scope" character varying, "idToken" character varying, "password" character varying, CONSTRAINT "PK_54115ee388cdb6d86bb4bf5b2ea" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `ALTER TABLE "twoFactor" ADD CONSTRAINT "FK_03fe91172968ed69813bc6ff0bd" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "session" ADD CONSTRAINT "FK_3d2f174ef04fb312fdebd0ddc53" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "passkey" ADD CONSTRAINT "FK_c36f303905314ea9ead857b6268" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
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
      `ALTER TABLE "passkey" DROP CONSTRAINT "FK_c36f303905314ea9ead857b6268"`
    );
    await queryRunner.query(
      `ALTER TABLE "session" DROP CONSTRAINT "FK_3d2f174ef04fb312fdebd0ddc53"`
    );
    await queryRunner.query(
      `ALTER TABLE "twoFactor" DROP CONSTRAINT "FK_03fe91172968ed69813bc6ff0bd"`
    );
    await queryRunner.query(`DROP TABLE "account"`);
    await queryRunner.query(`DROP TABLE "passkey"`);
    await queryRunner.query(`DROP TABLE "session"`);
    await queryRunner.query(`DROP TABLE "twoFactor"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d0012b9482ca5b4f270e6fdb5e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_25dca47b418c43ad4bdbe4fbb9"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_070157ac5f9096d1a00bab15aa"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    await queryRunner.query(`DROP TABLE "verification"`);
  }
}
