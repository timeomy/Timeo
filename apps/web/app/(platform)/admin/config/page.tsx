"use client";

import { useState } from "react";
import { usePlatformConfig, useUpdatePlatformConfig } from "@timeo/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@timeo/ui/web";
import { Settings, Save } from "lucide-react";

function Toggle({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (val: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        checked ? "bg-primary" : "bg-zinc-700"
      }`}
    >
      <span
        className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function ConfigField({
  label,
  section,
  configKey,
  config,
  onSave,
  saving,
}: {
  label: string;
  section: string;
  configKey: string;
  config: Record<string, Record<string, unknown>> | undefined;
  onSave: (section: string, key: string, value: unknown) => void;
  saving: boolean;
}) {
  const currentValue = String(config?.[section]?.[configKey] ?? "");
  const [value, setValue] = useState(currentValue);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => onSave(section, configKey, value)}
          disabled={saving || value === currentValue}
          className="shrink-0"
        >
          <Save className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function ConfigToggle({
  label,
  description,
  section,
  configKey,
  config,
  onSave,
}: {
  label: string;
  description: string;
  section: string;
  configKey: string;
  config: Record<string, Record<string, unknown>> | undefined;
  onSave: (section: string, key: string, value: unknown) => void;
}) {
  const checked = Boolean(config?.[section]?.[configKey]);

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Toggle checked={checked} onCheckedChange={(val) => onSave(section, configKey, val)} />
    </div>
  );
}

export default function ConfigPage() {
  const { data: config, isLoading } = usePlatformConfig();
  const updateConfig = useUpdatePlatformConfig();

  function handleSave(section: string, key: string, value: unknown) {
    updateConfig.mutate({ section, key, value });
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const maintenanceEnabled = Boolean(config?.["maintenance"]?.["enabled"]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Config</h1>
        <p className="mt-1 text-muted-foreground">
          All platform-wide settings in one place.
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="auth">Auth</TabsTrigger>
          <TabsTrigger value="limits">Limits</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="glass border-white/[0.08]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>Core platform configuration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ConfigField
                label="Default Currency"
                section="general"
                configKey="default_currency"
                config={config}
                onSave={handleSave}
                saving={updateConfig.isPending}
              />
              <ConfigField
                label="Default Timezone"
                section="general"
                configKey="default_timezone"
                config={config}
                onSave={handleSave}
                saving={updateConfig.isPending}
              />
              <ConfigField
                label="Support Email"
                section="general"
                configKey="support_email"
                config={config}
                onSave={handleSave}
                saving={updateConfig.isPending}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auth">
          <Card className="glass border-white/[0.08]">
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>Control sign-up and authentication behavior.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ConfigToggle
                label="Sign-up Enabled"
                description="Allow new users to register on the platform."
                section="auth"
                configKey="signup_enabled"
                config={config}
                onSave={handleSave}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits">
          <Card className="glass border-white/[0.08]">
            <CardHeader>
              <CardTitle>Limits</CardTitle>
              <CardDescription>Platform resource limits.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ConfigField
                label="Max Tenants per User"
                section="limits"
                configKey="max_tenants_per_user"
                config={config}
                onSave={handleSave}
                saving={updateConfig.isPending}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card className="glass border-white/[0.08]">
            <CardHeader>
              <CardTitle>Maintenance Mode</CardTitle>
              <CardDescription>Take the platform offline for maintenance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ConfigToggle
                label="Maintenance Mode"
                description="When enabled, all tenant-facing pages show a maintenance message."
                section="maintenance"
                configKey="enabled"
                config={config}
                onSave={handleSave}
              />
              {maintenanceEnabled && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                  <p className="text-sm font-medium text-yellow-400">
                    Maintenance mode is active
                  </p>
                  <p className="text-xs text-yellow-400/80">
                    Tenants will see a maintenance page. Remember to disable when done.
                  </p>
                </div>
              )}
              <ConfigField
                label="Maintenance Message"
                section="maintenance"
                configKey="message"
                config={config}
                onSave={handleSave}
                saving={updateConfig.isPending}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
