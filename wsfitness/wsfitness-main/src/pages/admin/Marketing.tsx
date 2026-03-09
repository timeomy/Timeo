import { useState } from 'react';
import { GymLayout } from '@/components/layout/GymLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Megaphone, Users, Globe, Mail, MessageSquare, TrendingUp,
  Plus, Search, ExternalLink, Settings
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: 'new' | 'contacted' | 'interested' | 'converted';
  date: string;
}

const SAMPLE_LEADS: Lead[] = [
  { id: '1', name: 'Ahmad Razak', email: 'ahmad@email.com', phone: '+60123456789', source: 'Website', status: 'new', date: '2025-12-28' },
  { id: '2', name: 'Sarah Lee', email: 'sarah@email.com', phone: '+60187654321', source: 'Instagram', status: 'contacted', date: '2025-12-27' },
  { id: '3', name: 'Ravi Kumar', email: 'ravi@email.com', phone: '+60198765432', source: 'Referral', status: 'interested', date: '2025-12-26' },
  { id: '4', name: 'Michelle Tan', email: 'michelle@email.com', phone: '+60145678901', source: 'Facebook', status: 'converted', date: '2025-12-25' },
];

export default function Marketing() {
  const [search, setSearch] = useState('');
  const [leads] = useState<Lead[]>(SAMPLE_LEADS);

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(search.toLowerCase()) ||
    lead.email.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: Lead['status']) => {
    const styles = {
      new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      contacted: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      interested: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      converted: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };
    return <Badge className={styles[status]}>{status}</Badge>;
  };

  const stats = [
    { label: 'Total Leads', value: leads.length, icon: Users, color: 'text-blue-400' },
    { label: 'New This Week', value: leads.filter(l => l.status === 'new').length, icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Conversion Rate', value: '25%', icon: Megaphone, color: 'text-primary' },
  ];

  return (
    <GymLayout title="Marketing" subtitle="Manage leads and campaigns">
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="ios-card bg-card border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  {stat.label}
                </div>
                <p className={`text-2xl font-display ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Card className="ios-card bg-card border-border/50">
          <Tabs defaultValue="leads" className="w-full">
            <CardHeader className="pb-2">
              <TabsList className="bg-muted/30 w-full justify-start">
                <TabsTrigger value="leads" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Leads
                </TabsTrigger>
                <TabsTrigger value="campaigns" className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4" />
                  Campaigns
                </TabsTrigger>
                <TabsTrigger value="website" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Website
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="leads" className="mt-0 space-y-4">
                {/* Action Bar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search leads..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 bg-muted/30"
                    />
                  </div>
                  <Button variant="default" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Lead
                  </Button>
                </div>

                {/* Table */}
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((lead) => (
                        <TableRow key={lead.id} className="hover:bg-muted/20">
                          <TableCell className="font-medium">{lead.name}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="text-muted-foreground">{lead.email}</p>
                              <p className="text-muted-foreground text-xs">{lead.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{lead.source}</TableCell>
                          <TableCell>{getStatusBadge(lead.status)}</TableCell>
                          <TableCell className="text-muted-foreground">{lead.date}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="campaigns" className="mt-0">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="bg-muted/20 border-border/30">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        Email Campaigns
                      </CardTitle>
                      <CardDescription>Send newsletters and promotions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Campaign
                      </Button>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/20 border-border/30">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        SMS Campaigns
                      </CardTitle>
                      <CardDescription>Send text message promotions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Campaign
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="website" className="mt-0">
                <div className="space-y-4">
                  <Card className="bg-muted/20 border-border/30">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        Website Settings
                      </CardTitle>
                      <CardDescription>Manage your gym's landing page</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium">Public Website</p>
                          <p className="text-sm text-muted-foreground">wsfitness.my</p>
                        </div>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Visit
                        </Button>
                      </div>
                      <Button variant="default">
                        <Settings className="h-4 w-4 mr-2" />
                        Edit Website
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="mt-0">
                <div className="text-center py-12 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Marketing settings coming soon</p>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </GymLayout>
  );
}