import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('software changes atomically update the existing sheet and history with tenant checks and replay protection', async () => {
  const db = new PGlite();
  const org='10000000-0000-0000-0000-000000000001', other='10000000-0000-0000-0000-000000000002';
  const user='20000000-0000-0000-0000-000000000001', pc='30000000-0000-0000-0000-000000000001', foreign='30000000-0000-0000-0000-000000000002';
  const req=n=>`40000000-0000-0000-0000-00000000000${n}`;
  try {
    await db.exec(`create role authenticated; create role anon; create schema auth;
      create table auth.users(id uuid primary key); create table organizations(id uuid primary key);
      create table profiles(id uuid primary key,organization_id uuid,full_name text,role text);
      create function auth.uid() returns uuid language sql stable as $$select current_setting('test.uid')::uuid$$;
      create function current_profile_role() returns text language sql stable security definer as $$select role from profiles where id=auth.uid()$$;
      create function current_profile_organization_id() returns uuid language sql stable security definer as $$select organization_id from profiles where id=auth.uid()$$;
      insert into organizations values('${org}'),('${other}'); insert into auth.users values('${user}');
      insert into profiles values('${user}','${org}','José','soporte'); set test.uid='${user}';`);
    for (const [file,table] of [['v8-laboratorio-soporte','laboratory_equipment'],['v8-laboratorio-soporte','laboratory_logs'],['v9-fichas-tecnicas-laboratorio','laboratory_technical_sheets']]) {
      const source=fs.readFileSync(`supabase/migration-${file}.sql`,'utf8');
      await db.exec(source.match(new RegExp(`create table if not exists public\\.${table} \\([\\s\\S]*?\\n\\);`))[0]);
    }
    await db.exec(fs.readFileSync('supabase/migration-v14-mantenimiento-e-incidencias.sql','utf8'));
    await db.exec(`insert into laboratory_equipment(id,organization_id,code,name,category,location,status) values
      ('${pc}','${org}','51251','EST 01','Computadora','Laboratorio 2','en_reparacion'),('${foreign}','${other}','51252','EST 01','Computadora','Laboratorio 2','operativo');
      insert into laboratory_technical_sheets(organization_id,pc,location,applications,technical_specs,inventory,actions,ip_address)
      values('${org}','EST 01','Laboratorio 2','[{"nombre":"Office","instalada":true,"observacion":"2021"}]','[{"nombre":"Memoria","valor":"16 GB"}]','[{"equipo":"PC","numero":"51251"}]','[{"accion":"Histórica"}]','10.0.0.1');`);
    await db.exec(fs.readFileSync('supabase/migration-v32-programas-equipo.sql','utf8'));
    assert.equal((await db.query('select equipment_id from laboratory_technical_sheets')).rows[0].equipment_id,pc);
    await db.exec('set role authenticated');
    const run=(id,action,name='Visual Studio Code',version='1.0',desc='Solicitado por profesora',eq=pc)=>db.query('select record_equipment_software($1,$2,$3,$4,$5,$6)',[eq,id,action,name,version,desc]);
    await run(req(1),'instalar'); await run(req(1),'instalar');
    await assert.rejects(run(req(1),'instalar','Otro programa'),/Identificador/);
    await assert.rejects(run(req(2),'instalar','Visual Studio Code'),/ya está instalado/);
    await assert.rejects(run(req(2),'instalar','Otro','1','',''+foreign),/Equipo no encontrado/);
    await run(req(2),'actualizar','visual studio code','2.0');
    await run(req(3),'retirar','Visual Studio Code','');
    await db.exec('reset role');
    const sheet=(await db.query('select * from laboratory_technical_sheets')).rows[0];
    assert.equal(sheet.applications.length,2);
    assert.equal(sheet.applications.find(a=>a.nombre==='Visual Studio Code').instalada,false);
    assert.equal(sheet.applications.find(a=>a.nombre==='Visual Studio Code').observacion,'2.0');
    assert.equal(sheet.applications[0].nombre,'Office');
    assert.equal(sheet.ip_address,'10.0.0.1'); assert.equal(sheet.technical_specs[0].valor,'16 GB'); assert.equal(sheet.actions[0].accion,'Histórica');
    assert.equal((await db.query('select count(*)::int n from laboratory_logs')).rows[0].n,3);
    assert.equal((await db.query('select status from laboratory_equipment where id=$1',[pc])).rows[0].status,'en_reparacion');
    await db.exec(`create function reject_test_log() returns trigger language plpgsql as $$begin raise exception 'test rollback'; end$$;
      create trigger test_failure before insert on laboratory_logs for each row execute function reject_test_log(); set role authenticated;`);
    await assert.rejects(run(req(4),'instalar','Nuevo programa'),/test rollback/);
    await db.exec('reset role');
    assert.deepEqual((await db.query('select applications from laboratory_technical_sheets')).rows[0].applications,sheet.applications);
    for(const role of ['recepcion','organizador','scanner']) {
      await db.query('update profiles set role=$1',[role]); await db.exec('set role authenticated');
      await assert.rejects(run(req(4),'instalar'),/Sin permiso/); await db.exec('reset role');
    }
    await db.exec('set role anon'); await assert.rejects(run(req(4),'instalar'),/permission denied/);
  } finally { await db.close(); }
});
