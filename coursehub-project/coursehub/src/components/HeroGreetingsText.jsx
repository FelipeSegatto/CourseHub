import { useAuth } from "../auth/AuthContext";

export default function HeroGreetingsText({
  titleClassName = "",
  descriptionClassName = "",
}) {
  const { usuarioLogado } = useAuth();

  const genero = usuarioLogado?.gender?.toLowerCase();

  const saudacao =
    genero === "feminino" ||
    genero === "female" ||
    genero === "f"
      ? "vinda"
      : "vindo";

  return (
    <div className="mb-10">
      <h1 className={`text-4xl font-bold ${titleClassName}`}>
        Bem {saudacao}, {usuarioLogado?.name}!
      </h1>

      <p className={`mt-3 max-w-2xl ${descriptionClassName}`}>
        Aprenda tecnologia, design e desenvolvimento web com cursos práticos,
        objetivos e focados em projetos reais.
      </p>
    </div>
  );
}