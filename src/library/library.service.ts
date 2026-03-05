import { Injectable } from "@nestjs/common";
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LibraryService {
    constructor(private prisma: PrismaService) {}
    
    async createResource(file: Express.Multer.File, body: any, userId: string) {

    const cleanedPath = file.path.replace(/\\/g, '/');

    return this.prisma.libraryResource.create({
      data: {
        title: body.title,
        description: body.description,
        subject: body.subject,
        fileUrl: file.path,
        fileType: file.mimetype,
        fileSize: file.size,
        uploaderId: userId,
      },
    });
  }

  async findAll() {
  const resources = await this.prisma.libraryResource.findMany();
  
    return resources.map(res => ({
      ...res,
      // Construct the full URL for the frontend
      fileUrl: `http://localhost:3000/static/${res.fileUrl.replace('uploads/', '')}`
    }));
  }
}