import { useState, useEffect, useRef } from 'react';
import { GymLayout } from '@/components/layout/GymLayout';
import { MemberTabNav } from '@/components/admin/MemberTabNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FileText, ArrowLeft, Variable } from 'lucide-react';
import { format } from 'date-fns';

interface DocumentTemplate {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  require_signature: boolean;
  created_at: string;
  updated_at: string;
  signature_count?: number;
  member_count?: number;
}

const PLACEHOLDERS = [
  { key: '{first_name}', label: 'First name' },
  { key: '{name}', label: 'Full name' },
  { key: '{dob}', label: 'Date of birth' },
  { key: '{address}', label: 'Member address' },
  { key: '{phone}', label: 'Phone number' },
  { key: '{contact_name}', label: 'Emergency contact (if member has any)' },
  { key: '{contact_phone}', label: 'Emergency contact phone' },
  { key: '{contact_relation}', label: 'Emergency contact relation' },
  { key: '{sign_date}', label: 'Date document was signed (if applicable)' },
  { key: '{sign_name}', label: 'Name of the member or guardian signing the document (if applicable)' },
  { key: '{initials}', label: 'Member clicks to add their initials' },
  { key: '{checkbox}', label: 'A box the member can optionally check' },
  { key: '{input}', label: 'Text input' },
  { key: '{input required}', label: 'Required text input' },
  { key: '{file}', label: 'File upload' },
  { key: '{file required}', label: 'Required file upload' },
  { key: '{login_link}', label: 'Members portal link' },
];

export default function MemberDocuments() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    is_active: true,
    require_signature: true,
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data: templatesData, error: templatesError } = await supabase
        .from('document_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;

      const templatesWithCounts = await Promise.all(
        (templatesData || []).map(async (template) => {
          const { count: signatureCount } = await supabase
            .from('member_document_signatures')
            .select('*', { count: 'exact', head: true })
            .eq('document_id', template.id);

          const { data: memberData } = await supabase
            .from('member_document_signatures')
            .select('member_id')
            .eq('document_id', template.id);

          const uniqueMembers = new Set(memberData?.map(s => s.member_id) || []);

          return {
            ...template,
            signature_count: signatureCount || 0,
            member_count: uniqueMembers.size,
          };
        })
      );

      setTemplates(templatesWithCounts);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load document templates');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditor = (template?: DocumentTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        title: template.title,
        content: template.content,
        is_active: template.is_active,
        require_signature: template.require_signature,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        title: '',
        content: '',
        is_active: true,
        require_signature: true,
      });
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a document title');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('Please enter document content');
      return;
    }

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('document_templates')
          .update({
            title: formData.title,
            content: formData.content,
            is_active: formData.is_active,
            require_signature: formData.require_signature,
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast.success('Document template updated');
      } else {
        const { error } = await supabase
          .from('document_templates')
          .insert({
            title: formData.title,
            content: formData.content,
            is_active: formData.is_active,
            require_signature: formData.require_signature,
          });

        if (error) throw error;
        toast.success('Document template created');
      }

      setIsEditing(false);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save document template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document template?')) return;

    try {
      const { error } = await supabase
        .from('document_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Document template deleted');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete document template');
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;
    const newText = text.substring(0, start) + placeholder + text.substring(end);
    
    setFormData({ ...formData, content: newText });
    
    // Set cursor position after the inserted placeholder
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  // Editor View
  if (isEditing) {
    return (
      <GymLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {editingTemplate ? 'Edit Document Template' : 'New Document Template'}
                </h1>
                <p className="text-muted-foreground text-sm">WS Fitness</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Editor */}
            <div className="lg:col-span-3 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Document Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Document Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Liability Waiver, Membership Agreement"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="text-lg"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="content">Document Content</Label>
                    <Textarea
                      ref={textareaRef}
                      id="content"
                      placeholder="Enter the waiver or contract text here. Use placeholders like {first_name} to personalize the document..."
                      rows={20}
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      className="font-mono text-sm leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="require_signature"
                        checked={formData.require_signature}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, require_signature: checked })
                        }
                      />
                      <div>
                        <Label htmlFor="require_signature" className="cursor-pointer">
                          Signature Needed
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Members must sign this document
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, is_active: checked })
                        }
                      />
                      <div>
                        <Label htmlFor="is_active" className="cursor-pointer">
                          Active
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Show to members
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Placeholder Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Member Information Placeholders
                  </CardTitle>
                  <CardDescription className="text-xs">
                    You can add placeholders for member information in the document text, such as name, date of birth and address to be automatically filled out when you add this document to a member. All placeholders must have curly braces on both sides - {'{...}'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 max-h-[500px] overflow-y-auto">
                  {PLACEHOLDERS.map((placeholder) => (
                    <button
                      key={placeholder.key}
                      onClick={() => insertPlaceholder(placeholder.key)}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-primary/10 transition-colors text-sm"
                    >
                      <code className="text-primary font-mono text-xs">{placeholder.key}</code>
                      <span className="text-muted-foreground"> - {placeholder.label}</span>
                    </button>
                  ))}
                  <p className="text-xs text-muted-foreground pt-3 border-t mt-3">
                    For memberships/trials that convert to a new membership at the end of the term, add "converted_" at the beginning of the placeholder. For example, {'{converted_total_amount}'} - for the total cost of the converted membership
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </GymLayout>
    );
  }

  // List View
  return (
    <GymLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Members</h1>
            <p className="text-muted-foreground text-sm">WS Fitness</p>
          </div>
        </div>

        <MemberTabNav />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Member Documents</CardTitle>
              <CardDescription>
                Create templates for documents such as contracts and liability waivers.
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenEditor()} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              New Document Template
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No document templates yet. Create your first template to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Signatures</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <button
                          onClick={() => handleOpenEditor(template)}
                          className="text-primary font-medium hover:underline cursor-pointer text-left"
                        >
                          {template.title}
                        </button>
                      </TableCell>
                      <TableCell>{template.member_count}</TableCell>
                      <TableCell>{template.signature_count}</TableCell>
                      <TableCell>{format(new Date(template.updated_at), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditor(template)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(template.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </GymLayout>
  );
}
