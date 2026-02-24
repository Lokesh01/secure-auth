import { config } from '#config/app.config';
import nodemailer from 'nodemailer';
import { transporterPromise } from './nodemailerClient';

type Params = {
  to: string | string[];
  from?: string;
  subject: string;
  html: string;
  text?: string;
};

const mailer_sender =
  config.NODE_ENV === 'development'
    ? `no-reply <${config.SMTP_USER}>`
    : `no-reply <${config.BREVO_SENDER_EMAIL}>`;

export const sendEmail = async ({
  to,
  from = mailer_sender,
  subject,
  html,
  text,
}: Params) => {
  const transporter = await transporterPromise;

  try {
    const info = await transporter.sendMail({
      from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text,
    });

    if (config.NODE_ENV === 'development') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return info;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error(
      `Email sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};
