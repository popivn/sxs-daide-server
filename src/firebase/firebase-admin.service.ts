import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private adminApp: admin.app.App;

  onModuleInit() {
    let serviceAccount: admin.ServiceAccount | null = null;

    // Cách 1: Đọc từ biến môi trường (Ưu tiên khi deploy Render/Production)
    if (process.env.FIREBASE_CONFIG_JSON) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
        this.logger.log('Loaded Firebase credentials from FIREBASE_CONFIG_JSON environment variable.');
      } catch (err) {
        this.logger.error('Failed to parse FIREBASE_CONFIG_JSON:', err);
      }
    }

    // Cách 2: Đọc từ Secret File trên Render hoặc file cục bộ tại máy local
    if (!serviceAccount) {
      const possiblePaths = [
        path.resolve(process.cwd(), 'serviceAccountKey.json'),
        '/etc/secrets/serviceAccountKey.json', // Đường dẫn mặc định Secret Files của Render
      ];

      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          try {
            serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
            this.logger.log(`Loaded Firebase credentials from file: ${p}`);
            break;
          } catch (err) {
            this.logger.error(`Error reading key file at ${p}:`, err);
          }
        }
      }
    }

    if (!serviceAccount) {
      this.logger.error('No Firebase credentials found! Please set FIREBASE_CONFIG_JSON or add serviceAccountKey.json.');
      return;
    }

    if (!admin.apps.length) {
      this.adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      this.logger.log('Firebase Admin SDK initialized successfully.');
    } else {
      this.adminApp = admin.app();
    }
  }

  getAuth(): admin.auth.Auth {
    return this.adminApp.auth();
  }

  getFirestore(): admin.firestore.Firestore {
    return this.adminApp.firestore();
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    return this.getAuth().verifyIdToken(idToken);
  }
}
