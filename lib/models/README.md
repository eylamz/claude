# Mongoose Models

This directory contains Mongoose schemas and models with full TypeScript support.

## User Model

### Overview

The `User` model provides a complete user management system with authentication, preferences, addresses, and role-based access control.

### File Structure

```
lib/models/
├── User.ts         # User model with authentication
└── index.ts        # Model exports
```

## User Schema

### Fields

#### Authentication
- **email** (String, unique, required)
  - Auto-converted to lowercase
  - Email validation regex
  - Unique index for performance
  - Indexed for fast lookups

- **password** (String, required)
  - Minimum 6 characters
  - Auto-hashed with bcrypt (salt rounds: 10)
  - Excluded from queries by default (`select: false`)
  - Not included in JSON responses

#### Personal Information
- **fullName** (String, required)
  - Trimmed automatically
  - Maximum 100 characters

- **role** (Enum, required, default: 'user')
  - Values: `'user'`, `'editor'`, `'admin'`
  - Indexed for performance
  - Default: `'user'`

#### Addresses (Array)
```typescript
interface IAddress {
  type: 'home' | 'work' | 'other';
  name: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  phone?: string;       // Optional
  isDefault: boolean;   // Only one default address
}
```

- Automatic validation to ensure only one default address
- Nested schema structure

#### Preferences
```typescript
interface IUserPreferences {
  language: 'en' | 'he';
  colorMode: 'light' | 'dark' | 'system';
  emailMarketing: boolean;
}
```

#### Additional Fields
- **wishlist** (Array of ObjectIds)
  - References to Product documents
  
- **resetToken** (String, optional)
  - Hashed password reset token
  - Excluded from queries and JSON

- **resetTokenExpiry** (Date, optional)
  - Expiration time for reset token
  - Excluded from queries and JSON

- **emailVerified** (Boolean, default: false)

- **createdAt** (Date, auto-generated)
- **updatedAt** (Date, auto-generated)

### Indexes

```typescript
// Email index (unique)
{ email: 1 }

// Role index
{ role: 1 }
```

### Middleware

#### Pre-save: Password Hashing
```typescript
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
```

#### Pre-save: Address Default Enforcement
Ensures only one default address exists.

### Instance Methods

#### `comparePassword(candidatePassword: string): Promise<boolean>`
Compare a plain text password with the hashed password.

```typescript
const user = await User.findOne({ email });
const isValid = await user.comparePassword('plaintextPassword');
```

#### `generateResetToken(): string`
Generate a password reset token.

```typescript
const resetToken = user.generateResetToken();
await user.save();
// Send resetToken to user's email
```

#### `toJSON(): any`
Exclude sensitive fields from JSON output.

```typescript
const user = await User.findById(id);
const safeUser = user.toJSON();
// password, resetToken, resetTokenExpiry are excluded
```

#### `isAdmin(): boolean`
Check if user is an admin.

```typescript
if (user.isAdmin()) {
  // Admin functionality
}
```

#### `isEditor(): boolean`
Check if user is editor or admin.

```typescript
if (user.isEditor()) {
  // Editor/admin functionality
}
```

#### `getDefaultAddress(): IAddress | undefined`
Get the default address or first address.

```typescript
const address = user.getDefaultAddress();
```

### Static Methods

#### `findByEmail(email: string): Promise<IUser | null>`
Find a user by email (case-insensitive).

```typescript
const user = await User.findByEmail('user@example.com');
```

#### `findAdmins(): Promise<IUser[]>`
Find all admin users.

```typescript
const admins = await User.findAdmins();
```

## Usage Examples

### Create a User

```typescript
import User from '@/lib/models/User';

const user = new User({
  email: 'user@example.com',
  password: 'securePassword123',
  fullName: 'John Doe',
  role: 'user',
  preferences: {
    language: 'en',
    colorMode: 'light',
    emailMarketing: false,
  },
  addresses: [{
    type: 'home',
    name: 'Home Address',
    street: '123 Main St',
    city: 'New York',
    zip: '10001',
    country: 'USA',
    isDefault: true,
  }],
});

await user.save();
```

### Verify Password

```typescript
import User from '@/lib/models/User';

const user = await User.findByEmail('user@example.com');
if (user && await user.comparePassword('candidatePassword')) {
  // Password is correct
}
```

### Password Reset

```typescript
import User from '@/lib/models/User';

const user = await User.findByEmail('user@example.com');
if (user) {
  const resetToken = user.generateResetToken();
  await user.save();
  
  // Send email with resetToken
  console.log(`Reset token: ${resetToken}`);
  
  // Later, verify token and update password
  // ... (verify token hasn't expired)
  user.password = 'newPassword';
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();
}
```

### Update User Preferences

```typescript
import User from '@/lib/models/User';

const user = await User.findById(userId);
if (user) {
  user.preferences.language = 'he';
  user.preferences.colorMode = 'dark';
  await user.save();
}
```

