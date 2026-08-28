import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: text('employee_id').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull(), // 'inspector' | 'supervisor' | 'admin'
  district: text('district').notNull(),
  state: text('state').notNull(),
  passwordHash: text('password_hash').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const inspections = pgTable('inspections', {
  id: uuid('id').primaryKey().defaultRandom(),
  productName: text('product_name').notNull(),
  manufacturer: text('manufacturer').notNull(),
  category: text('category').notNull(),
  score: integer('score').notNull(),
  status: text('status').notNull(), // 'compliant' | 'non-compliant' | 'pending'
  date: date('date', { mode: 'string' }).notNull(),
  state: text('state').notNull(),
  batchNumber: text('batch_number').notNull(),
  inspectorId: uuid('inspector_id').notNull().references(() => users.id),
  sourceType: text('source_type').notNull(), // 'image' | 'url'
  image: text('image'), // base64 data URL (nullable)
  productLink: text('product_link'),
  notes: text('notes').notNull().default(''),
  fields: jsonb('fields').notNull().$type<unknown[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  inspectionId: uuid('inspection_id')
    .notNull()
    .references(() => inspections.id, { onDelete: 'cascade' }),
  product: text('product').notNull(),
  inspector: text('inspector').notNull(),
  date: date('date', { mode: 'string' }).notNull(),
  score: integer('score').notNull(),
  status: text('status').notNull(),
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type UserRow = typeof users.$inferSelect
export type InspectionRow = typeof inspections.$inferSelect
export type ReportRow = typeof reports.$inferSelect
