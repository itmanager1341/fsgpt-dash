
import React, { useState } from 'react';
import { Search, Filter, Plus, Move, FileText, Presentation, Mic, FileCheck, BarChart, FileAudio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useKnowledgeItems, KnowledgeItem } from '@/hooks/useKnowledgeItems';
import { formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import AudioUploadDialog from './AudioUploadDialog';
import TemplateUploadDialog from './TemplateUploadDialog';
import KnowledgeItemDetailPane from './KnowledgeItemDetailPane';
import { cn } from '@/lib/utils';

interface FSGKnowledgeTableProps {
  categoryId?: string;
  subcategoryId?: string | null;
}

const FSGKnowledgeTable = ({ 
  categoryId = 'personal_collection', 
  subcategoryId = 'overview' 
}: FSGKnowledgeTableProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [audioUploadDialogOpen, setAudioUploadDialogOpen] = useState(false);
  const [templateUploadDialogOpen, setTemplateUploadDialogOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState<string>('');
  
  // Fix category filtering - ensure we get the right items
  const actualCategoryId = categoryId === 'overview' ? undefined : categoryId;
  const actualSubcategoryId = subcategoryId === 'overview' ? undefined : subcategoryId;
  
  const { data: knowledgeItems = [], isLoading } = useKnowledgeItems(
    actualCategoryId,
    actualSubcategoryId
  );

  const getContentTypeIcon = (contentType: string) => {
    const iconMap = {
      'document': FileText,
      'presentation': Presentation,
      'recording': Mic,
      'template': FileCheck,
      'guideline': FileCheck,
      'report': BarChart,
      'audio': FileAudio,
    };
    return iconMap[contentType as keyof typeof iconMap] || FileText;
  };

  const getClassificationColor = (level: string) => {
    const colorMap = {
      'public': 'bg-green-100 text-green-800',
      'internal': 'bg-blue-100 text-blue-800',
      'confidential': 'bg-red-100 text-red-800',
    };
    return colorMap[level as keyof typeof colorMap] || 'bg-gray-100 text-gray-800';
  };

  const getProcessingStatusColor = (status: string) => {
    const colorMap = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'processing': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
    };
    return colorMap[status as keyof typeof colorMap] || 'bg-gray-100 text-gray-800';
  };

  const filteredItems = searchQuery 
    ? knowledgeItems.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.transcript_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : knowledgeItems;

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(itemId => itemId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleRowClick = (item: KnowledgeItem) => {
    setSelectedItem(item);
  };

  const handleMoveItems = () => {
    if (!targetCategory) return;
    
    toast.success(`Moved ${selectedItems.length} items to ${targetCategory}`);
    setSelectedItems([]);
    setMoveDialogOpen(false);
    setTargetCategory('');
  };

  const categoryOptions = [
    { id: 'company_resources', name: 'Company Resources' },
    { id: 'department_library', name: 'Department Library' },
    { id: 'project_workspace', name: 'Project Workspace' },
    { id: 'personal_collection', name: 'Personal Collection' },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading knowledge items...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Search knowledge base..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {selectedItems.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setMoveDialogOpen(true)}>
              <Move size={16} className="mr-2" />
              Move ({selectedItems.length})
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Filter size={16} className="mr-2" />
            Filter
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus size={16} className="mr-2" />
                Add Item
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTemplateUploadDialogOpen(true)}>
                <FileCheck size={16} className="mr-2" />
                Create Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAudioUploadDialogOpen(true)}>
                <FileAudio size={16} className="mr-2" />
                Upload Audio
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText size={16} className="mr-2" />
                Upload Document
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Presentation size={16} className="mr-2" />
                Upload Presentation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 overflow-auto">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FileText size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No knowledge items found</p>
              <p>Add documents, presentations, or other resources to get started.</p>
              {categoryId !== 'personal_collection' && (
                <p className="text-sm mt-2">
                  Items uploaded will appear in "{categoryId?.replace('_', ' ')}" by default.
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const ContentIcon = getContentTypeIcon(item.content_type);
                  const isSelected = selectedItems.includes(item.id);
                  const isDetailSelected = selectedItem?.id === item.id;
                  
                  return (
                    <TableRow 
                      key={item.id}
                      className={cn(
                        "cursor-pointer",
                        isSelected && "bg-muted/50",
                        isDetailSelected && "bg-primary/10 border-primary/20"
                      )}
                      onClick={() => handleRowClick(item)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectItem(item.id)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <ContentIcon size={16} className="text-muted-foreground" />
                          <div>
                            <div className="font-medium">{item.title}</div>
                            {item.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {item.description}
                              </div>
                            )}
                            {item.tags && item.tags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {item.tags.slice(0, 3).map((tag, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {item.content_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.department && (
                          <Badge variant="secondary" className="capitalize">
                            {item.department}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getClassificationColor(item.classification_level)}>
                          {item.classification_level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getProcessingStatusColor(item.processing_status)}>
                          {item.processing_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Detail pane */}
        {selectedItem && (
          <KnowledgeItemDetailPane
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </div>

      <AudioUploadDialog
        open={audioUploadDialogOpen}
        onOpenChange={setAudioUploadDialogOpen}
        onUploadComplete={(item) => {
          // Handle the uploaded item here
          console.log('Audio uploaded:', item);
          // You might want to refetch the knowledge items or add the item to the list
        }}
      />

      <TemplateUploadDialog
        open={templateUploadDialogOpen}
        onOpenChange={setTemplateUploadDialogOpen}
        onUploadComplete={() => {
          // Refetch knowledge items when template is created
        }}
      />

      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move to Category</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Select onValueChange={setTargetCategory} value={targetCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select target category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map(option => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMoveItems} disabled={!targetCategory}>
              Move Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FSGKnowledgeTable;
