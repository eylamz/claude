declare module 'cloudinary' {
  export const v2: {
    config: (options: { cloud_name?: string; api_key?: string; api_secret?: string }) => void;
    uploader: {
      upload: (path: string, options?: Record<string, unknown>) => Promise<{ secure_url: string; public_id: string; [key: string]: unknown }>;
      destroy: (publicId: string) => Promise<unknown>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}
