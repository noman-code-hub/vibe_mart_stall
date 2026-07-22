import { useEffect, useMemo, useState } from 'react';
import StallEditorForm from './components/StallEditorForm';
import MarketStall from './components/MarketStall';
import BackgroundRemovalTool from './components/BackgroundRemovalTool';
import { mockStallData, createEmptyStallData } from './data/mockStallData';
import { sellerPlaceholder } from './data/placeholderImages';
import { sampleProductPhoto } from './data/sampleProductPhotos';
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

function sampleProductSlots() {
  return mockStallData.products.map((p, i) => ({
    name: p.name,
    description: p.description,
    price: p.price,
    file: sampleProductPhoto(i),
  }));
}

function App() {
  const [step, setStep] = useState('edit'); // 'edit' | 'finished'
  const [data, setData] = useState(() => toFormData(mockStallData));
  const [selfieFile, setSelfieFile] = useState(() => sellerPlaceholder());
  const [productSlots, setProductSlots] = useState(sampleProductSlots);
  const [selectedProductIndex, setSelectedProductIndex] = useState(null);

  const handleLoadSample = () => {
    setData(toFormData(mockStallData));
    setSelfieFile(sellerPlaceholder());
    setProductSlots(sampleProductSlots());
  };

  const handleClearAll = () => {
    setData(toFormData(createEmptyStallData()));
    setSelfieFile(null);
    setProductSlots([]);
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
        <p>
          Phase 1: local build against mock/sample data for client review. Nothing here talks to
          WordPress yet — the "Generate" REST call and PHP/Imagick render land in Phase 2, after
          sign-off on this layout.
        </p>
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
          onLoadSample={handleLoadSample}
          onClearAll={handleClearAll}
        />
        <BackgroundRemovalTool onApplyToSelfie={setSelfieFile} />
        <div className="app__generate-row">
          <button type="button" className="app__generate-btn" onClick={() => setStep('finished')}>
            Generate Stall →
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
