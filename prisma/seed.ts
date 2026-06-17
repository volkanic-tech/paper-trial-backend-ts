import { PrismaClient } from "../generated/prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding database...");

    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    await prisma.admin.upsert({
        where: {
            email: "admin@papertrail.com",
        },
        update: {},
        create: {
            name: "System Administrator",
            email: "admin@papertrail.com",
            phone: "0771234567",
            address: "Head Office",
            password: hashedPassword,
            role: "admin",
            isActive: true,
        },
    });

    const categories = [
        "Laptops",
        "Desktop Computers",
        "Monitors",
        "Printers",
        "Accessories",
    ];

    for (const categoryName of categories) {
        await prisma.category.upsert({
            where: {
                name: categoryName,
            },
            update: {},
            create: {
                name: categoryName,
                isActive: true,
            },
        });
    }

    console.log("Database seeded successfully");
}

main()
    .catch((e) => {
        console.error("Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });