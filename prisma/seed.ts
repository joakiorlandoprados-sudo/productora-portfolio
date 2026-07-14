/**
 * Seed idempotente de los 3 usuarios administradores.
 *
 * - Corre con `npx prisma db seed` o `npm run db:seed`.
 * - Upsert por el campo único `usuario` → se puede correr N veces.
 * - Los hashes ya están pre-calculados (bcrypt, cost 12). Este archivo NUNCA
 *   contiene ni calcula contraseñas en texto plano.
 */

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL no está definida en las variables de entorno");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface SeedUser {
  usuario: string;
  passwordHash: string;
}

const USERS: SeedUser[] = [
  {
    usuario: "Admindev",
    passwordHash: "$2b$12$Cwo2mXa63sjHiJrkUIsMF.Ovxvyg6P20IwguOZQdX8xCkesMGh.jG",
  },
  {
    usuario: "Augusto",
    passwordHash: "$2b$12$h.luLm8GwMUPwsCSKaWqf.n.ZgQ2VW5g6vlw/8Hx2UlVoS50DmKXe",
  },
  {
    usuario: "Alfredo",
    passwordHash: "$2b$12$mxxRazWqjC/54q.wb0vHbuftLQdiIAsXJBU1PPpB5Vntnvnm0wq8K",
  },
];

async function main() {
  for (const { usuario, passwordHash } of USERS) {
    await prisma.usuario.upsert({
      where: { usuario },
      update: { password: passwordHash },
      create: { usuario, password: passwordHash },
    });
    console.log(`✓ usuario listo: ${usuario}`);
  }
}

main()
  .catch((err) => {
    console.error("Error en seed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });