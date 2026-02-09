/**
 * Model exports
 */

export { default as User } from './User';
export type { IUser, IAddress, IUserPreferences, UserRole } from './User';

export { default as Product } from './Product';
export type {
  IProduct,
  IProductImage,
  IColorVariant,
  ISizeVariant,
  IProductVariant,
  IProductMetadata,
  ILocalizedField,
  ProductStatus,
} from './Product';

export { default as Skatepark } from './Skatepark';
export type {
  ISkatepark,
  ISkateparkImage,
  IDaySchedule,
  IOperatingHours,
  IAmenities,
  IMediaLinks,
  ILocation,
  Area,
  SkateparkStatus,
} from './Skatepark';

export { default as Event } from './Event';
export type { IEvent, IEventModel } from './Event';

export { default as EventSignup } from './EventSignup';
export type {
  IEventSignup,
  IFormField,
  EventSignupStatus,
} from './EventSignup';

export { default as Trainer } from './Trainer';
export type {
  ITrainer,
  ITrainerImage,
  IReview,
  IContactDetails,
  TrainerStatus,
} from './Trainer';

export { default as Guide } from './Guide';
export type {
  IGuide,
  IContentBlock,
  ContentBlockType,
  HeadingLevel,
  ListType,
  GuideStatus,
} from './Guide';

export { default as Settings } from './Settings';
export type {
  ISettings,
  IHeroCarouselImage,
  IHomepageSettings,
  IShopSettings,
  IEmailSettings,
  ISEOSettings,
  IMaintenanceSettings,
} from './Settings';

export { default as WeatherForecast } from './WeatherForecast';
export type {
  IWeatherForecast,
  IHourlyForecast,
  IDailyForecast,
} from './WeatherForecast';

export { default as AnalyticsEvent } from './AnalyticsEvent';
export type {
  IAnalyticsEvent,
  IPageViewEvent,
  IConsentEvent,
  AnalyticsEventType,
  DeviceCategory,
  ReferrerCategory,
  ConsentChoice,
} from './AnalyticsEvent';