import React from 'react';
import Svg, { Text as SvgText, G, Path } from 'react-native-svg';

export type StoreKey = 'ebay' | 'amazon' | 'walmart' | 'taobao' | '1688' | 'iherb';

function EbayIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72">
      <SvgText x="2" y="50" fontFamily="Arial" fontSize="36" fontWeight="bold" fill="#E53238">e</SvgText>
      <SvgText x="18" y="50" fontFamily="Arial" fontSize="36" fontWeight="bold" fill="#0064D2">b</SvgText>
      <SvgText x="34" y="50" fontFamily="Arial" fontSize="36" fontWeight="bold" fill="#F5AF02">a</SvgText>
      <SvgText x="50" y="50" fontFamily="Arial" fontSize="36" fontWeight="bold" fill="#86B817">y</SvgText>
    </Svg>
  );
}

function AmazonIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72">
      <SvgText x="36" y="36" fontFamily="Arial" fontSize="16" fontWeight="bold" fill="white" textAnchor="middle">
        amazon
      </SvgText>
      <Path d="M 14 48 Q 36 62 58 48" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Path d="M 54 44 L 58 49 L 53 53" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function WalmartIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72">
      <G transform="translate(36, 36)">
        {([0, 60, 120, 180, 240, 300] as number[]).map(angle => (
          <Path key={angle} d="M 0 -19 L 4.5 0 L 0 19 L -4.5 0 Z" fill="#FFC220" transform={`rotate(${angle})`} />
        ))}
      </G>
    </Svg>
  );
}

function TaobaoIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72">
      <SvgText x="36" y="53" fontFamily="Arial" fontSize="46" fontWeight="bold" fill="white" textAnchor="middle">
        淘
      </SvgText>
    </Svg>
  );
}

function Icon1688({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72">
      <SvgText x="36" y="46" fontFamily="Arial" fontSize="22" fontWeight="bold" fill="#FFDD00" textAnchor="middle">
        1688
      </SvgText>
    </Svg>
  );
}

function IherbIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72">
      <Path d="M 36 10 Q 58 20 56 40 Q 54 58 36 64 Q 18 58 16 40 Q 14 20 36 10 Z" fill="#2DA84E" />
      <Path d="M 36 10 L 36 64" stroke="#6DD47E" strokeWidth="2.5" fill="none" />
      <Path d="M 36 36 Q 26 28 20 22" stroke="#6DD47E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Path d="M 36 44 Q 46 36 52 30" stroke="#6DD47E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

const ICONS: Record<StoreKey, (props: { size: number }) => React.JSX.Element> = {
  ebay: EbayIcon,
  amazon: AmazonIcon,
  walmart: WalmartIcon,
  taobao: TaobaoIcon,
  '1688': Icon1688,
  iherb: IherbIcon,
};

export function StoreIcon({ store, size = 72 }: { store: StoreKey; size?: number }) {
  const IconComponent = ICONS[store];
  if (!IconComponent) return null;
  return <IconComponent size={size} />;
}
