/**
 * Promotes an existing user (identified by the email they signed in to
 * Google with) to SUPER_ADMIN so they can access the /admin CMS.
 *
 * Usage:
 *   npm run make-admin -- you@example.com
 *   npm run make-admin -- you@example.com MODERATOR   (defaults to SUPER_ADMIN)
 *
 * There's no self-serve "become an admin" flow by design — the first admin
 * account has to be granted out-of-band by whoever controls this database.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [email, roleArg] = process.argv.slice(2);
  const role = (roleArg ?? "SUPER_ADMIN").toUpperCase();

  if (!email) {
    console.error("Usage: npm run make-admin -- <email> [SUPER_ADMIN|MODERATOR]");
    process.exit(1);
  }
  if (role !== "SUPER_ADMIN" && role !== "MODERATOR") {
    console.error(`Invalid role "${role}" — must be SUPER_ADMIN or MODERATOR`);
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { primaryEmail: email } });
  if (!user) {
    console.error(
      `No user found with email ${email}. They need to sign in with Google at least once first — that's what creates the row.`
    );
    process.exit(1);
  }

  await prisma.user.update({ where: { id: user.id }, data: { role: role as any } });
  console.log(`${email} is now ${role}. They may need to sign out and back in (or wait up to a minute) for the new role to appear in their session.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
