import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const roundMoney = (value: number) =>
    Math.round((value + Number.EPSILON) * 100) / 100;

const calculateDocumentTotals = (
    items: Array<{
        id: number;
        name: string;
        basePrice: number;
        price: number;
        quantity: number;
    }>,
    taxRate: number,
    shippingFee: number,
    discountRate: number
) => {
    const calculatedItems = items.map(item => ({
        ...item,
        basePrice: roundMoney(item.basePrice),
        price: roundMoney(item.price),
        subtotal: roundMoney(item.price * item.quantity)
    }));

    const subtotal = roundMoney(
        calculatedItems.reduce((sum, item) => sum + item.subtotal, 0)
    );
    const discountAmount = roundMoney(subtotal * (discountRate / 100));
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = roundMoney(taxableAmount * (taxRate / 100));
    const total = roundMoney(taxableAmount + taxAmount + shippingFee);

    return {
        items: calculatedItems,
        subtotal,
        taxRate,
        taxAmount,
        shippingFee: roundMoney(shippingFee),
        discountRate,
        discountAmount,
        total
    };
};

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

    const categoryNames = [
        "Laptops",
        "Desktop Computers",
        "Monitors",
        "Printers",
        "Accessories",
    ];

    const categories = new Map<string, number>();

    for (const categoryName of categoryNames) {
        const category = await prisma.category.upsert({
            where: {
                name: categoryName,
            },
            update: {
                isActive: true,
            },
            create: {
                name: categoryName,
                isActive: true,
            },
        });

        categories.set(categoryName, category.id);
    }

    const products = [
        {
            sku: "LAP-DELL-001",
            name: "Dell Latitude 5550",
            description: "15-inch business laptop suitable for office and remote work.",
            price: 325000,
            originalPrice: 345000,
            costPrice: 285000,
            category: "Laptops",
            stock: 12,
            isNew: true,
            isFeatured: true,
            features: ["Intel Core Ultra 5", "16GB RAM", "512GB SSD"],
            specifications: {
                display: "15.6-inch FHD",
                memory: "16GB DDR5",
                storage: "512GB NVMe SSD",
            },
            image: "https://placehold.co/1200x900/png?text=Dell+Latitude+5550",
        },
        {
            sku: "MON-LG-001",
            name: "LG UltraGear 27-inch Monitor",
            description: "High-refresh-rate QHD monitor for creative and gaming workloads.",
            price: 128500,
            originalPrice: 139000,
            costPrice: 108000,
            category: "Monitors",
            stock: 20,
            isNew: false,
            isFeatured: true,
            features: ["QHD resolution", "165Hz refresh rate", "IPS panel"],
            specifications: {
                size: "27-inch",
                resolution: "2560x1440",
                refreshRate: "165Hz",
            },
            image: "https://placehold.co/1200x900/png?text=LG+UltraGear+Monitor",
        },
        {
            sku: "PRN-HP-001",
            name: "HP LaserJet Pro Printer",
            description: "Compact monochrome laser printer for small offices.",
            price: 89500,
            originalPrice: 95000,
            costPrice: 74000,
            category: "Printers",
            stock: 8,
            isNew: false,
            isFeatured: false,
            features: ["Automatic duplex", "Wi-Fi", "Mobile printing"],
            specifications: {
                type: "Monochrome laser",
                speed: "33 ppm",
                connectivity: "USB, Ethernet, Wi-Fi",
            },
            image: "https://placehold.co/1200x900/png?text=HP+LaserJet+Pro",
        },
        {
            sku: "ACC-LOGI-001",
            name: "Logitech MX Master 3S",
            description: "Ergonomic wireless productivity mouse.",
            price: 36500,
            originalPrice: 39900,
            costPrice: 29500,
            category: "Accessories",
            stock: 35,
            isNew: true,
            isFeatured: true,
            features: ["Quiet clicks", "8K DPI sensor", "Multi-device support"],
            specifications: {
                connection: "Bluetooth and USB receiver",
                battery: "Up to 70 days",
                color: "Graphite",
            },
            image: "https://placehold.co/1200x900/png?text=Logitech+MX+Master+3S",
        },
    ];

    const seededProducts = new Map<string, { id: number; name: string; price: number }>();

    for (const productData of products) {
        const categoryId = categories.get(productData.category);

        if (!categoryId) {
            throw new Error(`Category not found while seeding: ${productData.category}`);
        }

        const product = await prisma.product.upsert({
            where: {
                sku: productData.sku,
            },
            update: {
                name: productData.name,
                description: productData.description,
                price: productData.price,
                originalPrice: productData.originalPrice,
                costPrice: productData.costPrice,
                features: productData.features,
                specifications: productData.specifications,
                categoryId,
                stock: productData.stock,
                isActive: true,
                isNew: productData.isNew,
                isFeatured: productData.isFeatured,
            },
            create: {
                sku: productData.sku,
                name: productData.name,
                description: productData.description,
                price: productData.price,
                originalPrice: productData.originalPrice,
                costPrice: productData.costPrice,
                features: productData.features,
                specifications: productData.specifications,
                categoryId,
                stock: productData.stock,
                isActive: true,
                isNew: productData.isNew,
                isFeatured: productData.isFeatured,
            },
        });

        await prisma.productImage.deleteMany({
            where: {
                productId: product.id,
            },
        });

        await prisma.productImage.create({
            data: {
                productId: product.id,
                url: productData.image,
                altText: productData.name,
                isPrimary: true,
            },
        });

        seededProducts.set(productData.sku, {
            id: product.id,
            name: product.name,
            price: product.price,
        });
    }

    const dellLaptop = seededProducts.get("LAP-DELL-001");
    const lgMonitor = seededProducts.get("MON-LG-001");
    const hpPrinter = seededProducts.get("PRN-HP-001");
    const logitechMouse = seededProducts.get("ACC-LOGI-001");

    if (!dellLaptop || !lgMonitor || !hpPrinter || !logitechMouse) {
        throw new Error("Required seeded products were not created");
    }

    const documents = [
        {
            generatedId: "QUO-26-9001",
            type: "quotation",
            customerName: "Acme Design Studio",
            customerEmail: "accounts@acmedesign.test",
            customerPhone: "0775551001",
            customerAddress: "42 Galle Road, Colombo 03",
            issueDate: new Date("2026-06-15"),
            expiryDate: new Date("2026-07-15"),
            status: "issued",
            notes: "Quotation valid for 30 days.",
            taxRate: 18,
            shippingFee: 2500,
            discountRate: 5,
            items: [
                {
                    id: dellLaptop.id,
                    name: dellLaptop.name,
                    basePrice: dellLaptop.price,
                    price: 320000,
                    quantity: 2,
                },
                {
                    id: logitechMouse.id,
                    name: logitechMouse.name,
                    basePrice: logitechMouse.price,
                    price: 35000,
                    quantity: 2,
                },
            ],
        },
        {
            generatedId: "INV-26-9001",
            type: "invoice",
            customerName: "Bluewave Solutions",
            customerEmail: "finance@bluewave.test",
            customerPhone: "0775551002",
            customerAddress: "18 Duplication Road, Colombo 04",
            issueDate: new Date("2026-06-01"),
            expiryDate: new Date("2026-06-30"),
            status: "paid",
            notes: "Paid by bank transfer.",
            taxRate: 18,
            shippingFee: 1500,
            discountRate: 0,
            items: [
                {
                    id: lgMonitor.id,
                    name: lgMonitor.name,
                    basePrice: lgMonitor.price,
                    price: 125000,
                    quantity: 3,
                },
            ],
        },
        {
            generatedId: "INV-26-9002",
            type: "invoice",
            customerName: "Northstar Consulting",
            customerEmail: "office@northstar.test",
            customerPhone: "0775551003",
            customerAddress: "7 Park Street, Colombo 02",
            issueDate: new Date("2026-05-01"),
            expiryDate: new Date("2026-05-31"),
            status: "overdue",
            notes: "Payment reminder required.",
            taxRate: 18,
            shippingFee: 2000,
            discountRate: 10,
            items: [
                {
                    id: hpPrinter.id,
                    name: hpPrinter.name,
                    basePrice: hpPrinter.price,
                    price: 87500,
                    quantity: 2,
                },
                {
                    id: logitechMouse.id,
                    name: logitechMouse.name,
                    basePrice: logitechMouse.price,
                    price: 36000,
                    quantity: 1,
                },
            ],
        },
        {
            generatedId: "QUO-26-9002",
            type: "quotation",
            customerName: "Greenfield Academy",
            customerEmail: "admin@greenfield.test",
            customerPhone: "0775551004",
            customerAddress: "120 Kandy Road, Kadawatha",
            issueDate: new Date("2026-06-20"),
            expiryDate: new Date("2026-07-20"),
            status: "draft",
            notes: "Internal draft for customer review.",
            taxRate: 18,
            shippingFee: 3500,
            discountRate: 7.5,
            items: [
                {
                    id: dellLaptop.id,
                    name: dellLaptop.name,
                    basePrice: dellLaptop.price,
                    price: 315000,
                    quantity: 5,
                },
                {
                    id: lgMonitor.id,
                    name: lgMonitor.name,
                    basePrice: lgMonitor.price,
                    price: 122000,
                    quantity: 5,
                },
            ],
        },
    ];

    for (const document of documents) {
        const { items, taxRate, shippingFee, discountRate, ...documentData } = document;
        const totals = calculateDocumentTotals(items, taxRate, shippingFee, discountRate);

        await prisma.quotationInvoice.upsert({
            where: {
                generatedId: document.generatedId,
            },
            update: {
                ...documentData,
                ...totals,
            },
            create: {
                ...documentData,
                ...totals,
            },
        });
    }

    console.log(
        `Database seeded successfully: ${products.length} products and ${documents.length} invoice documents`
    );
}

main()
    .catch((e) => {
        console.error("Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
