import { IsNotEmpty, IsString } from 'class-validator';

export class ReplyReviewDto {
  @IsString()
  @IsNotEmpty({ message: 'Nội dung phản hồi không được để trống' })
  reply: string;
}

