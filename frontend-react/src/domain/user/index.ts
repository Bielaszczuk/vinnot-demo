/**
 * User domain barrel export
 */

export type {
  User,
  UserRole,
  UserProfile,
  UserPreferences,
  UserStats,
  PriceRange,
  NotificationPreferences,
} from './user.types'


export {
  userRoleSchema,
  themeSchema,
  priceRangeSchema,
  notificationPreferencesSchema,
  userPreferencesSchema,
  userSchema,
  registerUserSchema,
  loginUserSchema,
  updateUserProfileSchema,
  changePasswordSchema,
} from './user.validators'


export type {
  RegisterUserInput,
  LoginUserInput,
  UpdateUserProfileInput,
  ChangePasswordInput,
  UserPreferencesInput,
} from './user.validators'

export {
  mapUserFromDto,
  mapUserToDto,
  mapUserProfileFromDto,
} from './user.mappers'

