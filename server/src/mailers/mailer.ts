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

const mailer_sender = `no-reply <${config.SMTP_USER}>`;

export const sendEmail = async ({
  to,
  from = mailer_sender,
  subject,
  html,
  text,
}: Params) => {
  const transporter = await transporterPromise;

  const info = await transporter.sendMail({
    from,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    text,
  });

  // Logs a preview URL in development so you can inspect the email in Ethereal
  if (config.NODE_ENV === 'development') {
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
  }

  return info;
};
