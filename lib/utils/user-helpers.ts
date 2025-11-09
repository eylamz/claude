import User, { IUser, UserRole } from '@/lib/models/User';
import { validatePasswordStrength } from './password';

/**
 * Create a new user
 */
export async function createUser(userData: {
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
}): Promise<IUser> {
  // Validate password strength
  const passwordValidation = validatePasswordStrength(userData.password);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.errors.join(', '));
  }

  // Check if user already exists
  const existingUser = await User.findByEmail(userData.email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Create user
  const user = new User({
    email: userData.email,
    password: userData.password,
    fullName: userData.fullName,
    role: userData.role || 'user',
  });

  await user.save();
  return user;
}

/**
 * Verify user email
 */
export async function verifyUserEmail(userId: string): Promise<IUser | null> {
  return await User.findByIdAndUpdate(
    userId,
    { emailVerified: true },
    { new: true }
  );
}

/**
 * Update user password
 */
export async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<IUser | null> {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Validate password strength
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.errors.join(', '));
  }

  user.password = newPassword;
  await user.save();
  return user;
}

/**
 * Set default address
 */
export async function setDefaultAddress(
  userId: string,
  addressId: string
): Promise<IUser | null> {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Remove default from all addresses
  user.addresses.forEach((addr) => {
    addr.isDefault = false;
  });

  // Set new default - find address by index or create a new address entry
  const addressIndex = parseInt(addressId, 10);
  if (!isNaN(addressIndex) && addressIndex >= 0 && addressIndex < user.addresses.length) {
    user.addresses[addressIndex].isDefault = true;
    await user.save();
  }

  return user;
}

/**
 * Check if user has permission
 */
export function hasPermission(user: IUser, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    user: 1,
    editor: 2,
    admin: 3,
  };

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

