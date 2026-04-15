# Documentación de Cálculos por Dashboard

> **Referencia técnica completa** de cómo se calcula cada gráfica y KPI en cada dashboard de la aplicación Netskope Dashboard Viewer.

---

## Tabla de Contenidos

- [Conceptos Generales](#conceptos-generales)
- [Dashboard A — Mapa: Top Applications & Users](#dashboard-a--mapa-top-applications--users)
- [Dashboard B — Mapa: Private Access Overview](#dashboard-b--mapa-private-access-overview)
- [Dashboard C — Protección: GDPR Level & Top 20](#dashboard-c--protección-gdpr-level--top-20)
- [Dashboard D — IA: % of Risky AI Apps (KPI)](#dashboard-d--ia--of-risky-ai-apps-kpi)
- [Dashboard E — IA: Risk Attributes](#dashboard-e--ia-risk-attributes)
- [Dashboard F — IA: Risky AI Apps Distribution](#dashboard-f--ia-risky-ai-apps-distribution)
- [Dashboard G — IA: CCL Overview](#dashboard-g--ia-ccl-overview)
- [Pipeline de Normalización de Datos](#pipeline-de-normalización-de-datos)
- [Lógica de Periodización](#lógica-de-periodización)

---

## Conceptos Generales

### Familias de ZIP

| Familia | Prefijo del ZIP | Dashboards |
|---------|-----------------|------------|
| `mapa` | `Mapa_` | A, B |
| `proteccion_datos_personales` | `Protecci(ó/o)n_` | C |
| `ia_en_riesgos` | `IA_en_riesgos_` | D, E, F, G |

### Modos de Agregación por Widget

Cada widget opera en uno de dos modos:

| Modo | Descripción | Uso típico |
|------|-------------|------------|
| **snapshot** | Usa SOLO los datos del **último corte** del mes | KPIs, conteos, distribuciones estáticas |
| **aggregated** | **Combina TODOS los cortes** del mes (suma, merge) | Series de tiempo, totales acumulados, rankings |

### Flujo de Datos General

```
ZIP → descomprimir → detectar familia → extraer cutDate → asignar reportingMonth
    → parsear CSVs → normalizar valores → resolver cortes por mes
    → aplicar snapshot/aggregated por widget → renderizar gráfica
```

---

## Dashboard A — Mapa: Top Applications & Users

**Familia:** `mapa`  
**Componente:** `MapaTopApps.tsx`  
**Archivos fuente:** ZIP familia Mapa

### Widget 1: Top 10 Applications by # Sessions (Pie Chart)

| Propiedad | Valor |
|-----------|-------|
| **Tipo de gráfica** | Pie chart |
| **Modo de agregación** | `aggregated` |
| **Archivo CSV** | `top_10_applications_by_#_sessions.csv` |
| **Columna clave** | `Application Destination` |
| **Columna valor** | `Sum - Total Network Sessions` |

**Cálculo:**
1. Se obtienen los CSVs de **todos** los cortes del mes (`getWidgetCsvData(..., 'aggregated')`)
2. Se ejecuta `mergeTopN()`:
   - Recorre todas las filas de todos los cortes
   - Agrupa por `Application Destination`
   - **Suma** `Sum - Total Network Sessions` por aplicación
   - Ordena descendente por valor total
   - Retorna los primeros 10 (sin límite explícito, toma todos)
3. La leyenda muestra el porcentaje relativo: `valor_app / total_todos * 100`

**Fórmula por celda del pie:**
```
porcentaje_app = (Σ sessions_app_across_cuts / Σ sessions_all_apps_across_cuts) × 100
```

### Widget 2: Top 10 Users by # Sessions (Bar Chart)

| Propiedad | Valor |
|-----------|-------|
| **Tipo de gráfica** | Bar chart vertical |
| **Modo de agregación** | `aggregated` |
| **Archivo CSV** | `top_10_users_by_#_sessions.csv` |
| **Columna clave** | `User` |
| **Columna valor** | `# Network Sessions` |

**Cálculo:**
1. CSVs de todos los cortes → `mergeTopN(csvs, 'User', '# Network Sessions', 10)`
2. Agrupa por `User`, suma `# Network Sessions` entre cortes
3. Ordena descandente, toma top 10
4. Eje X = nombres de usuarios, Eje Y = # sessions sumadas

---

## Dashboard B — Mapa: Private Access Overview

**Familia:** `mapa`  
**Componente:** `MapaPrivateAccess.tsx`  
**Modo mixto:** Contiene widgets tanto snapshot como aggregated

### Widget 1: Sankey — Publisher Usage by Bytes

| Propiedad | Valor |
|-----------|-------|
| **Tipo de gráfica** | Sankey diagram |
| **Modo de agregación** | `aggregated` |
| **Archivo CSV** | `private_access_publisher_usage_by_bytes.csv` |

**Columnas usadas:**
- `User` → nodo source (nivel 1)
- `Policy Name` → nodo intermedio (nivel 2)
- `Publisher CN` → nodo intermedio (nivel 3)
- `Destination Host` → nodo destino (nivel 4)
- `Sum - Total Bytes (MB)` → peso de los links

**Cálculo (`mergeSankeyData`):**
1. Recorre todos los cortes combinados
2. Por cada fila, crea 3 links:
   - `User → Policy Name` (peso = bytes)
   - `Policy Name → Publisher CN` (peso = bytes)
   - `Publisher CN → Destination Host` (peso = bytes)
3. Los links se **acumulan** (suman) si ya existen para el mismo par
4. Todos los valores únicos se agregan como nodos
5. Se filtran filas con `bytes <= 0`

### Widget 2: Most Used Policies (Pie Chart)

| Propiedad | Valor |
|-----------|-------|
| **Tipo de gráfica** | Pie chart |
| **Modo de agregación** | `aggregated` |
| **Archivo CSV** | `most_used_policies.csv` |
| **Columna clave** | `Policy Name` |
| **Columna valor** | `Sum - App Hits` |

**Cálculo:** `mergeTopN()` — suma `App Hits` por policy entre todos los cortes.

### Widget 3: Top Private Apps by Total Bytes (Pie Chart)

| Propiedad | Valor |
|-----------|-------|
| **Tipo de gráfica** | Pie chart |
| **Modo de agregación** | `aggregated` |
| **Archivo CSV** | `top_private_apps_by_total_bytes.csv` |
| **Columna clave** | `Destination Host` |
| **Columna valor** | `Total Bytes (MB)` |

**Cálculo:** `mergeTopN()` — suma bytes por host entre cortes.

### KPIs Aggregated (Sumados entre cortes)

| KPI | Archivo CSV | Columna | Modo |
|-----|-------------|---------|------|
| Uploaded (GB) | `uploaded.csv` | `Uploaded` | `aggregated` |
| Downloaded (GB) | `downloaded.csv` | `Downloaded` | `aggregated` |
| Sessions | `total_sessions.csv` | `# Network Sessions` | `aggregated` |

**Cálculo (`aggregateKpiSum`):**
1. De cada corte, extrae la **primera fila no-nula** del CSV
2. **Suma** todos los valores entre cortes
3. Resultado = total acumulado del mes

### KPIs Snapshot (Último corte solamente)

| KPI | Archivo CSV | Columna | Modo |
|-----|-------------|---------|------|
| Policies Accessed | `total_policies_access.csv` | `Count of Policy Name` | `snapshot` |
| Active Publishers | `active_publishers_count.csv` | `Count of Publisher CN` | `snapshot` |
| Discovered Apps | `discovered_apps.csv` | `Total Apps` | `snapshot` |
| Discovered Users | `users.csv` | `Count of User` | `snapshot` |
| Data Centers | `netskope_dc_count.csv` | `Count of Netskope Host POP` | `snapshot` |

**Cálculo (`snapshotKpiValue`):**
1. Toma el CSV del `lastCut` (último corte del mes por fecha)
2. Extrae la primera fila no-nula de la columna indicada
3. Retorna ese valor directamente (sin sumar con otros cortes)

---

## Dashboard C — Protección: GDPR Level & Top 20

**Familia:** `proteccion_datos_personales`  
**Componente:** `ProteccionGdpr.tsx`  
**Modo:** Ambos widgets son **snapshot**

### Widget 1: # of Risky Applications by GDPR Level (Pie Chart)

| Propiedad | Valor |
|-----------|-------|
| **Tipo de gráfica** | Pie chart |
| **Modo de agregación** | `snapshot` |
| **Archivo CSV** | `#_of_risky_applications_by_gdpr_level.csv` |
| **Columna clave** | `GDPR Level` |
| **Columna valor** | `# Applications` |

**Cálculo:**
1. Se toma SOLO el CSV del **último corte** (`getSnapshotCsv`)
2. Se mapean las filas a `{ name: GDPR Level, value: # Applications }`
3. Se filtran entradas con nombre vacío
4. Se ordenan descendente por valor
5. Colores asignados por mapa `GDPR_COLORS` según nivel (poor → rojo, low → naranja, etc.)

**Porcentaje en leyenda:**
```
pct = (apps_nivel / total_apps_todos_niveles) × 100
```

### Widget 2: Top 20 Risky Applications with Low GDPR Level (Tabla)

| Propiedad | Valor |
|-----------|-------|
| **Tipo de visualización** | Tabla con barras inline |
| **Modo de agregación** | `snapshot` |
| **Archivo CSV** | `top_20_risky_applications_with_low_gdpr_level.csv` |

**Columnas mostradas:**

| Columna CSV | Encabezado tabla |
|-------------|-----------------|
| `Application` | Application |
| `Category` | Category |
| `CCL` | CCL |
| `# Sessions` | # Sessions |
| `# Users` | # Users |
| `Sum - Bytes Uploaded` | Bytes Up |
| `Sum - Bytes Downloaded` | Bytes Down |

Las columnas `Bytes Up` y `Bytes Down` tienen **barras horizontales inline** proporcionales al valor máximo de la columna.

---

## Dashboard D — IA: % of Risky AI Apps (KPI)

**Familia:** `ia_en_riesgos`  
**Componente:** `IaRiskyAppsKpi.tsx`  
**Modo:** Ambos widgets son **snapshot**

### Widget 1: % of Risky AI Apps Amongst All AI Apps (Círculo KPI)

| Propiedad | Valor |
|-----------|-------|
| **Tipo de visualización** | Círculo con porcentaje centrado |
| **Modo de agregación** | `snapshot` |
| **Archivo CSV** | `__of_risky_ai_apps_amongst_all_ai_apps.csv` |
| **Columna** | `%RiskyApps` |

**Cálculo:**
1. CSV del último corte → primera fila no-nula de `%RiskyApps`
2. El valor viene pre-normalizado por el `csvNormalizer`:
   - Formato original del CSV: `7,500%`
   - Normalización: quita `%`, parsea `7,500` como `7500` (comma = thousands), divide `/100` → `75.00`
3. Se muestra con `valor.toFixed(2)` + `%` → `75.00%`

> **Regla especial de parseo:** Si el valor numérico sin `%` es ≥ 1000, se interpreta como centesimal y se divide entre 100. Esto maneja el formato Netskope donde `7,500%` = 75.00%.

### Widget 2: Number of Risky AI Apps (Número grande)

| Propiedad | Valor |
|-----------|-------|
| **Tipo de visualización** | Número grande centrado |
| **Modo de agregación** | `snapshot` |
| **Archivo CSV** | `number_of_risky_ai_apps.csv` |
| **Columna** | Busca fuzzy: cualquier header que contenga `applications` o `# applications` |

**Cálculo:**
1. CSV del último corte
2. Búsqueda flexible del header (porque el nombre varía entre exports de Netskope)
3. Primera fila no-nula → valor numérico entero

---

## Dashboard E — IA: Risk Attributes

**Familia:** `ia_en_riesgos`  
**Componente:** `IaRiskAttributes.tsx`  
**Modo:** Los 5 widgets son **snapshot**

### Tabla de Risk Attributes (5 filas)

| Propiedad | Valor |
|-----------|-------|
| **Tipo de visualización** | Tabla con pills de porcentaje coloreados |
| **Modo de agregación** | `snapshot` |

**Archivos CSV por atributo (2 archivos cada uno — base + suplementario):**

| # | Atributo | Archivo base | Archivo suplementario (_1) |
|---|----------|-------------|---------------------------|
| 1 | Customer data for learning purposes | `__of_genai_apps_for_which_customer_data_is_used_for_learning_purposes.csv` | `..._1.csv` |
| 2 | Data shared with vendor | `__of_ai_apps_for_which_customer_data_is_shared_with_the_vendor.csv` | `..._1.csv` |
| 3 | No tenant isolation | `__of_ai_apps_for_which_there_is_no_tenant_isolation_support.csv` | `..._1.csv` |
| 4 | No AI risk regulations | `__of_ai_apps_for_which_there_are_no_ai_risk_regulations_&_compliance.csv` | `..._1.csv` |
| 5 | No genAI usage policy | `__of_ai_apps_for_which_there_is_no_genai_usage_policy.csv` | `..._1.csv` |

**Cálculo por atributo (`resolveAttr`):**
1. Lee el CSV base del último corte
2. Ejecuta `detectPercentageOrCount()` para determinar si el CSV contiene un porcentaje o un conteo:
   - Busca headers con `%`, `percent`, `risky` → tipo `percentage`
   - Busca headers con `#`, `count`, `number`, `applications` → tipo `count`
   - Fallback: si el valor ≤ 100 → percentage, si > 100 → count
3. Si hay archivo suplementario `_1.csv`, repite el proceso para obtener el otro dato
4. Si solo se tiene uno de los dos:
   - **Solo porcentaje:** `count = round(percentage × totalApps / 100)`
   - **Solo conteo:** `percentage = round(count / totalApps × 100, 2)`
5. `totalApps` se calcula de `count_of_ai_apps_by_ccl.csv` sumando `# Applications` de todas las filas

**Regla de totalApps:**
```
totalApps = Σ row['# Applications'] from count_of_ai_apps_by_ccl.csv (último corte)
```

---

## Dashboard F — IA: Risky AI Apps Distribution

**Familia:** `ia_en_riesgos`  
**Componente:** `IaDistribution.tsx`  
**Modo:** Los 3 widgets son **aggregated**

### Widget 1: Users Accessing Risky AI Apps (Line Chart)

| Propiedad | Valor |
|-----------|-------|
| **Tipo de gráfica** | Línea con área sombreada |
| **Modo de agregación** | `aggregated` |
| **Archivo CSV** | `number_of_users_accessing_risky_ai_apps.csv` |
| **Columna fecha** | `Event Date` |
| **Columna valor** | `# Users` |

**Cálculo (`mergeTimeSeries`):**
1. Combina CSVs de TODOS los cortes
2. Agrupa por `Event Date`
3. Si una misma fecha aparece en múltiples cortes, **suma** los valores
4. Ordena ascendente por fecha
5. Eje X = fechas, Eje Y = # users
6. Línea suavizada (`smooth: true`) con relleno semitransparente

### Widget 2: Top 10 Org Units Using Risky AI Apps (Horizontal Bar)

| Propiedad | Valor |
|-----------|-------|
| **Tipo de gráfica** | Bar chart horizontal |
| **Modo de agregación** | `aggregated` |
| **Archivo CSV** | `top_10_organization_unit_using_risky_ai_apps.csv` |
| **Columna clave** | `Organization Unit Level1` |
| **Columna valor** | `# Applications` |

**Cálculo:**
1. `mergeTopN()` con limit 10
2. Agrupa por org unit, suma `# Applications` entre cortes
3. Se invierte el orden para que el mayor quede arriba en la gráfica horizontal

### Widget 3: Top 10 Risky AI Apps (Pie Chart)

| Propiedad | Valor |
|-----------|-------|
| **Tipo de gráfica** | Pie chart |
| **Modo de agregación** | `aggregated` |
| **Archivo CSV** | `top_10_risky_ai_apps.csv` |
| **Columna clave** | `Application` |
| **Columna valor** | `# Applications` |

**Cálculo:** `mergeTopN()` con limit 10 — suma `# Applications` por app entre cortes.

---

## Dashboard G — IA: CCL Overview

**Familia:** `ia_en_riesgos`  
**Componente:** `IaCclOverview.tsx`  
**Modo mixto:** snapshot + aggregated

### Widget 1: Count of AI Apps by CCL (Donut Chart)

| Propiedad | Valor |
|-----------|-------|
| **Tipo de gráfica** | Donut chart |
| **Modo de agregación** | `snapshot` |
| **Archivo CSV** | `count_of_ai_apps_by_ccl.csv` |
| **Columna clave** | `CCL` |
| **Columna valor** | `# Applications` |

**Cálculo:**
1. CSV del último corte solamente
2. Mapea filas a `{ name: CCL (capitalizado), value: # Applications }`
3. Ordena descendente
4. Colores por mapa `CCL_COLORS` (excellent → verde, poor → rojo, etc.)

**Porcentaje:**
```
pct = (apps_ccl / total_apps_todos_ccl) × 100
```

### Widget 2: AI Usage in Total Bytes by CCL (Donut Chart)

| Propiedad | Valor |
|-----------|-------|
| **Tipo de gráfica** | Donut chart |
| **Modo de agregación** | `aggregated` |
| **Archivo CSV** | `ai_usage_in_total_bytes_by_ccl.csv` |
| **Columna clave** | `CCL` |
| **Columna valor** | `Sum - Total Bytes (GB)` |

**Cálculo:**
1. CSVs de todos los cortes
2. Acumula en un mapa `{ ccl_name → total_bytes }`
3. Por cada fila de cada corte, **suma** `Total Bytes (GB)` al CCL correspondiente
4. Convierte a array, ordena descendente

### Widget 3: AI Apps Used by CCL Score (Tabla)

| Propiedad | Valor |
|-----------|-------|
| **Tipo de visualización** | Tabla simple |
| **Modo de agregación** | `snapshot` |
| **Archivo CSV** | `ai_apps_used_by_ccl_score.csv` |

**Columnas mostradas:**

| Columna CSV | Encabezado tabla |
|-------------|-----------------|
| `Application` | Application |
| `CCI` | CCI |

---

## Pipeline de Normalización de Datos

### Flujo completo de un valor CSV

```
Valor raw del CSV
  → trim()
  → ¿es "", "null", "NaN"?  → null
  → ¿termina con "%"?
      → quitar "%", parsear número
      → ¿resultado ≥ 1000?  → dividir /100 (formato centesimal Netskope)
      → retornar número
  → ¿tiene comas y puntos?
      → comas son separadores de miles → quitar comas, parseFloat
  → ¿solo comas?
      → ¿3 dígitos después de última coma? → separador de miles (ej: "4,583" = 4583)
      → ¿sino? → coma decimal (ej: "7,778" = 7.778)
  → ¿formato numérico simple?
      → parseFloat
  → retornar como string (texto no-numérico)
```

### Reglas de Normalización

| # | Regla | Ejemplo |
|---|-------|---------|
| 1 | Headers se recortan (trim) | `" User "` → `"User"` |
| 2 | Columnas `Unnamed: X` se eliminan | `Unnamed: 0` → eliminada |
| 3 | Números con comas de miles | `"4,583"` → `4583` |
| 4 | Porcentajes centesimales | `"7,500%"` → `75.00` |
| 5 | Valores nulos | `"null"`, `"NaN"`, `""` → `null` |
| 6 | Filas completamente vacías | Eliminadas |
| 7 | Búsqueda fuzzy de columnas | Case-insensitive, trimmed |
| 8 | Detección automática de porcentaje vs conteo | Por nombre de columna |

---

## Lógica de Periodización

### Asignación de Mes de Reporte

```
cutDate = fecha extraída del nombre del ZIP (regex: /\d{4}-\d{2}-\d{2}/)

if (modo === 'calendar'):
    reportingMonth = mes de cutDate

if (modo === 'operational'):
    if (día de cutDate ≤ graceDays):
        reportingMonth = mes anterior
    else:
        reportingMonth = mes de cutDate
```

### Resolución de Datos por Dashboard

```
if (viewMode === 'single_cut' AND cutDate seleccionado):
    → solo el ZIP con ese cutDate para esa familia

if (viewMode === 'monthly' AND reportingMonth seleccionado):
    → todos los ZIPs de esa familia con ese reportingMonth
    → ordenados por cutDate ascendente
    → lastCut = el último de la lista

if (reportingMonth === 'all'):
    → todos los ZIPs de esa familia, todos los meses
```

### Cascada de Filtros

Cuando un filtro padre cambia, los hijos se resetean:

```
assignmentMode/graceDays cambia
  → recalcula reportingMonth de TODOS los ZIPs
  → resetea reportingMonth a 'all'
  → resetea cutDate a 'all'

sourceType cambia
  → si dashboardId no es válido para la nueva familia → reset a 'all'
  → resetea cutDate a 'all'

reportingMonth cambia
  → si cutDate no existe en el nuevo mes → reset a 'all'

viewMode → 'monthly'
  → resetea cutDate a 'all'
```

---

## Funciones de Resolución de Datos

### `mergeTopN(csvs, keyCol, valCol, limit?)`
- Recorre todos los CSVs
- Agrupa por `keyCol`
- Suma `valCol` por grupo
- Ordena descendente por valor
- Corta a `limit` si se especifica

### `mergeTimeSeries(csvs, dateCol, valCol)`
- Recorre todos los CSVs
- Agrupa por `dateCol`
- Suma `valCol` por fecha
- Ordena ascendente por fecha

### `aggregateKpiSum(csvs, colName)`
- De cada CSV, toma la **primera fila no-nula**
- Suma todos esos valores
- Un valor por corte → total del mes

### `snapshotKpiValue(resolved, fileName, colName)`
- Toma el CSV del `lastCut`
- Retorna la primera fila no-nula

### `mergeSankeyData(csvs, columns)`
- Crea links entre 4 niveles: User → Policy → Publisher → Dest
- Acumula bytes por link
- Retorna nodos únicos + links con peso

### `getWidgetCsvData(resolved, fileName, mode)`
- `snapshot` → solo `lastCut.normalizedData[fileName]`
- `aggregated` → todos los `sortedCuts[*].normalizedData[fileName]`

### `getSnapshotCsv(resolved, fileName)`
- Shorthand para `lastCut.normalizedData[fileName]`
