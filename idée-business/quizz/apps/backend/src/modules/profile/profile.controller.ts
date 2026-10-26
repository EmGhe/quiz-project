import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(@CurrentUser() userId: string): Promise<ProfileResponseDto> {
    return this.profileService.getCompleteProfile(userId);
  }

  @Patch()
  async updateProfile(@CurrentUser() userId: string, @Body() updateDto: UpdateProfileDto) {
    return this.profileService.updateProfile(userId, updateDto);
  }
}
