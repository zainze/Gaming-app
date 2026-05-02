/**
 * Cloudinary Upload Service
 * Handles uploading local files or blobs to Cloudinary
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.replace(/['"]/g, '');
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.replace(/['"]/g, '');

export const uploadToCloudinary = async (file: File | Blob): Promise<string> => {
  console.log('Cloudinary Config Check:', { CLOUD_NAME, UPLOAD_PRESET: UPLOAD_PRESET ? 'Set' : 'Missing' });
  
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(`Cloudinary configuration is missing. Cloud: ${CLOUD_NAME}, Preset: ${UPLOAD_PRESET}. Please ensure VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET are set in your environment.`);
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to upload to Cloudinary');
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw error;
  }
};
