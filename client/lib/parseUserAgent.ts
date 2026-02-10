import { Laptop, LucideIcon, Smartphone } from 'lucide-react';
import UAParser from 'ua-parser-js';
import { format, formatDistanceToNowStrict, isPast } from 'date-fns';

interface AgentType {
  deviceType: string;
  os: string;
  browser: string;
  timeAgo: string;
  icon: LucideIcon;
}

export const parseUserAgent = (
  userAgent: string,
  createdAt: string
): AgentType => {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  // console.log('agent info: ', result);

  const deviceType = result.device.type || 'Desktop';
  const os = `${result.os.name} ${result.os.version}`;
  const browser = result.browser.name || 'Web';

  const icon = deviceType === 'mobile' ? Smartphone : Laptop;
  const formattedAt = isPast(new Date(createdAt))
    ? `${formatDistanceToNowStrict(new Date(createdAt))} ago`
    : format(new Date(createdAt), 'd MMM, yyyy');

  return {
    deviceType,
    browser,
    os,
    timeAgo: formattedAt,
    icon,
  };
};
