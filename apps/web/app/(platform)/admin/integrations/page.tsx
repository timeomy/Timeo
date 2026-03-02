"use client";

import { useState } from "react";
import {
  usePlatformApiKeys,
  useCreatePlatformApiKey,
  useRevokePlatformApiKey,
} from "@timeo/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Skeleton,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@timeo/ui/web";
import { Key, Plus, Trash2, Copy, Check } from "lucide-react";

export default function IntegrationsPage() {
  const { data: apiKeys, isLoading } = usePlatformApiKeys();
  const createKey = useCreatePlatformApiKey();
  const revokeKey = useRevokePlatformApiKey();

  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    if (!keyName.trim()) return;
    const result = await createKey.mutateAsync({ name: keyName.trim() });
    setNewKey((result as { key: string }).key);
    setKeyName("");
  }

  function handleCopy() {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleCloseCreate() {
    setShowCreate(false);
    setNewKey(null);
    setKeyName("");
  }

  function handleRevoke(id: string) {
    revokeKey.mutate(id);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API & Integrations</h1>
          <p className="mt-1 text-muted-foreground">
            Manage API keys and integration connections.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New API Key
        </Button>
      </div>

      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>
            API keys for third-party integrations. Keys are shown only once on creation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !apiKeys || apiKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Key className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No API keys</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Create API keys to allow third-party integrations to access the Timeo API.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{k.name}</p>
                      {k.tenantId && (
                        <Badge variant="outline" className="text-xs">
                          Tenant
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                      {k.lastUsedAt && (
                        <span>Last used: {new Date(k.lastUsedAt).toLocaleDateString()}</span>
                      )}
                      {k.expiresAt && (
                        <span>Expires: {new Date(k.expiresAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    {k.permissions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {k.permissions.map((p) => (
                          <Badge key={p} variant="outline" className="text-xs">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRevoke(k.id)}
                    className="shrink-0 text-red-400 hover:text-red-300"
                    disabled={revokeKey.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={showCreate} onOpenChange={handleCloseCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{newKey ? "API Key Created" : "Create API Key"}</DialogTitle>
          </DialogHeader>
          {newKey ? (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                <p className="text-sm font-medium text-yellow-400">
                  Copy this key now — it will not be shown again.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input value={newKey} readOnly className="font-mono text-sm" />
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Key Name</label>
                <Input
                  value={keyName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyName(e.target.value)}
                  placeholder="e.g. Production API Key"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {newKey ? (
              <Button onClick={handleCloseCreate}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleCloseCreate}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createKey.isPending || !keyName.trim()}
                >
                  {createKey.isPending ? "Creating..." : "Create Key"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
