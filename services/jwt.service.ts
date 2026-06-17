import jwt from 'jsonwebtoken';
import { Admin } from '../generated/prisma/client';

export class JwtService {
    signAdminToken(admin: Pick<Admin, 'id' | 'email' | 'role'>) {
        return jwt.sign(
            {
                id: admin.id,
                email: admin.email,
                base_role: 'admin',
                role: admin.role
            },
            process.env.JWT_SECRET || '',
            { expiresIn: '24h' }
        );
    }
}
