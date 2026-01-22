import bcrypt from 'bcryptjs';

const JWT_SECRET = 'lavadero-admin-secret-key-2024';

import { signToken, verifyToken } from './jwt';

export function createSession(email: string): string {
    return signToken({ email, role: 'admin' });
}

export function verifySession(token: string): { email: string } | null {
    const payload = verifyToken(token);
    if (!payload) return null;
    return { email: payload.email };
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
