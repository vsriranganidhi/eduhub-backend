import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
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
      const templatePath = path.join(__dirname, 'templates', 'college-admin-welcome.html');
      let htmlContent = fs.readFileSync(templatePath, 'utf-8');

      htmlContent = htmlContent
        .replaceAll('{{firstName}}', firstName)
        .replaceAll('{{lastName}}', lastName)
        .replaceAll('{{institutionName}}', institutionName)
        .replaceAll('{{tempPassword}}', tempPassword)
        .replaceAll('{{joinCode}}', joinCode)
        .replaceAll('{{loginUrl}}', loginUrl);

      const { data, error } = await this.resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: collegeAdminEmail,
        subject: `Welcome to Eduhub - ${institutionName}`,
        html: htmlContent,
      });

      if (error) {
        console.error('Resend API Error:', error);
        throw new Error(error.message);
      }

      console.log(`Welcome email sent to ${collegeAdminEmail}`, data);
    } catch (error) {
      console.error(`Failed to send email to ${collegeAdminEmail}:`, error);
      throw new InternalServerErrorException(
        `Failed to send welcome email to ${collegeAdminEmail}. Please try again later.`,
      );
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
    const registrationLink = `${process.env.FRONTEND_URL}/auth/register/teacher?token=${token}&email=${email}&joinCode=${joinCode}`;
    
    const templatePath = path.join(
      __dirname,
      'templates/teacher-invitation.html',
    );
    let htmlContent = fs.readFileSync(templatePath, 'utf-8');

    htmlContent = htmlContent
      .replaceAll('{{institutionName}}', institutionName)
      .replaceAll('{{registrationLink}}', registrationLink)
      .replaceAll('{{joinCode}}', joinCode);

    const { data, error } = await this.resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: email,
      subject: `Invitation to join ${institutionName} on Eduhub`,
      html: htmlContent,
    });

    if (error) {
      console.error('Resend API Error:', error);
      throw new Error(error.message);
    }

    console.log(`Teacher invitation email sent to ${email}`, data);
  } catch (error) {
    console.error(`Failed to send invitation email to ${email}:`, error);
    throw new InternalServerErrorException(
      `Failed to send invitation email to ${email}. Please try again later.`,
    );
  }
}

  async sendPasswordResetEmail(
    email: string,
    token: string,
    firstName: string,
    lastName: string,
    institutionName: string,
  ): Promise<void> {
    try {
      const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}&email=${email}`;
      
      const templatePath = path.join(
        __dirname,
        'templates/password-reset.html',
      );
      let htmlContent = fs.readFileSync(templatePath, 'utf-8');

      htmlContent = htmlContent
        .replaceAll('{{firstName}}', firstName)
        .replaceAll('{{lastName}}', lastName)
        .replaceAll('{{institutionName}}', institutionName)
        .replaceAll('{{resetLink}}', resetLink);

      const { data, error } = await this.resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: email,
        subject: `Password Reset Request - ${institutionName}`,
        html: htmlContent,
      });

      if (error) {
        console.error('Resend API Error:', error);
        throw new Error(error.message);
      }

      console.log(`Password reset email sent to ${email}`, data);
    } catch (error) {
      console.error(`Failed to send password reset email to ${email}:`, error);
      throw new InternalServerErrorException(
        `Failed to send password reset email to ${email}. Please try again later.`,
      );
    }
  }
}
