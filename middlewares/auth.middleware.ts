import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Admin } from "../generated/prisma/client";
import prisma from "../config/prisma";
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from "../modules/common/error";
dotenv.config();

interface AdminRequest extends Request {
    user?: Admin
}

const role = {
    "admin": 2,
    "moderator": 1
}

const adminAuthMiddleware = (requiredRole?: string) => {

    return async (req: AdminRequest, res: Response, next: NextFunction) => {
        const authHeader = req.header("Authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedError("Access denied. No token provided.");
        }

        const token = authHeader.split(" ")[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; email: string; role?: string, base_role?: string };
            const user = await prisma.admin.findUnique({ where: { email: decoded.email } });
            // const authToken = await prisma.authToken.findUnique({ where: { tokenValue: token } })

            if (!user) {
                res.status(404).json({ message: "Admin account not found." });
                throw new NotFoundError("Admin account not found.");
            }

            if (!user.isActive) {
                throw new ForbiddenError("Admin account is not activated!");
            }

            if (decoded.base_role !== 'admin') {
                throw new ForbiddenError("Access denied. Not an admin account.");
            }

            req.user = user;

            if (requiredRole) {
                const userRoleLevel = role[user.role as keyof typeof role] || 0;
                const requiredRoleLevel = role[requiredRole as keyof typeof role] || 0;

                if (userRoleLevel < requiredRoleLevel) {
                    res.status(403).json({ message: "Access denied. Insufficient permissions." });
                    return
                }
            }

            next();
        } catch (err) {
            throw new BadRequestError("Invalid token.");
        }
    };

};

export default adminAuthMiddleware;