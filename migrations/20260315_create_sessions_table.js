export async function up(knex) {
  await knex.schema.createTable('sessions', (table) => {
    table.increments('id').primary();
    table.string('title', 255).notNullable();
    table.dateTime('start_at').notNullable();
    table.dateTime('end_at').notNullable();
    table.string('venue', 255).nullable();
    table.text('tags').nullable();
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('sessions');
}
