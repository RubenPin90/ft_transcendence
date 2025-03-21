import * as settings_db from './database/db_settings_functions.js';
import * as main_db from './database/db_main.js';
import * as mfa_db from './database/db_mfa_functions.js'
import * as joined_db from './database/db_joined_functions.js'

// await main_db.create_db();
const wow = await settings_db.create_settings_value('aaa', "vv", 0, 0, 7573487938475, 83485734759879);
console.log(wow);
// await settings_db.get_settings();
// await main_db.show_full_db();
// const value = await mfa_db.get_mfa_value('self', '47858745', '47858745');

// let value = await mfa_db.create_mfa_value('', 0, 0, '47858745');
// console.log(value);
// value = await main_db.show_full_db();
// console.log(value);
// value = await mfa_db.delete_mfa_value('47858745');
// console.log(value);
// value = await main_db.show_full_db();
// console.log(value);


// await mfa_db.create_mfa_value(0, 0, 100000, '47858745');

// let value = await mfa_db.get_mfa_value('self', '47858745');
// console.log(value);
// value = await mfa_db.update_mfa_value('email', '1', '47858745');
// console.log(value);
// value = await mfa_db.get_mfa();
// console.log(value);
// value = await mfa_db.get_mfa_value('self', '47858745');
// console.log(value);

await settings_db.update_settings_value('pfp', 10, '47858745');
// console.log(await settings_db.get_settings_value('47858745'))

console.log(await main_db.show_full_db());