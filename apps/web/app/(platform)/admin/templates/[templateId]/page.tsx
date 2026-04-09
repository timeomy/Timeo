"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useCreateTemplateVersion,
  usePublishTemplateVersion,
  useTemplateVersions,
} from "@timeo/api-client";
import {
  ALLOWED_ADMIN_WIDGET_TYPES,
  ALLOWED_MEMBER_BLOCK_TYPES,
} from "@timeo/shared";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@timeo/ui/web";
import { ArrowLeft, Rocket, Save } from "lucide-react";

function buildStarterDefinition(template: {
  key: string;
  industry: string;
  name: string;
}) {
  const noRequiredFlags: string[] = [];

  return {
    schemaVersion: 1,
    templateKey: template.key,
    industry: template.industry,
    displayName: template.name,
    description: `${template.name} template draft`,
    featureDefaults: {},
    settingsDefaults: {
      industry: template.industry,
    },
    brandingDefaults: {
      primaryColor: null as string | null,
      secondaryColor: null as string | null,
      logoUrl: null as string | null,
      companyDisplayName: null as string | null,
    },
    memberPortal: {
      layout: {
        shell: "mobile_bottom_tabs",
        breakpoints: ["mobile", "tablet", "desktop"],
      },
      navigation: [
        {
          id: "member.home",
          labelKey: "nav.home",
          icon: "home",
          route: "/member/home",
          pageId: "member.home",
          visibility: { requiresFlags: noRequiredFlags },
        },
      ],
      pages: [
        {
          id: "member.home",
          titleKey: "page.member.home",
          layout: "stack",
          blocks: [
            {
              id: "member.home.block.1",
              type: ALLOWED_MEMBER_BLOCK_TYPES[0],
              config: {},
              visibility: { requiresFlags: noRequiredFlags },
            },
          ],
        },
      ],
    },
    adminPanel: {
      layout: {
        shell: "sidebar_topbar",
        breakpoints: ["desktop", "tablet"],
      },
      menu: [
        {
          id: "admin.dashboard",
          labelKey: "menu.dashboard",
          icon: "layout-dashboard",
          route: "/dashboard",
          pageId: "admin.dashboard",
          visibility: { requiresFlags: noRequiredFlags },
        },
      ],
      pages: [
        {
          id: "admin.dashboard",
          titleKey: "page.admin.dashboard",
          layout: "grid",
          widgets: [
            {
              id: "admin.dashboard.widget.1",
              type: ALLOWED_ADMIN_WIDGET_TYPES[0],
              config: {},
              visibility: { requiresFlags: noRequiredFlags },
            },
          ],
        },
      ],
    },
    editableZones: {
      memberPortal: true,
      adminPanel: true,
      featureDefaults: true,
      settingsDefaults: true,
    },
  };
}

export default function PlatformTemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.templateId as string;

  const { data: template, isLoading } = useTemplateVersions(templateId);
  const createVersion = useCreateTemplateVersion();
  const publishVersion = usePublishTemplateVersion();

  const [draftJson, setDraftJson] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [seededTemplateId, setSeededTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (!template) {
      return;
    }

    if (seededTemplateId === template.id) {
      return;
    }

    const latestDefinition = template.versions[0]?.definition;
    const starter = latestDefinition ?? buildStarterDefinition(template);
    setDraftJson(JSON.stringify(starter, null, 2));
    setSeededTemplateId(template.id);
  }, [template, seededTemplateId]);

  const versions = useMemo(() => template?.versions ?? [], [template]);

  async function handleCreateVersion() {
    setJsonError(null);

    try {
      const parsed = JSON.parse(draftJson) as Record<string, unknown>;
      await createVersion.mutateAsync({
        templateId,
        definition: parsed,
      });
    } catch (err) {
      if (err instanceof SyntaxError) {
        setJsonError("Invalid JSON format.");
      } else {
        setJsonError(err instanceof Error ? err.message : "Failed to create version");
      }
    }
  }

  async function handlePublish(version: number) {
    try {
      await publishVersion.mutateAsync({ templateId, version });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to publish version");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <button
          onClick={() => router.push("/admin/templates")}
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Templates
        </button>

        <h1 className="text-3xl font-bold tracking-tight">
          {isLoading ? "Loading template..." : template?.name ?? "Template"}
        </h1>
        {!isLoading && template && (
          <p className="mt-1 text-sm text-muted-foreground">
            <code>{template.key}</code> · {template.industry}
          </p>
        )}
      </div>

      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Create New Draft Version
          </CardTitle>
          <CardDescription>
            Paste/edit template JSON, then create a draft version.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={draftJson}
            onChange={(event) => setDraftJson(event.target.value)}
            className="min-h-[260px] w-full rounded-md border border-white/[0.12] bg-background p-3 font-mono text-xs"
          />
          {jsonError && <p className="text-sm text-red-400">{jsonError}</p>}
          <div className="flex justify-end">
            <Button
              onClick={handleCreateVersion}
              disabled={createVersion.isPending || !draftJson.trim()}
            >
              {createVersion.isPending ? "Creating..." : "Create Draft Version"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Versions</h2>

        {isLoading ? (
          <Card className="glass border-white/[0.08]">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Loading versions...
            </CardContent>
          </Card>
        ) : versions.length === 0 ? (
          <Card className="glass border-white/[0.08]">
            <CardContent className="p-6 text-sm text-muted-foreground">
              No versions yet.
            </CardContent>
          </Card>
        ) : (
          versions.map((version) => (
            <Card key={version.id} className="glass border-white/[0.08]">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Version {version.version}</CardTitle>
                  <CardDescription>
                    Schema v{version.schemaVersion} · Created{" "}
                    {new Date(version.createdAt).toLocaleString()}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {version.isPublished ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    >
                      Published
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handlePublish(version.version)}
                      disabled={publishVersion.isPending}
                    >
                      <Rocket className="mr-2 h-4 w-4" />
                      Publish
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[320px] overflow-auto rounded-md border border-white/[0.12] bg-background p-3 text-xs">
                  {JSON.stringify(version.definition, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
