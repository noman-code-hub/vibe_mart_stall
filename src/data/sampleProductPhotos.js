// Real-looking sample product photos for the Phase-1 demo, replacing the
// flat placeholder swatches. Order matches mockStallData.products.
import spicedPlumJam from '../assets/products/spiced-plum-jam.png';
import smokyPickledOnions from '../assets/products/smoky-pickled-onions.png';
import honeyThymeMarmalade from '../assets/products/honey-thyme-marmalade.png';
import chilliLimeChutney from '../assets/products/chilli-lime-chutney.png';

const SAMPLE_PRODUCT_PHOTOS = [spicedPlumJam, smokyPickledOnions, honeyThymeMarmalade, chilliLimeChutney];

export function sampleProductPhoto(index) {
  return SAMPLE_PRODUCT_PHOTOS[index % SAMPLE_PRODUCT_PHOTOS.length];
}
