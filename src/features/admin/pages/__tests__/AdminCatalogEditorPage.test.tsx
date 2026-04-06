import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminCatalogEditorPage from '../AdminCatalogEditorPage';
import type { AdminProductEditorDraft } from '../../shared/types';

const mockedCatalogEditorService = vi.hoisted(() => ({
  createEmptyDraft: vi.fn(),
  getProductDraft: vi.fn(),
  saveDraft: vi.fn(),
  publishDraft: vi.fn(),
  unpublishDraft: vi.fn(),
}));

vi.mock('../../shared/services', () => ({
  adminCatalogEditorService: mockedCatalogEditorService,
}));

const buildDraft = (overrides: Partial<AdminProductEditorDraft> = {}): AdminProductEditorDraft => ({
  id: '1',
  name: 'Phantom Velocity X',
  brand: 'VeloSnak Elite',
  category: 'Performance',
  colorway: 'Midnight / Cyan Spark',
  price: 295,
  compareAtPrice: 340,
  stockStatus: 'In stock',
  quantityOnHand: 20,
  sizes: ['US 8', 'US 9'],
  materials: ['Prime-knit upper'],
  shortBlurb: 'Reliable comfort for daily rotation.',
  description: 'A premium runner with stable cushioning and confident grip for all-day wear.',
  image: 'https://example.com/hero.jpg',
  modelUrl: 'https://example.com/model.glb',
  publishState: 'Draft',
  ...overrides,
});

const renderEditor = (initialEntries: Array<string | { pathname: string; state?: unknown }> = ['/admin/catalog/1/edit']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/admin/catalog/new" element={<AdminCatalogEditorPage />} />
        <Route path="/admin/catalog/:productId/edit" element={<AdminCatalogEditorPage />} />
        <Route path="/admin/catalog" element={<div>Catalog Route</div>} />
      </Routes>
    </MemoryRouter>
  );

const getHeroImage = (container: HTMLElement) => container.querySelector('img[alt*="hero preview"]') as HTMLImageElement | null;

const getModelViewer = (container: HTMLElement) => container.querySelector('model-viewer') as HTMLElement | null;

const loadMediaPreviews = async (container: HTMLElement) => {
  const heroImage = getHeroImage(container);
  const modelViewer = getModelViewer(container);

  expect(heroImage).not.toBeNull();
  expect(modelViewer).not.toBeNull();

  fireEvent.load(heroImage as HTMLImageElement);
  fireEvent.load(modelViewer as HTMLElement);

  await waitFor(() => {
    expect(screen.getByText('Hero: Ready')).toBeInTheDocument();
    expect(screen.getByText('3D: Ready')).toBeInTheDocument();
  });
};

