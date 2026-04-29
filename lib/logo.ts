"use client";

const STORAGE_KEY = "shree-cleaning-manager-logo";
const MAX_SOURCE_LOGO_SIZE = 3 * 1024 * 1024;
const MAX_STORED_LOGO_SIZE = 900 * 1024;

export function getStoredLogo() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(STORAGE_KEY) || "";
}

export function clearStoredLogo() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export async function fileToDataUrl(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  if (file.size > MAX_SOURCE_LOGO_SIZE) {
    throw new Error("Please choose a logo under 3 MB.");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the selected logo."));
    reader.readAsDataURL(file);
  });

  if (dataUrl.length <= MAX_STORED_LOGO_SIZE) {
    return dataUrl;
  }

  return compressLogoDataUrl(dataUrl);
}

async function compressLogoDataUrl(dataUrl: string) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not prepare the selected logo."));
    img.src = dataUrl;
  });

  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = Math.min(1, 900 / Math.max(longestSide, 1));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not resize the selected logo.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  for (const quality of [0.86, 0.76, 0.66, 0.56]) {
    const compressed = canvas.toDataURL("image/jpeg", quality);
    if (compressed.length <= MAX_STORED_LOGO_SIZE) {
      return compressed;
    }
  }

  throw new Error("This logo is too large to save. Try a smaller image.");
}

export async function saveLogoFile(file: File) {
  const dataUrl = await fileToDataUrl(file);

  window.localStorage.setItem(STORAGE_KEY, dataUrl);
  return dataUrl;
}

export async function loadInvoiceLogo() {
  const storedLogo = getStoredLogo();

  if (storedLogo) {
    return storedLogo;
  }

  try {
    const response = await fetch("/api/logo");
    const payload = (await response.json()) as { dataUrl?: string | null };
    return payload.dataUrl || "";
  } catch {
    return "";
  }
}
