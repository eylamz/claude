/**
 * Type definitions for file uploads
 */

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface ProcessedFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