describe('AdminCatalogEditorPage', () => {
  beforeEach(() => {
    mockedCatalogEditorService.createEmptyDraft.mockReturnValue(buildDraft({
      id: 'new-draft',
      name: '',
      brand: '',
      category: '',
      colorway: '',
      price: 0,
      compareAtPrice: 0,
      sizes: [],
      materials: [],
      shortBlurb: '',
      description: '',
      image: '',
      modelUrl: '',
    }));
    mockedCatalogEditorService.getProductDraft.mockResolvedValue(buildDraft());
    mockedCatalogEditorService.saveDraft.mockResolvedValue({
      savedAt: '2026-03-25T08:00:00.000Z',
      draft: buildDraft(),
    });
    mockedCatalogEditorService.publishDraft.mockResolvedValue({
      publishedAt: '2026-03-25T08:05:00.000Z',
      draft: buildDraft({ publishState: 'Published' }),
    });
    mockedCatalogEditorService.unpublishDraft.mockResolvedValue({
      unpublishedAt: '2026-03-25T08:10:00.000Z',
      draft: buildDraft({ publishState: 'Draft' }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('publishes a valid draft from the editor workflow', async () => {
    renderEditor();

    await screen.findByText(/draft id: 1/i);
    fireEvent.click(screen.getByRole('button', { name: /^publish$/i }));

    await waitFor(() => {
      expect(mockedCatalogEditorService.publishDraft).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText(/product published at/i)).toBeInTheDocument();
    expect(screen.getByText(/visible on storefront routes/i)).toBeInTheDocument();
  });

  it('blocks publishing when publish-readiness has blocking issues', async () => {
    mockedCatalogEditorService.getProductDraft.mockResolvedValueOnce(buildDraft({ modelUrl: '' }));
    renderEditor();

    await screen.findByText(/draft id: 1/i);
    fireEvent.click(screen.getByRole('button', { name: /^publish$/i }));

    expect(mockedCatalogEditorService.publishDraft).not.toHaveBeenCalled();
    expect(await screen.findByText(/cannot publish/i)).toBeInTheDocument();
  });

  it('shows draft setup guidance on a fresh create route', async () => {
    renderEditor(['/admin/catalog/new']);

    await screen.findByText(/draft id: new-draft/i);
    expect(
      screen.getByText(/new drafts start off-storefront\. save whenever you want, then publish once the required fields and media checks are complete\./i)
    ).toBeInTheDocument();
    expect(screen.getAllByText('Not started').length).toBeGreaterThan(0);
    expect(screen.getByText('Draft setup')).toBeInTheDocument();
  });

  it('shows the duplicate handoff notice when arriving from the catalog list', async () => {
    renderEditor([
      {
        pathname: '/admin/catalog/1/edit',
        state: {
          catalogEditorNotice: {
            message: 'Duplicated "Phantom Velocity X" at 8:00 AM. The new copy opened as a draft.',
            tone: 'success',
          },
        },
      },
    ]);

    await screen.findByText(/draft id: 1/i);
    expect(await screen.findByText(/the new copy opened as a draft/i)).toBeInTheDocument();
  });

  it('protects unsaved changes before leaving the editor route', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderEditor();

    await screen.findByText(/draft id: 1/i);
    fireEvent.change(screen.getByLabelText(/product name/i), {
      target: { value: 'Phantom Velocity X Mark II' },
    });

    fireEvent.click(screen.getByRole('button', { name: /back to catalog/i }));
    expect(confirmSpy).toHaveBeenCalledWith('You have unsaved changes. Leave editor anyway?');
    expect(screen.queryByText('Catalog Route')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /back to catalog/i }));
    expect(await screen.findByText('Catalog Route')).toBeInTheDocument();
  });

  it('marks valid media as ready after preview load events', async () => {
    const { container } = renderEditor();

    await screen.findByText(/draft id: 1/i);
    await loadMediaPreviews(container);
  });

  it('keeps media readiness stable when non-media fields change', async () => {
    const { container } = renderEditor();

    await screen.findByText(/draft id: 1/i);
    await loadMediaPreviews(container);

    fireEvent.change(screen.getByLabelText(/brand/i), {
      target: { value: 'Phantom Velocity X Mark II' },
    });

    await waitFor(() => {
      expect(screen.getByText('Hero: Ready')).toBeInTheDocument();
      expect(screen.getByText('3D: Ready')).toBeInTheDocument();
      expect(screen.queryByText('Hero: loading')).not.toBeInTheDocument();
      expect(screen.queryByText('3D: loading')).not.toBeInTheDocument();
    });
  });

  it('restarts hero readiness when the hero url changes and resolves after a load event', async () => {
    const { container } = renderEditor();

    await screen.findByText(/draft id: 1/i);
    await loadMediaPreviews(container);

    fireEvent.change(screen.getByLabelText(/hero image url/i), {
      target: { value: 'https://example.com/hero-next.jpg' },
    });

    await waitFor(() => {
      expect(screen.getByText('Hero: loading')).toBeInTheDocument();
    });

    const updatedHeroImage = getHeroImage(container);
    expect(updatedHeroImage).not.toBeNull();

    fireEvent.load(updatedHeroImage as HTMLImageElement);

    await waitFor(() => {
      expect(screen.getByText('Hero: Ready')).toBeInTheDocument();
    });
  });

  it('marks hero readiness as error when the hero preview fails to load', async () => {
    const { container } = renderEditor();

    await screen.findByText(/draft id: 1/i);

    fireEvent.change(screen.getByLabelText(/hero image url/i), {
      target: { value: 'https://example.com/broken-hero.jpg' },
    });

    await waitFor(() => {
      expect(screen.getByText('Hero: loading')).toBeInTheDocument();
    });

    const brokenHeroImage = getHeroImage(container);
    expect(brokenHeroImage).not.toBeNull();

    fireEvent.error(brokenHeroImage as HTMLImageElement);

    await waitFor(() => {
      expect(screen.getByText('Hero: error')).toBeInTheDocument();
    });
  });

  it('renders an error-oriented shell for missing edit routes', async () => {
    mockedCatalogEditorService.getProductDraft.mockResolvedValueOnce(null);
    renderEditor(['/admin/catalog/99999/edit']);

    expect(await screen.findByText(/unable to load this product draft\./i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /product unavailable/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /edit product 99999/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^publish$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^unpublish$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^save draft$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^save changes$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /return to catalog/i })).toBeInTheDocument();
  });
});
