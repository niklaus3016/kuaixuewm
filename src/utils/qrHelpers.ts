import { WIFIConfig, VCardConfig } from '../types';

export const generateWiFiString = (config: WIFIConfig) => {
  const { ssid, password, encryption } = config;
  return `WIFI:T:${encryption};S:${ssid};P:${password};;`;
};

export const generateVCardString = (config: VCardConfig) => {
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${config.lastName};${config.firstName};;;`,
    `FN:${config.firstName} ${config.lastName}`,
    `ORG:${config.company}`,
    `TITLE:${config.title}`,
    `TEL;TYPE=CELL:${config.phone}`,
    `EMAIL:${config.email}`,
    'END:VCARD'
  ].join('\n');
};

export const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};
