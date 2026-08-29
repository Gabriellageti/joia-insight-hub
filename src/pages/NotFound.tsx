import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-muted p-4">
      <div className="text-center max-w-md">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Página não encontrada</p>
        <p className="mb-6 text-sm text-muted-foreground">O endereço informado não existe ou não está mais disponível.</p>
        <Button asChild><Link to="/">Voltar ao início</Link></Button>
      </div>
    </main>
  );
};

export default NotFound;
