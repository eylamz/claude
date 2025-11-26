import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Multilingual text interface
 */
export interface IMultilingualText {
  en?: string;
  he?: string;
}

/**
 * Hero carousel image interface
 */
export interface IHeroCarouselImage {
  imageUrl?: string;
  desktopImageUrl?: string;
  tabletImageUrl?: string;
  mobileImageUrl?: string;
  link?: string;
  title?: string | IMultilingualText;
  subtitle?: string | IMultilingualText;
  ctaText?: string | IMultilingualText;
  textOverlay?: string | IMultilingualText;
  order: number;
}

/**
 * Homepage settings interface
 */
export interface IHomepageSettings {
  heroCarouselImages: IHeroCarouselImage[];
  featuredProductsCount: number;
  featuredSkateparksCount: number;
  featuredTrainersCount: number;
  featuredGuidesCount: number;
}

/**
 * Shop settings interface
 */
export interface IShopSettings {
  productsPerPage: number;
  defaultSortOrder: string;
  showOutOfStockProducts: boolean;
  guestCheckoutEnabled: boolean;
}

/**
 * Email settings interface
 */
export interface IEmailSettings {
  adminNotificationEmail: string;
  orderConfirmationTemplate: string;
  contactFormRecipient: string;
}

/**
 * SEO settings interface
 */
export interface ISEOSettings {
  siteTitle: string;
  defaultMetaDescription: string;
  facebookImage?: string;
  twitterImage?: string;
}

/**
 * Maintenance settings interface
 */
export interface IMaintenanceSettings {
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
}

/**
 * Settings interface extending Mongoose Document
 */
export interface ISettings extends Document {
  homepage: IHomepageSettings;
  shop: IShopSettings;
  email: IEmailSettings;
  seo: ISEOSettings;
  maintenance: IMaintenanceSettings;
  skateparksVersion: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Static methods
  findOrCreate(): Promise<ISettings>;
}

/**
 * Settings Model interface
 */
export interface ISettingsModel extends Model<ISettings> {
  findOrCreate(): Promise<ISettings>;
}

/**
 * Settings schema definition
 */
const SettingsSchema: Schema<ISettings> = new Schema<ISettings>(
  {
    homepage: {
      heroCarouselImages: [
        {
          imageUrl: {
            type: String,
            required: false,
          },
          desktopImageUrl: {
            type: String,
            required: false,
          },
          tabletImageUrl: {
            type: String,
            required: false,
          },
          mobileImageUrl: {
            type: String,
            required: false,
          },
          link: {
            type: String,
            required: false,
          },
          title: {
            type: Schema.Types.Mixed,
            required: false,
          },
          subtitle: {
            type: Schema.Types.Mixed,
            required: false,
          },
          ctaText: {
            type: Schema.Types.Mixed,
            required: false,
          },
          textOverlay: {
            type: Schema.Types.Mixed,
            required: false,
          },
          order: {
            type: Number,
            default: 0,
          },
        },
      ],
      featuredProductsCount: {
        type: Number,
        default: 6,
        min: 0,
      },
      featuredSkateparksCount: {
        type: Number,
        default: 6,
        min: 0,
      },
      featuredTrainersCount: {
        type: Number,
        default: 6,
        min: 0,
      },
      featuredGuidesCount: {
        type: Number,
        default: 6,
        min: 0,
      },
    },
    shop: {
      productsPerPage: {
        type: Number,
        default: 12,
        min: 1,
      },
      defaultSortOrder: {
        type: String,
        default: 'createdAt-desc',
      },
      showOutOfStockProducts: {
        type: Boolean,
        default: false,
      },
      guestCheckoutEnabled: {
        type: Boolean,
        default: true,
      },
    },
    email: {
      adminNotificationEmail: {
        type: String,
        trim: true,
      },
      orderConfirmationTemplate: {
        type: String,
        trim: true,
      },
      contactFormRecipient: {
        type: String,
        trim: true,
      },
    },
    seo: {
      siteTitle: {
        type: String,
        trim: true,
      },
      defaultMetaDescription: {
        type: String,
        trim: true,
      },
      facebookImage: {
        type: String,
        required: false,
      },
      twitterImage: {
        type: String,
        required: false,
      },
    },
    maintenance: {
      maintenanceEnabled: {
        type: Boolean,
        default: false,
      },
      maintenanceMessage: {
        type: String,
        trim: true,
      },
    },
    skateparksVersion: {
      type: Number,
      default: 1,
      min: [1, 'Version must be at least 1'],
    },
  },
  {
    timestamps: true,
    collection: 'settings',
  }
);

/**
 * Static method: Find or create settings
 */
SettingsSchema.statics.findOrCreate = async function (): Promise<ISettings> {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      homepage: {
        heroCarouselImages: [],
        featuredProductsCount: 6,
        featuredSkateparksCount: 6,
        featuredTrainersCount: 6,
        featuredGuidesCount: 6,
      },
      shop: {
        productsPerPage: 12,
        defaultSortOrder: 'createdAt-desc',
        showOutOfStockProducts: false,
        guestCheckoutEnabled: true,
      },
      email: {
        adminNotificationEmail: '',
        orderConfirmationTemplate: '',
        contactFormRecipient: '',
      },
      seo: {
        siteTitle: '',
        defaultMetaDescription: '',
        facebookImage: '',
        twitterImage: '',
      },
      maintenance: {
        maintenanceEnabled: false,
        maintenanceMessage: '',
      },
      skateparksVersion: 1,
    });
  }
  return settings;
};

/**
 * Create and export the Settings model
 * Delete cached model if it exists to ensure fresh schema
 */
if (mongoose.models.Settings) {
  delete mongoose.models.Settings;
}

const Settings: ISettingsModel =
  mongoose.model<ISettings, ISettingsModel>('Settings', SettingsSchema);

export default Settings;
