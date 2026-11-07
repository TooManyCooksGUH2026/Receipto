import type { Supermarket } from './catalog';

type City = {
	city: string;
	region: string;
	lat: number;
	lng: number;
	postcodePrefix: string;
	chains: Supermarket[];
};

const CITIES: City[] = [
	{
		city: 'London',
		region: 'Greater London',
		lat: 51.5074,
		lng: -0.1278,
		postcodePrefix: 'EC',
		chains: ['Tesco', "Sainsbury's", 'Asda', 'Aldi', 'Waitrose', 'Co-op', 'M&S']
	},
	{
		city: 'Manchester',
		region: 'North West',
		lat: 53.4808,
		lng: -2.2426,
		postcodePrefix: 'M',
		chains: ['Tesco', "Sainsbury's", 'Asda', 'Aldi', 'Lidl', 'Morrisons']
	},
	{
		city: 'Birmingham',
		region: 'West Midlands',
		lat: 52.4862,
		lng: -1.8904,
		postcodePrefix: 'B',
		chains: ['Tesco', "Sainsbury's", 'Asda', 'Aldi', 'Lidl', 'Morrisons']
	},
	{
		city: 'Leeds',
		region: 'Yorkshire and the Humber',
		lat: 53.8008,
		lng: -1.5491,
		postcodePrefix: 'LS',
		chains: ['Tesco', "Sainsbury's", 'Asda', 'Aldi', 'Morrisons', 'Waitrose']
	},
	{
		city: 'Bristol',
		region: 'South West',
		lat: 51.4545,
		lng: -2.5879,
		postcodePrefix: 'BS',
		chains: ['Tesco', "Sainsbury's", 'Asda', 'Aldi', 'Co-op', 'Waitrose']
	},
	{
		city: 'Liverpool',
		region: 'North West',
		lat: 53.4084,
		lng: -2.9916,
		postcodePrefix: 'L',
		chains: ['Tesco', "Sainsbury's", 'Asda', 'Aldi', 'Lidl', 'Morrisons']
	},
	{
		city: 'Sheffield',
		region: 'Yorkshire and the Humber',
		lat: 53.3811,
		lng: -1.4701,
		postcodePrefix: 'S',
		chains: ['Tesco', "Sainsbury's", 'Asda', 'Aldi', 'Morrisons', 'Iceland']
	},
	{
		city: 'Newcastle upon Tyne',
		region: 'North East',
		lat: 54.9783,
		lng: -1.6178,
		postcodePrefix: 'NE',
		chains: ['Tesco', "Sainsbury's", 'Asda', 'Aldi', 'Lidl', 'Morrisons']
	},
	{
		city: 'Edinburgh',
		region: 'Scotland',
		lat: 55.9533,
		lng: -3.1883,
		postcodePrefix: 'EH',
		chains: ['Tesco', "Sainsbury's", 'Asda', 'Aldi', 'Lidl', 'Waitrose']
	},
	{
		city: 'Glasgow',
		region: 'Scotland',
		lat: 55.8642,
		lng: -4.2518,
		postcodePrefix: 'G',
		chains: ['Tesco', "Sainsbury's", 'Asda', 'Aldi', 'Lidl', 'Morrisons']
	},
	{
		city: 'Cardiff',
		region: 'Wales',
		lat: 51.4816,
		lng: -3.1791,
		postcodePrefix: 'CF',
		chains: ['Tesco', "Sainsbury's", 'Asda', 'Aldi', 'Lidl', 'Co-op']
	},
	{
		city: 'Brighton',
		region: 'South East',
		lat: 50.8225,
		lng: -0.1372,
		postcodePrefix: 'BN',
		chains: ['Tesco', "Sainsbury's", 'Asda', 'Aldi', 'Waitrose', 'Co-op']
	}
];

const OFFSETS: [number, number][] = [
	[0.008, 0.004],
	[-0.007, 0.009],
	[0.011, -0.008],
	[-0.012, -0.006],
	[0.003, -0.013],
	[0.016, 0.012],
	[-0.017, 0.002]
];

export type ShopSeed = {
	shopName: string;
	supermarketName: Supermarket;
	area?: string | null;
	brand: string;
	lat: number;
	lng: number;
	address: string | null;
	city: string;
	region: string;
	postcode: string | null;
	osmId: string | null;
	osmType: string | null;
};

/**
 * Curated approximate locations used when the Overpass import has not been run.
 * These are deliberately spread around each city centre so the prototype map
 * always has useful coverage.
 */
export const FALLBACK_SHOPS: ShopSeed[] = CITIES.flatMap((city) =>
	city.chains.map((chain, index) => {
		const [dLat, dLng] = OFFSETS[index % OFFSETS.length];
		const branch = ['Central', 'High Street', 'Market Square', 'Station Road', 'The Parade', 'Riverside', 'Green Lane'][index % 7];
		return {
			shopName: `${chain} ${city.city} ${branch}`,
			supermarketName: chain,
			area: branch,
			brand: chain,
			lat: Number((city.lat + dLat).toFixed(6)),
			lng: Number((city.lng + dLng).toFixed(6)),
			address: `${branch}, ${city.city}`,
			city: city.city,
			region: city.region,
			postcode: `${city.postcodePrefix}${(index + 1) * 2} ${index + 1}AB`,
			osmId: null,
			osmType: null
		};
	})
);
