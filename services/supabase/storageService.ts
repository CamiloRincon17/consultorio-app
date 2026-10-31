import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { supabase } from './client';

const BUCKET_NAME = 'procedimientos-fotos';

/**
 * Solicita permisos y permite al usuario tomar o seleccionar una fotografía.
 */
export async function pickImage(source: 'camera' | 'library'): Promise<string | null> {
  try {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('Se requieren permisos de cámara para tomar fotos clínicas.');
        return null;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Se requieren permisos de galería para seleccionar fotos clínicas.');
        return null;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri;
      }
    }
  } catch (error) {
    console.error('Error al capturar/seleccionar imagen:', error);
  }
  return null;
}

/**
 * Comprime y redimensiona la imagen para optimizar espacio y rendimiento.
 * Redimensiona a un ancho máximo de 1200px y calidad de 0.7 en JPEG.
 */
export async function compressImage(uri: string): Promise<string> {
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipulated.uri;
  } catch (error) {
    console.warn('Fallo la compresión de la imagen, usando URI original:', error);
    return uri;
  }
}

/**
 * Subes la imagen comprimida a Supabase Storage (o retorna la URI local si no hay conexión).
 */
export async function uploadProcedurePhoto(
  patientId: string,
  visitId: string | undefined,
  localUri: string
): Promise<string> {
  try {
    // Comprimir primero la imagen
    const compressedUri = await compressImage(localUri);

    // Preparar nombre de archivo único
    const timestamp = Date.now();
    const cleanPatientId = patientId || 'general';
    const cleanVisitId = visitId || 'v';
    const fileName = `${cleanPatientId}/${cleanVisitId}_${timestamp}.jpg`;

    // Intentar leer el archivo local como Base64 / ArrayBuffer
    const base64 = await FileSystem.readAsStringAsync(compressedUri, {
      encoding: 'base64' as any,
    });

    const arrayBuffer = decodeBase64ToArrayBuffer(base64);

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.warn('⚠️ No se pudo subir la foto a Supabase (posiblemente offline). Se usará la copia local:', error.message);
      return compressedUri;
    }

    // Obtener la URL pública de la foto subida
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.warn('⚠️ Error durante la subida a Supabase, manteniendo foto local:', err);
    return localUri;
  }
}

/**
 * Decodifica Base64 a ArrayBuffer para Supabase Upload en React Native.
 */
function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Elimina una foto de Supabase Storage si corresponde.
 */
export async function deleteProcedurePhoto(photoUrl: string): Promise<boolean> {
  try {
    if (!photoUrl.includes(BUCKET_NAME)) return true; // Si es local, no hay nada que borrar en la nube

    const pathIndex = photoUrl.indexOf(BUCKET_NAME) + BUCKET_NAME.length + 1;
    const filePath = photoUrl.substring(pathIndex);

    const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);
    if (error) {
      console.warn('Error al borrar foto en Supabase:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error borrando foto de Supabase:', e);
    return false;
  }
}
