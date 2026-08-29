import { DocumentsWorkspace } from "@/components/documents";

export default function Documentos() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Documentos</h1>
        <p className="text-muted-foreground">Arquivos, evidências e versões de toda a operação em um só lugar.</p>
      </div>
      <DocumentsWorkspace />
    </div>
  );
}
