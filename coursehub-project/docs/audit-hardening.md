# Endurecimento pos-auditoria

Branch: `feature/audit-hardening-enrollment-and-public-surface`.

Este documento descreve o que mudou no codigo, quais SQLs acompanham e o que ja foi aplicado no banco local `coursehub_escola`.

## Superficie publica

- `GET /api/users` e `POST /api/users` foram removidos. Cadastro comercial e o checkout; cadastro institucional e o admin.
- A rota `/register` continua existindo, mas nao cria usuario. Explica que a conta nasce no checkout e aponta para `/courses`. Links publicos de "Criar conta" tambem vao para `/courses`. `/login` nao muda.
- Catalogo publico lista apenas cursos `status=active`.
- Conteudos publicos expoe metadados (`video`/`pdf`/`text`/`live_class`) sem `content_url`/`content_text`. Tipos `activity`/`assessment` continuam no ENUM, mas ficam fora do catalogo/player/progresso.
- Frontend usa `VITE_API_URL` via `apiFetch`.

## Rematricula

`completed` nao permite retake. Progresso e envios continuam por aluno+conteudo.

A unique viva permite historico `cancelled`/`withdrawn` e no maximo uma matricula viva por (`student_id`, `course_id`).

## Financeiro

- Cancelamento direto so em contratos `pending_payment`. Ativos/atrasados usam desistencia.
- Cobranca automatica exige `financial_contracts.enrollment_id`.
- Tentativas PIX/boleto vencidas expiram na leitura da fatura, do financeiro do aluno e do pagamento por contexto de acesso.

## Auth / UX

- Rotas de atividade do aluno exigem `authorizeRoles("student")`.
- `ProtectedRoute` redireciona para `/login`.
- Homes usam dados do papel (matriculas / cursos do professor / cursos admin).
- Pagina de frequencia do aluno em `/aluno/frequencia`.
- Purga de refresh/reset tokens expirados no boot da API.

## SQL no repositorio

| Tipo | Arquivo |
|---|---|
| Migration | `database/migrations/20260918_001_enrollment_alive_unique_and_pricing_plan_name.sql` |
| Rollback | `database/rollback/20260918_001_revert_enrollment_alive_unique_and_pricing_plan_name.sql` |
| Migration | `database/migrations/20260918_002_audit_user_foreign_keys.sql` |
| Rollback | `database/rollback/20260918_002_drop_audit_user_foreign_keys.sql` |
| Seed | `database/seeds/20260918_001_seed_admin_chat_permissions.sql` |

O rollback da 001 nao desfaz o repair de matriculas `active` com contrato `cancelled`, e nao remove `uq_pricing_plan_course_name` (isso ja tem rollback em `20260813_001`). O seed nao tem rollback: e idempotente e so insere permissao que ainda nao existe.

`coursehub_app` so tem SELECT/INSERT/UPDATE/DELETE. ALTER/REFERENCES precisam de um usuario privilegiado (root no ambiente local).

## Estado aplicado em `coursehub_escola` (2026-09-18)

- Repair: enrollments `28` e `614` passaram de `active` para `cancelled`.
- Unique `uk_enrollment_student_course_alive` + coluna gerada `alive_marker`.
- Unique `uq_pricing_plan_course_name`.
- FKs de auditoria em `invoices`, `payments` e `financial_events` com `ON DELETE SET NULL`.
- Seed de chat: 2 admins ativos com as 4 chaves de supervisao.

## Testes

Defina `DB_NAME_TEST` e rode com `NODE_ENV=test` para nao usar `coursehub_escola`. Sem essa variavel o backend avisa e cai em `DB_NAME`.