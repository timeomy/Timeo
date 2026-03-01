import React from "react";
import {
  View,
  Image,
  type ImageStyle,
  type StyleProp,
  ActivityIndicator,
} from "react-native";
import { ImageOff } from "lucide-react-native";
import { useTheme } from "../theme";

export interface RemoteImageProps {
  url: string | null | undefined;
  fallback?: React.ReactNode;
  width: number;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ImageStyle>;
}

export function RemoteImage({
  url,
  fallback,
  width,
  height,
  borderRadius = 0,
  style,
}: RemoteImageProps) {
  const theme = useTheme();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  if (!url || error) {
    return (
      <View
        className="items-center justify-center"
        style={{
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.border,
        }}
      >
        {fallback ?? <ImageOff size={Math.min(width, height) * 0.3} color={theme.colors.textSecondary} />}
      </View>
    );
  }

  return (
    <View style={{ width, height, borderRadius, overflow: "hidden" }}>
      {loading ? (
        <View
          className="absolute inset-0 items-center justify-center"
          style={{ backgroundColor: theme.colors.border }}
        >
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : null}
      <Image
        source={{ uri: url }}
        style={[
          {
            width,
            height,
            borderRadius,
          },
          style,
        ]}
        resizeMode="cover"
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
    </View>
  );
}
