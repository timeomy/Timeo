import React, { useCallback, useRef } from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import { Search, X } from "lucide-react-native";
import { useTheme } from "../theme";

export interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSearch?: (text: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export function SearchInput({
  value,
  onChangeText,
  onSearch,
  placeholder = "Search...",
  debounceMs = 300,
  className,
}: SearchInputProps) {
  const theme = useTheme();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (text: string) => {
      onChangeText(text);
      if (onSearch) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => onSearch(text), debounceMs);
      }
    },
    [onChangeText, onSearch, debounceMs]
  );

  return (
    <View
      className={`flex-row items-center rounded-xl px-3 ${className ?? ""}`}
      style={{ backgroundColor: theme.colors.surface }}
    >
      <Search size={18} color={theme.colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        className="flex-1 py-2.5 pl-2 text-base"
        style={{ color: theme.colors.text }}
        returnKeyType="search"
        onSubmitEditing={() => onSearch?.(value)}
      />
      {value.length > 0 ? (
        <TouchableOpacity onPress={() => handleChange("")}>
          <X size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
