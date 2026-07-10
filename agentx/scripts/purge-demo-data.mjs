#!/usr/bin/env node
/** Remove seeded demo matches/signals from agentx DB. Safe for production hackathon deploy. */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const deleted = await prisma.match.deleteMany({
    where: { externalId: { startsWith: "demo-" } },
  });
  console.log(`Removed ${deleted.count} demo match(es). Run engine restart to sync TxLINE fixtures.`);
} finally {
  await prisma.$disconnect();
}
