# ============================================================
# Verificación de totales post-migración
# Compara trabajos_agricolas (viejo) vs trabajos (nuevo)
# ============================================================

$BASE = 'https://lwzqtrjtqzfkvdztrvse.supabase.co'
$KEY  = 'sb_publishable_fb8e8haYdLGyHmnJ3KBA-g_ChkEIhY1'
$H    = @{ 'apikey' = $KEY; 'Authorization' = "Bearer $KEY" }

function Get($tabla, $query='') {
    return Invoke-RestMethod "$BASE/rest/v1/${tabla}${query}" -Headers $H
}

Write-Host "=== VERIFICACIÓN DE MIGRACIÓN ===" -ForegroundColor Cyan
Write-Host ""

# ── CONTEOS ──────────────────────────────────────────────────
$viejo = Get 'trabajos_agricolas' '?select=id,tipo,hectareas,fecha'
$nuevo = Get 'trabajos'           '?select=id,tipo_labor,hectareas,fecha,origen_id'

Write-Host "Filas en trabajos_agricolas (viejo): $($viejo.Count)"
Write-Host "Filas en trabajos (nuevo):           $($nuevo.Count)"
if ($viejo.Count -eq $nuevo.Count) {
    Write-Host "✅ Conteo exacto coincide" -ForegroundColor Green
} else {
    Write-Host "⚠️  Diferencia: $($viejo.Count - $nuevo.Count) filas" -ForegroundColor Red
}

# ── HECTÁREAS TOTALES ─────────────────────────────────────────
$hasViejo = ($viejo | Measure-Object -Property hectareas -Sum).Sum
$hasNuevo = ($nuevo | Measure-Object -Property hectareas -Sum).Sum
Write-Host ""
Write-Host "Hectáreas totales (viejo): $hasViejo"
Write-Host "Hectáreas totales (nuevo): $hasNuevo"
if ([Math]::Abs($hasViejo - $hasNuevo) -lt 0.01) {
    Write-Host "✅ Hectáreas coinciden" -ForegroundColor Green
} else {
    Write-Host "⚠️  Diferencia: $($hasViejo - $hasNuevo) ha" -ForegroundColor Red
}

# ── POR TIPO ─────────────────────────────────────────────────
Write-Host ""
Write-Host "--- Por tipo de labor ---"

$mapTipo = @{
    'Enrolladora'   = 'enrollado'
    'Segadora'      = 'corte'
    'Rastrillo'     = 'rastrillado'
    'Siembra'       = 'siembra'
    'Pulverización' = 'pulverizacion'
    'Fertilización' = 'fertilizacion'
    'Cosecha'       = 'cosecha'
    'Henificación'  = 'enrollado'
    'Labranza'      = 'movimiento_suelos'
}

$porTipoViejo = $viejo | Group-Object tipo | Sort-Object Name
foreach ($g in $porTipoViejo) {
    $tipoNuevo = if ($mapTipo.ContainsKey($g.Name)) { $mapTipo[$g.Name] } else { $g.Name.ToLower() }
    $enNuevo   = ($nuevo | Where-Object { $_.tipo_labor -eq $tipoNuevo } | Measure-Object).Count
    $ok = if ($g.Count -eq $enNuevo) { '✅' } else { '⚠️ ' }
    Write-Host "  $ok $($g.Name) → $tipoNuevo : viejo=$($g.Count) nuevo=$enNuevo"
}

# ── TRABAJO_MAQUINARIA ────────────────────────────────────────
$maqViejo = ($viejo | Where-Object { $_.tipo -in @('Enrolladora','Segadora','Rastrillo') } | Measure-Object).Count
$maqNuevo = (Get 'trabajo_maquinaria' '?select=id').Count
Write-Host ""
Write-Host "Filas con maquinaria (viejo, por tipo): $maqViejo"
Write-Host "Filas en trabajo_maquinaria (nuevo):    $maqNuevo"
if ($maqViejo -eq $maqNuevo) {
    Write-Host "✅ Maquinaria coincide" -ForegroundColor Green
} else {
    Write-Host "⚠️  Diferencia en trabajo_maquinaria" -ForegroundColor Yellow
}

# ── PARTES / LOTES ────────────────────────────────────────────
$partes    = (Get 'partes'    '?select=id').Count
$lotes     = (Get 'lotes'     '?select=id').Count
$empleados = (Get 'empleados' '?select=id').Count
Write-Host ""
Write-Host "Partes:    $partes"
Write-Host "Lotes:     $lotes"
Write-Host "Empleados: $empleados"

# ── TRAZABILIDAD: verificar que todo tiene origen_id ─────────
$sinOrigen = $nuevo | Where-Object { -not $_.origen_id }
if ($sinOrigen.Count -eq 0) {
    Write-Host ""
    Write-Host "✅ Todos los trabajos tienen origen_id (trazabilidad completa)" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️  $($sinOrigen.Count) trabajos sin origen_id" -ForegroundColor Yellow
}
