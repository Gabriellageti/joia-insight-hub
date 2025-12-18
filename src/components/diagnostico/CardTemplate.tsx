import { MoreHorizontal, Sparkles } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DiagnosticTemplate } from "@/types";

interface CardTemplateProps {
  template: DiagnosticTemplate;
  onApply: (template: DiagnosticTemplate) => void;
  onEdit: (template: DiagnosticTemplate) => void;
  onDuplicate: (template: DiagnosticTemplate) => void;
  onDelete: (template: DiagnosticTemplate) => void;
}

export function CardTemplate({ template, onApply, onEdit, onDuplicate, onDelete }: CardTemplateProps) {
  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-lg leading-tight">{template.name}</CardTitle>
            <div className="flex flex-wrap gap-2">
              {template.tags?.map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-accent/10 text-accent-foreground">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onDuplicate(template)}>Duplicar</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(template)}>Editar</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(template)}>
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Seções</Badge>
          <span>{template.sectionsCount ?? template.sections?.length ?? 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Perguntas</Badge>
          <span>
            {template.questionCount ?? template.sections?.reduce((count, section) => count + (section.questions?.length || 0), 0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Tempo</Badge>
          <span>{template.estimatedTimeMinutes ? `${template.estimatedTimeMinutes} min` : "Tempo: não definido"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Versão</Badge>
          <span>{template.version || "-"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Atualizado em</Badge>
          <span>{template.updatedAt || "-"}</span>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between pt-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span>Pronto para aplicar</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onEdit(template)}>
            Editar
          </Button>
          <Button onClick={() => onApply(template)}>Aplicar</Button>
        </div>
      </CardFooter>
    </Card>
  );
}
