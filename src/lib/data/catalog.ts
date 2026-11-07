export const ALL_SUPERMARKETS = [
	'Tesco',
	"Sainsbury's",
	'Asda',
	'Morrisons',
	'Aldi',
	'Lidl',
	'Waitrose',
	'Co-op',
	'M&S',
	'Iceland'
] as const;

export type Supermarket = (typeof ALL_SUPERMARKETS)[number];

export type SupermarketMeta = {
	short: string;
	receiptCode: string;
	color: string;
	priceIndex: number;
	ownBrandLabel: string;
};

export const SUPERMARKET_META: Record<Supermarket, SupermarketMeta> = {
	Tesco: {
		short: 'Tesco',
		receiptCode: 'TESCO',
		color: '#00539f',
		priceIndex: 1,
		ownBrandLabel: 'Tesco'
	},
	"Sainsbury's": {
		short: "Sainsbury's",
		receiptCode: 'S/BD',
		color: '#f06c00',
		priceIndex: 1.03,
		ownBrandLabel: "Sainsbury's"
	},
	Asda: {
		short: 'Asda',
		receiptCode: 'ASDA',
		color: '#5c9e31',
		priceIndex: 0.95,
		ownBrandLabel: 'Asda'
	},
	Morrisons: {
		short: 'Morrisons',
		receiptCode: 'MORR',
		color: '#007a33',
		priceIndex: 0.97,
		ownBrandLabel: 'Morrisons'
	},
	Aldi: {
		short: 'Aldi',
		receiptCode: 'ALDI',
		color: '#00005a',
		priceIndex: 0.82,
		ownBrandLabel: 'Aldi'
	},
	Lidl: {
		short: 'Lidl',
		receiptCode: 'LIDL',
		color: '#0050aa',
		priceIndex: 0.8,
		ownBrandLabel: 'Lidl'
	},
	Waitrose: {
		short: 'Waitrose',
		receiptCode: 'WAIT',
		color: '#7ab800',
		priceIndex: 1.15,
		ownBrandLabel: 'Waitrose'
	},
	'Co-op': {
		short: 'Co-op',
		receiptCode: 'CO-OP',
		color: '#00b1e7',
		priceIndex: 1.06,
		ownBrandLabel: 'Co-op'
	},
	'M&S': {
		short: 'M&S',
		receiptCode: 'M&S',
		color: '#1f1f1f',
		priceIndex: 1.18,
		ownBrandLabel: 'M&S'
	},
	Iceland: {
		short: 'Iceland',
		receiptCode: 'ICELAND',
		color: '#cc0000',
		priceIndex: 0.88,
		ownBrandLabel: 'Iceland'
	}
};

export type ProductClassDef = {
	key: string;
	name: string;
	category: string;
	icon: string;
	size: string;
	unit: string;
	basePrice: number;
	supermarkets?: readonly Supermarket[];
	brands?: {
		brand: string;
		itemName: string;
		size: string;
		basePrice: number;
		alias?: string;
	}[];
};

