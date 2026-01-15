import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Get client IP for optional IP binding check
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Hash the provided token
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Connect to database
    await connectDB();

    // Find user with matching token - select all reset token fields
    const user = await User.findOne({
      resetToken: resetTokenHash,
      resetTokenExpiry: { $gt: new Date() },
    }).select('+resetToken +resetTokenExpiry +resetTokenUsed +resetTokenAttempts +resetTokenIP password email');

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if token has already been used (single-use)
    if (user.resetTokenUsed) {
      // Increment attempts for trying to use an already-used token
      user.resetTokenAttempts = (user.resetTokenAttempts || 0) + 1;
      await user.save();
      return NextResponse.json(
        { error: 'This reset link has already been used. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check attempt limits (max 5 attempts)
    if (user.resetTokenAttempts && user.resetTokenAttempts >= 5) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please request a new reset link.' },
        { status: 400 }
      );
    }

    // Optional IP binding check (only if IP was stored)
    // Note: We log IP mismatches but don't block (optional feature)
    if (user.resetTokenIP && user.resetTokenIP !== 'unknown' && ip !== 'unknown') {
      if (user.resetTokenIP !== ip) {
        console.log(`IP mismatch for reset token: stored=${user.resetTokenIP}, current=${ip}`);
        // Increment attempt counter for IP mismatch (optional security feature)
        user.resetTokenAttempts = (user.resetTokenAttempts || 0) + 1;
        await user.save();
      }
    }

    try {
      // Update password and mark token as used (single-use)
      user.password = password; // Will be hashed by User model pre-save hook
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
      user.resetTokenUsed = true; // Mark as used
      user.resetTokenAttempts = 0; // Reset attempts on success
      user.resetTokenIP = undefined; // Clear IP
      await user.save();

      return NextResponse.json({
        success: true,
        message: 'Password has been reset successfully.',
      });
    } catch (saveError) {
      // Increment attempts on save failure
      user.resetTokenAttempts = (user.resetTokenAttempts || 0) + 1;
      await user.save();
      console.error('Password save error:', saveError);
      throw saveError;
    }
  } catch (error) {
    console.error('Password reset confirmation error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

