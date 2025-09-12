import { Test, TestingModule } from '@nestjs/testing';
import { WopiService } from './wopi.service';

describe('WopiService', () => {
  let service: WopiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WopiService],
    }).compile();

    service = module.get<WopiService>(WopiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
