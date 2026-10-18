import { CheckCircle2, Circle } from "lucide-react";

export function PasswordRequisitos({ password, id }: { password: string; id: string }) {
  const requisitos = [
    { texto: "Al menos 6 caracteres", cumple: password.length >= 6 },
    { texto: "Al menos una letra mayúscula", cumple: /\p{Lu}/u.test(password) },
  ];
  return <ul id={id} className="mt-2 space-y-1 text-xs">
    {requisitos.map(({ texto, cumple }) => {
      const Icono = cumple ? CheckCircle2 : Circle;
      return <li key={texto} className={`flex items-center gap-2 ${cumple ? "text-green-800" : "text-muted-foreground"}`}>
        <Icono className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{texto}<span className="sr-only">{cumple ? ": cumplido" : ": pendiente"}</span></span>
      </li>;
    })}
  </ul>;
}
