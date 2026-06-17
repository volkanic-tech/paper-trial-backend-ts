const parseOptionalJson = (value: unknown, fallback: unknown) => {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    return typeof value === 'string' ? JSON.parse(value) : value;
};

const parseBoolean = (value: unknown, fallback?: boolean) => {
    if (value === undefined) {
        return fallback;
    }

    return value === true || value === 'true';
};

export const parseCreateProductBody = (body: Record<string, unknown>) => ({
    ...body,
    price: Number.parseFloat(String(body.price)),
    originalPrice: Number.parseFloat(String(body.originalPrice)),
    costPrice: Number.parseFloat(String(body.costPrice)),
    categoryId: Number.parseInt(String(body.categoryId), 10),
    stock: Number.parseInt(String(body.stock), 10),
    isActive: parseBoolean(body.isActive, true),
    isNew: parseBoolean(body.isNew, true),
    isFeatured: parseBoolean(body.isFeatured, false),
    imageLinks: parseOptionalJson(body.imageLinks, [])
});

export const parseUpdateProductBody = (body: Record<string, unknown>) => {
    const parsed: Record<string, unknown> = { ...body };

    if (parsed.price !== undefined) parsed.price = Number.parseFloat(String(parsed.price));
    if (parsed.originalPrice !== undefined) parsed.originalPrice = Number.parseFloat(String(parsed.originalPrice));
    if (parsed.costPrice !== undefined) parsed.costPrice = Number.parseFloat(String(parsed.costPrice));
    if (parsed.categoryId !== undefined) parsed.categoryId = Number.parseInt(String(parsed.categoryId), 10);
    if (parsed.stock !== undefined) parsed.stock = Number.parseInt(String(parsed.stock), 10);
    if (parsed.isActive !== undefined) parsed.isActive = parseBoolean(parsed.isActive);
    if (parsed.isNew !== undefined) parsed.isNew = parseBoolean(parsed.isNew);
    if (parsed.isFeatured !== undefined) parsed.isFeatured = parseBoolean(parsed.isFeatured);
    if (parsed.imageLinks !== undefined) parsed.imageLinks = parseOptionalJson(parsed.imageLinks, undefined);
    if (parsed.deleteImageIds !== undefined) parsed.deleteImageIds = parseOptionalJson(parsed.deleteImageIds, undefined);

    return parsed;
};
