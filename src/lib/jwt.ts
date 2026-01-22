import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-key-change-this-in-env';

export interface TokenPayload {
    email: string;
    role: string;
}

export function signToken(payload: TokenPayload): string {
    return jwt.sign(payload, SECRET_KEY, { expiresIn: '8h' });
}

export function verifyToken(token: string): TokenPayload | null {
    try {
        return jwt.verify(token, SECRET_KEY) as TokenPayload;
    } catch (error) {
        return null;
    }
}
