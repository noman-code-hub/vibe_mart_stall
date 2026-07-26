import sellerSelfie from '../assets/demo/seller-selfie.png';
import spicedPlumJam from '../assets/products/spiced-plum-jam.png';
import smokyPickledOnions from '../assets/products/smoky-pickled-onions.png';
import honeyThymeMarmalade from '../assets/products/honey-thyme-marmalade.png';
import chilliLimeChutney from '../assets/products/chilli-lime-chutney.png';

/** Demo stall copy — kept within FIELD_LIMITS for overlay fit. */
export const demoStallData = {
  business_name: 'Marigold & Vine',
  seller: {
    name: 'Amara Whitlock',
    selfie_id: null,
    about:
      "I've made jams and pickles since I could reach the stove. Everything here is small-batch and seasonal.",
    ambition:
      'One day I want a little high-street shop where people can taste before they buy.',
  },
  pitch: {
    number: 'VM 2026 A',
    location: 'North Court Stall 4',
    member_since: 'May 2024',
    product_count: 4,
    rating: 4.6,
    review_count: 128,
  },
  products: [
    { name: 'Spiced Plum Jam', description: '340g jar', price: '£6.50' },
    { name: 'Pickled Onions', description: '250g jar', price: '£4.00' },
    { name: 'Honey Marmalade', description: '340g jar', price: '£7.00' },
    { name: 'Chilli Chutney', description: '300g jar', price: '£5.50' },
  ],
  generated_image_id: null,
};

const DEMO_PRODUCT_PHOTOS = [
  spicedPlumJam,
  smokyPickledOnions,
  honeyThymeMarmalade,
  chilliLimeChutney,
];

export function demoSelfieUrl() {
  return sellerSelfie;
}

export function demoProductSlots() {
  return demoStallData.products.map((p, i) => ({
    name: p.name,
    description: p.description,
    price: p.price,
    file: DEMO_PRODUCT_PHOTOS[i % DEMO_PRODUCT_PHOTOS.length],
  }));
}
