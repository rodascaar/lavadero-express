import bcrypt from 'bcryptjs';

const JWT_SECRET = 'lavadero-admin-secret-key-2024';

export function createSession(email: string): string {
    const payload = {
        email,
        exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };
    // Simple base64 encoding for demo (use proper JWT in production)
    const encoded = btoa(JSON.stringify(payload));
    return encoded;
}

export function verifySession(token: string): { email: string } | null {
    try {
        const decoded = JSON.parse(atob(token));
        if (decoded.exp < Date.now()) {
            return null;
        }
        return { email: decoded.email };
    } catch {
        return null;
    }
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
