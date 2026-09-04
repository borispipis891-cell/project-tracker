import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  resourceType: string;
  bytes: number;
}

/**
 * Upload file to Cloudinary
 * @param file - File buffer or base64 string
 * @param folder - Cloudinary folder (e.g., 'project-tracker/attachments')
 * @returns Upload result with URL and public_id
 */
export async function uploadToCloudinary(
  file: Buffer | string,
  folder: string = 'project-tracker'
): Promise<UploadResult> {
  try {
    const result = await cloudinary.uploader.upload(
      `data:application/octet-stream;base64,${
        Buffer.isBuffer(file) ? file.toString('base64') : file
      }`,
      {
        folder,
        resource_type: 'auto', // Automatically detect file type
        transformation: [
          {
            quality: 'auto', // Automatic quality optimization
            fetch_format: 'auto', // Automatic format selection
          },
        ],
      }
    );

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload file to Cloudinary');
  }
}

/**
 * Delete file from Cloudinary
 * @param publicId - Cloudinary public_id
 * @param resourceType - Type of resource (image, video, raw)
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'raw'
): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete file from Cloudinary');
  }
}

/**
 * Get optimized image URL with transformations
 * @param publicId - Cloudinary public_id
 * @param width - Image width
 * @param height - Image height
 * @returns Optimized image URL
 */
export function getOptimizedImageUrl(
  publicId: string,
  width?: number,
  height?: number
): string {
  return cloudinary.url(publicId, {
    transformation: [
      {
        width,
        height,
        crop: 'fill',
        quality: 'auto',
        fetch_format: 'auto',
      },
    ],
  });
}

export { cloudinary };
