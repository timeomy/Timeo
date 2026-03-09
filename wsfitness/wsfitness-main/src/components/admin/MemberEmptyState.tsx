import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, FileSpreadsheet, Mail, BookOpen } from 'lucide-react';

// Card background color for Gymdesk-Dark theme
const CARD_BG = 'bg-[hsl(220,20%,11%)]';

interface MemberEmptyStateProps {
  onAddMember: () => void;
  onImportExcel: () => void;
  onInviteMembers: () => void;
}

export function MemberEmptyState({ onAddMember, onImportExcel, onInviteMembers }: MemberEmptyStateProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Add Member Card */}
      <Card className={`${CARD_BG} border-border/30 hover:border-primary/30 transition-colors`}>
        <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="p-4 rounded-md bg-primary/10">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Enter member information</h3>
            <p className="text-sm text-muted-foreground">
              Manually add a new member with their details
            </p>
          </div>
          <Button onClick={onAddMember} variant="default" className="w-full rounded-md">
            Add A Member
          </Button>
        </CardContent>
      </Card>

      {/* Learn More Card */}
      <Card className={`${CARD_BG} border-border/30 hover:border-secondary/30 transition-colors`}>
        <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="p-4 rounded-md bg-secondary/10">
            <BookOpen className="h-8 w-8 text-secondary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Have them fill out their information</h3>
            <p className="text-sm text-muted-foreground">
              Send a form link for members to complete
            </p>
          </div>
          <Button variant="outline" className="w-full rounded-md">
            Learn More
          </Button>
        </CardContent>
      </Card>

      {/* Import Excel Card */}
      <Card className={`${CARD_BG} border-border/30 hover:border-emerald-500/30 transition-colors`}>
        <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="p-4 rounded-md bg-emerald-500/10">
            <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Import existing members</h3>
            <p className="text-sm text-muted-foreground">
              Bulk import members from an Excel spreadsheet
            </p>
          </div>
          <Button onClick={onImportExcel} variant="outline" className="w-full rounded-md border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10">
            Import Excel
          </Button>
        </CardContent>
      </Card>

      {/* Invite Members Card */}
      <Card className={`${CARD_BG} border-border/30 hover:border-blue-500/30 transition-colors`}>
        <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="p-4 rounded-md bg-blue-500/10">
            <Mail className="h-8 w-8 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Invite members via Email</h3>
            <p className="text-sm text-muted-foreground">
              Send email invitations to join your gym
            </p>
          </div>
          <Button onClick={onInviteMembers} variant="outline" className="w-full rounded-md border-blue-500/30 text-blue-500 hover:bg-blue-500/10">
            Invite Members
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}