import { Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentCategory, DOCUMENT_CATEGORIES } from "@/types/documents";
import { cn } from "@/lib/utils";

interface CategorySidebarProps {
  selectedCategory: DocumentCategory | "all";
  onCategoryChange: (category: DocumentCategory | "all") => void;
  categoryCounts: Record<string, number>;
}

export function CategorySidebar({
  selectedCategory,
  onCategoryChange,
  categoryCounts,
}: CategorySidebarProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm mb-3 text-foreground">Categorias</h3>
      {DOCUMENT_CATEGORIES.map((category) => (
        <Button
          key={category.id}
          variant={selectedCategory === category.id ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-start",
            selectedCategory === category.id && "bg-secondary"
          )}
          onClick={() => onCategoryChange(category.id)}
        >
          <Folder className="h-4 w-4 mr-2 shrink-0" />
          <span className="truncate flex-1 text-left">{category.name}</span>
          <Badge variant="outline" className="ml-2 shrink-0">
            {categoryCounts[category.id] ?? 0}
          </Badge>
        </Button>
      ))}
    </div>
  );
}
