// Sample/default stall data used for local Phase-1 development and client
// review. Mirrors the JSON data model from the spec exactly (minus the
// media-attachment IDs, which don't exist outside WordPress yet - image
// uploads are handled as local object URLs instead, see useStallImages).

export const mockStallData = {
  business_name: "Marigold & Vine Preserves",
  seller: {
    name: 'Amara Whitlock',
    selfie_id: null,
    about:
      "I've been putting up jams and pickles since I was tall enough to reach the stove. Everything here is small-batch, seasonal, and made in my own kitchen.",
    ambition:
      'One day I want a little bricks-and-mortar shop on the high street where people can taste before they buy, and maybe run preserving workshops on weekends.',
  },
  pitch: {
    number: 'VM 2026 A',
    location: 'North Court, Stall 4',
    member_since: 'May 2024',
    product_count: 4,
    rating: 4.6,
    review_count: 128,
  },
  products: [
    { product_id: 101, image_id: null, name: 'Spiced Plum Jam', description: '340g jar', price: '£6.50' },
    { product_id: 102, image_id: null, name: 'Smoky Pickled Onions', description: '250g jar', price: '£4.00' },
    { product_id: 103, image_id: null, name: 'Honey & Thyme Marmalade', description: '340g jar', price: '£7.00' },
    { product_id: 104, image_id: null, name: 'Chilli Lime Chutney', description: '300g jar', price: '£5.50' },
  ],
  generated_image_id: null,
};

export function createEmptyStallData() {
  return {
    business_name: '',
    seller: { name: '', selfie_id: null, about: '', ambition: '' },
    pitch: {
      number: '',
      location: '',
      member_since: '',
      product_count: 0,
      rating: 0,
      review_count: 0,
    },
    products: [],
    generated_image_id: null,
  };
}
