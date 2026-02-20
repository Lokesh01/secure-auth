import nodemailer, { TransportOptions } from 'nodemailer';
import { config } from '#config/app.config';

const createTransporter = async () => {
  try {
    if (config.NODE_ENV === 'development') {
      const account = await nodemailer.createTestAccount();
      return nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: { user: account.user, pass: account.pass },
      });
    }

    return nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    } as TransportOptions);
  } catch (error) {
    console.error('Failed to create mail transporter:', error);
    throw new Error('Mail transporter initialization failed');
  }
};

export const transporterPromise = createTransporter();

// return nodemailer.createTransport({
//   host: config.SMTP_HOST,
//   port: config.SMTP_PORT,
//   secure: config.SMTP_PORT === 465,
//   auth: {
//     user: config.SMTP_USER,
//     pass: config.SMTP_PASS,
//   },
// } as TransportOptions);
