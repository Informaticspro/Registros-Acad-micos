import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { handler } from '../netlify/functions/staff-users.mjs';

let db;
const orgA='10000000-0000-0000-0000-000000000001';
const orgB='10000000-0000-0000-0000-000000000002';
const admin='20000000-0000-0000-0000-000000000001';
const scanner='20000000-0000-0000-0000-000000000002';
const outsider='20000000-0000-0000-0000-000000000003';
const support='20000000-0000-0000-0000-000000000004';
const event='30000000-0000-0000-0000-000000000001';
before(async()=> {
  db=new PGlite();
  await db.exec(`create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;`);
  let schema=fs.readFileSync('supabase/schema.sql','utf8').replace('create extension if not exists "pgcrypto";','');
  // Test-only random defaults: no pgcrypto extension is bundled in PGlite.
  schema=schema.replace("encode(gen_random_bytes(32), 'hex')", "replace(gen_random_uuid()::text, '-', '')")
    .replace("upper(encode(gen_random_bytes(8), 'hex'))", "upper(replace(gen_random_uuid()::text, '-', ''))");
  await db.exec(schema);
  await db.exec(`alter type public.app_role add value 'soporte';
    alter table events add column is_permanent boolean not null default false;
    create table attendance_daily_logs(id uuid primary key default gen_random_uuid(), event_id uuid references events, registration_id uuid references registrations, scanned_by uuid references profiles, checked_in_at timestamptz not null default now(), attendance_period text not null default 'matutina');
    grant all on all tables in schema public to authenticated;
    grant select on events to anon;`);
  await db.exec(fs.readFileSync('supabase/migration-v3-lookup-export.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migration-v24-seguridad-registro-asistencia.sql','utf8'));
});
beforeEach(async()=> {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub','',false);
    truncate organizations, auth.users cascade;
    insert into organizations(id,name,slug) values ('${orgA}','A','a'),('${orgB}','B','b');
    insert into auth.users values ('${admin}','admin@example.test'),('${scanner}','scanner@example.test'),('${outsider}','outside@example.test'),('${support}','support@example.test');
    insert into profiles(id,organization_id,full_name,email,role) values
      ('${admin}','${orgA}','Admin','admin@example.test','admin'),
      ('${scanner}','${orgA}','Scanner','scanner@example.test','scanner'),
      ('${outsider}','${orgB}','Outside','outside@example.test','admin'),
      ('${support}','${orgA}','Support','support@example.test','soporte');
    insert into events(id,organization_id,organizer_id,title,event_type,location,capacity,status,starts_at,ends_at)
      values ('${event}','${orgA}','${admin}','Evento','congreso','A',2,'active',now()-interval '1 hour',now()+interval '1 day');`);
});
after(async()=>db?.close());
const register=async(doc='DOC-001',email='participant@example.test') => (await db.query(`select * from public_event_check_in($1,'Nombre','Apellido',$2,$3,'{}')`,[event,doc,email])).rows[0];
const session=async(user)=> {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
  await db.exec('set role authenticated');
};

test('legacy endpoint is inert for every method',async()=> {
  for(const httpMethod of ['GET','POST','PUT','DELETE']) assert.equal((await handler({httpMethod})).statusCode,410);
});
test('registration does not mark presence or disclose an existing QR',async()=> {
  await db.exec('set role anon');
  const row=await register();
  assert.equal(row.result_attendance_id,null);
  await assert.rejects(register(),/inscripción ya existe/);
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::int as n from attendance_records')).rows[0].n,0);
  assert.equal((await db.query('select checked_in_at from registrations')).rows[0].checked_in_at,null);
});
test('partial identity match cannot overwrite a participant',async()=> {
  await register();
  await assert.rejects(register('DOC-002'),/validar/);
  await assert.rejects(register('DOC-001','other@example.test'),/validar/);
  assert.equal((await db.query('select email from participants')).rows[0].email,'participant@example.test');
});
test('capacity, closed dates and permanent drafts are enforced on server',async()=> {
  await register(); await register('DOC-002','second@example.test');
  await assert.rejects(register('DOC-003','third@example.test'),/capacidad/);
  await db.exec("update events set status='draft',is_permanent=true");
  await assert.rejects(register('DOC-004','fourth@example.test'),/disponible/);
  await db.exec("update events set status='active',is_permanent=false,ends_at=now()-interval '1 minute'");
  await assert.rejects(register('DOC-004','fourth@example.test'),/disponible/);
});
test('attendance requires permitted role and same organization and deduplicates',async()=> {
  const row=await register();
  for(const user of [outsider,support]) {
    await session(user);
    await assert.rejects(db.query('select * from record_daily_attendance($1,$2,$3)',[event,row.result_qr_token,'matutina']),/permiso/);
  }
  await session(scanner);
  const first=await db.query('select * from record_daily_attendance($1,$2,$3)',[event,row.result_qr_token,'matutina']);
  const second=await db.query('select * from record_daily_attendance($1,$2,$3)',[event,row.result_qr_token,'matutina']);
  assert.equal(first.rows[0].result_already_logged_today,false);
  assert.equal(second.rows[0].result_already_logged_today,true);
});
test('public recovery requires possession of recovery code; old overload is revoked',async()=> {
  const row=await register();
  await db.exec('set role anon');
  await assert.rejects(db.query('select * from lookup_participant_registration($1,$2)',[event,'DOC-001']),/permission denied/);
  assert.equal((await db.query('select * from lookup_participant_registration($1,$2,$3)',[event,'DOC-001','WRONG'])).rows.length,0);
  assert.equal((await db.query('select * from lookup_participant_registration($1,$2,$3)',[event,'DOC-001',row.result_certificate_code])).rows.length,1);
});
test('organization guard prevents reads across tenants and profile reassignment',async()=> {
  const row=await register();
  await session(outsider);
  assert.equal((await db.query('select * from registrations')).rows.length,0);
  await assert.rejects(db.query('select admin_assign_staff_profile($1,$2,$3,$4)',[scanner,'Moved','scanner@example.test','admin']),/reasignarse/);
  await db.exec('reset role');
  assert.equal((await db.query('select organization_id from profiles where id=$1',[scanner])).rows[0].organization_id,orgA);
  assert.ok(row.result_registration_id);
});
