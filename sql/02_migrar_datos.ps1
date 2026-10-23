# ============================================================
# Migración de datos — Grupo Giraudo
# PARTES → EMPLEADOS → LOTES → TRABAJOS
# trabajos_agricolas NO se modifica
# ============================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$BASE = 'https://lwzqtrjtqzfkvdztrvse.supabase.co'
$KEY  = 'sb_publishable_fb8e8haYdLGyHmnJ3KBA-g_ChkEIhY1'
$HDR  = @{ 'apikey'=$KEY; 'Authorization'="Bearer $KEY"; 'Content-Type'='application/json; charset=utf-8'; 'Prefer'='return=representation' }
$HGET = @{ 'apikey'=$KEY; 'Authorization'="Bearer $KEY" }

function ApiGet($tabla, $query='') {
    return Invoke-RestMethod "$BASE/rest/v1/${tabla}${query}" -Headers $HGET
}

function ApiPost($tabla, $obj) {
    # Serializar con UTF-8 explícito para caracteres especiales (ñ, etc.)
    $json = $obj | ConvertTo-Json -Depth 5 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $r = Invoke-RestMethod "$BASE/rest/v1/$tabla" -Method POST -Headers $HDR -Body $bytes
    return $r
}

Write-Host "=== MIGRACION TRABAJOS — GRUPO GIRAUDO ===" -ForegroundColor Cyan

# ── NORMALIZACION ──────────────────────────────────────────
# Propietarios propios del Grupo (lote sin propietario_id)
$PROPIOS = @('Giraudo SH','GyG SH','Giraudo','Francisco Giraudo')

# Tabla de unificacion de nombres de terceros
$NORM_PROP = @{
    'Bollatti'              = 'Nico Bollatti'
    'Nico Bollatti'         = 'Nico Bollatti'
    'Chena Leonardo'        = 'Leonardo Chena'
    'Leonardo Chena'        = 'Leonardo Chena'
    'Mana'                  = 'Laureano Mana'
    'Mana/Celada'           = 'Laureano Mana'
    'Laureano Mana'         = 'Laureano Mana'
    'Turaglio'              = 'Turaglio Cereales'
    'Turaglio cereales'     = 'Turaglio Cereales'
    'Turaglio Cereales'     = 'Turaglio Cereales'
    'Osvaldo Ramb'          = 'Osvaldo y Daniel Ramb'
    'Osvaldo y Daniel Ramb' = 'Osvaldo y Daniel Ramb'
    'Supertino'             = 'Supertino Antonio'
    'Supertino Antonio'     = 'Supertino Antonio'
}

function NormProp($p) {
    if (-not $p) { return $null }
    if ($PROPIOS -contains $p) { return $null }   # propio → sin propietario_id
    if ($NORM_PROP.ContainsKey($p)) { return $NORM_PROP[$p] }
    return $p
}

function NormLote($l) {
    if (-not $l) { return '' }
    $l = $l.Trim()
    # Quitar prefijo "Lote " o "lote " redundante
    if ($l -match '^[Ll]ote\s+(.+)$') { $l = $Matches[1].Trim() }
    return $l
}

function NormCampo($e) {
    if (-not $e) { return '' }
    $e = $e.Trim()
    if ($e -eq 'Doa Vica') { $e = [System.Text.Encoding]::UTF8.GetString([byte[]](68,111,195,177,97,32,86,105,99,97)) }
    return $e
}

function NormOp($o) {
    if (-not $o) { return $null }
    if ($o -eq 'Wilhen') { return 'Wilhelm' }
    return $o
}

function MapTipo($t) {
    $m = @{
        'Enrolladora'   = 'enrollado'
        'Segadora'      = 'corte'
        'Rastrillo'     = 'rastrillado'
        'Siembra'       = 'siembra'
        'Pulverizacion' = 'pulverizacion'
        'Fertilizacion' = 'fertilizacion'
        'Cosecha'       = 'cosecha'
        'Henificacion'  = 'enrollado'
        'Labranza'      = 'movimiento_suelos'
    }
    # Normalizar quitando tildes
    $tNorm = $t -replace 'ó','o' -replace 'ó','o' -replace 'ó','o' -replace 'Pulverización','Pulverizacion' -replace 'Fertilización','Fertilizacion' -replace 'Henificación','Henificacion'
    if ($m.ContainsKey($t))     { return $m[$t] }
    if ($m.ContainsKey($tNorm)) { return $m[$tNorm] }
    if ($t) { return $t.ToLower() } else { return 'otro' }
}

