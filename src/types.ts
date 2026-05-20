export type QRType = 'url' | 'text' | 'wifi' | 'vCard';

export interface WIFIConfig {
  ssid: string;
  password?: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
}

export interface VCardConfig {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  company: string;
  title: string;
}

export interface QRStyleOptions {
  fgColor: string;
  bgColor: string;
  level: 'L' | 'M' | 'Q' | 'H';
  renderAs: 'canvas' | 'svg';
  dotStyle: 'square' | 'rounded' | 'dots';
  logoImage?: string;
  logoWidth?: number;
  logoHeight?: number;
  logoOpacity?: number;
  logoShape?: 'square' | 'circle';
}

export interface HistoryItem {
  id: string;
  type: QRType;
  content: string;
  label: string;
  timestamp: number;
  style: QRStyleOptions;
}
