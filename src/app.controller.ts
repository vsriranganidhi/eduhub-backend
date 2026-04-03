import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
} from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): object {
    return {
      message: '✅ EduHub Backend is running!',
      timestamp: new Date().toISOString(),
      status: 'operational',
      endpoints: {
        auth: '/auth',
        assignments: '/assignment',
        library: '/library',
        notices: '/notice',
      }
    };
  }
}

