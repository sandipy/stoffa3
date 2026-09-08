import React, { useState } from 'react';
import {
  Camera,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Folder,
  Image as ImageIcon,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useCommerce } from '../../context/CommerceContext';
import { downloadAllHeroImagesZip, downloadCustomImagesZip, ZipItem } from '../../utils/zipDownloader';
import { DEFAULT_HERO_PAIRINGS } from '../../data/heroPairingsData';

export const AdminMediaTools: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const {
    setIsMediaGalleryOpen,
    setIsHeroCsvModalOpen,
    openPageHeroManager,
    setIsPairingCuratorOpen,
    heroSlides,
    products,
  } = useCommerce();

  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleDownloadAllZip = async () => {
    try {
      setDownloadProgress('Preparing high-resolution images ZIP...');
      await downloadAllHeroImagesZip((curr, total, msg) => {
        setDownloadProgress(msg);
      });
      setTimeout(() => setDownloadProgress(null), 3500);
    } catch (err: any) {
      setDownloadProgress('Error creating ZIP: ' + (err?.message || 'Download failed'));
      setTimeout(() => setDownloadProgress(null), 4000);
    }
  };

  const handleDownloadSeatedZip = async () => {
    try {
      setDownloadProgress('Downloading Seated & Lounging Shoot ZIP...');
      const seatedItems: ZipItem[] = DEFAULT_HERO_PAIRINGS.filter(
        (p) => p.category === 'Seated Hero' || p.cleanFilename.includes('seated')
      ).map((p) => ({
        filename: p.cleanFilename,
        url: p.imageSrc,
      }));

      await downloadCustomImagesZip(
        seatedItems.length > 0 ? seatedItems : DEFAULT_HERO_PAIRINGS.slice(0, 10).map((p) => ({ filename: p.cleanFilename, url: p.imageSrc })),
        'stoffa_seated_lounging_editorial_10.zip',
        (curr, total, msg) => setDownloadProgress(msg)
      );
      setTimeout(() => setDownloadProgress(null), 3500);
    } catch (err: any) {
      setDownloadProgress('Error: ' + (err?.message || 'Download failed'));
      setTimeout(() => setDownloadProgress(null), 4000);
    }
  };

  const handleDownloadCatalogImagesZip = async () => {
    try {
      setDownloadProgress('Extracting product catalog image URLs for ZIP...');
      const catalogItems: ZipItem[] = [];
      products.slice(0, 25).forEach((p, idx) => {
        if (p.images && p.images[0]) {
          catalogItems.push({
            filename: `${p.category.toLowerCase().replace(/\s+/g, '_')}_${p.id}_hero.jpg`,
            url: p.images[0],
          });
        }
      });

      await downloadCustomImagesZip(
        catalogItems,
        'stoffa_product_catalog_images.zip',
        (curr, total, msg) => setDownloadProgress(msg)
      );
      setTimeout(() => setDownloadProgress(null), 3500);
    } catch (err: any) {
      setDownloadProgress('Error: ' + (err?.message || 'Download failed'));
      setTimeout(() => setDownloadProgress(null), 4000);
    }
  };

  // Sample curated image assets for quick CSV copy-pasting
  const quickAssetSamples = DEFAULT_HERO_PAIRINGS.slice(0, 8);

  return (
    <div id="admin-media-tools-panel" className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-800 font-semibold">
            <Camera className="w-4 h-4 text-amber-700" />
            <span>STUDIO MEDIA &amp; ASSET TOOLS</span>
          </div>
          <h4 className="text-lg font-serif text-stone-900 font-medium mt-0.5">
            Media Library, Page Hero Manager &amp; High-Res ZIP Packages
          </h4>
          <p className="text-xs text-stone-500">
            Access 38+ official photoshoot assets, manage individual page hero banners, and copy verified image URLs directly into your CSV catalogs.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="open-media-gallery-direct-btn"
            onClick={() => setIsMediaGalleryOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Folder className="w-4 h-4" />
            <span>Open Media Gallery</span>
          </button>

          <button
            id="open-page-hero-direct-btn"
            onClick={() => openPageHeroManager()}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4 text-amber-300" />
            <span>Page Hero Manager</span>
          </button>
        </div>
      </div>

      {/* Download Progress Banner if active */}
      {downloadProgress && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs font-mono text-amber-900 flex items-center gap-3 animate-pulse">
          <Download className="w-4 h-4 text-amber-700 shrink-0" />
          <span>{downloadProgress}</span>
        </div>
      )}

      {/* 4 Tool Launcher Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Media Gallery Modal */}
        <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-stone-50 transition-colors flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-amber-800">
              <Folder className="w-5 h-5 text-amber-600" />
              <span className="text-xs font-mono font-bold uppercase">Asset Gallery</span>
            </div>
            <h5 className="text-sm font-serif font-bold text-stone-900">38+ Editorial Photos</h5>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Browse seated terrace shoots, gala models, bridal comfort, and occasion lookbooks with clean filenames.
            </p>
          </div>
          <button
            onClick={() => setIsMediaGalleryOpen(true)}
            className="w-full py-2 px-3 rounded-lg bg-white hover:bg-stone-100 text-stone-900 text-xs font-semibold border border-stone-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Eye className="w-3.5 h-3.5 text-stone-600" />
            <span>Launch Gallery</span>
          </button>
        </div>

        {/* Card 2: Page Hero Manager */}
        <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-stone-50 transition-colors flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-800">
              <Camera className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-mono font-bold uppercase">Hero Customizer</span>
            </div>
            <h5 className="text-sm font-serif font-bold text-stone-900">Per-Page Banners</h5>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Change the hero image on every page: Prom Night, Date Night, Shoes, Wedges, Bags, Sale &amp; Just In.
            </p>
          </div>
          <button
            onClick={() => openPageHeroManager()}
            className="w-full py-2 px-3 rounded-lg bg-white hover:bg-stone-100 text-stone-900 text-xs font-semibold border border-stone-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Camera className="w-3.5 h-3.5 text-stone-600" />
            <span>Change Page Heroes</span>
          </button>
        </div>

        {/* Card 3: Hero Slides CSV Manager */}
        <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-stone-50 transition-colors flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-800">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              <span className="text-xs font-mono font-bold uppercase">Hero Slides CSV</span>
            </div>
            <h5 className="text-sm font-serif font-bold text-stone-900">Rotating Slideshow</h5>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Manage all {heroSlides.length} active rotating hero slides via CSV with subtitle captions and image links.
            </p>
          </div>
          <button
            onClick={() => setIsHeroCsvModalOpen(true)}
            className="w-full py-2 px-3 rounded-lg bg-white hover:bg-stone-100 text-stone-900 text-xs font-semibold border border-stone-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-stone-600" />
            <span>Manage Hero Slides</span>
          </button>
        </div>

        {/* Card 4: Image Pairing Curator */}
        <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-stone-50 transition-colors flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-purple-800">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span className="text-xs font-mono font-bold uppercase">Pairing Curator</span>
            </div>
            <h5 className="text-sm font-serif font-bold text-stone-900">Shoes + Bag Sets</h5>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Curate matching luxury shoes and embroidered potlis for editorial styling recommendations.
            </p>
          </div>
          <button
            onClick={() => setIsPairingCuratorOpen(true)}
            className="w-full py-2 px-3 rounded-lg bg-white hover:bg-stone-100 text-stone-900 text-xs font-semibold border border-stone-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-stone-600" />
            <span>Curate Pairings</span>
          </button>
        </div>
      </div>

      {/* Direct High-Resolution ZIP Downloads Suite */}
      <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-mono uppercase font-bold text-stone-800 flex items-center gap-2">
              <Download className="w-3.5 h-3.5 text-stone-700" />
              <span>Direct ZIP Downloads (Client-Side Compression)</span>
            </div>
            <div className="text-[11px] text-stone-500">
              Downloads all photos cleanly into a `.zip` archive on your computer without proxy limits.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleDownloadAllZip}
            className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            <span>Download All 38 Hero Photos (.ZIP)</span>
          </button>

          <button
            onClick={handleDownloadSeatedZip}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-800 text-xs font-medium border border-stone-300 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-stone-600" />
            <span>Download 10 Seated Shoot Photos (.ZIP)</span>
          </button>

          <button
            onClick={handleDownloadCatalogImagesZip}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-800 text-xs font-medium border border-stone-300 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-stone-600" />
            <span>Download Catalog Footwear Photos (.ZIP)</span>
          </button>
        </div>
      </div>

      {/* Fast Image URL Copy Palette for CSV insertion */}
      {!compact && (
        <div className="pt-2 border-t border-stone-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-mono font-bold text-stone-800 uppercase">
                Photoshoot Image Assets for CSV Insertion:
              </div>
              <div className="text-[11px] text-stone-500">
                Click "Copy Image URL" to paste directly into the <code className="font-mono text-stone-800">images</code> column of any of the 4 CSVs.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Filter by occasion/model..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="px-3 py-1 text-xs rounded-lg border border-stone-300 w-44 text-stone-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-1">
            {quickAssetSamples
              .filter((item) =>
                searchFilter
                  ? item.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
                    item.description.toLowerCase().includes(searchFilter.toLowerCase())
                  : true
              )
              .map((item, idx) => {
                const isCopied = copiedUrl === item.imageSrc;
                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-stone-200 bg-white hover:border-stone-400 transition-all flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={item.imageSrc}
                        alt={item.title}
                        className="w-12 h-12 rounded-lg object-cover border border-stone-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-stone-900 truncate" title={item.title}>
                          {item.title}
                        </div>
                        <div className="text-[10px] text-stone-500 font-mono truncate">
                          {item.cleanFilename}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopy(item.imageSrc)}
                      className={`w-full py-1 px-2 rounded-md text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-100 text-emerald-800 font-semibold'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied URL!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-stone-500" />
                          <span>Copy Image URL</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
