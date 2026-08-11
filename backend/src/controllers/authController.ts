import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { generateToken } from '../utils/jwt';
import { AuthenticatedRequest, UserRole } from '../types';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: AuthenticatedRequest, res: Response) {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.flatten(),
      });
    }

    const { email, password } = parseResult.data;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
    });

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Login error details:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Server error during login',
    });
  }
}

export async function me(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  return res.json({ success: true, user });
}

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { name, email } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        name: name.trim(),
        ...(email && { email: email.toLowerCase().trim() }),
      },
      select: { id: true, email: true, name: true, role: true, updatedAt: true },
    });

    return res.json({
      success: true,
      message: 'Profile name updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile name' });
  }
}
