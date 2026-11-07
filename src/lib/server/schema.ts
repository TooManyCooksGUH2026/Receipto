import {
	boolean,
	doublePrecision,
	index,
	integer,
	numeric,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';

/* ------------------------------------------------------------------ */
/* Better Auth tables                                                  */
/* ------------------------------------------------------------------ */

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		token: text('token').notNull().unique(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(t) => [index('session_user_id_idx').on(t.userId)]
);

export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [index('account_user_id_idx').on(t.userId)]
);

export const verification = pgTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('verification_identifier_idx').on(t.identifier)]
);

export const userSettings = pgTable('user_settings', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	lat: doublePrecision('lat'),
	lng: doublePrecision('lng'),
	label: text('label'),
	radiusMiles: doublePrecision('radius_miles').default(5).notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

/* ------------------------------------------------------------------ */
/* Application tables                                                  */
/* ------------------------------------------------------------------ */

export const productClasses = pgTable('product_classes', {
	id: serial('id').primaryKey(),
	name: text('name').notNull().unique(),
	category: text('category').notNull(),
	icon: text('icon')
});

export const products = pgTable(
	'products',
	{
		id: serial('id').primaryKey(),
		classId: integer('class_id')
			.notNull()
			.references(() => productClasses.id, { onDelete: 'restrict' }),
		itemName: text('item_name').notNull(),
		brand: text('brand'),
		size: text('size'),
		unit: text('unit'),
		supermarket: text('supermarket'),
		isOwnBrand: boolean('is_own_brand').default(false).notNull(),
		basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull()
	},
	(t) => [
		index('products_class_id_idx').on(t.classId),
		index('products_item_name_idx').on(t.itemName)
	]
);

export const shops = pgTable(
	'shops',
	{
		id: serial('id').primaryKey(),
		shopName: text('shop_name').notNull(),
		supermarketName: text('supermarket_name').notNull(),
		brand: text('brand').notNull(),
		lat: doublePrecision('lat').notNull(),
		lng: doublePrecision('lng').notNull(),
		address: text('address'),
		area: text('area'),
		city: text('city').notNull(),
		region: text('region').notNull(),
		postcode: text('postcode'),
		osmId: text('osm_id'),
		osmType: text('osm_type')
	},
	(t) => [
		index('shops_supermarket_idx').on(t.supermarketName),
		index('shops_region_idx').on(t.region),
		index('shops_coords_idx').on(t.lat, t.lng)
	]
);

export const receipts = pgTable(
	'receipts',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		shopId: integer('shop_id')
			.notNull()
			.references(() => shops.id, { onDelete: 'restrict' }),
		purchasedAt: timestamp('purchased_at', { withTimezone: true }).notNull(),
		subtotal: numeric('subtotal', { precision: 10, scale: 2 }).default('0').notNull(),
		discountTotal: numeric('discount_total', { precision: 10, scale: 2 }).default('0').notNull(),
		total: numeric('total', { precision: 10, scale: 2 }).notNull(),
		itemCount: integer('item_count').default(0).notNull(),
		source: text('source').default('manual').notNull(),
		ocrText: text('ocr_text'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [
		index('receipts_user_date_idx').on(t.userId, t.purchasedAt),
		index('receipts_shop_idx').on(t.shopId)
	]
);

export const itemPurchases = pgTable(
	'item_purchases',
	{
		id: serial('id').primaryKey(),
		receiptId: text('receipt_id')
			.notNull()
			.references(() => receipts.id, { onDelete: 'cascade' }),
		productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
		nameInReceipt: text('name_in_receipt').notNull(),
		price: numeric('price', { precision: 10, scale: 2 }).notNull(),
		quantity: numeric('quantity', { precision: 8, scale: 3 }).default('1').notNull(),
		unitPrice: numeric('unit_price', { precision: 10, scale: 2 })
	},
	(t) => [
		index('item_purchases_receipt_idx').on(t.receiptId),
		index('item_purchases_product_idx').on(t.productId)
	]
);

export const itemPrices = pgTable(
	'item_prices',
	{
		id: serial('id').primaryKey(),
		shopId: integer('shop_id')
			.notNull()
			.references(() => shops.id, { onDelete: 'cascade' }),
		productId: integer('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		price: numeric('price', { precision: 10, scale: 2 }).notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
		receiptId: text('receipt_id').references(() => receipts.id, { onDelete: 'set null' })
	},
	(t) => [
		uniqueIndex('item_prices_shop_product_idx').on(t.shopId, t.productId),
		index('item_prices_product_idx').on(t.productId)
	]
);

export const receiptToProduct = pgTable(
	'receipt_to_product',
	{
		id: serial('id').primaryKey(),
		productId: integer('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		nameInReceipt: text('name_in_receipt').notNull(),
		supermarketName: text('supermarket_name').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [
		uniqueIndex('receipt_alias_unique_idx').on(t.supermarketName, t.nameInReceipt),
		index('receipt_alias_product_idx').on(t.productId)
	]
);

export const receiptItems = itemPurchases;
