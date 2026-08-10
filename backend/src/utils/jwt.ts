import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { JwtPayload } from '../types';

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'super-secret-jwt-key-mini-erp-crm-2026';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

export function generateToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN,
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
