import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, ReactNode } from 'react';
import { ColorValue, Platform, StyleProp, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

export type AppIconName = ComponentProps<typeof Ionicons>['name'];

type AppIconProps = {
  name: AppIconName;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle | TextStyle>;
};

function renderWebIcon(name: AppIconName, color: ColorValue): ReactNode {
  const line = { fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (name) {
    case 'add':
      return <><Line {...line} x1="12" y1="5" x2="12" y2="19" /><Line {...line} x1="5" y1="12" x2="19" y2="12" /></>;
    case 'checkmark':
      return <Polyline {...line} points="5 12.5 10 17 19 7" />;
    case 'send':
      return <><Path {...line} d="m3 4 18 8-18 8 3-8Z" /><Line {...line} x1="6" y1="12" x2="21" y2="12" /></>;
    case 'arrow-undo-outline':
      return <><Path {...line} d="M9 7 4 12l5 5" /><Path {...line} d="M5 12h8a7 7 0 0 1 7 7" /></>;
    case 'close':
      return <><Line {...line} x1="6" y1="6" x2="18" y2="18" /><Line {...line} x1="18" y1="6" x2="6" y2="18" /></>;
    case 'ellipsis-horizontal':
      return <><Circle cx="5" cy="12" r="1.6" fill={color} /><Circle cx="12" cy="12" r="1.6" fill={color} /><Circle cx="19" cy="12" r="1.6" fill={color} /></>;
    case 'chevron-back':
      return <Polyline {...line} points="15 5 8 12 15 19" />;
    case 'chevron-forward':
      return <Polyline {...line} points="9 5 16 12 9 19" />;
    case 'chevron-up':
      return <Polyline {...line} points="5 15 12 8 19 15" />;
    case 'chevron-down':
      return <Polyline {...line} points="5 9 12 16 19 9" />;
    case 'arrow-back':
      return <><Line {...line} x1="19" y1="12" x2="5" y2="12" /><Polyline {...line} points="11 6 5 12 11 18" /></>;
    case 'heart-outline':
      return <Path {...line} d="M12 20.2 4.7 13C.5 8.9 3.2 3.8 7.5 4.1c2 .1 3.4 1.6 4.5 3 1.1-1.4 2.5-2.9 4.5-3 4.3-.3 7 4.8 2.8 8.9Z" />;
    case 'calendar-outline':
      return <><Rect {...line} x="4" y="5.5" width="16" height="14" rx="2.5" /><Line {...line} x1="8" y1="3.5" x2="8" y2="7.5" /><Line {...line} x1="16" y1="3.5" x2="16" y2="7.5" /><Line {...line} x1="4" y1="9.5" x2="20" y2="9.5" /><Circle cx="9" cy="13.5" r="1" fill={color} /><Circle cx="15" cy="13.5" r="1" fill={color} /></>;
    case 'calendar-number-outline':
      return <><Rect {...line} x="4" y="5.5" width="16" height="14" rx="2.5" /><Line {...line} x1="8" y1="3.5" x2="8" y2="7.5" /><Line {...line} x1="16" y1="3.5" x2="16" y2="7.5" /><Line {...line} x1="4" y1="9.5" x2="20" y2="9.5" /><Line {...line} x1="9" y1="13" x2="9" y2="17" /><Path {...line} d="M13 14a1.5 1.5 0 1 1 2.7 1l-2.7 2h3" /></>;
    case 'notifications-outline':
      return <><Path {...line} d="M6.5 16.5h11l-1.4-2.1V10a4.1 4.1 0 0 0-8.2 0v4.4Z" /><Path {...line} d="M10 19a2.2 2.2 0 0 0 4 0" /><Line {...line} x1="12" y1="3" x2="12" y2="4" /></>;
    case 'chatbubbles-outline':
      return <><Path {...line} d="M4 5.5h11a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z" /><Path {...line} d="M18 9.5h1a2 2 0 0 1 2 2v6l-3-2h-4" /></>;
    case 'person-outline':
      return <><Circle {...line} cx="12" cy="8" r="3.5" /><Path {...line} d="M5 20c.5-4 3-6 7-6s6.5 2 7 6" /></>;
    case 'shield-checkmark-outline':
      return <><Path {...line} d="M12 3 19 6v5c0 4.6-2.7 7.8-7 10-4.3-2.2-7-5.4-7-10V6Z" /><Polyline {...line} points="8.5 12 11 14.5 15.8 9.5" /></>;
    case 'stats-chart-outline':
      return <><Line {...line} x1="4" y1="20" x2="20" y2="20" /><Rect {...line} x="5" y="12" width="3" height="6" rx="1" /><Rect {...line} x="10.5" y="8" width="3" height="10" rx="1" /><Rect {...line} x="16" y="4" width="3" height="14" rx="1" /></>;
    case 'mail-open-outline':
      return <><Path {...line} d="M3 9 12 3l9 6v10H3Z" /><Polyline {...line} points="3 10 12 16 21 10" /><Line {...line} x1="3" y1="19" x2="9" y2="13.8" /><Line {...line} x1="21" y1="19" x2="15" y2="13.8" /></>;
    case 'eye-outline':
      return <><Path {...line} d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><Circle {...line} cx="12" cy="12" r="2.5" /></>;
    case 'eye-off-outline':
      return <><Path {...line} d="M4 5 20 19" /><Path {...line} d="M9.3 6.5A9 9 0 0 1 12 6c6 0 9.5 6 9.5 6a14 14 0 0 1-3 3.6M6.2 8A15 15 0 0 0 2.5 12s3.5 6 9.5 6c1 0 2-.2 2.8-.5" /></>;
    case 'checkmark-circle':
    case 'checkmark-circle-outline':
      return <><Circle {...line} cx="12" cy="12" r="9" /><Polyline {...line} points="7.5 12.3 10.5 15.3 16.8 8.7" /></>;
    case 'alert-circle-outline':
      return <><Circle {...line} cx="12" cy="12" r="9" /><Line {...line} x1="12" y1="7" x2="12" y2="13" /><Circle cx="12" cy="17" r="1" fill={color} /></>;
    case 'warning-outline':
      return <><Path {...line} d="M12 3 22 20H2Z" /><Line {...line} x1="12" y1="8" x2="12" y2="14" /><Circle cx="12" cy="17" r="1" fill={color} /></>;
    case 'sparkles-outline':
      return <><Path {...line} d="m8 3 1.2 3.2L12 8 9.2 9.8 8 13 6.8 9.8 4 8l2.8-1.8Z" /><Path {...line} d="m16 10 1.2 3.2L20 15l-2.8 1.8L16 20l-1.2-3.2L12 15l2.8-1.8Z" /></>;
    case 'gift-outline':
      return <><Rect {...line} x="4" y="9" width="16" height="11" rx="1.5" /><Rect {...line} x="3" y="6" width="18" height="4" rx="1.5" /><Line {...line} x1="12" y1="6" x2="12" y2="20" /><Path {...line} d="M12 6c-2.5 0-5-.8-5-2.2C7 2 10.5 2.5 12 6Zm0 0c2.5 0 5-.8 5-2.2C17 2 13.5 2.5 12 6Z" /></>;
    case 'airplane-outline':
      return <Path {...line} d="m3 13 7-2 3-7c.5-1.2 2-1.7 3-1l.4.3c.8.6.9 1.7.4 2.5L14 11l6-1.2 1.5 1.5-6.2 3.2-3.2 6.2-1.5-1.5 1.2-6-4.8 2.8Z" />;
    case 'sunny-outline':
      return <><Circle {...line} cx="12" cy="12" r="4" /><Line {...line} x1="12" y1="2" x2="12" y2="5" /><Line {...line} x1="12" y1="19" x2="12" y2="22" /><Line {...line} x1="2" y1="12" x2="5" y2="12" /><Line {...line} x1="19" y1="12" x2="22" y2="12" /><Line {...line} x1="4.9" y1="4.9" x2="7" y2="7" /><Line {...line} x1="17" y1="17" x2="19.1" y2="19.1" /><Line {...line} x1="19.1" y1="4.9" x2="17" y2="7" /><Line {...line} x1="7" y1="17" x2="4.9" y2="19.1" /></>;
    case 'moon-outline':
      return <Path {...line} d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />;
    case 'cafe-outline':
      return <><Path {...line} d="M4 7h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z" /><Path {...line} d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17" /><Line {...line} x1="3" y1="21" x2="19" y2="21" /></>;
    case 'restaurant-outline':
      return <><Line {...line} x1="7" y1="3" x2="7" y2="21" /><Path {...line} d="M4 3v5a3 3 0 0 0 6 0V3M16 3v18M16 3c4 2 4 8 0 10" /></>;
    case 'film-outline':
      return <><Rect {...line} x="3" y="5" width="18" height="14" rx="2" /><Line {...line} x1="8" y1="5" x2="8" y2="19" /><Line {...line} x1="16" y1="5" x2="16" y2="19" /><Line {...line} x1="3" y1="9" x2="8" y2="9" /><Line {...line} x1="16" y1="9" x2="21" y2="9" /><Line {...line} x1="3" y1="15" x2="8" y2="15" /><Line {...line} x1="16" y1="15" x2="21" y2="15" /></>;
    case 'musical-notes-outline':
      return <><Path {...line} d="M9 17V6l10-2v11" /><Line {...line} x1="9" y1="9" x2="19" y2="7" /><Circle {...line} cx="6.5" cy="18" r="2.5" /><Circle {...line} cx="16.5" cy="16" r="2.5" /></>;
    case 'camera-outline':
      return <><Rect {...line} x="3" y="7" width="18" height="13" rx="2.5" /><Path {...line} d="M8 7 9.5 4h5L16 7" /><Circle {...line} cx="12" cy="13.5" r="3.2" /></>;
    case 'flower-outline':
      return <><Circle {...line} cx="12" cy="12" r="2" /><Circle {...line} cx="12" cy="6.5" r="3" /><Circle {...line} cx="17.2" cy="10.3" r="3" /><Circle {...line} cx="15.2" cy="16.5" r="3" /><Circle {...line} cx="8.8" cy="16.5" r="3" /><Circle {...line} cx="6.8" cy="10.3" r="3" /></>;
    case 'home-outline':
      return <><Path {...line} d="m3 11 9-8 9 8" /><Path {...line} d="M5 10v10h14V10M9 20v-6h6v6" /></>;
    case 'fitness-outline':
      return <><Line {...line} x1="6" y1="12" x2="18" y2="12" /><Rect {...line} x="3" y="8" width="3" height="8" rx="1" /><Rect {...line} x="18" y="8" width="3" height="8" rx="1" /><Line {...line} x1="1.5" y1="10" x2="1.5" y2="14" /><Line {...line} x1="22.5" y1="10" x2="22.5" y2="14" /></>;
    case 'balloon-outline':
      return <><Path {...line} d="M12 3a7 7 0 0 0-7 7c0 4.2 3.1 7.5 7 7.5s7-3.3 7-7.5a7 7 0 0 0-7-7Z" /><Polyline {...line} points="10.2 17.2 12 20 13.8 17.2" /><Line {...line} x1="12" y1="20" x2="12" y2="22" /></>;
    case 'people-outline':
      return <><Circle {...line} cx="8.5" cy="8" r="3" /><Circle {...line} cx="16.5" cy="9" r="2.5" /><Path {...line} d="M2.5 20c.4-4 2.4-6 6-6s5.6 2 6 6" /><Path {...line} d="M14.5 15c3.8-.7 6.3 1.1 7 4.5" /></>;
    case 'wine-outline':
      return <><Path {...line} d="M6 3h12l-1 6a5 5 0 0 1-10 0Z" /><Line {...line} x1="12" y1="14" x2="12" y2="21" /><Line {...line} x1="8" y1="21" x2="16" y2="21" /><Line {...line} x1="7" y1="8" x2="17" y2="8" /></>;
    case 'time-outline':
      return <><Circle {...line} cx="12" cy="12" r="9" /><Polyline {...line} points="12 7 12 12 16 14" /></>;
    case 'game-controller-outline':
      return <><Path {...line} d="M7 8h10a4 4 0 0 1 3.8 5.2l-1.4 4.2a2.4 2.4 0 0 1-4 .9L13.8 17h-3.6l-1.6 1.3a2.4 2.4 0 0 1-4-.9l-1.4-4.2A4 4 0 0 1 7 8Z" /><Line {...line} x1="7" y1="11" x2="7" y2="15" /><Line {...line} x1="5" y1="13" x2="9" y2="13" /><Circle cx="16" cy="12" r="1" fill={color} /><Circle cx="18" cy="14" r="1" fill={color} /></>;
    case 'headset-outline':
      return <><Path {...line} d="M4 13v-2a8 8 0 0 1 16 0v2" /><Rect {...line} x="3" y="12" width="4" height="7" rx="2" /><Rect {...line} x="17" y="12" width="4" height="7" rx="2" /><Path {...line} d="M17 19c0 2-2 3-5 3" /></>;
    case 'phone-portrait-outline':
      return <><Rect {...line} x="6" y="2" width="12" height="20" rx="2.5" /><Line {...line} x1="10" y1="5" x2="14" y2="5" /><Circle cx="12" cy="19" r="1" fill={color} /></>;
    case 'watch-outline':
      return <><Path {...line} d="m9 5 1-3h4l1 3M9 19l1 3h4l1-3" /><Rect {...line} x="6" y="5" width="12" height="14" rx="4" /><Polyline {...line} points="12 8 12 12 15 13.5" /></>;
    case 'bicycle-outline':
      return <><Circle {...line} cx="5" cy="17" r="4" /><Circle {...line} cx="19" cy="17" r="4" /><Path {...line} d="m5 17 4-8h4l3 8H9l-3-6h8M10 6h3" /></>;
    case 'car-sport-outline':
      return <><Path {...line} d="M3 16v-4l3-5h10l5 5v4H3Z" /><Polyline {...line} points="6 11 8 8 15 8 18 11" /><Circle {...line} cx="7" cy="17" r="2" /><Circle {...line} cx="17" cy="17" r="2" /></>;
    case 'boat-outline':
      return <><Path {...line} d="M4 13h16l-2.5 6h-11Z" /><Path {...line} d="M9 13V5h6v8M9 5l6 3" /><Path {...line} d="M3 21c2 1 4 1 6 0 2 1 4 1 6 0 2 1 4 1 6 0" /></>;
    case 'bag-handle-outline':
      return <><Rect {...line} x="4" y="7" width="16" height="14" rx="2" /><Path {...line} d="M8 8V6a4 4 0 0 1 8 0v2" /></>;
    case 'image-outline':
      return <><Rect {...line} x="3" y="4" width="18" height="16" rx="2" /><Circle {...line} cx="8" cy="9" r="1.5" /><Polyline {...line} points="4 18 9 13 12 16 15 12 20 18" /></>;
    case 'volume-medium-outline':
      return <><Polygon {...line} points="4,10 8,10 13,6 13,18 8,14 4,14" /><Path {...line} d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" /></>;
    case 'trash-outline':
      return <><Path {...line} d="M5 7h14l-1 14H6Z" /><Line {...line} x1="3" y1="7" x2="21" y2="7" /><Path {...line} d="M9 7V4h6v3M10 11v6M14 11v6" /></>;
    case 'create-outline':
      return <>
        <Path {...line} d="M13 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
        <Path {...line} d="m6.2 17.8.9-3.8L16.6 4.5a2.1 2.1 0 0 1 3 3L10 17.1Z" />
        <Line {...line} x1="15.2" y1="5.9" x2="18.2" y2="8.9" />
      </>;
    case 'lock-closed-outline':
      return <><Rect {...line} x="5" y="10" width="14" height="11" rx="2" /><Path {...line} d="M8 10V7a4 4 0 0 1 8 0v3" /><Circle cx="12" cy="15" r="1.2" fill={color} /></>;
    case 'checkbox':
      return <><Rect x="3" y="3" width="18" height="18" rx="2" fill={color} /><Polyline fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" points="7 12 10.5 15.5 17 8" /></>;
    case 'checkbox-outline':
      return <><Rect {...line} x="3" y="3" width="18" height="18" rx="2" /><Polyline {...line} points="7 12 10.5 15.5 17 8" /></>;
    case 'square-outline':
      return <Rect {...line} x="3" y="3" width="18" height="18" rx="2" />;
    case 'document-text-outline':
      return <><Path {...line} d="M6 3h8l4 4v14H6Z" /><Polyline {...line} points="14 3 14 8 18 8" /><Line {...line} x1="9" y1="12" x2="15" y2="12" /><Line {...line} x1="9" y1="16" x2="15" y2="16" /></>;
    case 'document-outline':
      return <><Path {...line} d="M6 3h8l4 4v14H6Z" /><Polyline {...line} points="14 3 14 8 18 8" /></>;
    case 'bulb-outline':
      return <><Path {...line} d="M8.5 15.5a6 6 0 1 1 7 0c-1 .8-1.5 1.7-1.5 2.5h-4c0-.8-.5-1.7-1.5-2.5Z" /><Line {...line} x1="10" y1="21" x2="14" y2="21" /><Line {...line} x1="9.5" y1="18" x2="14.5" y2="18" /></>;
    case 'bookmark-outline':
      return <Path {...line} d="M6 3h12v18l-6-4-6 4Z" />;
    case 'book-outline':
      return <><Path {...line} d="M3 5.5A3.5 3.5 0 0 1 6.5 2H11v17H6.5A3.5 3.5 0 0 0 3 22Z" /><Path {...line} d="M21 5.5A3.5 3.5 0 0 0 17.5 2H13v17h4.5A3.5 3.5 0 0 1 21 22Z" /></>;
    case 'cart-outline':
      return <><Path {...line} d="M3 4h2l2.2 11h10.5l2-7H6" /><Circle {...line} cx="9" cy="19" r="1.5" /><Circle {...line} cx="17" cy="19" r="1.5" /></>;
    case 'flag-outline':
      return <><Line {...line} x1="5" y1="3" x2="5" y2="22" /><Path {...line} d="M5 4h12l-2 4 2 4H5Z" /></>;
    case 'chatbubble-ellipses-outline':
      return <><Path {...line} d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 3v-3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /><Circle cx="8" cy="11" r="1" fill={color} /><Circle cx="12" cy="11" r="1" fill={color} /><Circle cx="16" cy="11" r="1" fill={color} /></>;
    case 'pencil-outline':
      return <><Path {...line} d="m4 20 1.2-4.5L16.7 4a2.1 2.1 0 0 1 3 3L8.2 18.5Z" /><Line {...line} x1="15.2" y1="5.5" x2="18.2" y2="8.5" /><Line {...line} x1="5.2" y1="15.5" x2="8.2" y2="18.5" /></>;
    case 'clipboard-outline':
      return <><Rect {...line} x="5" y="4" width="14" height="18" rx="2" /><Rect {...line} x="9" y="2" width="6" height="4" rx="1" /><Line {...line} x1="8" y1="11" x2="16" y2="11" /><Line {...line} x1="8" y1="15" x2="16" y2="15" /></>;
    case 'folder-outline':
      return <Path {...line} d="M3 6h7l2 2h9v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />;
    case 'link-outline':
      return <><Path {...line} d="m10 14-2 2a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0" /><Path {...line} d="m14 10 2-2a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0" /><Line {...line} x1="9" y1="15" x2="15" y2="9" /></>;
    case 'attach-outline':
      return <Path {...line} d="M8 12.5 14.5 6a3 3 0 0 1 4.2 4.2l-8 8a4.5 4.5 0 0 1-6.4-6.4l8.2-8.2M7 15l8-8" />;
    case 'list-outline':
      return <><Circle cx="4" cy="6" r="1" fill={color} /><Circle cx="4" cy="12" r="1" fill={color} /><Circle cx="4" cy="18" r="1" fill={color} /><Line {...line} x1="8" y1="6" x2="21" y2="6" /><Line {...line} x1="8" y1="12" x2="21" y2="12" /><Line {...line} x1="8" y1="18" x2="21" y2="18" /></>;
    case 'grid-outline':
      return <><Rect {...line} x="3" y="3" width="7" height="7" rx="1" /><Rect {...line} x="14" y="3" width="7" height="7" rx="1" /><Rect {...line} x="3" y="14" width="7" height="7" rx="1" /><Rect {...line} x="14" y="14" width="7" height="7" rx="1" /></>;
    case 'archive-outline':
      return <><Rect {...line} x="3" y="4" width="18" height="5" rx="1" /><Path {...line} d="M5 9v11h14V9" /><Line {...line} x1="9" y1="13" x2="15" y2="13" /></>;
    default:
      return <><Circle {...line} cx="12" cy="12" r="9" /><Path {...line} d="M9.5 9a2.7 2.7 0 1 1 4.2 2.2c-1.2.8-1.7 1.3-1.7 2.8" /><Circle cx="12" cy="17.5" r="1" fill={color} /></>;
  }
}

export function AppIcon({ name, size = 24, color = '#000000', style }: AppIconProps) {
  if (Platform.OS !== 'web') {
    return <Ionicons name={name} size={size} color={color} style={style as StyleProp<TextStyle>} />;
  }

  return (
    <View accessible={false} style={[{ width: size, height: size }, style as StyleProp<ViewStyle>]}>
      <Svg width="100%" height="100%" viewBox="0 0 24 24">
        {renderWebIcon(name, color)}
      </Svg>
    </View>
  );
}
