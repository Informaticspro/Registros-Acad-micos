import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('gallery storage isolates organizations and excludes reception and academic users', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role authenticated; create role anon; create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      grant usage on schema storage to authenticated,anon;
      grant select,insert,delete on storage.objects to authenticated,anon;
      create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
      create function public.current_profile_organization_id() returns uuid language sql stable as $$select nullif(current_setting('test.org',true),'')::uuid$$;
      create function public.current_profile_role() returns text language sql stable as $$select current_setting('test.role',true)$$;`);
    await db.exec(fs.readFileSync('supabase/migration-v30-galeria-soporte.sql','utf8'));
    await db.exec(fs.readFileSync('supabase/migration-v31-eliminar-imagenes.sql','utf8'));
    const bucket = (await db.query('select * from storage.buckets')).rows[0];
    assert.equal(bucket.public, false);
    assert.equal(Number(bucket.file_size_limit), 10485760);
    assert.ok(!bucket.allowed_mime_types.includes('image/svg+xml'));
    await db.exec(`set test.org='10000000-0000-0000-0000-000000000001'; set test.role='soporte'; set role authenticated;`);
    await db.exec(`insert into storage.objects(bucket_id,name) values('laboratory-images','10000000-0000-0000-0000-000000000001/photo.png');`);
    assert.equal((await db.query('select * from storage.objects')).rows.length,1);
    await assert.rejects(db.exec(`insert into storage.objects(bucket_id,name) values('laboratory-images','10000000-0000-0000-0000-000000000002/photo.png')`), /row-level security/);
    for (const role of ['recepcion','scanner','organizador']) {
      await db.exec(`set test.role='${role}'`);
      assert.equal((await db.query('select * from storage.objects')).rows.length,0);
      assert.equal((await db.query('delete from storage.objects returning *')).rows.length,0);
      await assert.rejects(db.exec(`insert into storage.objects(bucket_id,name) values('laboratory-images','10000000-0000-0000-0000-000000000001/test.png')`), /row-level security/);
    }
    await db.exec(`set test.role='soporte'; set test.org='10000000-0000-0000-0000-000000000002';`);
    assert.equal((await db.query('select * from storage.objects')).rows.length,0);
    assert.equal((await db.query('delete from storage.objects returning *')).rows.length,0);
    await db.exec(`set role anon`);
    assert.equal((await db.query('select * from storage.objects')).rows.length,0);
    assert.equal((await db.query('delete from storage.objects returning *')).rows.length,0);
    await db.exec(`set role authenticated; set test.org='10000000-0000-0000-0000-000000000001';`);
    for (const role of ['soporte','admin','propietario']) {
      await db.exec(`set test.role='${role}'; insert into storage.objects(bucket_id,name) values('laboratory-images','10000000-0000-0000-0000-000000000001/${role}.png');`);
      assert.equal((await db.query('delete from storage.objects where name=$1 returning *', [`10000000-0000-0000-0000-000000000001/${role}.png`])).rows.length,1);
    }
  } finally { await db.close(); }
});
