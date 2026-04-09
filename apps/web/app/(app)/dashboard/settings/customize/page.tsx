"use client";

import { useEffect, useMemo, useState } from "react";
import {
  isAllowedAdminWidgetType,
  isAllowedMemberBlockType,
} from "@timeo/shared";
import {
  useResetTenantUiConfig,
  useTenantUiConfig,
  useUpdateTenantUiConfig,
} from "@timeo/api-client";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@timeo/ui/web";
import { ArrowDown, ArrowUp, RefreshCcw, Save } from "lucide-react";

type ItemWithHidden = {
  id: string;
  hidden?: boolean;
  [key: string]: unknown;
};

type MemberBlock = ItemWithHidden & { type: string };
type MemberPage = ItemWithHidden & { blocks?: MemberBlock[] };
type MemberConfig = {
  navigation?: ItemWithHidden[];
  pages?: MemberPage[];
  [key: string]: unknown;
};

type AdminWidget = ItemWithHidden & { type: string };
type AdminPage = ItemWithHidden & { widgets?: AdminWidget[] };
type AdminConfig = {
  menu?: ItemWithHidden[];
  pages?: AdminPage[];
  [key: string]: unknown;
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function moveItem<T>(items: T[], index: number, delta: -1 | 1) {
  const targetIndex = index + delta;
  if (targetIndex < 0 || targetIndex >= items.length) {
    return items;
  }

  const next = [...items];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

function setItemVisible<T extends ItemWithHidden>(item: T, visible: boolean): T {
  if (visible) {
    const { hidden, ...rest } = item;
    void hidden;
    return rest as T;
  }

  return {
    ...item,
    hidden: true,
  };
}

function visibilityLabel(hidden?: boolean) {
  return hidden ? "Hidden" : "Visible";
}

export default function CustomizeUiConfigPage() {
  const { tenantId } = useTenantId();

  const memberQuery = useTenantUiConfig(tenantId, "member");
  const adminQuery = useTenantUiConfig(tenantId, "admin");
  const updateMember = useUpdateTenantUiConfig(tenantId, "member");
  const updateAdmin = useUpdateTenantUiConfig(tenantId, "admin");
  const resetUiConfig = useResetTenantUiConfig(tenantId);

  const [memberDraft, setMemberDraft] = useState<MemberConfig | null>(null);
  const [adminDraft, setAdminDraft] = useState<AdminConfig | null>(null);

  useEffect(() => {
    if (!memberQuery.data?.resolved) {
      return;
    }

    setMemberDraft(cloneJson(memberQuery.data.resolved as MemberConfig));
  }, [memberQuery.data?.revision, memberQuery.data?.resolved]);

  useEffect(() => {
    if (!adminQuery.data?.resolved) {
      return;
    }

    setAdminDraft(cloneJson(adminQuery.data.resolved as AdminConfig));
  }, [adminQuery.data?.revision, adminQuery.data?.resolved]);

  const memberNavigation = useMemo(
    () => memberDraft?.navigation ?? [],
    [memberDraft],
  );
  const memberPages = useMemo(() => memberDraft?.pages ?? [], [memberDraft]);

  const adminMenu = useMemo(() => adminDraft?.menu ?? [], [adminDraft]);
  const adminPages = useMemo(() => adminDraft?.pages ?? [], [adminDraft]);

  async function saveMemberConfig() {
    if (!memberDraft) {
      return;
    }

    try {
      await updateMember.mutateAsync(memberDraft);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save member config");
    }
  }

  async function saveAdminConfig() {
    if (!adminDraft) {
      return;
    }

    try {
      await updateAdmin.mutateAsync(adminDraft);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save admin config");
    }
  }

  async function resetScope(scope: "member" | "admin") {
    try {
      await resetUiConfig.mutateAsync(scope);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reset config");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customize UI</h1>
        <p className="mt-1 text-muted-foreground">
          Configure member portal and admin panel structure for this tenant.
        </p>
      </div>

      <Tabs defaultValue="member" className="space-y-4">
        <TabsList>
          <TabsTrigger value="member">Member Portal</TabsTrigger>
          <TabsTrigger value="admin">Admin Panel</TabsTrigger>
        </TabsList>

        <TabsContent value="member" className="space-y-4">
          <Card className="glass border-white/[0.08]">
            <CardHeader>
              <CardTitle>Resolved Member Config</CardTitle>
              <CardDescription>Read-only resolved runtime config.</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[260px] overflow-auto rounded-md border border-white/[0.12] bg-background p-3 text-xs">
                {JSON.stringify(memberQuery.data?.resolved ?? {}, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card className="glass border-white/[0.08]">
            <CardHeader>
              <CardTitle>Navigation</CardTitle>
              <CardDescription>
                Toggle visibility and reorder top-level member navigation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {memberNavigation.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded border border-white/[0.08] p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{item.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {visibilityLabel(item.hidden)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!item.hidden}
                      onChange={(event) => {
                        setMemberDraft((current) => {
                          if (!current?.navigation) {
                            return current;
                          }

                          const nextNavigation = [...current.navigation];
                          nextNavigation[index] = setItemVisible(
                            nextNavigation[index],
                            event.target.checked,
                          );

                          return {
                            ...current,
                            navigation: nextNavigation,
                          };
                        });
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setMemberDraft((current) => {
                          if (!current?.navigation) {
                            return current;
                          }

                          return {
                            ...current,
                            navigation: moveItem(current.navigation, index, -1),
                          };
                        })
                      }
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setMemberDraft((current) => {
                          if (!current?.navigation) {
                            return current;
                          }

                          return {
                            ...current,
                            navigation: moveItem(current.navigation, index, 1),
                          };
                        })
                      }
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass border-white/[0.08]">
            <CardHeader>
              <CardTitle>Pages & Blocks</CardTitle>
              <CardDescription>
                Toggle visibility and reorder pages and their blocks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {memberPages.map((page, pageIndex) => (
                <div key={page.id} className="rounded border border-white/[0.08] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{page.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {visibilityLabel(page.hidden)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!page.hidden}
                        onChange={(event) => {
                          setMemberDraft((current) => {
                            if (!current?.pages) {
                              return current;
                            }

                            const nextPages = [...current.pages];
                            nextPages[pageIndex] = setItemVisible(
                              nextPages[pageIndex],
                              event.target.checked,
                            );

                            return {
                              ...current,
                              pages: nextPages,
                            };
                          });
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setMemberDraft((current) => {
                            if (!current?.pages) {
                              return current;
                            }

                            return {
                              ...current,
                              pages: moveItem(current.pages, pageIndex, -1),
                            };
                          })
                        }
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setMemberDraft((current) => {
                            if (!current?.pages) {
                              return current;
                            }

                            return {
                              ...current,
                              pages: moveItem(current.pages, pageIndex, 1),
                            };
                          })
                        }
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-white/[0.08] pt-2">
                    {(page.blocks ?? []).map((block, blockIndex) => (
                      (() => {
                        const isSupportedType = isAllowedMemberBlockType(block.type);

                        return (
                      <div
                        key={block.id}
                        className="flex items-center justify-between rounded border border-white/[0.06] px-3 py-2"
                      >
                        <div>
                          <p className="text-xs font-medium">{block.id}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                isSupportedType
                                  ? ""
                                  : "border-red-500/40 text-red-300"
                              }`}
                            >
                              {block.type}
                            </Badge>
                            {!isSupportedType && (
                              <span className="text-[10px] text-red-300">
                                unsupported type
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {visibilityLabel(block.hidden)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!block.hidden}
                            disabled={!isSupportedType}
                            onChange={(event) => {
                              setMemberDraft((current) => {
                                if (!current?.pages) {
                                  return current;
                                }

                                const nextPages = [...current.pages];
                                const targetPage = nextPages[pageIndex];
                                const nextBlocks = [...(targetPage.blocks ?? [])];
                                nextBlocks[blockIndex] = setItemVisible(
                                  nextBlocks[blockIndex],
                                  event.target.checked,
                                );

                                nextPages[pageIndex] = {
                                  ...targetPage,
                                  blocks: nextBlocks,
                                };

                                return {
                                  ...current,
                                  pages: nextPages,
                                };
                              });
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={!isSupportedType}
                            onClick={() => {
                              setMemberDraft((current) => {
                                if (!current?.pages) {
                                  return current;
                                }

                                const nextPages = [...current.pages];
                                const targetPage = nextPages[pageIndex];
                                nextPages[pageIndex] = {
                                  ...targetPage,
                                  blocks: moveItem(
                                    targetPage.blocks ?? [],
                                    blockIndex,
                                    -1,
                                  ),
                                };

                                return {
                                  ...current,
                                  pages: nextPages,
                                };
                              });
                            }}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={!isSupportedType}
                            onClick={() => {
                              setMemberDraft((current) => {
                                if (!current?.pages) {
                                  return current;
                                }

                                const nextPages = [...current.pages];
                                const targetPage = nextPages[pageIndex];
                                nextPages[pageIndex] = {
                                  ...targetPage,
                                  blocks: moveItem(
                                    targetPage.blocks ?? [],
                                    blockIndex,
                                    1,
                                  ),
                                };

                                return {
                                  ...current,
                                  pages: nextPages,
                                };
                              });
                            }}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                        );
                      })()
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => resetScope("member")}
              disabled={resetUiConfig.isPending}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reset Member Config
            </Button>
            <Button
              onClick={saveMemberConfig}
              disabled={updateMember.isPending || !memberDraft}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Member Config
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
          <Card className="glass border-white/[0.08]">
            <CardHeader>
              <CardTitle>Resolved Admin Config</CardTitle>
              <CardDescription>Read-only resolved runtime config.</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[260px] overflow-auto rounded-md border border-white/[0.12] bg-background p-3 text-xs">
                {JSON.stringify(adminQuery.data?.resolved ?? {}, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card className="glass border-white/[0.08]">
            <CardHeader>
              <CardTitle>Menu</CardTitle>
              <CardDescription>
                Toggle visibility and reorder admin menu entries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {adminMenu.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded border border-white/[0.08] p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{item.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {visibilityLabel(item.hidden)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!item.hidden}
                      onChange={(event) => {
                        setAdminDraft((current) => {
                          if (!current?.menu) {
                            return current;
                          }

                          const nextMenu = [...current.menu];
                          nextMenu[index] = setItemVisible(
                            nextMenu[index],
                            event.target.checked,
                          );

                          return {
                            ...current,
                            menu: nextMenu,
                          };
                        });
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setAdminDraft((current) => {
                          if (!current?.menu) {
                            return current;
                          }

                          return {
                            ...current,
                            menu: moveItem(current.menu, index, -1),
                          };
                        })
                      }
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setAdminDraft((current) => {
                          if (!current?.menu) {
                            return current;
                          }

                          return {
                            ...current,
                            menu: moveItem(current.menu, index, 1),
                          };
                        })
                      }
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass border-white/[0.08]">
            <CardHeader>
              <CardTitle>Pages & Widgets</CardTitle>
              <CardDescription>
                Toggle visibility and reorder pages and widgets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {adminPages.map((page, pageIndex) => (
                <div key={page.id} className="rounded border border-white/[0.08] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{page.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {visibilityLabel(page.hidden)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!page.hidden}
                        onChange={(event) => {
                          setAdminDraft((current) => {
                            if (!current?.pages) {
                              return current;
                            }

                            const nextPages = [...current.pages];
                            nextPages[pageIndex] = setItemVisible(
                              nextPages[pageIndex],
                              event.target.checked,
                            );

                            return {
                              ...current,
                              pages: nextPages,
                            };
                          });
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setAdminDraft((current) => {
                            if (!current?.pages) {
                              return current;
                            }

                            return {
                              ...current,
                              pages: moveItem(current.pages, pageIndex, -1),
                            };
                          })
                        }
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setAdminDraft((current) => {
                            if (!current?.pages) {
                              return current;
                            }

                            return {
                              ...current,
                              pages: moveItem(current.pages, pageIndex, 1),
                            };
                          })
                        }
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-white/[0.08] pt-2">
                    {(page.widgets ?? []).map((widget, widgetIndex) => (
                      (() => {
                        const isSupportedType = isAllowedAdminWidgetType(widget.type);

                        return (
                      <div
                        key={widget.id}
                        className="flex items-center justify-between rounded border border-white/[0.06] px-3 py-2"
                      >
                        <div>
                          <p className="text-xs font-medium">{widget.id}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                isSupportedType
                                  ? ""
                                  : "border-red-500/40 text-red-300"
                              }`}
                            >
                              {widget.type}
                            </Badge>
                            {!isSupportedType && (
                              <span className="text-[10px] text-red-300">
                                unsupported type
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {visibilityLabel(widget.hidden)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!widget.hidden}
                            disabled={!isSupportedType}
                            onChange={(event) => {
                              setAdminDraft((current) => {
                                if (!current?.pages) {
                                  return current;
                                }

                                const nextPages = [...current.pages];
                                const targetPage = nextPages[pageIndex];
                                const nextWidgets = [...(targetPage.widgets ?? [])];
                                nextWidgets[widgetIndex] = setItemVisible(
                                  nextWidgets[widgetIndex],
                                  event.target.checked,
                                );

                                nextPages[pageIndex] = {
                                  ...targetPage,
                                  widgets: nextWidgets,
                                };

                                return {
                                  ...current,
                                  pages: nextPages,
                                };
                              });
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={!isSupportedType}
                            onClick={() => {
                              setAdminDraft((current) => {
                                if (!current?.pages) {
                                  return current;
                                }

                                const nextPages = [...current.pages];
                                const targetPage = nextPages[pageIndex];
                                nextPages[pageIndex] = {
                                  ...targetPage,
                                  widgets: moveItem(
                                    targetPage.widgets ?? [],
                                    widgetIndex,
                                    -1,
                                  ),
                                };

                                return {
                                  ...current,
                                  pages: nextPages,
                                };
                              });
                            }}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={!isSupportedType}
                            onClick={() => {
                              setAdminDraft((current) => {
                                if (!current?.pages) {
                                  return current;
                                }

                                const nextPages = [...current.pages];
                                const targetPage = nextPages[pageIndex];
                                nextPages[pageIndex] = {
                                  ...targetPage,
                                  widgets: moveItem(
                                    targetPage.widgets ?? [],
                                    widgetIndex,
                                    1,
                                  ),
                                };

                                return {
                                  ...current,
                                  pages: nextPages,
                                };
                              });
                            }}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                        );
                      })()
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => resetScope("admin")}
              disabled={resetUiConfig.isPending}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reset Admin Config
            </Button>
            <Button
              onClick={saveAdminConfig}
              disabled={updateAdmin.isPending || !adminDraft}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Admin Config
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