# ── FASE 1: PARTES ──────────────────────────────────────────
Write-Host "`n--- Fase 1: PARTES ---" -ForegroundColor Yellow
$src = ApiGet 'trabajos_agricolas' '?select=propietario,contratista,cliente&limit=2000'

$nombresSet = [System.Collections.Generic.HashSet[string]]::new()
foreach ($r in $src) {
    $np = NormProp $r.propietario
    if ($np) { [void]$nombresSet.Add($np) }
    if ($r.contratista -and $r.contratista -ne 'Propio') {
        $nc = if ($NORM_PROP.ContainsKey($r.contratista)) { $NORM_PROP[$r.contratista] } else { $r.contratista }
        if ($nc -and -not ($PROPIOS -contains $nc)) { [void]$nombresSet.Add($nc) }
    }
    if ($r.cliente) { [void]$nombresSet.Add($r.cliente) }
}

$partesId = @{}
foreach ($nombre in ($nombresSet | Sort-Object)) {
    $res = ApiPost 'partes' @{ nombre=$nombre }
    if ($res) {
        $partesId[$nombre] = $res[0].id
        Write-Host "  + $nombre"
    } else {
        Write-Host "  ERROR: $nombre" -ForegroundColor Red
    }
}
Write-Host "  Total partes: $($partesId.Count)"

# ── FASE 2: EMPLEADOS ────────────────────────────────────────
Write-Host "`n--- Fase 2: EMPLEADOS ---" -ForegroundColor Yellow
$srcOp = ApiGet 'trabajos_agricolas' '?select=operario&limit=2000'
$operarios = $srcOp | Select-Object -ExpandProperty operario |
    Where-Object { $_ } | ForEach-Object { NormOp $_ } | Sort-Object -Unique

$empleadosId = @{}
foreach ($o in $operarios) {
    $res = ApiPost 'empleados' @{ nombre=$o; rol='operario' }
    if ($res) { $empleadosId[$o] = $res[0].id; Write-Host "  + $o" }
}

# ── FASE 3: LOTES ────────────────────────────────────────────
Write-Host "`n--- Fase 3: LOTES ---" -ForegroundColor Yellow
# En trabajos_agricolas: campo propio usa campo='Don Alfredo (Azcona)' etc.
# Los trabajos de maquinaria usan establecimiento='Azcona', propietario='Giraudo SH'
# Necesitamos leer ambas columnas: campo Y establecimiento
$srcLotes = ApiGet 'trabajos_agricolas' '?select=propietario,establecimiento,campo,lote,hectareas&limit=2000'

$lotesMap = @{}
foreach ($r in $srcLotes) {
    # Determinar el nombre del establecimiento: primero 'establecimiento', luego 'campo'
    $rawEstab = if ($r.establecimiento) { $r.establecimiento } elseif ($r.campo) { $r.campo } else { '' }
    $campoNorm = NormCampo $rawEstab
    $loteNorm  = NormLote  $r.lote
    if (-not $campoNorm -or -not $loteNorm) { continue }

    $propNorm = NormProp $r.propietario
    $k = "${campoNorm}~~~${loteNorm}"
    $has = if ($r.hectareas) { [double]$r.hectareas } else { 0 }

    if (-not $lotesMap.ContainsKey($k)) {
        $lotesMap[$k] = @{ campo=$campoNorm; lote=$loteNorm; propNorm=$propNorm; max_has=$has }
    } else {
        if ($has -gt $lotesMap[$k].max_has) { $lotesMap[$k].max_has = $has }
    }
}

Write-Host "  Insertando $($lotesMap.Count) lotes unicos..."
$lotesId = @{}
foreach ($kv in $lotesMap.GetEnumerator()) {
    $v       = $kv.Value
    $propId  = if ($v.propNorm -and $partesId.ContainsKey($v.propNorm)) { $partesId[$v.propNorm] } else { $null }
    $hasVal  = if ($v.max_has -gt 0) { $v.max_has } else { $null }

    $body = [ordered]@{ campo=$v.campo; lote=$v.lote }
    if ($hasVal) { $body['hectareas'] = $hasVal }
    if ($propId) { $body['propietario_id'] = $propId }

    $res = ApiPost 'lotes' $body
    if ($res) {
        $lotesId[$kv.Key] = $res[0].id
        $tag = if ($propId) { "tercero: $($v.propNorm)" } else { "propio" }
        Write-Host "  + $($v.campo) lote $($v.lote) [$tag]"
    } else {
        Write-Host "  ERROR: $($v.campo) lote $($v.lote)" -ForegroundColor Red
    }
}

