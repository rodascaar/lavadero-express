import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this-in-env';

export interface UserPayload {
    email: string;
    role: string;
}

export function createSession(email: string, role: string): string {
    return jwt.sign({ email, role }, JWT_SECRET, { expiresIn: '8h' });
}

export function verifySession(token: string): UserPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as UserPayload;
    } catch (error) {
        return null;
    }
}

export function isAdmin(userPayload: UserPayload | null | undefined): boolean {
    return userPayload?.role === 'ADMIN';
}

export function isEmployee(userPayload: UserPayload | null | undefined): boolean {
    return userPayload?.role === 'EMPLOYEE';
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function getSessionCookie(): string {
    return 'admin_session';
}
