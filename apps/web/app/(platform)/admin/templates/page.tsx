"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TEMPLATE_INDUSTRIES } from "@timeo/shared";
import { useCreatePlatformTemplate, usePlatformTemplates } from "@timeo/api-client";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@timeo/ui/web";
import { Layers, Plus } from "lucide-react";

const statusClasses: Record<string, string> = {
  draft: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  published: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  archived: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

export default function PlatformTemplatesPage() {
  const router = useRouter();
  const { data: templates, isLoading } = usePlatformTemplates();
  const createTemplate = useCreatePlatformTemplate();

  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [industry, setIndustry] = useState<(typeof TEMPLATE_INDUSTRIES)[number]>(
    "fitness",
  );

  const sortedTemplates = useMemo(() => {
    return [...(templates ?? [])].sort((left, right) => {
      if (left.industry === right.industry) {
        return left.key.localeCompare(right.key);
      }
      return left.industry.localeCompare(right.industry);
    });
  }, [templates]);

  async function handleCreateTemplate() {
    if (!name.trim() || !key.trim()) {
      return;
    }

    try {
      const created = await createTemplate.mutateAsync({
        name: name.trim(),
        key: key.trim(),
        industry,
      });
      setName("");
      setKey("");
      router.push(`/admin/templates/${created.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create template");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Templates</h1>
          <p className="mt-1 text-muted-foreground">
            Manage industry templates and published versions.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/admin/templates/migrations")}
        >
          Template Migrations
        </Button>
      </div>

      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Template Draft
          </CardTitle>
          <CardDescription>
            Create a template shell, then add versions from its detail page.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input
            value={name}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setName(event.target.value)
            }
            placeholder="Display name"
          />
          <Input
            value={key}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setKey(event.target.value.toLowerCase().replace(/\s+/g, "-"))
            }
            placeholder="template-key"
          />
          <select
            value={industry}
            onChange={(event) =>
              setIndustry(event.target.value as (typeof TEMPLATE_INDUSTRIES)[number])
            }
            className="h-10 rounded-md border border-white/[0.12] bg-background px-3 text-sm"
          >
            {TEMPLATE_INDUSTRIES.map((industryOption) => (
              <option key={industryOption} value={industryOption}>
                {industryOption}
              </option>
            ))}
          </select>
          <Button
            onClick={handleCreateTemplate}
            disabled={createTemplate.isPending || !name.trim() || !key.trim()}
          >
            {createTemplate.isPending ? "Creating..." : "Create Draft"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Templates
          </CardTitle>
          <CardDescription>
            {isLoading
              ? "Loading templates..."
              : `${sortedTemplates.length} template${sortedTemplates.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading templates...</div>
          ) : sortedTemplates.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No templates found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06]">
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Version</TableHead>
                  <TableHead>Published</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTemplates.map((template) => (
                  <TableRow
                    key={template.id}
                    className="cursor-pointer border-white/[0.06] transition-colors hover:bg-white/[0.02]"
                    onClick={() => router.push(`/admin/templates/${template.id}`)}
                  >
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-white/[0.05] px-1.5 py-0.5 text-xs">
                        {template.key}
                      </code>
                    </TableCell>
                    <TableCell>{template.industry}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusClasses[template.status] ?? statusClasses.draft}
                      >
                        {template.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{template.currentVersion || "—"}</TableCell>
                    <TableCell>
                      {template.currentVersionPublished ? "Published" : "Not published"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
