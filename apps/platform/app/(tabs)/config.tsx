import React, { useState, useCallback } from "react";
import { View, Text, FlatList, RefreshControl, Alert } from "react-native";
import {
  Settings,
  Save,
  Plus,
  Trash2,
} from "lucide-react-native";
import {
  Screen,
  Header,
  Card,
  Input,
  Button,
  Section,
  EmptyState,
  LoadingScreen,
  Modal,
  Spacer,
  useTheme,
} from "@timeo/ui";
import { api } from "@timeo/api";
import { useQuery, useMutation } from "convex/react";

interface ConfigEntry {
  key: string;
  value: string;
  dirty: boolean;
}

export default function ConfigScreen() {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // We query known config keys individually; since there is no listAll endpoint,
  // we use a set of well-known platform config keys
  const KNOWN_CONFIG_KEYS = [
    "platform.name",
    "platform.support_email",
    "platform.maintenance_mode",
    "platform.max_tenants",
    "platform.default_plan",
    "platform.default_timezone",
    "platform.signup_enabled",
    "platform.webhook_secret",
  ];

  const setConfig = useMutation(api.platform.setConfig);

  // Query each known config key
  const configQueries: Record<string, ReturnType<typeof useQuery>> = {};
  for (const key of KNOWN_CONFIG_KEYS) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    configQueries[key] = useQuery(api.platform.getConfig, { key });
  }

  const configEntries: ConfigEntry[] = KNOWN_CONFIG_KEYS.map((key) => {
    const result = configQueries[key];
    const savedValue = result ? JSON.stringify(result.value) : "";
    const editedValue = editedValues[key];
    return {
      key,
      value: editedValue !== undefined ? editedValue : savedValue,
      dirty: editedValue !== undefined && editedValue !== savedValue,
    };
  }).filter((entry) => {
    // Show entries that exist or have been edited
    const result = configQueries[entry.key];
    return result !== undefined || editedValues[entry.key] !== undefined;
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setEditedValues({});
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleSave = useCallback(
    async (key: string, value: string) => {
      setSavingKeys((prev) => new Set(prev).add(key));
      try {
        // Try to parse as JSON, fallback to string
        let parsedValue: unknown;
        try {
          parsedValue = JSON.parse(value);
        } catch {
          parsedValue = value;
        }

        await setConfig({ key, value: parsedValue });
        setEditedValues((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      } catch (error) {
        Alert.alert(
          "Error",
          `Failed to save config "${key}". ${error instanceof Error ? error.message : "Please try again."}`
        );
      } finally {
        setSavingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [setConfig]
  );

  const handleAddConfig = useCallback(async () => {
    if (!newKey.trim()) {
      Alert.alert("Error", "Config key is required.");
      return;
    }

    setAddLoading(true);
    try {
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(newValue);
      } catch {
        parsedValue = newValue;
      }

      await setConfig({ key: newKey.trim(), value: parsedValue });
      setNewKey("");
      setNewValue("");
      setShowAddModal(false);
    } catch (error) {
      Alert.alert(
        "Error",
        `Failed to add config. ${error instanceof Error ? error.message : "Please try again."}`
      );
    } finally {
      setAddLoading(false);
    }
  }, [newKey, newValue, setConfig]);

  return (
    <Screen padded={false}>
      <Header
        title="System Config"
        rightActions={
          <Button size="sm" onPress={() => setShowAddModal(true)}>
            <View className="flex-row items-center">
              <Plus size={16} color="#FFFFFF" />
              <Text className="ml-1 text-sm font-semibold text-white">Add</Text>
            </View>
          </Button>
        }
      />

      <FlatList
        data={configEntries}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ItemSeparatorComponent={() => <Spacer size={10} />}
        ListHeaderComponent={
          <View className="mb-4">
            <Text
              className="text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              Manage platform-wide configuration settings. Values are stored as
              JSON.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No configuration"
            description="Add your first configuration entry to get started."
            icon={<Settings size={32} color={theme.colors.textSecondary} />}
            action={{
              label: "Add Config",
              onPress: () => setShowAddModal(true),
            }}
          />
        }
        renderItem={({ item }) => (
          <Card>
            <Text
              className="mb-2 text-sm font-bold"
              style={{ color: theme.colors.primary }}
            >
              {item.key}
            </Text>
            <Input
              value={item.value}
              onChangeText={(text) =>
                setEditedValues((prev) => ({ ...prev, [item.key]: text }))
              }
              placeholder="Enter value (JSON or string)"
              className="mb-2"
            />
            {item.dirty ? (
              <Button
                size="sm"
                loading={savingKeys.has(item.key)}
                onPress={() => handleSave(item.key, item.value)}
              >
                <View className="flex-row items-center">
                  <Save size={14} color="#FFFFFF" />
                  <Text className="ml-1.5 text-sm font-semibold text-white">
                    Save
                  </Text>
                </View>
              </Button>
            ) : (
              <Text
                className="text-xs"
                style={{ color: theme.colors.textSecondary }}
              >
                Up to date
              </Text>
            )}
          </Card>
        )}
      />

      {/* Add Config Modal */}
      <Modal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setNewKey("");
          setNewValue("");
        }}
        title="Add Configuration"
      >
        <Input
          label="Key"
          value={newKey}
          onChangeText={setNewKey}
          placeholder="e.g. platform.feature_name"
          autoCapitalize="none"
          className="mb-4"
        />
        <Input
          label="Value"
          value={newValue}
          onChangeText={setNewValue}
          placeholder='e.g. true, "hello", 42'
          autoCapitalize="none"
          className="mb-4"
        />
        <Button
          loading={addLoading}
          onPress={handleAddConfig}
          disabled={!newKey.trim()}
        >
          Add Configuration
        </Button>
      </Modal>
    </Screen>
  );
}
