import { PrismaClient } from "@prisma/client";
import {
  INNOVATION_SECTORS,
  NIGERIAN_STATES,
  SYSTEM_ROLES,
} from "../src/seed-data";

const prisma = new PrismaClient();

async function seedRoles(): Promise<void> {
  for (const role of SYSTEM_ROLES) {
    await prisma.role.upsert({
      where: { type: role.type },
      update: {
        name: role.name,
        description: role.description,
      },
      create: role,
    });
  }
}

async function seedStates(): Promise<void> {
  for (const state of NIGERIAN_STATES) {
    await prisma.state.upsert({
      where: { code: state.code },
      update: {
        name: state.name,
        region: state.region,
        isActive: true,
      },
      create: state,
    });
  }
}

async function seedSectors(): Promise<void> {
  for (const sector of INNOVATION_SECTORS) {
    await prisma.sector.upsert({
      where: { slug: sector.slug },
      update: {
        name: sector.name,
        description: sector.description,
        sortOrder: sector.sortOrder,
        isActive: true,
      },
      create: sector,
    });
  }
}

async function main(): Promise<void> {
  console.log("Seeding PitchDeck Nigeria reference data...");
  await seedRoles();
  await seedStates();
  await seedSectors();
  console.log("Seed completed successfully.");
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
