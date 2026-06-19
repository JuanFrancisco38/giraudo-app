-- Columnas para certificaciones de depósito de granos
-- Correr en Supabase SQL Editor

alter table certificaciones add column if not exists coe text;
alter table certificaciones add column if not exists grano text;
alter table certificaciones add column if not exists ctgs integer;
alter table certificaciones add column if not exists kg_bruto numeric;
alter table certificaciones add column if not exists merma numeric;
alter table certificaciones add column if not exists kg_neto numeric;
alter table certificaciones add column if not exists depositario text;
alter table certificaciones add column if not exists campania text;
