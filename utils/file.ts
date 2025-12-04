import path from "path";
import fs from "fs";


export const ensureUploadDir = () => {
    const uploadDir = path.join(__dirname, '../uploads/products');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    return uploadDir;
};

export const generateUniqueFilename = (originalName: string): string => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, extension);
    return `${nameWithoutExt}-${timestamp}-${randomString}${extension}`;
}