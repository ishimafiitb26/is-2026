export async function uploadToCloudinary(file: File) {
  const rawCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const rawUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!rawCloudName || !rawUploadPreset) {
    throw new Error("Cloudinary configuration credentials missing.");
  }

  const cloudName = rawCloudName.replace(/['"]/g, "");
  const uploadPreset = rawUploadPreset.replace(/['"]/g, "");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    // Membongkar pesan error detail bawaan dari JSON server Cloudinary
    const errorData = await response.json().catch(() => ({}));
    const remoteMessage = errorData?.error?.message || `Status code ${response.status}`;
    throw new Error(remoteMessage);
  }

  return (await response.json()) as {
    secure_url: string;
    public_id: string;
    original_filename?: string;
    resource_type?: string;
  };
}

export async function uploadDocumentToCloudinary(file: File, folder: string = "tasks") {
  const rawCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const rawUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!rawCloudName || !rawUploadPreset) {
    throw new Error("Cloudinary configuration credentials missing.");
  }

  const cloudName = rawCloudName.replace(/['"]/g, "");
  const uploadPreset = rawUploadPreset.replace(/['"]/g, "");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    // Membongkar pesan error detail bawaan dari JSON server Cloudinary
    const errorData = await response.json().catch(() => ({}));
    const remoteMessage = errorData?.error?.message || `Status code ${response.status}`;
    throw new Error(remoteMessage);
  }

  return (await response.json()) as {
    secure_url: string;
    public_id: string;
    original_filename?: string;
    resource_type?: string;
  };
}