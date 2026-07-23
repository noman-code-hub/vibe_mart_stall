import { useEffect, useMemo, useState } from 'react';
import StallEditorForm from './components/StallEditorForm';
import MarketStall from './components/MarketStall';
import StallLoadingScreen from './components/StallLoadingScreen';
import { createEmptyStallData } from './data/stallData';
import stallCart from './assets/stall-cart.png';
import './App.css';

// ---------------------------------------------------------------------------
// Stable object-URL hook — must live here (App never unmounts between steps)
// so the URL isn't revoked when the editor form unmounts on "Generate Stall".
// ---------------------------------------------------------------------------
function useStableFileUrl(source) {
  const isBlobLike = Boolean(source) && typeof source !== 'string';
  const objectUrl = useMemo(
    () => (isBlobLike ? URL.createObjectURL(source) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source]
  );
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  if (!source) return null;
  if (typeof source === 'string') return source;
  return objectUrl;
}

function preloadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve();
      return;
    }
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

function toFormData(stall) {
  return {
    business_name: stall.business_name,
    seller: {
      name: stall.seller.name,
      about: stall.seller.about,
      ambition: stall.seller.ambition,
    },
    pitch: { ...stall.pitch },
  };
}

function App() {
  const [step, setStep] = useState('edit'); // 'edit' | 'loading' | 'finished'
  const [data, setData] = useState(() => toFormData(createEmptyStallData()));
  const [selfieFile, setSelfieFile] = useState(null);
  const [productSlots, setProductSlots] = useState([]);
  const [selectedProductIndex, setSelectedProductIndex] = useState(null);

  const handleClearAll = () => {
    setData(toFormData(createEmptyStallData()));
    setSelfieFile(null);
    setProductSlots([]);
    setSelectedProductIndex(null);
  };

  const selfieUrl = useStableFileUrl(selfieFile);
  const productUrl0 = useStableFileUrl(productSlots[0]?.file ?? null);
  const productUrl1 = useStableFileUrl(productSlots[1]?.file ?? null);
  const productUrl2 = useStableFileUrl(productSlots[2]?.file ?? null);
  const productUrl3 = useStableFileUrl(productSlots[3]?.file ?? null);
  const resolvedProductUrls = [productUrl0, productUrl1, productUrl2, productUrl3];

  const stallProducts = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => {
        const slot = productSlots[i];
        if (!slot) {
          return { id: i, title: `Product ${i + 1}`, image: null, description: '', price: '' };
        }
        return {
          id: i,
          title: `Product ${i + 1}`,
          name: slot.name ?? '',
          label: slot.description ?? '',
          image: resolvedProductUrls[i] ?? null,
          price: slot.price ?? '',
        };
      }),
    [productSlots, resolvedProductUrls]
  );

  const handleGenerateStall = async () => {
    setStep('loading');

    // Stall cart is large — wait until it (and any uploaded photos) are ready
    // so the finished view does not flash a blank brown background.
    const assets = [stallCart, selfieUrl, ...resolvedProductUrls].filter(Boolean);
    await Promise.all(assets.map(preloadImage));

    setStep('finished');
  };

  if (step === 'loading') {
    return (
      <div className="app app--finished">
        <StallLoadingScreen />
      </div>
    );
  }

  if (step === 'finished') {
    return (
      <div className="app app--finished">
        <div className="app__finished-toolbar">
          <button type="button" className="app__edit-btn" onClick={() => setStep('edit')}>
            ← Edit
          </button>
        </div>
        <MarketStall
          businessName={data.business_name}
          products={stallProducts}
          seller={data.seller}
          pitch={data.pitch}
          selfieUrl={selfieUrl}
          selfieAlt={data.seller?.name}
          selectedProductIndex={selectedProductIndex}
          onProductClick={(index) =>
            setSelectedProductIndex((prev) => (prev === index ? null : index))
          }
        />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>Vibe Mart — Stall Editor</h1>
        <p>Fill in your stall details, upload photos, then generate your market stall.</p>
      </header>

      <div className="app__form-wrap">
        <StallEditorForm
          data={data}
          onDataChange={setData}
          selfieFile={selfieFile}
          onSelfieChange={setSelfieFile}
          onSelfieClear={() => setSelfieFile(null)}
          productSlots={productSlots}
          onProductSlotsChange={setProductSlots}
          onClearAll={handleClearAll}
        />
        <div className="app__generate-row">
          <button type="button" className="app__generate-btn" onClick={handleGenerateStall}>
            Generate Stall →
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
