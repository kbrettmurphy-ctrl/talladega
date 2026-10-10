// Prints SQL that sets the shared family password. Matches hash() in supabase/functions/reunion-api/index.ts.
import {pbkdf2Sync,randomBytes} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
const io=createInterface({input:process.stdin,output:process.stdout});
const password=(await io.question('New family password: ')).trim();io.close();
if(password.length<8||password.length>200){console.error('Use 8 to 200 characters.');process.exit(1);}
const salt=randomBytes(16).toString('hex');
const hash=pbkdf2Sync(password,salt,210000,32,'sha256').toString('hex');
console.log(`\nRun in the Supabase SQL editor:\n\ninsert into public.reunion_access(id,salt,password_hash) values(1,'${salt}','${hash}')\non conflict(id) do update set salt=excluded.salt,password_hash=excluded.password_hash;\n`);
