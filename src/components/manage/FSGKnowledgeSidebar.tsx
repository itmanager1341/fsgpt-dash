
import React from 'react';
import { Building, Users, Folder, User, Megaphone, Settings, Target, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKnowledgeCategories } from '@/hooks/useKnowledgeItems';

interface FSGKnowledgeSidebarProps {
  onCategorySelect: (categoryId: string, subcategoryId: string | null) => void;
  selectedCategoryId: string;
  selectedSubcategoryId: string | null;
}

const FSGKnowledgeSidebar = ({ 
  onCategorySelect, 
  selectedCategoryId = 'personal_collection', 
  selectedSubcategoryId = 'overview' 
}: FSGKnowledgeSidebarProps) => {
  const { data: categories = [] } = useKnowledgeCategories();

  const getIconComponent = (iconName?: string) => {
    const iconMap = {
      'building': Building,
      'users': Users,
      'folder': Folder,
      'user': User,
      'megaphone': Megaphone,
      'settings': Settings,
      'target': Target,
      'dollar-sign': DollarSign,
    };
    
    const IconComponent = iconName ? iconMap[iconName as keyof typeof iconMap] : Folder;
    return IconComponent || Folder;
  };

  const getColorClass = (categoryName: string) => {
    const colorMap = {
      'Company Resources': 'text-blue-500',
      'Department Libraries': 'text-green-500', 
      'Project Workspaces': 'text-purple-500',
      'Personal Collections': 'text-amber-500',
      'Marketing': 'text-pink-500',
      'Operations': 'text-gray-500',
      'Strategy': 'text-red-500',
      'HR': 'text-orange-500',
      'Finance': 'text-emerald-500',
    };
    return colorMap[categoryName as keyof typeof colorMap] || 'text-gray-500';
  };

  const mainCategories = categories.filter(cat => !cat.parent_category);
  const subCategories = categories.filter(cat => cat.parent_category);

  const handleCategoryClick = (categoryKey: string) => {
    onCategorySelect(categoryKey, null);
  };

  const handleSubcategoryClick = (categoryKey: string, subcategoryKey: string) => {
    onCategorySelect(categoryKey, subcategoryKey);
  };

  return (
    <div className="w-64 border-r border-border/50 overflow-y-auto shrink-0 bg-muted/20">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">FSG KNOWLEDGE HUB</h3>
        
        {mainCategories.map((category) => {
          const categoryKey = category.name.toLowerCase().replace(/\s+/g, '_');
          const IconComponent = getIconComponent(category.icon);
          const relatedSubcategories = subCategories.filter(sub => sub.parent_category === category.name);
          
          return (
            <div key={category.id} className="mb-6">
              <div 
                className={cn(
                  "flex items-center justify-between px-3 py-2 text-sm font-medium cursor-pointer rounded-lg transition-colors",
                  selectedCategoryId === categoryKey && !selectedSubcategoryId 
                    ? "bg-primary/10 text-primary" 
                    : "hover:bg-muted/50 text-foreground/80"
                )}
                onClick={() => handleCategoryClick(categoryKey)}
              >
                <div className="flex items-center gap-3">
                  <IconComponent size={16} className={getColorClass(category.name)} />
                  <span>{category.name}</span>
                </div>
              </div>
              
              {relatedSubcategories.length > 0 && (
                <div className="mt-2 ml-6">
                  {relatedSubcategories.map((subcategory) => {
                    const subcategoryKey = subcategory.name.toLowerCase();
                    const SubIconComponent = getIconComponent(subcategory.icon);
                    
                    return (
                      <div 
                        key={subcategory.id}
                        className={cn(
                          "flex items-center px-3 py-2 text-sm cursor-pointer rounded-lg transition-colors",
                          selectedCategoryId === 'department_library' && selectedSubcategoryId === subcategoryKey
                            ? "bg-primary/10 text-primary" 
                            : "hover:bg-muted/30 text-foreground/70"
                        )}
                        onClick={() => handleSubcategoryClick('department_library', subcategoryKey)}
                      >
                        <SubIconComponent size={14} className={cn("mr-2", getColorClass(subcategory.name))} />
                        <span>{subcategory.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FSGKnowledgeSidebar;
