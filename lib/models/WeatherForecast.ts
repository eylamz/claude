import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Hourly forecast data interface
 */
export interface IHourlyForecast {
  time: Date;
  precipitation: number; // mm
  probability: number; // 0-100 percentage
  temperature?: number; // Celsius (optional for research)
}

/**
 * Daily forecast data interface
 */
export interface IDailyForecast {
  date: Date;
  precipitation: number; // mm (total for the day)
  probability: number; // 0-100 percentage (max probability for the day)
  minTemperature?: number; // Celsius (optional)
  maxTemperature?: number; // Celsius (optional)
}

/**
 * Weather Forecast interface extending Mongoose Document
 */
export interface IWeatherForecast extends Document {
  skateparkId: mongoose.Types.ObjectId;
  skateparkSlug: string; // For easier querying
  location: {
    lat: number;
    lng: number;
  };
  hourlyForecast: IHourlyForecast[];
  dailyForecast: IDailyForecast[];
  lastUpdated: Date;
  expiresAt: Date; // For TTL index
  fetchedAt: Date; // Timestamp of API fetch for research
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Weather Forecast Model interface
 */
export interface IWeatherForecastModel extends Model<IWeatherForecast> {
  findBySkateparkId(skateparkId: string | mongoose.Types.ObjectId): Promise<IWeatherForecast | null>;
  findBySkateparkSlug(slug: string): Promise<IWeatherForecast | null>;
  findExpired(): Promise<IWeatherForecast[]>;
  deleteExpired(): Promise<void>;
}

/**
 * Hourly forecast schema
 */
const HourlyForecastSchema = new Schema<IHourlyForecast>({
  time: {
    type: Date,
    required: true,
  },
  precipitation: {
    type: Number,
    required: true,
    min: [0, 'Precipitation cannot be negative'],
    default: 0,
  },
  probability: {
    type: Number,
    required: true,
    min: [0, 'Probability cannot be negative'],
    max: [100, 'Probability cannot exceed 100'],
    default: 0,
  },
  temperature: {
    type: Number,
    required: false,
  },
}, { _id: false });

/**
 * Daily forecast schema
 */
const DailyForecastSchema = new Schema<IDailyForecast>({
  date: {
    type: Date,
    required: true,
  },
  precipitation: {
    type: Number,
    required: true,
    min: [0, 'Precipitation cannot be negative'],
    default: 0,
  },
  probability: {
    type: Number,
    required: true,
    min: [0, 'Probability cannot be negative'],
    max: [100, 'Probability cannot exceed 100'],
    default: 0,
  },
  minTemperature: {
    type: Number,
    required: false,
  },
  maxTemperature: {
    type: Number,
    required: false,
  },
}, { _id: false });

/**
 * Weather Forecast schema definition
 */
const WeatherForecastSchema: Schema<IWeatherForecast> = new Schema<IWeatherForecast>(
  {
    skateparkId: {
      type: Schema.Types.ObjectId,
      ref: 'Skatepark',
      required: [true, 'Skatepark ID is required'],
      index: true,
    },
    skateparkSlug: {
      type: String,
      required: [true, 'Skatepark slug is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    location: {
      lat: {
        type: Number,
        required: [true, 'Latitude is required'],
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90'],
      },
      lng: {
        type: Number,
        required: [true, 'Longitude is required'],
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180'],
      },
    },
    hourlyForecast: [HourlyForecastSchema],
    dailyForecast: [DailyForecastSchema],
    lastUpdated: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL index
    },
    fetchedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true, // For research queries
    },
  },
  {
    timestamps: true,
    collection: 'weatherforecasts',
  }
);

/**
 * Indexes for performance
 */
// Compound index for skatepark queries
WeatherForecastSchema.index({ skateparkId: 1, expiresAt: 1 });
WeatherForecastSchema.index({ skateparkSlug: 1, expiresAt: 1 });

// Index for research queries by date
WeatherForecastSchema.index({ fetchedAt: 1, 'location.lat': 1, 'location.lng': 1 });

/**
 * Static method: Find forecast by skatepark ID
 */
WeatherForecastSchema.statics.findBySkateparkId = function (skateparkId: string | mongoose.Types.ObjectId) {
  const id = typeof skateparkId === 'string' ? new mongoose.Types.ObjectId(skateparkId) : skateparkId;
  return this.findOne({ 
    skateparkId: id,
    expiresAt: { $gt: new Date() }, // Only return non-expired forecasts
  });
};

/**
 * Static method: Find forecast by skatepark slug
 */
WeatherForecastSchema.statics.findBySkateparkSlug = function (slug: string) {
  return this.findOne({ 
    skateparkSlug: slug.toLowerCase(),
    expiresAt: { $gt: new Date() }, // Only return non-expired forecasts
  });
};

/**
 * Static method: Find expired forecasts
 */
WeatherForecastSchema.statics.findExpired = function () {
  return this.find({ expiresAt: { $lte: new Date() } });
};

/**
 * Static method: Delete expired forecasts (cleanup)
 */
WeatherForecastSchema.statics.deleteExpired = async function () {
  const result = await this.deleteMany({ expiresAt: { $lte: new Date() } });
  return result;
};

/**
 * Pre-save middleware: Ensure expiresAt is set
 */
WeatherForecastSchema.pre('save', function (next) {
  // If expiresAt is not set or is in the past, set it to 24 hours from now
  if (!this.expiresAt || this.expiresAt <= new Date()) {
    const ttl = parseInt(process.env.WEATHER_CACHE_TTL || '86400', 10); // Default 24 hours
    this.expiresAt = new Date(Date.now() + ttl * 1000);
  }
  next();
});

/**
 * Create and export the WeatherForecast model
 */
if (mongoose.models.WeatherForecast) {
  delete mongoose.models.WeatherForecast;
}

const WeatherForecast: IWeatherForecastModel =
  mongoose.model<IWeatherForecast, IWeatherForecastModel>('WeatherForecast', WeatherForecastSchema);

export default WeatherForecast;

