import { Test, TestingModule } from '@nestjs/testing';
import { WopiController } from './wopi.controller';

describe('WopiController', () => {
  let controller: WopiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WopiController],
    }).compile();

    controller = module.get<WopiController>(WopiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
