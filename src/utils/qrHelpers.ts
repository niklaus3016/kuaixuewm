import { WIFIConfig, VCardConfig } from '../types';

export const generateWiFiString = (config: WIFIConfig) => {
  const { ssid, password, encryption } = config;
  if (encryption === 'nopass') {
    return `WIFI:T:nopass;S:${ssid};;`;
  }
  return `WIFI:T:${encryption};S:${ssid};P:${password || ''};;`;
};

export const generateVCardString = (config: VCardConfig) => {
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${config.lastName};${config.firstName};;;`,
    `FN:${config.firstName} ${config.lastName}`
  ];

  if (config.company) lines.push(`ORG:${config.company}`);
  if (config.title) lines.push(`TITLE:${config.title}`);
  if (config.phone) lines.push(`TEL;TYPE=CELL:${config.phone}`);
  if (config.email) lines.push(`EMAIL:${config.email}`);

  lines.push('END:VCARD');
  return lines.join('\n');
};

export const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};
