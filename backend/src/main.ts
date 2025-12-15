import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS with specific Office Online requirements
  app.enableCors({
    origin: [
      'https://word-edit.officeapps.live.com',
      'https://excel-edit.officeapps.live.com', 
      'https://powerpoint-edit.officeapps.live.com',
      'https://*.officeapps.live.com',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'https://265d5d63734b.ngrok-free.app',
      /localhost/,
      '*'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'X-WOPI-Override',
      'X-WOPI-Lock',
      'X-WOPI-OldLock',
      'X-WOPI-LockFailureReason',
      'X-WOPI-ValidRelativeTarget',
      'X-WOPI-SuggestedTarget',
      'X-WOPI-RelativeTarget',
      'Content-Type',
      'Authorization',
      'Accept',
      'ngrok-skip-browser-warning',
      'X-Requested-With',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers'
    ],
    exposedHeaders: [
      'X-WOPI-Lock',
      'X-WOPI-LockFailureReason',
      'X-WOPI-InvalidFileNameError',
      'X-WOPI-ValidRelativeTarget',
      'X-WOPI-ItemVersion',
      'X-WOPI-MachineName',
      'X-WOPI-ServerVersion'
    ],
    credentials: true, // Allow credentials for local development
    preflightContinue: false,
    optionsSuccessStatus: 200,
  });

  // Add middleware to handle ngrok warning bypass and additional CORS
  app.use((req, res, next) => {
    // Bypass ngrok browser warning
    res.setHeader('ngrok-skip-browser-warning', 'true');
    
    // Additional CORS headers for broad compatibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    next();
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
 