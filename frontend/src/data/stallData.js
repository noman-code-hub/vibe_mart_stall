/** Empty stall shape used when starting fresh or clearing the form. */
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
