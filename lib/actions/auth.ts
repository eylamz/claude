'use server';

import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';

interface RegisterResult {
  success: boolean;
  error?: string;
  user?: any;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
function isStrongPassword(password: string): boolean {
  return password.length >= 12;
}

/**
 * Check if email already exists
 */
export async function emailExists(email: string): Promise<boolean> {
  try {
    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() });
    return !!user;
  } catch (error) {
    console.error('Error checking email:', error);
    return false;
  }
}

/**
 * Server action to register a new user
 */
export async function registerUser(
  data: {
    email: string;
    password: string;
  }
): Promise<RegisterResult> {
  try {
    // Validate inputs
    if (!data.email?.trim()) {
      return { success: false, error: 'Email is required' };
    }

    if (!isValidEmail(data.email)) {
      return { success: false, error: 'Invalid email address' };
    }

    if (!data.password) {
      return { success: false, error: 'Password is required' };
    }

    if (!isStrongPassword(data.password)) {
      return {
        success: false,
        error: 'Password must be at least 12 characters',
      };
    }

    // Check if email already exists
    if (await emailExists(data.email)) {
      return { success: false, error: 'Email already exists' };
    }

    // Connect to database
    await connectDB();

    // Create new user
    const user = new User({
      email: data.email.toLowerCase(),
      password: data.password, // Will be hashed by User model pre-save hook
      // fullName is optional and will default to '' from schema
      role: 'user',
      preferences: {
        language: 'en', // Can be updated based on locale
        colorMode: 'system',
        emailMarketing: false,
      },
      emailVerified: false,
      wishlist: [],
      addresses: [],
    });

    // Save user (password will be automatically hashed)
    await user.save();

    // Return success (don't include password in response)
    // Convert to plain object and remove Mongoose-specific properties
    const userObject = user.toObject();
    const { password: _, __v, ...userWithoutPassword } = userObject;
    
    // Convert MongoDB _id to string and ensure all values are plain
    const plainUser = {
      ...userWithoutPassword,
      _id: user._id.toString(),
      id: user._id.toString(),
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString(),
    };

    return {
      success: true,
      user: plainUser,
    };
  } catch (error: any) {
    console.error('Registration error:', error);

    // Handle duplicate email error
    if (error.code === 11000) {
      return { success: false, error: 'Email already exists' };
    }

    return {
      success: false,
      error: error.message || 'An error occurred during registration',
    };
  }
}

