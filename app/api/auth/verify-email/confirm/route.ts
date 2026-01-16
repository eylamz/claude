import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Hash the provided token
    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Connect to database
    await connectDB();

    // Find user with matching token
    const user = await User.findOne({
      resetToken: verificationTokenHash,
      resetTokenExpiry: { $gt: new Date() },
    }).select('+resetToken +resetTokenExpiry +resetTokenUsed +resetTokenAttempts +resetTokenIP email emailVerified');

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    // Check if token has already been used
    if (user.resetTokenUsed) {
      return NextResponse.json(
        { error: 'This verification link has already been used.' },
        { status: 400 }
      );
    }

    // Mark email as verified and clear token
    user.emailVerified = true;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    user.resetTokenUsed = undefined;
    user.resetTokenAttempts = undefined;
    user.resetTokenIP = undefined;
    
    await user.save();
    
    console.log(`Email verified successfully for user: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Email has been verified successfully.',
      email: user.email,
    });
  } catch (error) {
    console.error('Email verification confirmation error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

