import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Search, User, Loader2, X, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemberProfile {
  id: string;
  name: string;
  email: string | null;
  phone_number: string | null;
  member_id: string | null;
  avatar_url: string | null;
}

interface MemberSearchSelectProps {
  value: MemberProfile | null;
  onChange: (member: MemberProfile | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MemberSearchSelect({ value, onChange, disabled, placeholder = "Search for a gym member..." }: MemberSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MemberProfile[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Search members when query changes
  useEffect(() => {
    const searchMembers = async () => {
      if (search.length < 2) {
        setResults([]);
        return;
      }
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email, phone_number, member_id, avatar_url')
          .or(`name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%,member_id.ilike.%${search}%`)
          .limit(15);
        
        if (error) throw error;
        setResults(data || []);
      } catch (error) {
        console.error('Error searching members:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    
    const debounce = setTimeout(searchMembers, 300);
    return () => clearTimeout(debounce);
  }, [search]);
  
  const handleSelect = (member: MemberProfile) => {
    onChange(member);
    setIsOpen(false);
    setSearch('');
    setResults([]);
  };
  
  const handleClear = () => {
    onChange(null);
    setSearch('');
  };
  
  // If a member is selected, show their info
  if (value) {
    return (
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
        {value.avatar_url ? (
          <img src={value.avatar_url} alt={value.name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{value.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {value.member_id && <Badge variant="outline" className="text-xs">{value.member_id}</Badge>}
            {value.email && <span className="truncate">{value.email}</span>}
          </div>
        </div>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }
  
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          className="pl-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      
      {isOpen && (search.length >= 2 || results.length > 0) && (
        <div className="absolute z-[250] mt-1 w-full bg-popover border border-border rounded-md shadow-lg">
          <ScrollArea className="max-h-[200px]">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                <p className="text-sm">Searching...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <User className="h-5 w-5 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {search.length < 2 ? 'Type at least 2 characters to search' : 'No members found'}
                </p>
              </div>
            ) : (
              <div className="p-1">
                {results.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleSelect(member)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-md text-left",
                      "hover:bg-accent transition-colors"
                    )}
                  >
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{member.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {member.member_id && <span className="font-mono">{member.member_id}</span>}
                        {member.phone_number && <span>• {member.phone_number}</span>}
                      </div>
                    </div>
                    <CheckCircle className="h-4 w-4 text-emerald-500 opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
