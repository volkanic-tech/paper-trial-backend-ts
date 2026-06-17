import path from 'node:path';
import fs from 'node:fs';
import { FileArray, UploadedFile } from 'express-fileupload';
import { ensureUploadDir, generateUniqueFilename } from '../../utils/file';
import { BadRequestError } from '../common/error';
import { ProductImageInput } from './product.schemas';

const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const maxImageSize = 5 * 1024 * 1024;

const parseOptionalJson = (value: unknown, fallback: unknown) => {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    return typeof value === 'string' ? JSON.parse(value) : value;
};

export class ProductUploadService {
    async saveProductImages(
        files: FileArray | null | undefined,
        body: Record<string, unknown>
    ): Promise<ProductImageInput[]> {
        if (!files || !files.images) {
            return [];
        }

        const uploadDir = ensureUploadDir();
        const images = files.images;
        const fileArray: UploadedFile[] = Array.isArray(images) ? images : [images];
        const altTexts = parseOptionalJson(body.altTexts, []) as string[];
        const primaryFlags = parseOptionalJson(body.primaryFlags, []) as Array<boolean | string>;
        const uploadedImages: ProductImageInput[] = [];

        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];

            if (!allowedImageTypes.includes(file.mimetype)) {
                throw new BadRequestError(`Invalid file type: ${file.name}. Allowed types: jpeg, jpg, png, webp, gif`);
            }

            if (file.size > maxImageSize) {
                throw new BadRequestError(`File too large: ${file.name}. Maximum size: 5MB`);
            }

            const uniqueFilename = generateUniqueFilename(file.name);
            const filePath = path.join(uploadDir, uniqueFilename);

            await file.mv(filePath);

            uploadedImages.push({
                url: `/uploads/products/${uniqueFilename}`,
                altText: altTexts[i] || undefined,
                isPrimary: primaryFlags[i] === true || primaryFlags[i] === 'true'
            });
        }

        return uploadedImages;
    }

    deleteUploadedImage(url: string) {
        if (!url.startsWith('/uploads/')) {
            return;
        }

        const filePath = path.join(__dirname, '..', '..', url);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}
