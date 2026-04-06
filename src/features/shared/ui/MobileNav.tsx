import * as React from 'react';
import { Link } from 'react-router-dom';
import { SHOES } from '../../../constants';
import { ADMIN_ROUTE_PATHS } from '../../admin/app/adminRoutes';
import { useOverlayA11y } from '../hooks/useOverlayA11y';
import { scrollToSection } from '../utils/scrollToSection';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  setFilter: (filter: string) => void;
  activeFilter: string;
  onOpenCart: () => void;
  onOpenProfile: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  setFilter,
  activeFilter,
  onOpenCart,
  onOpenProfile,
}) => {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const brands = ['All', 'New Arrivals', ...new Set(SHOES.map((shoe) => shoe.brand))];
  const overlayStateClass = isOpen
    ? 'visible pointer-events-auto opacity-100'
    : 'invisible pointer-events-none opacity-0';
  const panelStateClass = isOpen
    ? 'visible pointer-events-auto translate-x-0 opacity-100'
    : 'invisible pointer-events-none -translate-x-8 opacity-0';

  useOverlayA11y({
    containerRef: panelRef,
    initialFocusSelector: '[data-overlay-close="true"]',
    isOpen,
    onClose,
  });

  const goToCollection = (brand: string) => {
    setFilter(brand);
    onClose();
    scrollToSection('collection');
  };

  const goToSection = (sectionId: string) => {
    onClose();
    scrollToSection(sectionId);
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[100] bg-[rgba(15,23,42,0.35)] backdrop-blur-[2px] transition-opacity duration-300 ${overlayStateClass}`}
        aria-hidden={!isOpen}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-nav-title"
        aria-hidden={!isOpen}
        className={`fixed top-0 left-0 bottom-0 z-[101] w-[90%] max-w-sm border-r border-zinc-200 bg-[linear-gradient(180deg,rgba(253,252,249,0.98),rgba(248,244,236,0.98))] shadow-[0_24px_80px_rgba(15,23,42,0.28)] transition-all duration-300 md:w-[24rem] md:max-w-none ${panelStateClass}`}
        tabIndex={-1}
      >
        <div className="flex h-full flex-col overflow-y-auto p-6 md:p-7">
          <div className="mb-8 flex items-center justify-between border-b border-zinc-200/80 pb-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                Curated Footwear
              </p>
              <p id="mobile-nav-title" className="text-2xl font-black tracking-tight text-zinc-950">
                Velosnak Atelier
              </p>
            </div>
            <button
              data-overlay-close="true"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition hover:border-zinc-300 hover:text-zinc-950"
              aria-label="Close navigation"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-2">
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">
              Shop by brand
            </p>
            {brands.map((brand) => (
              <button
                key={brand}
                onClick={() => goToCollection(brand)}
                className={`w-full rounded-2xl px-5 py-4 text-left text-sm font-black uppercase tracking-[0.22em] transition ${
                  activeFilter === brand
                    ? 'bg-zinc-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.15)]'
                    : 'bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
                }`}
              >
                {brand}
              </button>
            ))}
          </div>

          <div className="mt-8 space-y-2 border-t border-zinc-200/80 pt-6">
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">
              Explore storefront
            </p>
            <button
              onClick={() => goToSection('collection')}
              className="w-full rounded-2xl bg-white px-5 py-4 text-left text-sm font-black uppercase tracking-[0.22em] text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
            >
              Collection
            </button>
            <button
              onClick={() => goToSection('promise')}
              className="w-full rounded-2xl bg-white px-5 py-4 text-left text-sm font-black uppercase tracking-[0.22em] text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
            >
              Why shop us
            </button>
            <button
              onClick={() => goToSection('faq')}
              className="w-full rounded-2xl bg-white px-5 py-4 text-left text-sm font-black uppercase tracking-[0.22em] text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
            >
              FAQ
            </button>
            <Link
              to="/why-us-faq"
              onClick={onClose}
              className="block w-full rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-left text-sm font-black uppercase tracking-[0.22em] text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-950"
            >
              Why us + FAQ page
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 border-t border-zinc-200/80 pt-6">
            <button
              onClick={() => {
                onClose();
                onOpenCart();
              }}
              className="rounded-3xl bg-zinc-950 px-5 py-4 text-left text-white shadow-[0_18px_40px_rgba(15,23,42,0.15)]"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-300">Bag</p>
              <p className="mt-1 text-lg font-black">View bag</p>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenProfile();
              }}
              className="rounded-3xl border border-zinc-200 bg-white px-5 py-4 text-left text-zinc-950"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Account</p>
              <p className="mt-1 text-lg font-black">Saved styles and orders</p>
            </button>

            <Link
              to={ADMIN_ROUTE_PATHS.dashboard}
              onClick={onClose}
              className="rounded-3xl border border-zinc-200 bg-transparent px-5 py-4 text-left text-zinc-600 transition hover:border-zinc-300 hover:bg-white hover:text-zinc-950"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Studio</p>
              <p className="mt-1 text-lg font-black">Open owner panel</p>
            </Link>
          </div>

          <div className="mt-8 rounded-[2rem] border border-zinc-200 bg-white p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">
              Store promise
            </p>
            <p className="mt-2 text-lg font-black tracking-tight text-zinc-950">
              Free shipping over $300 and simple size exchanges.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileNav;
