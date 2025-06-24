
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

  // Create the main category mappings
  const mainCategoryMappings = [
    {
      id: 'company_resources',
      name: 'Company Resources',
      icon: 'building',
      description: 'Shared company-wide resources and documents'
    },
    {
      id: 'department_library', 
      name: 'Department Libraries',
      icon: 'users',
      description: 'Department-specific knowledge and resources'
    },
    {
      id: 'project_workspace',
      name: 'Project Workspaces', 
      icon: 'folder',
      description: 'Project-specific files and collaboration'
    },
    {
      id: 'personal_collection',
      name: 'Personal Collections',
      icon: 'user', 
      description: 'Your personal knowledge items and files'
    }
  ];

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
        
        {/* Main Categories - using our predefined structure */}
        {mainCategoryMappings.map((categoryMapping) => {
          const IconComponent = getIconComponent(categoryMapping.icon);
          const isSelected = selectedCategoryId === categoryMapping.id && !selectedSubcategoryId;
          
          // Get subcategories for department_library 
          const relatedSubcategories = categoryMapping.id === 'department_library' 
            ? subCategories.filter(sub => sub.parent_category === 'Department Libraries')
            : [];
          
          return (
            <div key={categoryMapping.id} className="mb-6">
              <div 
                className={cn(
                  "flex items-center justify-between px-3 py-2 text-sm font-medium cursor-pointer rounded-lg transition-colors",
                  isSelected
                    ? "bg-primary/10 text-primary" 
                    : "hover:bg-muted/50 text-foreground/80"
                )}
                onClick={() => handleCategoryClick(categoryMapping.id)}
              >
                <div className="flex items-center gap-3">
                  <IconComponent size={16} className={getColorClass(categoryMapping.name)} />
                  <span>{categoryMapping.name}</span>
                </div>
              </div>
              
              {/* Show subcategories for Department Libraries */}
              {relatedSubcategories.length > 0 && (
                <div className="mt-2 ml-6">
                  {relatedSubcategories.map((subcategory) => {
                    const subcategoryKey = subcategory.name.toLowerCase();
                    const SubIconComponent = getIconComponent(subcategory.icon);
                    const isSubSelected = selectedCategoryId === 'department_library' && selectedSubcategoryId === subcategoryKey;
                    
                    return (
                      <div 
                        key={subcategory.id}
                        className={cn(
                          "flex items-center px-3 py-2 text-sm cursor-pointer rounded-lg transition-colors",
                          isSubSelected
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
