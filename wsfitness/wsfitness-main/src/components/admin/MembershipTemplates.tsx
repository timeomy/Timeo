import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarCheck, Repeat, Flag, Ticket } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  planType: string;
}

const templates: Template[] = [
  {
    id: '3x-week',
    name: '3x Week',
    description: 'Membership offering 3 sessions per week with monthly recurring billing.',
    icon: <Repeat className="h-5 w-5" />,
    planType: '3x_week',
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    description: 'Membership offering unlimited sessions with monthly recurring billing.',
    icon: <CalendarCheck className="h-5 w-5" />,
    planType: 'unlimited',
  },
  {
    id: 'training-camp',
    name: 'Training Camp',
    description: 'A limited capacity membership that runs between 2 specific dates.',
    icon: <Flag className="h-5 w-5" />,
    planType: 'training_camp',
  },
  {
    id: '10-class',
    name: '10 Class Punch Card',
    description: 'Membership offering access to 10 classes with a single payment.',
    icon: <Ticket className="h-5 w-5" />,
    planType: '10_class',
  },
];

interface MembershipTemplatesProps {
  onSelectTemplate: (template: Template) => void;
}

export function MembershipTemplates({ onSelectTemplate }: MembershipTemplatesProps) {
  return (
    <div className="space-y-6">
      <p className="text-center text-muted-foreground">Or use an example template:</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {templates.map((template) => (
          <Card 
            key={template.id}
            className="bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors"
            onClick={() => onSelectTemplate(template)}
          >
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg">{template.name}</h3>
              <p className="text-sm text-primary-foreground/80 mt-1">{template.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export type { Template };
