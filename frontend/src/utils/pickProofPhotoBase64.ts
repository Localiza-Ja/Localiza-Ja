// frontend/src/utils/pickProofPhotoBase64.ts

import * as ImagePicker from "expo-image-picker";
import { useCustomAlert } from "../components/CustomAlert";

/**
 * Usa ImagePicker.MediaType (SDKs novos) ou MediaTypeOptions (SDKs antigos) sem quebrar.
 */
const IMAGES_MEDIA_TYPE: any =
  (ImagePicker as any)?.MediaType?.Images ??
  ImagePicker.MediaTypeOptions.Images;

/**
 * Gera uma DATA URL no formato que o backend espera (data:image/<ext>;base64,<B64>)
 * O expo-image-picker NÃO retorna a extensão/mime do base64, então inferimos por filename/uri quando possível.
 */
function toDataUrl(base64?: string | null, uri?: string | null) {
  if (!base64) return null;

  // tenta inferir a extensão a partir da URI (ex.: file:///.../image.jpg)
  let ext = "jpeg";
  if (uri) {
    const lower = uri.toLowerCase();
    if (lower.endsWith(".png")) ext = "png";
    else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) ext = "jpeg";
    // se nada bater, deixa "jpeg" por padrão
  }

  return `data:image/${ext};base64,${base64}`;
}

/**
 * HOOK WRAPPER para permitir uso do showAlert dentro das funções assíncronas.
 * Assim não precisa transformar essas funções em hooks.
 */
function useAlertWrapper() {
  const { showAlert } = useCustomAlert();
  return showAlert;
}

/** CÂMERA → { dataUrl, uri } (ou null) */
export async function pickFromCameraDataUrl(): Promise<{
  dataUrl: string;
  uri: string;
} | null> {
  const showAlert = useAlertWrapper();

  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    showAlert({
      title: "Permissão negada",
      message: "Permita acesso à câmera para tirar a foto.",
      type: "warning",
    });
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.8,
    base64: true,
    allowsEditing: false,
    exif: false,
    mediaTypes: IMAGES_MEDIA_TYPE,
  });

  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const dataUrl = toDataUrl(asset.base64 ?? null, asset.uri ?? null);
  if (!dataUrl) return null;

  return { dataUrl, uri: asset.uri! };
}

/** GALERIA → { dataUrl, uri } (ou null) */
export async function pickFromLibraryDataUrl(): Promise<{
  dataUrl: string;
  uri: string;
} | null> {
  const showAlert = useAlertWrapper();

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    showAlert({
      title: "Permissão negada",
      message: "Permita acesso à galeria para selecionar a foto.",
      type: "warning",
    });
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    quality: 0.8,
    base64: true,
    allowsEditing: false,
    exif: false,
    mediaTypes: IMAGES_MEDIA_TYPE,
  });

  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const dataUrl = toDataUrl(asset.base64 ?? null, asset.uri ?? null);
  if (!dataUrl) return null;

  return { dataUrl, uri: asset.uri! };
}

/** Prompt: Câmera ou Galeria? → { dataUrl, uri } (ou null) */
export async function pickProofPhotoDataUrl(): Promise<{
  dataUrl: string;
  uri: string;
} | null> {
  const showAlert = useAlertWrapper();

  // Usamos uma PROMISE manual para capturar qual opção o usuário clicou
  return new Promise((resolve) => {
    showAlert({
      title: "Escolher foto",
      message: "Selecione a origem da foto de comprovação:",
      type: "info",
      buttons: [
        {
          text: "Câmera",
          variant: "primary",
          onPress: async () => resolve(await pickFromCameraDataUrl()),
        },
        {
          text: "Galeria",
          variant: "primary",
          onPress: async () => resolve(await pickFromLibraryDataUrl()),
        },
        {
          text: "Cancelar",
          variant: "ghost",
          onPress: () => resolve(null),
        },
      ],
    });
  });
}

/** =======================================
 *  EXPORTS DE COMPATIBILIDADE (LEGACY)
 *  =======================================
 */

/** Antes alguns lugares esperavam string base64 — agora retornamos a DATA URL (string) */
export async function pickFromCameraBase64(): Promise<string | null> {
  const r = await pickFromCameraDataUrl();
  return r?.dataUrl ?? null; // data URL string: "data:image/...;base64,..."
}

export async function pickFromGalleryBase64(): Promise<string | null> {
  const r = await pickFromLibraryDataUrl();
  return r?.dataUrl ?? null; // data URL string
}

/** Este é o nome que seus arquivos já importavam */
export async function pickProofPhotoBase64(): Promise<string | null> {
  const r = await pickProofPhotoDataUrl();
  return r?.dataUrl ?? null; // data URL string
}
