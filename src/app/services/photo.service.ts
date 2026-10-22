import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Injectable({
  providedIn: 'root'
})
export class PhotoService {

  async takePhoto(): Promise<string | undefined> {
    try {
      const photo = await Camera.getPhoto({
        quality: 75,
        width: 1024,
        height: 1024,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      return photo.dataUrl ? await this.compressImage(photo.dataUrl) : undefined;
    } catch (error) {
      console.error('Error taking photo:', error);
      return undefined;
    }
  }

  async selectPhoto(): Promise<string | undefined> {
    try {
      const photo = await Camera.getPhoto({
        quality: 75,
        width: 1024,
        height: 1024,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      return photo.dataUrl ? await this.compressImage(photo.dataUrl) : undefined;
    } catch (error) {
      console.error('Error selecting photo:', error);
      return undefined;
    }
  }

  async compressImage(
    dataUrl: string,
    maxDimension = 1024,
    quality = 0.72
  ): Promise<string> {
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      return dataUrl;
    }

    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const permissions = await Camera.requestPermissions({
        permissions: ['camera', 'photos']
      });
      return permissions.camera === 'granted' && permissions.photos === 'granted';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  async checkPermissions(): Promise<boolean> {
    try {
      const permissions = await Camera.checkPermissions();
      return permissions.camera === 'granted' && permissions.photos === 'granted';
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }
}
