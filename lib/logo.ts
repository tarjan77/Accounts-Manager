"use client";

const STORAGE_KEY = "shree-cleaning-manager-logo";

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

export async function saveLogoFile(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the selected logo."));
    reader.readAsDataURL(file);
  });

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
