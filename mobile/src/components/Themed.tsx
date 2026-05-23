/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */

import { Text as DefaultText, View as DefaultView } from 'react-native';

export type TextProps = DefaultText['props'];
export type ViewProps = DefaultView['props'];

export function Text(props: TextProps) {
  const { className, ...otherProps } = props;
  return (
    <DefaultText
      className={`${className ?? ''}`}
      style={[{ color: '#1a1a1a' }, otherProps.style as object]}
      {...otherProps}
    />
  );
}

export function View(props: ViewProps) {
  const { className, ...otherProps } = props;
  return (
    <DefaultView
      className={`${className ?? ''}`}
      style={[{ backgroundColor: '#FFFFFF' }, otherProps.style as object]}
      {...otherProps}
    />
  );
}
