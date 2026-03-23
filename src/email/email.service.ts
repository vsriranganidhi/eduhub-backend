import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  //We are creating a connection between our nest js application and external email service
  //We are creating a transporter instance
  private transporter: nodemailer.Transporter;

  constructor() {

    //This configures how to send the email
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,//The address of the smtp server
      port: parseInt(process.env.SMTP_PORT || '587'),//465: secure=true (using SSL), 587: secure=false (using STARTTLS)
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendCollegeAdminWelcomeEmail(
    collegeAdminEmail: string,
    firstName: string,
    lastName: string,
    tempPassword: string,
    institutionName: string,
    joinCode: string,
    loginUrl: string,
  ): Promise<void> {
    try {
      const templatePath = path.join(
        process.cwd(),
        'src/email/templates/college-admin-welcome.html',
      );
      let htmlContent = fs.readFileSync(templatePath, 'utf-8');

      htmlContent = htmlContent
        .replace('{{firstName}}', firstName)
        .replace('{{lastName}}', lastName)
        .replace('{{institutionName}}', institutionName)
        .replace('{{tempPassword}}', tempPassword)
        .replace('{{joinCode}}', joinCode)
        .replace('{{loginUrl}}', loginUrl);

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: collegeAdminEmail,
        subject: `Welcome to Eduhub - ${institutionName}`,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to ${collegeAdminEmail}`);
    } catch (error) {
      console.error(`Failed to send email to ${collegeAdminEmail}:`, error);
    }
  }

  async sendTeacherInvitation(
  email: string,
  token: string,
  joinCode: string,
  institutionName: string,
  collegeAdminEmail: string,
): Promise<void> {
  try {
    const registrationLink = `${process.env.FRONTEND_URL}/register/teacher?token=${token}&email=${email}&joinCode=${joinCode}`;
    
    const templatePath = path.join(
      process.cwd(),
      'src/email/templates/teacher-invitation.html',
    );
    let htmlContent = fs.readFileSync(templatePath, 'utf-8');

    htmlContent = htmlContent
      .replace('{{institutionName}}', institutionName)
      .replace('{{registrationLink}}', registrationLink)
      .replace('{{joinCode}}', joinCode);

    const mailOptions = {
      from: collegeAdminEmail,
      to: email,
      subject: `Invitation to join ${institutionName} on Eduhub`,
      html: htmlContent,
    };

    await this.transporter.sendMail(mailOptions);
    console.log(`Teacher invitation email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send invitation email to ${email}:`, error);
  }
}
  
}