# ── FASE 4: TRABAJOS ─────────────────────────────────────────
Write-Host "`n--- Fase 4: TRABAJOS ---" -ForegroundColor Yellow
$srcT = ApiGet 'trabajos_agricolas' '?order=fecha&limit=2000'
Write-Host "  Fuente: $($srcT.Count) filas"

$okT=0; $okMaq=0; $okCont=0; $okIns=0; $errT=0

foreach ($r in $srcT) {
    # Resolver lote_id
    $rawEstab = if ($r.establecimiento) { $r.establecimiento } elseif ($r.campo) { $r.campo } else { '' }
    $campoNorm = NormCampo $rawEstab
    $loteNorm  = NormLote  $r.lote
    $loteKey   = "${campoNorm}~~~${loteNorm}"
    $loteId    = if ($lotesId.ContainsKey($loteKey)) { $lotesId[$loteKey] } else { $null }

    # Insertar TRABAJOS
    $tBody = [ordered]@{
        fecha      = $r.fecha
        tipo_labor = MapTipo $r.tipo
        hectareas  = $r.hectareas
        cultivo    = $r.cultivo
        campania   = $r.campania
        origen_id  = $r.id
    }
    if ($loteId) { $tBody['lote_id'] = $loteId }

    $tRes = ApiPost 'trabajos' $tBody
    if (-not $tRes) { $errT++; continue }
    $tid = $tRes[0].id
    $okT++

    # TRABAJO_MAQUINARIA
    if ($r.maquina_id) {
        $opNorm = NormOp $r.operario
        $opId   = if ($opNorm -and $empleadosId.ContainsKey($opNorm)) { $empleadosId[$opNorm] } else { $null }
        $costo  = $null
        if ($r.extras -and $r.extras.costo_total) { $costo = $r.extras.costo_total }

        $mBody = [ordered]@{ trabajo_id=$tid; maquina_id=$r.maquina_id }
        if ($r.tarifa_gasoil) { $mBody['tarifa_gasoil'] = $r.tarifa_gasoil }
        if ($opId)            { $mBody['operario_id']   = $opId }
        if ($costo)           { $mBody['costo']         = $costo }

        $mRes = ApiPost 'trabajo_maquinaria' $mBody
        if ($mRes) { $okMaq++ }
    }

    # TRABAJO_CONTRATISTA
    if ($r.contratista -and $r.contratista -ne 'Propio') {
        $contNorm = if ($NORM_PROP.ContainsKey($r.contratista)) { $NORM_PROP[$r.contratista] } else { $r.contratista }
        $contId   = if ($partesId.ContainsKey($contNorm)) { $partesId[$contNorm] } else { $null }
        if ($contId) {
            $cRes = ApiPost 'trabajo_contratista' @{ trabajo_id=$tid; contratista_id=$contId }
            if ($cRes) { $okCont++ }
        }
    }

    # TRABAJO_INSUMOS
    if ($r.descripcion -and $r.dosis) {
        $iBody = [ordered]@{ trabajo_id=$tid; insumo=$r.descripcion; cantidad=$r.consumo_total }
        if ($r.precio_unitario -and $r.consumo_total) {
            $cantNum = if ($r.consumo_total -match '([\d]+)') { [double]$Matches[1] } else { 0 }
            if ($cantNum) { $iBody['costo_total'] = [Math]::Round($r.precio_unitario * $cantNum, 0) }
        }
        $iRes = ApiPost 'trabajo_insumos' $iBody
        if ($iRes) { $okIns++ }
    }
}

# ── RESUMEN ──────────────────────────────────────────────────
Write-Host ""
Write-Host "=== RESULTADO ===" -ForegroundColor Cyan
Write-Host "  Partes:             $($partesId.Count)"
Write-Host "  Empleados:          $($empleadosId.Count)"
Write-Host "  Lotes:              $($lotesId.Count)"
Write-Host "  Trabajos:           $okT / $($srcT.Count)"
Write-Host "  → maquinaria:       $okMaq"
Write-Host "  → contratista:      $okCont"
Write-Host "  → insumos:          $okIns"
$color = if ($errT -gt 0) { 'Red' } else { 'Green' }
Write-Host "  Errores:            $errT" -ForegroundColor $color
Write-Host ""
Write-Host "trabajos_agricolas NO fue modificada." -ForegroundColor Green