export const PRODUCT_CLASSES: ProductClassDef[] = [
	// Bakery
	{
		key: 'white-bread',
		name: 'White Bread',
		category: 'Bakery',
		icon: '🍞',
		size: '800g',
		unit: 'loaf',
		basePrice: 1.15,
		brands: [
			{ brand: 'Hovis', itemName: 'Hovis Soft White Bread', size: '800g', basePrice: 1.6 },
			{ brand: 'Warburtons', itemName: 'Warburtons Toastie White', size: '800g', basePrice: 1.75 }
		]
	},
	{
		key: 'wholemeal-bread',
		name: 'Wholemeal Bread',
		category: 'Bakery',
		icon: '🍞',
		size: '800g',
		unit: 'loaf',
		basePrice: 1.25,
		brands: [
			{ brand: 'Hovis', itemName: 'Hovis Wholemeal Bread', size: '800g', basePrice: 1.65 }
		]
	},
	{
		key: 'sourdough',
		name: 'Sourdough Loaf',
		category: 'Bakery',
		icon: '🥖',
		size: '500g',
		unit: 'loaf',
		basePrice: 3.2,
		brands: [
			{ brand: "Jason's", itemName: "Jason's Sourdough Loaf", size: '500g', basePrice: 3.5 }
		]
	},
	{
		key: 'bagels',
		name: 'Bagels',
		category: 'Bakery',
		icon: '🥯',
		size: '5 pack',
		unit: 'pack',
		basePrice: 1.85,
		brands: [
			{ brand: 'New York Bakery Co', itemName: 'New York Bagels', size: '5 pack', basePrice: 2.2 }
		]
	},
	{
		key: 'crumpets',
		name: 'Crumpets',
		category: 'Bakery',
		icon: '🥞',
		size: '6 pack',
		unit: 'pack',
		basePrice: 1.1,
		brands: [
			{ brand: 'Warburtons', itemName: 'Warburtons Crumpets', size: '6 pack', basePrice: 1.4 }
		]
	},
	{
		key: 'croissants',
		name: 'Croissants',
		category: 'Bakery',
		icon: '🥐',
		size: '4 pack',
		unit: 'pack',
		basePrice: 1.75
	},

	// Dairy & eggs
	{
		key: 'semi-skimmed-milk',
		name: 'Semi-Skimmed Milk',
		category: 'Dairy & Eggs',
		icon: '🥛',
		size: '2L',
		unit: 'bottle',
		basePrice: 1.45,
		brands: [
			{ brand: 'Cravendale', itemName: 'Cravendale Semi-Skimmed Milk', size: '2L', basePrice: 2.2 }
		]
	},
	{
		key: 'whole-milk',
		name: 'Whole Milk',
		category: 'Dairy & Eggs',
		icon: '🥛',
		size: '2L',
		unit: 'bottle',
		basePrice: 1.5
	},
	{
		key: 'oat-milk',
		name: 'Oat Milk',
		category: 'Dairy & Eggs',
		icon: '🌾',
		size: '1L',
		unit: 'carton',
		basePrice: 2.1,
		brands: [{ brand: 'Alpro', itemName: 'Alpro Oat Milk', size: '1L', basePrice: 2.4 }]
	},
	{
		key: 'free-range-eggs',
		name: 'Free-Range Eggs',
		category: 'Dairy & Eggs',
		icon: '🥚',
		size: '6 pack',
		unit: 'box',
		basePrice: 2.2,
		brands: [
			{ brand: 'Happy Egg Co', itemName: 'Happy Eggs Free-Range', size: '6 pack', basePrice: 2.8 }
		]
	},
	{
		key: 'butter',
		name: 'Butter',
		category: 'Dairy & Eggs',
		icon: '🧈',
		size: '250g',
		unit: 'block',
		basePrice: 2.3,
		brands: [{ brand: 'Lurpak', itemName: 'Lurpak Slightly Salted Butter', size: '250g', basePrice: 3 }]
	},
	{
		key: 'cheddar',
		name: 'Mature Cheddar',
		category: 'Dairy & Eggs',
		icon: '🧀',
		size: '400g',
		unit: 'block',
		basePrice: 3.6,
		brands: [
			{
				brand: 'Cathedral City',
				itemName: 'Cathedral City Mature Cheddar',
				size: '350g',
				basePrice: 4.5
			}
		]
	},
	{
		key: 'greek-yogurt',
		name: 'Greek Yogurt',
		category: 'Dairy & Eggs',
		icon: '🥣',
		size: '500g',
		unit: 'tub',
		basePrice: 2,
		brands: [{ brand: 'Fage', itemName: 'Fage Total Greek Yogurt', size: '500g', basePrice: 3.2 }]
	},
	{
		key: 'mozzarella',
		name: 'Mozzarella',
		category: 'Dairy & Eggs',
		icon: '🧀',
		size: '250g',
		unit: 'ball',
		basePrice: 1.1
	},

	// Fruit & veg
	{
		key: 'bananas',
		name: 'Bananas',
		category: 'Fruit & Veg',
		icon: '🍌',
		size: '1kg',
		unit: 'bunch',
		basePrice: 1.15
	},
	{
		key: 'apples',
		name: 'Apples',
		category: 'Fruit & Veg',
		icon: '🍎',
		size: '6 pack',
		unit: 'pack',
		basePrice: 2
	},
	{
		key: 'avocados',
		name: 'Avocados',
		category: 'Fruit & Veg',
		icon: '🥑',
		size: '2 pack',
		unit: 'pack',
		basePrice: 1.8
	},
	{
		key: 'tomatoes',
		name: 'Tomatoes',
		category: 'Fruit & Veg',
		icon: '🍅',
		size: '6 pack',
		unit: 'pack',
		basePrice: 1.3
	},
	{
		key: 'potatoes',
		name: 'Potatoes',
		category: 'Fruit & Veg',
		icon: '🥔',
		size: '2kg',
		unit: 'bag',
		basePrice: 1.75
	},
	{
		key: 'onions',
		name: 'Onions',
		category: 'Fruit & Veg',
		icon: '🧅',
		size: '1kg',
		unit: 'bag',
		basePrice: 1.1
	},
	{
		key: 'carrots',
		name: 'Carrots',
		category: 'Fruit & Veg',
		icon: '🥕',
		size: '1kg',
		unit: 'bag',
		basePrice: 0.75
	},
	{
		key: 'broccoli',
		name: 'Broccoli',
		category: 'Fruit & Veg',
		icon: '🥦',
		size: '1 head',
		unit: 'each',
		basePrice: 0.85
	},
	{
		key: 'cucumber',
		name: 'Cucumber',
		category: 'Fruit & Veg',
		icon: '🥒',
		size: 'each',
		unit: 'each',
		basePrice: 0.75
	},
	{
		key: 'lemons',
		name: 'Lemons',
		category: 'Fruit & Veg',
		icon: '🍋',
		size: '4 pack',
		unit: 'pack',
		basePrice: 1.25
	},

	// Meat & fish
	{
		key: 'chicken-breast',
		name: 'Chicken Breast Fillets',
		category: 'Meat & Fish',
		icon: '🍗',
		size: '600g',
		unit: 'pack',
		basePrice: 4.5
	},
	{
		key: 'beef-mince',
		name: 'Beef Mince 5%',
		category: 'Meat & Fish',
		icon: '🥩',
		size: '500g',
		unit: 'pack',
		basePrice: 4.25
	},
	{
		key: 'pork-sausages',
		name: 'Pork Sausages',
		category: 'Meat & Fish',
		icon: '🌭',
		size: '8 pack',
		unit: 'pack',
		basePrice: 3.2,
		brands: [
			{ brand: 'Richmond', itemName: 'Richmond Pork Sausages', size: '8 pack', basePrice: 3.5 }
		]
	},
	{
		key: 'bacon',
		name: 'Smoked Bacon',
		category: 'Meat & Fish',
		icon: '🥓',
		size: '300g',
		unit: 'pack',
		basePrice: 3,
		brands: [
			{ brand: 'Richmond', itemName: 'Richmond Smoked Bacon', size: '300g', basePrice: 3.5 }
		]
	},
	{
		key: 'salmon',
		name: 'Salmon Fillets',
		category: 'Meat & Fish',
		icon: '🐟',
		size: '2 pack',
		unit: 'pack',
		basePrice: 5.5,
		brands: [
			{
				brand: 'Loch Fyne',
				itemName: 'Loch Fyne Salmon Fillets',
				size: '2 pack',
				basePrice: 6.5
			}
		]
	},
	{
		key: 'fish-fingers',
		name: 'Fish Fingers',
		category: 'Meat & Fish',
		icon: '🐟',
		size: '10 pack',
		unit: 'pack',
		basePrice: 2.5,
		brands: [
			{ brand: 'Birds Eye', itemName: 'Birds Eye Fish Fingers', size: '10 pack', basePrice: 3.2 }
		]
	},

	// Cupboard
	{
		key: 'basmati-rice',
		name: 'Basmati Rice',
		category: 'Cupboard',
		icon: '🍚',
		size: '1kg',
		unit: 'bag',
		basePrice: 2.4
	},
	{
		key: 'pasta',
		name: 'Penne Pasta',
		category: 'Cupboard',
		icon: '🍝',
		size: '500g',
		unit: 'bag',
		basePrice: 1.1
	},
	{
		key: 'baked-beans',
		name: 'Baked Beans',
		category: 'Cupboard',
		icon: '🫘',
		size: '415g',
		unit: 'tin',
		basePrice: 0.85,
		brands: [{ brand: 'Heinz', itemName: 'Heinz Baked Beans', size: '415g', basePrice: 1.4 }]
	},
	{
		key: 'chopped-tomatoes',
		name: 'Chopped Tomatoes',
		category: 'Cupboard',
		icon: '🥫',
		size: '400g',
		unit: 'tin',
		basePrice: 0.65,
		brands: [
			{ brand: 'Napolina', itemName: 'Napolina Chopped Tomatoes', size: '400g', basePrice: 0.95 }
		]
	},
	{
		key: 'olive-oil',
		name: 'Olive Oil',
		category: 'Cupboard',
		icon: '🫒',
		size: '500ml',
		unit: 'bottle',
		basePrice: 4.5
	},
	{
		key: 'ketchup',
		name: 'Tomato Ketchup',
		category: 'Cupboard',
		icon: '🍅',
		size: '460g',
		unit: 'bottle',
		basePrice: 2,
		brands: [
			{ brand: 'Heinz', itemName: 'Heinz Tomato Ketchup', size: '460g', basePrice: 2.8 }
		]
	},
	{
		key: 'mayonnaise',
		name: 'Mayonnaise',
		category: 'Cupboard',
		icon: '🥚',
		size: '400g',
		unit: 'jar',
		basePrice: 1.75,
		brands: [
			{ brand: "Hellmann's", itemName: "Hellmann's Mayonnaise", size: '400g', basePrice: 2.6 }
		]
	},
	{
		key: 'cereal',
		name: 'Corn Flakes',
		category: 'Cupboard',
		icon: '🥣',
		size: '500g',
		unit: 'box',
		basePrice: 2.2,
		brands: [
			{
				brand: "Kellogg's",
				itemName: "Kellogg's Corn Flakes",
				size: '500g',
				basePrice: 2.8
			}
		]
	},
	{
		key: 'porridge-oats',
		name: 'Porridge Oats',
		category: 'Cupboard',
		icon: '🥣',
		size: '1kg',
		unit: 'bag',
		basePrice: 1.3,
		brands: [{ brand: 'Quaker', itemName: 'Quaker Porridge Oats', size: '1kg', basePrice: 2 }]
	},
	{
		key: 'tea',
		name: 'Tea Bags',
		category: 'Cupboard',
		icon: '🫖',
		size: '80 pack',
		unit: 'box',
		basePrice: 3.2,
		brands: [{ brand: 'PG Tips', itemName: 'PG Tips Tea Bags', size: '80 pack', basePrice: 3.8 }]
	},
	{
		key: 'coffee',
		name: 'Instant Coffee',
		category: 'Cupboard',
		icon: '☕',
		size: '200g',
		unit: 'jar',
		basePrice: 4.5,
		brands: [
			{ brand: 'Nescafé', itemName: 'Nescafé Original Coffee', size: '200g', basePrice: 5.5 }
		]
	},
	{
		key: 'orange-juice',
		name: 'Orange Juice',
		category: 'Drinks',
		icon: '🍊',
		size: '1L',
		unit: 'carton',
		basePrice: 1.6,
		brands: [
			{ brand: 'Tropicana', itemName: 'Tropicana Orange Juice', size: '1L', basePrice: 2.6 }
		]
	},
	{
		key: 'sparkling-water',
		name: 'Sparkling Water',
		category: 'Drinks',
		icon: '💧',
		size: '6x500ml',
		unit: 'pack',
		basePrice: 2
	},

	// Frozen
	{
		key: 'frozen-peas',
		name: 'Frozen Peas',
		category: 'Frozen',
		icon: '🟢',
		size: '1kg',
		unit: 'bag',
		basePrice: 1.6
	},
	{
		key: 'frozen-pizza',
		name: 'Margherita Pizza',
		category: 'Frozen',
		icon: '🍕',
		size: '350g',
		unit: 'pizza',
		basePrice: 3,
		brands: [
			{
				brand: 'Chicago Town',
				itemName: 'Chicago Town Margherita Pizza',
				size: '350g',
				basePrice: 3.5
			}
		]
	},
	{
		key: 'ice-cream',
		name: 'Vanilla Ice Cream',
		category: 'Frozen',
		icon: '🍨',
		size: '900ml',
		unit: 'tub',
		basePrice: 3.2,
		brands: [
			{ brand: "Ben & Jerry's", itemName: "Ben & Jerry's Vanilla Ice Cream", size: '465ml', basePrice: 4.5 }
		]
	},

	// Snacks
	{
		key: 'digestives',
		name: 'Digestive Biscuits',
		category: 'Snacks',
		icon: '🍪',
		size: '400g',
		unit: 'pack',
		basePrice: 1.5,
		brands: [
			{ brand: "McVitie's", itemName: "McVitie's Digestives", size: '400g', basePrice: 1.9 }
		]
	},
	{
		key: 'chocolate',
		name: 'Milk Chocolate',
		category: 'Snacks',
		icon: '🍫',
		size: '180g',
		unit: 'bar',
		basePrice: 2,
		brands: [
			{ brand: 'Cadbury', itemName: 'Cadbury Dairy Milk', size: '180g', basePrice: 2.5 }
		]
	},
	{
		key: 'crisps',
		name: 'Ready Salted Crisps',
		category: 'Snacks',
		icon: '🥔',
		size: '6 pack',
		unit: 'pack',
		basePrice: 1.75,
		brands: [
			{ brand: 'Walkers', itemName: 'Walkers Ready Salted Crisps', size: '6 pack', basePrice: 2.2 }
		]
	},

	// Household
	{
		key: 'toilet-roll',
		name: 'Toilet Roll',
		category: 'Household',
		icon: '🧻',
		size: '9 pack',
		unit: 'pack',
		basePrice: 4.5,
		brands: [{ brand: 'Andrex', itemName: 'Andrex Toilet Roll', size: '9 pack', basePrice: 6 }]
	},
	{
		key: 'washing-up-liquid',
		name: 'Washing-Up Liquid',
		category: 'Household',
		icon: '🧴',
		size: '500ml',
		unit: 'bottle',
		basePrice: 1.5,
		brands: [
			{ brand: 'Fairy', itemName: 'Fairy Washing-Up Liquid', size: '500ml', basePrice: 2.2 }
		]
	},
	{
		key: 'dishwasher-tablets',
		name: 'Dishwasher Tablets',
		category: 'Household',
		icon: '🧼',
		size: '30 pack',
		unit: 'pack',
		basePrice: 6,
		brands: [
			{ brand: 'Finish', itemName: 'Finish Dishwasher Tablets', size: '30 pack', basePrice: 8 }
		]
	},

	// Pets
	{
		key: 'cat-food',
		name: 'Cat Food',
		category: 'Pets',
		icon: '🐱',
		size: '12 pack',
		unit: 'pack',
		basePrice: 5.5,
		brands: [{ brand: 'Whiskas', itemName: 'Whiskas Cat Food', size: '12 pack', basePrice: 6.5 }]
	},
	{
		key: 'dog-food',
		name: 'Dog Food',
		category: 'Pets',
		icon: '🐶',
		size: '12 pack',
		unit: 'pack',
		basePrice: 6.5,
		brands: [
			{ brand: 'Pedigree', itemName: 'Pedigree Dog Food', size: '12 pack', basePrice: 7.5 }
		]
	}
];

