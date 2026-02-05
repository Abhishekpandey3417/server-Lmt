import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

export const uploadMedia = async (filePath) => {
  try {
    if (!filePath) {
      throw new Error("File path is missing");
    }

    const uploadResponse = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
    });

    return {
      secure_url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
    };
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    throw error; // important: do not swallow the error
  }
};

export const deleteMediaFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete failed:", error);
  }
};

export const deleteVideoFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "video",
    });
  } catch (error) {
    console.error("Cloudinary video delete failed:", error);
  }
};
