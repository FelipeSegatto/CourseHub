import { Link } from "react-router-dom";

export default function ProfilePage() {
  return (
    <main className="bg-gray-50 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <section className="grid items-center gap-12 md:grid-cols-2">
          
          <div>
            <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
              Perfil do aluno
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-tight text-gray-900 md:text-5xl">
              Crie seu perfil e acompanhe sua evolução.
            </h1>

            <p className="mt-5 text-lg text-gray-600">
              Tenha acesso aos seus cursos, progresso, certificados, aulas salvas
              e conteúdos exclusivos em uma área organizada e personalizada.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/cadastro"
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Criar conta
              </Link>

              <Link
                to="/login"
                className="rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                Já tenho conta
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900">
                  Progresso salvo
                </h3>

                <p className="mt-2 text-sm text-gray-600">
                  Continue exatamente de onde parou em qualquer dispositivo.
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900">
                  Certificados
                </h3>

                <p className="mt-2 text-sm text-gray-600">
                  Receba certificados ao concluir cursos e projetos.
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900">
                  Área personalizada
                </h3>

                <p className="mt-2 text-sm text-gray-600">
                  Organize cursos favoritos, aulas salvas e histórico.
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900">
                  Acesso contínuo
                </h3>

                <p className="mt-2 text-sm text-gray-600">
                  Estude no seu ritmo com acesso fácil aos conteúdos.
                </p>
              </div>
            </div>
          </div>

          
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <div className="mx-auto max-w-md">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900">
                  Criar perfil
                </h2>

                <p className="mt-2 text-gray-500">
                  Cadastre-se para acessar a plataforma.
                </p>
              </div>

              <form className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Nome completo
                  </label>

                  <input
                    type="text"
                    placeholder="Digite seu nome"
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Email
                  </label>

                  <input
                    type="email"
                    placeholder="Digite seu email"
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Senha
                  </label>

                  <input
                    type="password"
                    placeholder="Crie uma senha"
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  Criar conta
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}