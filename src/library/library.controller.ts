import { 
  Controller, Post, UseInterceptors, UploadedFile, 
  Body, UseGuards, Req, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthGuard } from '../auth/auth.gaurd';
import { RolesGuard } from '../auth/roles.gaurd';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/client';
import { LibraryService } from './library.service';

@Controller('library')
export class LibraryController {
  //This line is for dependency injection and it allows the controller to use all methods of the library service
  //Private: property is accessible only within this class
  //readonly: prevents the property from being reassigned
  constructor(private readonly libraryService: LibraryService) {}

  @Post('upload')
  @Roles(Role.TEACHER, Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: '../../uploads/resources', // Where files will be saved
      filename: (req, file, callback) => {
        // Create a unique name: timestamp + random + original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `${uniqueSuffix}${ext}`);
      },
    }),
  }))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB limit
          new FileTypeValidator({ fileType: '.(pdf|docx|png|jpg|jpeg)' }),
        ],
      }),
    ) file: Express.Multer.File,
    @Body() body: any, // We'll create a DTO for this next
    @Req() req: any
  ) {
    return this.libraryService.createResource(file, body, req.user.sub);
  }
}