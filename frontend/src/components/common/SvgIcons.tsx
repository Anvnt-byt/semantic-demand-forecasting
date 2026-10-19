import React from 'react';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export const IconClose: React.FC<IconProps> = ({ size = 20, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </Svg>
);

export const IconSettings: React.FC<IconProps> = ({ size = 18, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
    <Path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const IconDashboard: React.FC<IconProps> = ({ size = 18, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="7" height="9" rx="1.5" stroke={color} strokeWidth="2" />
    <Rect x="14" y="3" width="7" height="5" rx="1.5" stroke={color} strokeWidth="2" />
    <Rect x="14" y="12" width="7" height="9" rx="1.5" stroke={color} strokeWidth="2" />
    <Rect x="3" y="16" width="7" height="5" rx="1.5" stroke={color} strokeWidth="2" />
  </Svg>
);

export const IconIngestion: React.FC<IconProps> = ({ size = 18, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M17 8l-5-5-5 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="3" x2="12" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const IconLicense: React.FC<IconProps> = ({ size = 18, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="7.5" cy="15.5" r="4.5" stroke={color} strokeWidth="2" />
    <Path d="M10.8 12.2L20 3m0 0h4m-4 0v4m-3 1l2 2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const IconSun: React.FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth="2" />
    <Line x1="12" y1="2" x2="12" y2="4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="12" y1="20" x2="12" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="2" y1="12" x2="4" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="20" y1="12" x2="22" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="4.93" y1="4.93" x2="6.34" y2="6.34" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="17.66" y1="17.66" x2="19.07" y2="19.07" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="4.93" y1="19.07" x2="6.34" y2="17.66" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="17.66" y1="6.34" x2="19.07" y2="4.93" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const IconMoon: React.FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const IconFilePdf: React.FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="9" y1="13" x2="15" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="9" y1="17" x2="13" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const IconFileExcel: React.FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="8" y1="13" x2="12" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="12" y1="13" x2="8" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="14" y1="13" x2="16" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="14" y1="17" x2="16" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const IconCheck: React.FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const IconWarning: React.FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Circle cx="12" cy="17" r="1" fill={color} />
  </Svg>
);

export const IconDatabase: React.FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 3c-4.42 0-8 1.34-8 3s3.58 3 8 3 8-1.34 8-3-3.58-3-8-3z" stroke={color} strokeWidth="2" />
    <Path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" stroke={color} strokeWidth="2" />
    <Path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" stroke={color} strokeWidth="2" />
  </Svg>
);

export const IconArrowLeft: React.FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="19" y1="12" x2="5" y2="12" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <Path d="M12 19l-7-7 7-7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const IconEdit: React.FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const IconTrash: React.FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="10" y1="11" x2="10" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="14" y1="11" x2="14" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const IconFilter: React.FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const IconSearch: React.FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth="2" />
    <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const IconTable: React.FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="2" />
    <Line x1="3" y1="9" x2="21" y2="9" stroke={color} strokeWidth="2" />
    <Line x1="3" y1="15" x2="21" y2="15" stroke={color} strokeWidth="2" />
    <Line x1="9" y1="3" x2="9" y2="21" stroke={color} strokeWidth="2" />
    <Line x1="15" y1="3" x2="15" y2="21" stroke={color} strokeWidth="2" />
  </Svg>
);
