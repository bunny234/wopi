import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Report } from '../src/reports/report.entity';
import { User } from '../src/users/user.entity';
import { Repository } from 'typeorm';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let reportId: number;
  let userId: number;
  let userRepository: Repository<User>;
  let reportRepository: Repository<Report>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    reportRepository = moduleFixture.get<Repository<Report>>(getRepositoryToken(Report));

    // Clean up database before tests
    await reportRepository.clear();
    await userRepository.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/register (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'password123', role: 'doctor' })
      .expect(201)
      .then(res => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.email).toEqual('test@example.com');
        userId = res.body.id;
      });
  });

  it('/auth/login (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200)
      .then(res => {
        expect(res.body).toHaveProperty('access_token');
        accessToken = res.body.access_token;
      });
  });

  describe('with authenticated user', () => {
    beforeAll(async () => {
      // Seed a report for the user
      const report = await reportRepository.save({ title: 'Test Report', filePath: 'test.docx', doctorId: userId });
      reportId = report.id;
    });

    it('/reports (GET)', () => {
      return request(app.getHttpServer())
        .get('/reports')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then(res => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(1);
          expect(res.body[0].title).toEqual('Test Report');
        });
    });

    it('/reports/:id/editSession (POST)', () => {
      return request(app.getHttpServer())
        .post(`/reports/${reportId}/editSession`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201)
        .then(res => {
          expect(res.body).toHaveProperty('wopiSrc');
          expect(res.body).toHaveProperty('accessToken');
        });
    });
  });
});
