import nodemailer from 'nodemailer';
import BrevoTransport from 'nodemailer-brevo-transport';
import { config } from '#config/app.config';

const createTransporter = async () => {
  if (config.NODE_ENV === 'development') {
    const account = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: { user: account.user, pass: account.pass },
    });
  }

  return nodemailer.createTransport(
    new BrevoTransport({
      apiKey: config.BREVO_API_KEY,
    })
  );
};

export const transporterPromise = createTransporter();
