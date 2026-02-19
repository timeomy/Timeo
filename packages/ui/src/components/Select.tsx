import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
} from "react-native";
import { ChevronDown, Check } from "lucide-react-native";
import { useTheme } from "../theme";

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  className?: string;
}

export function Select({
  options,
  value,
  onChange,
  label,
  placeholder = "Select an option",
  error,
  className,
}: SelectProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value);

  return (
    <View className={className}>
      {label ? (
        <Text
          className="mb-1.5 text-sm font-medium"
          style={{ color: theme.colors.text }}
        >
          {label}
        </Text>
      ) : null}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-xl border px-3 py-3"
        style={{
          borderColor: error ? theme.colors.error : theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}
      >
        <Text
          className="text-base"
          style={{
            color: selectedOption
              ? theme.colors.text
              : theme.colors.textSecondary,
          }}
        >
          {selectedOption?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      {error ? (
        <Text
          className="mt-1 text-sm"
          style={{ color: theme.colors.error }}
        >
          {error}
        </Text>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          className="flex-1 justify-center bg-black/50 px-6"
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View
            className="rounded-2xl py-2"
            style={{ backgroundColor: theme.colors.background }}
          >
            {label ? (
              <Text
                className="px-4 py-3 text-base font-semibold"
                style={{ color: theme.colors.text }}
              >
                {label}
              </Text>
            ) : null}
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className="flex-row items-center justify-between px-4 py-3"
                >
                  <Text
                    className="text-base"
                    style={{
                      color:
                        item.value === value
                          ? theme.colors.primary
                          : theme.colors.text,
                      fontWeight: item.value === value ? "600" : "400",
                    }}
                  >
                    {item.label}
                  </Text>
                  {item.value === value ? (
                    <Check size={18} color={theme.colors.primary} />
                  ) : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
