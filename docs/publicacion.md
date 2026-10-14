# Publicación en npm

Cómo se publica `dmencu` en npm desde GitHub Actions. El workflow es `.github/workflows/publish.yml` y usa el reusable `npm-publish-new-version.yaml@v3` de `codenautas/.github`, el mismo que usa backend-plus.

## Requisitos (una sola vez)

En npmjs.com, el paquete `dmencu` tiene que tener un **Trusted publisher** configurado para GitHub Actions:

| Campo | Valor |
| :-- | :-- |
| Organization or user | `codenautas` |
| Repository | `dmencu` |
| Workflow filename | `publish.yml` |
| Environment name | vacío (el workflow no usa environment) |
| Allowed actions | publicar directamente (`npm publish`), no sólo stage publish |

Sin esto, `npm publish` responde **404 Not Found - PUT ... could not be found or you do not have permission**. Ese 404 no depende del login local: en CI la publicación se autentica por OIDC, no con tu usuario de npm. Hace falta ser maintainer del paquete para configurarlo.

## Cómo publicar

Hay dos formas. Las dos terminan en el mismo workflow.

### 1. Con tag (la forma usada hasta ahora)

```bash
npm version patch          # o minor / major: sube package.json, hace commit y crea el tag vX.Y.Z
git push --follow-tags     # sube el commit y el tag; el push del tag dispara el workflow
```

Si preferís tagear a mano después de pushear el commit:

```bash
git push origin master
git tag -a v3.3.2 -m v3.3.2
git push origin v3.3.2
```

El job `check` exige que el tag sea `v<version de package.json>`. Si no coincide, el workflow falla antes de publicar.

### 2. Manual desde GitHub

1. Subir la versión en `package.json` (sin crear tag), commit y `git push origin master`.
2. En GitHub: **Actions → Publish → Run workflow**, rama `master`.
3. Opcional: tildar "Publicar sin correr los tests" (no recomendado).

Con el disparo manual, el workflow crea y sube el tag `v<version>` y después publica. **Por eso no se debe crear ni pushear el tag antes.**

> Pendiente: la publicación manual todavía no se probó de punta a punta en este repo; la validada fue la de tag.

## Reglas que hay que respetar

- **Una versión, un tag.** Si `v<version>` ya existe en GitHub, el workflow falla con *"Tag already exists"* (en el disparo manual) o no se dispara (en el de tag). Para publicar de nuevo hay que subir la versión.
- **npm no admite republicar una versión.** Si `dmencu@X.Y.Z` ya está publicada, el paso de publicación falla aunque el resto esté bien.
- **Versiones prerelease:** si la versión contiene `beta`, `alpha` o `rc`, el workflow publica con ese dist-tag (`--tag beta`, etc.) y no con `latest`.
- **Usar un solo camino por versión.** No mezclar el tag local con el disparo manual para la misma versión.

## Qué hace el workflow

1. **check:** lee la versión de `package.json` y valida que el ref sea `refs/tags/v<version>` (o crea el tag, en el disparo manual).
2. **test:** `npm ci`, `npm run build` y `npm test` con Node 24.x. No levanta PostgreSQL: los tests de dmencu no necesitan base (ver [testing.md](testing.md)).
3. **publish:** `npm ci`, `npm run build`, y `npm publish --provenance` (con el tag correspondiente si es prerelease).

## Diagnóstico

| Síntoma | Causa probable |
| :-- | :-- |
| No aparece ninguna corrida al pushear el tag | El tag no llegó a GitHub (revisar `git ls-remote --tags origin`) o la versión no coincide con el tag |
| `check` falla con "Versions does not match" | El tag no es `v<version de package.json>` |
| Manual falla con "Tag ... already exists" | Ya existe ese tag; subir la versión |
| `publish` falla con 404 en PUT | Falta el Trusted publisher o no coincide (repo, workflow filename, o no permite publicar directo) |
| `publish` falla con "cannot publish over existing version" | La versión ya está en npm; subir la versión |

Para ver el error exacto: en la corrida, abrir el job `publish` y expandir el paso **Publish to NPM**.
