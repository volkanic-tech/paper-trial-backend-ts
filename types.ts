import { Admin, User } from "./generated/prisma/client";
import express from 'express';

export interface AuthenticatedAdminRequest extends express.Request {
  user?: Admin;
}
export interface AuthenticatedUserRequest extends express.Request {
  user?: User;
}