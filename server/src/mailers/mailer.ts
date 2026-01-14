import { config } from '#config/app.config';
import { logger } from '../common/utils/logger';
import { resend } from './resendClient';

type Params = {
  to: string | string[];
  from?: string;
  subject: string;
  html: string;
  text?: string;
};

const mailer_sender =
  config.NODE_ENV === 'development'
    ? 'no-reply <onboarding@resend.dev>'
    : `no-reply <${config.MAILER_SENDER}>`;

export const sendEmail = async ({
  to,
  from = mailer_sender,
  subject,
  text,
  html,
}: Params) =>
  await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    text,
    subject,
    html,
  });
