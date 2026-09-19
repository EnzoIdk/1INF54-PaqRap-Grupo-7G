# 1INF54-PaqRap-Grupo-7G

Desarrollo de software para envío de paquetes logísticos para el curso de Proyecto de Diseño y Desarrollo de Software ciclo 2026-2.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend / planificador | Java 21 + Spring Boot 3 |
| Base de datos | PostgreSQL 16 |
| Frontend / visualizador | TypeScript + React 18 (Vite) |
| Empaquetado | Docker / Docker Compose |

Las convenciones de nomenclatura, estructura de paquetes, manejo de errores, versionamiento y demás reglas de codificación se definen en el documento **STD - Estándares de Programación** del equipo.

## Estructura del repositorio

```
1INF54-PaqRap-Grupo-7G/
├── backend/            # Componente planificador (Java 21 + Spring Boot 3)
├── frontend/           # Componente visualizador (TypeScript + React + Vite)
├── docker-compose.yml  # Orquestación local (PostgreSQL, backend, frontend)
└── CHANGELOG.md
```

## Cómo levantar el entorno local

### Base de datos (PostgreSQL vía Docker)

```bash
docker compose up -d db
```

### Backend

```bash
cd backend
./mvnw spring-boot:run
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

