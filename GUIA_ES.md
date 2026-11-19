# Guía rápida: URL Shortener (Proyecto 2)

## Correrlo

```bash
docker compose up --build
```

Prueba en otra terminal:

```bash
curl -X POST http://localhost:3000/api/links -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/dondi213", "alias": "jose"}'
```

Luego abre http://localhost:3000/jose en el navegador y revisa http://localhost:3000/api/links/jose/stats.

## Pruebas

```bash
npm install
npm test
```

Las pruebas no necesitan PostgreSQL ni Redis: usan versiones "falsas" en memoria (`tests/fakes.js`).

## Qué debes poder explicar en una entrevista

- **Caché (cache-aside):** cuándo se lee de Redis, cuándo de PostgreSQL y por qué se borra la caché al eliminar un link.
- **Rate limiting:** cómo funciona la ventana fija con `INCR` + `EXPIRE` y por qué se guarda en Redis y no en memoria del servidor.
- **Inyección de dependencias:** por qué `createApp` recibe `repo` y `cache` en lugar de importarlos, y cómo eso facilita las pruebas.
- **Códigos HTTP:** 201, 302, 400, 404, 409, 410 y 429.
- **SQL:** qué hace `ON CONFLICT DO NOTHING` y por qué evita una condición de carrera.
- **Graceful shutdown:** qué pasa con las peticiones en curso cuando Docker detiene el contenedor.

## Retos para hacerlo tuyo

1. **Fácil:** contar clics por navegador (Chrome, Firefox...) a partir del `user_agent`.
2. **Fácil:** endpoint para listar los 10 links más visitados.
3. **Medio:** generar un código QR del link corto (`qrcode` npm).
4. **Medio:** pasar el proyecto a TypeScript.
5. **Avanzado:** API keys para que cada usuario solo vea y borre sus links.
