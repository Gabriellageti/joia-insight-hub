<TableCell className="font-medium">
  <div className="flex flex-col gap-0.5">
    <Link to={`/clientes/${client.id}`} className="hover:underline">
      {client.nomeFantasia || client.razaoSocial}
    </Link>
    <span className="text-sm text-muted-foreground">{client.razaoSocial}</span>
    {client.cnpj && <span className="text-xs text-muted-foreground">CNPJ: {client.cnpj}</span>}
  </div>
</TableCell>

<TableCell>
  {client.segmentoTags?.length ? (
    <div className="flex flex-wrap gap-1">
      {client.segmentoTags.map((tag, index) => (
        <Badge key={`${client.id}-segment-${index}`} variant="outline">
          {tag}
        </Badge>
      ))}
    </div>
  ) : (
    <span className="text-muted-foreground">-</span>
  )}
</TableCell>

<TableCell>
  <div className="flex flex-col gap-0.5">
    <span>{[client.endereco?.cidade, client.endereco?.uf].filter(Boolean).join(" - ") || "-"}</span>
    {client.endereco?.logradouro && (
      <span className="text-xs text-muted-foreground">
        {[client.endereco.logradouro, client.endereco.numero].filter(Boolean).join(", ")}
      </span>
    )}
  </div>
</TableCell>

<TableCell>
  <div className="flex flex-col gap-0.5">
    <span>{client.contatoPrincipal?.nome || "-"}</span>
    {client.contatoPrincipal?.whatsapp && (
      <span className="text-xs text-muted-foreground">{client.contatoPrincipal.whatsapp}</span>
    )}
    {client.contatoPrincipal?.email && (
      <span className="text-xs text-muted-foreground">{client.contatoPrincipal.email}</span>
    )}
  </div>
</TableCell>

<TableCell>
  <div className="flex flex-col gap-0.5">
    <span>{client.preferenciasRelacionamento?.diaReuniao || "-"}</span>
    {client.preferenciasRelacionamento?.frequencia && (
      <span className="text-xs text-muted-foreground">
        Frequência: {followUpLabels[client.preferenciasRelacionamento.frequencia]}
      </span>
    )}
  </div>
</TableCell>
