import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FileText, DollarSign, Clock, Key, User, Users, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MembershipFormData {
  title: string;
  type: 'single' | 'family';
  document_id: string;
  available_signup: boolean;
  available_portal: boolean;
  can_book_sessions: boolean;
  pricing: 'free' | 'paid';
  price: number;
  duration: 'ongoing' | 'fixed' | 'sessions';
  duration_months: number;
  session_count: number;
  access_type: 'unlimited' | 'limited';
  sessions_per_week: number;
}

interface MembershipDetailsFormProps {
  initialData?: Partial<MembershipFormData>;
  onSave: (data: MembershipFormData) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

export function MembershipDetailsForm({ initialData, onSave, onCancel, saving }: MembershipDetailsFormProps) {
  const [formData, setFormData] = useState<MembershipFormData>({
    title: initialData?.title || '',
    type: initialData?.type || 'single',
    document_id: initialData?.document_id || '',
    available_signup: initialData?.available_signup ?? true,
    available_portal: initialData?.available_portal ?? true,
    can_book_sessions: initialData?.can_book_sessions ?? true,
    pricing: initialData?.pricing || 'free',
    price: initialData?.price || 0,
    duration: initialData?.duration || 'ongoing',
    duration_months: initialData?.duration_months || 1,
    session_count: initialData?.session_count || 10,
    access_type: initialData?.access_type || 'unlimited',
    sessions_per_week: initialData?.sessions_per_week || 3,
  });

  const handleSubmit = async () => {
    await onSave(formData);
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Accordion type="single" collapsible defaultValue="details" className="space-y-4">
        {/* Membership Details */}
        <AccordionItem value="details" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Membership Details</h3>
                <p className="text-sm text-muted-foreground">General membership details and settings.</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label className="uppercase text-xs font-medium text-muted-foreground">Title</Label>
                <Input
                  placeholder="Enter membership title ..."
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label className="uppercase text-xs font-medium text-muted-foreground">Type</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formData.type === 'single' ? 'default' : 'outline'}
                    className="flex-1 gap-2"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'single' }))}
                  >
                    <User className="h-4 w-4" />
                    Single Member
                  </Button>
                  <Button
                    type="button"
                    variant={formData.type === 'family' ? 'default' : 'outline'}
                    className="flex-1 gap-2"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'family' }))}
                  >
                    <Users className="h-4 w-4" />
                    Family Shared
                  </Button>
                </div>
                {formData.type === 'family' && (
                  <p className="text-xs text-muted-foreground">
                    * Family shared memberships are shared between every member in a family account.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-semibold">Documents</Label>
                  <p className="text-sm text-muted-foreground">Assign membership specific agreements and documents.</p>
                  <Select 
                    value={formData.document_id} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, document_id: v }))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No document required</SelectItem>
                      <SelectItem value="waiver">Liability Waiver</SelectItem>
                      <SelectItem value="terms">Terms & Conditions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label className="font-semibold">Additional Settings</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="available_signup"
                        checked={formData.available_signup}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({ ...prev, available_signup: checked as boolean }))
                        }
                      />
                      <label htmlFor="available_signup" className="text-sm cursor-pointer">
                        Available for selection on the sign-up form
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="available_portal"
                        checked={formData.available_portal}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({ ...prev, available_portal: checked as boolean }))
                        }
                      />
                      <label htmlFor="available_portal" className="text-sm cursor-pointer">
                        Available for selection in the member portal
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="can_book"
                        checked={formData.can_book_sessions}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({ ...prev, can_book_sessions: checked as boolean }))
                        }
                      />
                      <label htmlFor="can_book" className="text-sm cursor-pointer">
                        Members can book sessions
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Pricing */}
        <AccordionItem value="pricing" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-amber-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Pricing</h3>
                  <p className="text-sm text-muted-foreground">Set the pricing and discount options for the membership.</p>
                </div>
              </div>
              <span className="text-sm font-medium px-3 py-1 bg-muted rounded">
                {formData.pricing === 'free' ? 'FREE' : `RM${formData.price}`}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4 pt-4">
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={formData.pricing === 'free' ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, pricing: 'free', price: 0 }))}
                >
                  Free
                </Button>
                <Button
                  type="button"
                  variant={formData.pricing === 'paid' ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, pricing: 'paid' }))}
                >
                  Paid
                </Button>
              </div>
              {formData.pricing === 'paid' && (
                <div className="space-y-2">
                  <Label>Price (MYR)</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="bg-background max-w-xs"
                  />
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Duration */}
        <AccordionItem value="duration" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Duration</h3>
                  <p className="text-sm text-muted-foreground">Manage the length and renewal options for the memberships.</p>
                </div>
              </div>
              <span className="text-sm font-medium px-3 py-1 bg-muted rounded capitalize">
                {formData.duration === 'ongoing' ? 'Ongoing' : 
                 formData.duration === 'fixed' ? `${formData.duration_months} month(s)` :
                 `${formData.session_count} sessions`}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4 pt-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.duration === 'ongoing' ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, duration: 'ongoing' }))}
                >
                  Ongoing
                </Button>
                <Button
                  type="button"
                  variant={formData.duration === 'fixed' ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, duration: 'fixed' }))}
                >
                  Fixed Period
                </Button>
                <Button
                  type="button"
                  variant={formData.duration === 'sessions' ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, duration: 'sessions' }))}
                >
                  Session Count
                </Button>
              </div>
              {formData.duration === 'fixed' && (
                <div className="space-y-2">
                  <Label>Duration (months)</Label>
                  <Input
                    type="number"
                    value={formData.duration_months}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_months: parseInt(e.target.value) || 1 }))}
                    className="bg-background max-w-xs"
                    min={1}
                  />
                </div>
              )}
              {formData.duration === 'sessions' && (
                <div className="space-y-2">
                  <Label>Number of Sessions</Label>
                  <Input
                    type="number"
                    value={formData.session_count}
                    onChange={(e) => setFormData(prev => ({ ...prev, session_count: parseInt(e.target.value) || 10 }))}
                    className="bg-background max-w-xs"
                    min={1}
                  />
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Access To Training */}
        <AccordionItem value="access" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Key className="h-5 w-5 text-gray-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Access To Training</h3>
                  <p className="text-sm text-muted-foreground">Set program and class access for the membership.</p>
                </div>
              </div>
              <span className="text-sm font-medium px-3 py-1 bg-muted rounded capitalize">
                {formData.access_type === 'unlimited' ? 'Unlimited' : `${formData.sessions_per_week}x/week`}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4 pt-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.access_type === 'unlimited' ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, access_type: 'unlimited' }))}
                >
                  Unlimited
                </Button>
                <Button
                  type="button"
                  variant={formData.access_type === 'limited' ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, access_type: 'limited' }))}
                >
                  Limited per Week
                </Button>
              </div>
              {formData.access_type === 'limited' && (
                <div className="space-y-2">
                  <Label>Sessions per Week</Label>
                  <Input
                    type="number"
                    value={formData.sessions_per_week}
                    onChange={(e) => setFormData(prev => ({ ...prev, sessions_per_week: parseInt(e.target.value) || 3 }))}
                    className="bg-background max-w-xs"
                    min={1}
                  />
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex gap-2 justify-end pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving || !formData.title}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Membership
        </Button>
      </div>
    </div>
  );
}
