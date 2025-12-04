import { Admin } from "./generated/prisma/client";
import express from 'express';

export interface AuthenticatedAdminRequest extends express.Request {
  user?: Admin;
}