### Add to Wishlist

```typescript
import User from '@/lib/models/User';
import Product from '@/lib/models/Product';

const user = await User.findById(userId);
const product = await Product.findById(productId);

if (user && product) {
  user.wishlist.push(product._id);
  await user.save();
}
```

### Address Management

```typescript
import User from '@/lib/models/User';

const user = await User.findById(userId);

// Add a new address
user.addresses.push({
  type: 'work',
  name: 'Office',
  street: '456 Business Ave',
  city: 'New York',
  zip: '10002',
  country: 'USA',
  phone: '+1-555-0123',
  isDefault: false,
});

await user.save();

// Get default address
const defaultAddress = user.getDefaultAddress();
```

### Role-Based Access Control

```typescript
import User from '@/lib/models/User';

// Check if user can access admin features
const user = await User.findById(userId);
if (user.isAdmin()) {
  // Admin only functionality
}

// Check if user can edit content
if (user.isEditor()) {
  // Editor/admin functionality
}
```

## TypeScript Interfaces

```typescript
// Address interface
export interface IAddress {
  type: 'home' | 'work' | 'other';
  name: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

// User preferences interface
export interface IUserPreferences {
  language: 'en' | 'he';
  colorMode: 'light' | 'dark' | 'system';
  emailMarketing: boolean;
}

// User role type
export type UserRole = 'user' | 'editor' | 'admin';

// User interface
export interface IUser extends Document {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  addresses: IAddress[];
  preferences: IUserPreferences;
  wishlist: mongoose.Types.ObjectId[];
  resetToken?: string;
  resetTokenExpiry?: Date;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateResetToken(): string;
  toJSON(): any;
  isAdmin(): boolean;
  isEditor(): boolean;
  getDefaultAddress(): IAddress | undefined;
}

// Static methods
export interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
  findAdmins(): Promise<IUser[]>;
}
```

## Validation

### Email Validation
- Format: `/^\S+@\S+\.\S+$/`
- Automatically lowercased
- Must be unique

### Password Requirements
- Minimum 6 characters
- Auto-hashed with bcrypt

### Full Name Validation
- Required field
- Trimmed automatically
- Maximum 100 characters

### Address Validation
- Only one default address
- Required fields: type, name, street, city, zip, country
- Optional: phone

## Security Features

1. **Password Hashing**
   - Bcrypt with 10 salt rounds
   - Auto-hashed on save

2. **Sensitive Data Exclusion**
   - Password excluded from queries
   - Reset tokens excluded from JSON

3. **Reset Token Expiration**
   - 1-hour expiration (can be customized)
   - Automatically hashed

4. **Role-Based Access**
   - Enum validation
   - Helper methods for role checks

## Best Practices

1. **Always use `select` to load password when needed:**
   ```typescript
   const user = await User.findOne({ email }).select('+password');
   ```

2. **Use helper methods for password comparison:**
   ```typescript
   // Always use comparePassword method
   const isValid = await user.comparePassword(password);
   ```

3. **Handle reset tokens properly:**
   ```typescript
   // Check expiration before using
   if (user.resetTokenExpiry > new Date()) {
     // Token is valid
   }
   ```

4. **Validate addresses on save:**
   ```typescript
   // Middleware ensures only one default address
   ```

## Related Files

- `lib/db/mongodb.ts` - Database connection utility
- `lib/utils/user-helpers.ts` - User helper functions
- `lib/utils/password.ts` - Password validation utilities

## Testing

```typescript
import User from '@/lib/models/User';
import { connectDB, disconnectDB } from '@/lib/db/mongodb';

describe('User Model', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('should hash password on save', async () => {
    const user = new User({
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
    });
    await user.save();
    
    expect(user.password).not.toBe('password123');
    expect(user.password.startsWith('$2b$')).toBe(true);
  });

  it('should compare passwords correctly', async () => {
    const user = await User.findOne({ email: 'test@example.com' });
    const isValid = await user.comparePassword('password123');
    
    expect(isValid).toBe(true);
  });

  it('should only allow one default address', async () => {
    const user = await User.findOne({ email: 'test@example.com' });
    user.addresses.push({
      type: 'work',
      name: 'Office',
      street: '123 St',
      city: 'City',
      zip: '12345',
      country: 'Country',
      isDefault: true,
    });
    await user.save();
    
    const defaultAddresses = user.addresses.filter(a => a.isDefault);
    expect(defaultAddresses.length).toBe(1);
  });
});
```

## Migration Notes

If migrating from an existing database:

1. **Password Migration**
   - Old passwords will be hashed on next login attempt
   - Or migrate in batches using migration script

2. **Index Migration**
   - Run `createIndexes()` to ensure indexes are created
   ```typescript
   await User.createIndexes();
   ```

3. **Default Values**
   - Existing users without preferences get defaults
   - Existing users without role get 'user' role

