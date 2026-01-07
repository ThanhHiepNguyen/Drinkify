import { Module } from '@nestjs/common';
import { OderService } from './oder.service';
import { OderController } from './oder.controller';

@Module({
  controllers: [OderController],
  providers: [OderService],
})
export class OderModule {}
