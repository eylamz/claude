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
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) && // Has uppercase
    /[a-z]/.test(password) && // Has lowercase
    /\d/.test(password) && // Has number
    /[^A-Za-z0-9]/.test(password) // Has special char
  );
}

/**
 * Check if email already exists
 */
async function emailExists(email: string): Promise<boolean> {
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
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    agreeToTerms: boolean;
    emailMarketing: boolean;
  }
): Promise<RegisterResult> {
  try {
    // Validate inputs
    if (!data.fullName?.trim()) {
      return { success: false, error: 'Full name is required' };
    }

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
        error:
          'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
      };
    }

    if (data.password !== data.confirmPassword) {
      return { success: false, error: 'Passwords do not match' };
    }

    if (!data.agreeToTerms) {
      return { success: false, error: 'You must agree to the terms and conditions' };
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
      fullName: data.fullName.trim(),
      role: 'user',
      preferences: {
        language: 'en', // Can be updated based on locale
        colorMode: 'system',
        emailMarketing: data.emailMarketing,
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

