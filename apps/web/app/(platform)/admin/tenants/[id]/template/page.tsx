"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useAssignTemplate,
  usePlatformTemplate,
  usePlatformTemplates,
  usePlatformTenantTemplate,
} from "@timeo/api-client";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@timeo/ui/web";
import { ArrowLeft } from "lucide-react";

export default function TenantTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const { data: tenantTemplate, isLoading } = usePlatformTenantTemplate(tenantId);
  const { data: templates } = usePlatformTemplates();
  const assignTemplate = useAssignTemplate();

  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedVersion, setSelectedVersion] = useState("");
  const templateDetailQuery = usePlatformTemplate(selectedTemplateId || null);

  useEffect(() => {
    if (!tenantTemplate?.assignment) {
      return;
    }

    setSelectedTemplateId(tenantTemplate.assignment.templateId);
    setSelectedVersion(String(tenantTemplate.assignment.version));
  }, [tenantTemplate?.assignment]);

  async function handleAssign() {
    if (!selectedTemplateId) {
      return;
    }

    try {
      await assignTemplate.mutateAsync({
        tenantId,
        templateId: selectedTemplateId,
        version: selectedVersion ? Number(selectedVersion) : undefined,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to assign template");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <button
          onClick={() => router.push(`/admin/tenants/${tenantId}`)}
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tenant
        </button>

        <h1 className="text-3xl font-bold tracking-tight">Tenant Template</h1>
        <p className="mt-1 text-muted-foreground">
          View assignment and reassign template versions.
        </p>
      </div>

      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle>Current Assignment</CardTitle>
          <CardDescription>
            {tenantTemplate?.tenant.name ?? "Tenant"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading assignment...</p>
          ) : tenantTemplate?.assignment ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Template:</span>{" "}
                <strong>{tenantTemplate.assignment.templateName}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Key:</span>{" "}
                <code>{tenantTemplate.assignment.templateKey}</code>
              </p>
              <p>
                <span className="text-muted-foreground">Version:</span>{" "}
                {tenantTemplate.assignment.version}
              </p>
              <Badge variant="outline">{tenantTemplate.assignment.source}</Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No template assigned yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle>Assign / Reassign</CardTitle>
          <CardDescription>
            Assign a published template version to this tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={selectedTemplateId}
              onChange={(event) => {
                setSelectedTemplateId(event.target.value);
                setSelectedVersion("");
              }}
              className="h-10 rounded-md border border-white/[0.12] bg-background px-3 text-sm"
            >
              <option value="">Select template</option>
              {(templates ?? []).map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.key})
                </option>
              ))}
            </select>

            <select
              value={selectedVersion}
              onChange={(event) => setSelectedVersion(event.target.value)}
              disabled={!selectedTemplateId || templateDetailQuery.isLoading}
              className="h-10 rounded-md border border-white/[0.12] bg-background px-3 text-sm"
            >
              <option value="">Current published version</option>
              {(templateDetailQuery.data?.versions ?? []).map((version) => (
                <option key={version.id} value={String(version.version)}>
                  Version {version.version}
                  {version.isPublished ? " (published)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleAssign}
              disabled={assignTemplate.isPending || !selectedTemplateId}
            >
              {assignTemplate.isPending ? "Saving..." : "Assign Template"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle>Resolved Config</CardTitle>
          <CardDescription>Read-only resolved runtime config.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[400px] overflow-auto rounded-md border border-white/[0.12] bg-background p-3 text-xs">
            {JSON.stringify(tenantTemplate?.resolvedConfig ?? {}, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
