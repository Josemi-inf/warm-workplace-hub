import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import heroImage from "@/assets/hero-collaboration.jpg";

export function WelcomeHeader() {
  const currentHour = new Date().getHours();
  const greeting = 
    currentHour < 12 ? "Buenos días" : 
    currentHour < 18 ? "Buenas tardes" : 
    "Buenas noches";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/20 to-accent/10 border border-primary/20">
      <div className="absolute inset-0 bg-gradient-to-r from-background/95 to-background/70" />
      
      <div className="relative grid md:grid-cols-2 gap-8 p-8 md:p-12">
        <div className="space-y-6 flex flex-col justify-center">
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground animate-slide-up">
              {greeting}, tu equipo te estaba esperando 👋
            </h1>
            <p className="text-lg text-muted-foreground animate-slide-up" style={{ animationDelay: "0.1s" }}>
              Hoy es un buen día para trabajar juntos. Vamos paso a paso.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md 
                         transition-all hover:shadow-lg hover:scale-105"
            >
              <Plus className="mr-2 h-5 w-5" />
              Crear Nueva Tarea
            </Button>
            
            <Button 
              size="lg" 
              variant="outline"
              className="border-primary/30 hover:bg-primary/5 hover:border-primary/50"
            >
              <Users className="mr-2 h-5 w-5" />
              Ver Tablero de Equipo
            </Button>
          </div>

          <p className="text-sm text-muted-foreground italic animate-slide-up" style={{ animationDelay: "0.3s" }}>
            3 compañeros están trabajando ahora mismo
          </p>
        </div>

        <div className="hidden md:block animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <img 
            src={heroImage} 
            alt="Equipo colaborando" 
            className="rounded-xl shadow-2xl w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
