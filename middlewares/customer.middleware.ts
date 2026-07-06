import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { User } from "../generated/prisma/client";
import prisma from "../config/prisma";
import { UnauthorizedError } from "../modules/common/error";

dotenv.config();

export interface CustomerRequest extends Request {
    user?: User;
}

export type CustomerJWTPayload = {
    id: string;
    email: string;
    base_role: string;
};

const customerAuthMiddleware = () => {

    return async (req: CustomerRequest, res: Response, next: NextFunction) => {
        const authHeader = req.header("Authorization");

        if (!authHeader?.startsWith("Bearer ")) {
            throw new UnauthorizedError("Access denied. No token provided.");
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as CustomerJWTPayload;
        const user = await prisma.user.findUnique({ where: { email: decoded.email } });
        // const authToken = await prisma.authToken.findUnique({ where: { tokenValue: token } })

        if (!user) {
            throw new UnauthorizedError("Invalid token. Access denied.");
        }

        if (!user.isActive) {
            throw new UnauthorizedError("Customer account is not activated!");
        }

        if (decoded.base_role !== 'customer') {
            throw new UnauthorizedError("Access denied. Not a customer account.");
        }

        req.user = user;

        next();

    };

};

export default customerAuthMiddleware;