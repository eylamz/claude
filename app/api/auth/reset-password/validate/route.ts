import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
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

    // Find user with matching token
    const user = await User.findOne({
      resetToken: resetTokenHash,
      resetTokenExpiry: { $gt: new Date() },
    }).select('+resetToken +resetTokenExpiry +resetTokenUsed +resetTokenAttempts +resetTokenIP email');

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if token has already been used (single-use)
    if (user.resetTokenUsed) {
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
    if (user.resetTokenIP && user.resetTokenIP !== 'unknown' && ip !== 'unknown') {
      // Allow some flexibility for IP changes (e.g., mobile networks)
      // In production, you might want stricter checking
      if (user.resetTokenIP !== ip) {
        // Increment attempt counter for IP mismatch
        user.resetTokenAttempts = (user.resetTokenAttempts || 0) + 1;
        await user.save();
        console.log(`IP mismatch for reset token: stored=${user.resetTokenIP}, current=${ip}`);
        // Don't block, but log the mismatch
      }
    }

    // Optional IP binding check (only if IP was stored)
    if (user.resetTokenIP && user.resetTokenIP !== 'unknown' && ip !== 'unknown') {
      // Allow some flexibility for IP changes (e.g., mobile networks)
      // In production, you might want stricter checking
      if (user.resetTokenIP !== ip) {
        // Log the mismatch but don't block (optional feature)
        console.log(`IP mismatch for reset token: stored=${user.resetTokenIP}, current=${ip}`);
      }
    }

    return NextResponse.json({
      success: true,
      email: user.email,
    });
  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