export type CatalogProduct = {
	key: string;
	classKey: string;
	className: string;
	category: string;
	icon: string;
	itemName: string;
	brand: string | null;
	size: string;
	unit: string;
	supermarket: Supermarket | null;
	isOwnBrand: boolean;
	basePrice: number;
};

function slug(value: string) {
	return value
		.toLowerCase()
		.replace(/&/g, 'and')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

export function buildCatalog(): CatalogProduct[] {
	const out: CatalogProduct[] = [];
	for (const cls of PRODUCT_CLASSES) {
		const supermarkets = cls.supermarkets ?? ALL_SUPERMARKETS;
		for (const supermarket of supermarkets) {
			const meta = SUPERMARKET_META[supermarket];
			out.push({
				key: `${cls.key}--${slug(supermarket)}`,
				classKey: cls.key,
				className: cls.name,
				category: cls.category,
				icon: cls.icon,
				itemName: `${meta.ownBrandLabel} ${cls.name}`,
				brand: meta.ownBrandLabel,
				size: cls.size,
				unit: cls.unit,
				supermarket,
				isOwnBrand: true,
				basePrice: Math.round(cls.basePrice * meta.priceIndex * 100) / 100
			});
		}
		for (const brand of cls.brands ?? []) {
			out.push({
				key: `${cls.key}--${slug(brand.brand)}`,
				classKey: cls.key,
				className: cls.name,
				category: cls.category,
				icon: cls.icon,
				itemName: brand.itemName,
				brand: brand.brand,
				size: brand.size,
				unit: cls.unit,
				supermarket: null,
				isOwnBrand: false,
				basePrice: brand.basePrice
			});
		}
	}
	return out;
}

export function receiptAlias(product: CatalogProduct, supermarket: Supermarket): string {
	const meta = SUPERMARKET_META[supermarket];
	if (product.isOwnBrand) {
		return `${meta.receiptCode} ${product.className.toUpperCase()} ${product.size.toUpperCase()}`;
	}
	const brand = (product.brand ?? '').toUpperCase();
	const shortName = product.itemName
		.toUpperCase()
		.replace(new RegExp(`^${brand}\\s*`), '')
		.replace(/[^A-Z0-9 ]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return `${brand} ${shortName} ${product.size.toUpperCase()}`.trim();
}

export const CATEGORIES = [...new Set(PRODUCT_CLASSES.map((c) => c.category))];
