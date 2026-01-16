import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Injectable({
  providedIn: 'root'
})
export class PhotoService {

  async takePhoto(): Promise<string | undefined> {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      return photo.dataUrl;
    } catch (error) {
      console.error('Error taking photo:', error);
      return undefined;
    }
  }

  async selectPhoto(): Promise<string | undefined> {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      return photo.dataUrl;
    } catch (error) {
      console.error('Error selecting photo:', error);
      return undefined;
    }
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
