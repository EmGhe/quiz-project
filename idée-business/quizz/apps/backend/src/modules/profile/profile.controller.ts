import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(@Request() req): Promise<ProfileResponseDto> {
    return this.profileService.getCompleteProfile(req.user.userId);
  }

  @Patch()
  async updateProfile(@Request() req, @Body() updateDto: UpdateProfileDto) {
    return this.profileService.updateProfile(req.user.userId, updateDto);
  }
}
