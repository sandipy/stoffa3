import React, { useState, useRef } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Filter,
  Folder,
  Layers,
  Megaphone,
  PackageCheck,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Tags,
  ToggleLeft,
  ToggleRight,
  Truck,
  Upload,
} from 'lucide-react';
import { useCommerce } from '../../context/CommerceContext';
import {
  isJustInProduct,
  isReadyToShipProduct,
  isSaleProduct,
  isShoeProduct,
  SectionType,
} from '../../utils/collectionClassifier';
import { Product } from '../../types';

export interface AdminFourCsvManagerProps {
  initialSection?: 'all' | 'shoes' | 'just-in' | 'sale' | 'ready-to-ship';
}

export const AdminFourCsvManager: React.FC<AdminFourCsvManagerProps> = ({
  initialSection = 'all',
}) => {
  const {
    products,
    exportShoesCSV,
    importShoesCSV,
    exportJustInCSV,
    importJustInCSV,
    exportSaleCSV,
    importSaleCSV,
    exportReadyToShipCSV,
    importReadyToShipCSV,
    getDefaultSectionCSV,
    hideAllShoes,
    selectAllShoes,
    hideAllJustIn,
    selectAllJustIn,
    toggleJustIn,
    bulkSetJustIn,
    hideAllSale,
    selectAllSale,
    toggleSale,
    bulkSetSale,
    hideAllReadyToShip,
    selectAllReadyToShip,
    toggleReadyToShip,
    bulkSetReadyToShip,
    toggleProductVisibility,
    bulkSetProductVisibility,
    setIsMediaGalleryOpen,
    openPageHeroManager,
    openAdminPageEditor,
    triggerLanguageMdAlert,
  } = useCommerce();

  // Active view tab filter within the 4 CSV manager: 'all' | 'shoes' | 'just-in' | 'sale' | 'ready-to-ship'
  const [activeSectionFilter, setActiveSectionFilter] = useState<'all' | 'shoes' | 'just-in' | 'sale' | 'ready-to-ship'>(initialSection);

  React.useEffect(() => {
    setActiveSectionFilter(initialSection);
  }, [initialSection]);

  // File input refs for uploading .csv files
  const shoesFileInputRef = useRef<HTMLInputElement>(null);
  const justInFileInputRef = useRef<HTMLInputElement>(null);
  const saleFileInputRef = useRef<HTMLInputElement>(null);
  const rtsFileInputRef = useRef<HTMLInputElement>(null);

  // Textarea input states
  const [shoesCsvText, setShoesCsvText] = useState('');
  const [justInCsvText, setJustInCsvText] = useState('');
  const [saleCsvText, setSaleCsvText] = useState('');
  const [rtsCsvText, setRtsCsvText] = useState('');

  // Expandable editor toggles
  const [showShoesEditor, setShowShoesEditor] = useState(false);
  const [showJustInEditor, setShowJustInEditor] = useState(false);
  const [showSaleEditor, setShowSaleEditor] = useState(false);
  const [showRtsEditor, setShowRtsEditor] = useState(false);

  // Search filter states
  const [shoesSearch, setShoesSearch] = useState('');
  const [justInSearch, setJustInSearch] = useState('');
  const [saleSearch, setSaleSearch] = useState('');
  const [rtsSearch, setRtsSearch] = useState('');

  // Multi-selection checkboxes
  const [selectedShoesIds, setSelectedShoesIds] = useState<string[]>([]);
  const [selectedJustInIds, setSelectedJustInIds] = useState<string[]>([]);
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);
  const [selectedRtsIds, setSelectedRtsIds] = useState<string[]>([]);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ [key: string]: { success: boolean; message: string } | null }>({});

  const setCardFeedback = (cardKey: string, message: string, success: boolean = true) => {
    setFeedback((prev) => ({ ...prev, [cardKey]: { success, message } }));
    setTimeout(() => {
      setFeedback((prev) => ({ ...prev, [cardKey]: null }));
    }, 4000);
  };

  // Helper to trigger browser download of CSV text
  const downloadCsvString = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  // -------------------------------------------------------------
  // SECTION 1: SHOES (MASTER CSV) HANDLERS
  // -------------------------------------------------------------
  const handleExportShoes = () => {
    const csv = exportShoesCSV();
    downloadCsvString(csv, `shoes_master_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
    setCardFeedback('shoes', 'Downloaded master shoes catalog CSV.');
  };

  const handleDownloadDefaultShoes = () => {
    const csv = getDefaultSectionCSV('shoes');
    downloadCsvString(csv, `shoes_default_from_page_${new Date().toISOString().slice(0, 10)}.csv`);
    setCardFeedback('shoes', 'Generated and downloaded default CSV from existing Shoes page!');
  };

  const handleLoadDefaultShoesIntoEditor = () => {
    const csv = getDefaultSectionCSV('shoes');
    setShoesCsvText(csv);
    setShowShoesEditor(true);
    setCardFeedback('shoes', 'Loaded default Shoes page CSV into editor below.');
  };

  const handleApplyShoesCsv = () => {
    if (!shoesCsvText.trim()) {
      setCardFeedback('shoes', 'Please paste or load Shoes CSV text first.', false);
      return;
    }
    const result = importShoesCSV(shoesCsvText);
    if (result.success) {
      setCardFeedback('shoes', `Successfully imported ${result.count} shoes into the master catalog!`);
      setShoesCsvText('');
      setShowShoesEditor(false);
      triggerLanguageMdAlert('Master Shoes CSV imported');
    } else {
      setCardFeedback('shoes', result.error || 'Failed to import CSV.', false);
    }
  };

  const handleShoesFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = importShoesCSV(content);
        if (result.success) {
          setCardFeedback('shoes', `Successfully uploaded and synced ${result.count} shoes from ${file.name}!`);
          triggerLanguageMdAlert(`Shoes CSV uploaded: ${file.name}`);
        } else {
          setCardFeedback('shoes', `Import error: ${result.error || 'Failed to import CSV.'}`, false);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // -------------------------------------------------------------
  // SECTION 2: JUST IN CSV HANDLERS
  // -------------------------------------------------------------
  const handleExportJustIn = () => {
    const csv = exportJustInCSV();
    downloadCsvString(csv, `just_in_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
    setCardFeedback('just-in', 'Downloaded Just In catalog CSV.');
  };

  const handleDownloadDefaultJustIn = () => {
    const csv = getDefaultSectionCSV('just-in');
    downloadCsvString(csv, `just_in_default_from_page_${new Date().toISOString().slice(0, 10)}.csv`);
    setCardFeedback('just-in', 'Generated and downloaded default CSV from existing Just In page!');
  };

  const handleLoadDefaultJustInIntoEditor = () => {
    const csv = getDefaultSectionCSV('just-in');
    setJustInCsvText(csv);
    setShowJustInEditor(true);
    setCardFeedback('just-in', 'Loaded default Just In page CSV into editor below.');
  };

  const handleApplyJustInCsv = () => {
    if (!justInCsvText.trim()) {
      setCardFeedback('just-in', 'Please paste or load Just In CSV text first.', false);
      return;
    }
    const result = importJustInCSV(justInCsvText);
    if (result.success) {
      setCardFeedback('just-in', `Successfully updated ${result.count} products for the Just In collection!`);
      setJustInCsvText('');
      setShowJustInEditor(false);
      triggerLanguageMdAlert('Just In CSV imported');
    } else {
      setCardFeedback('just-in', result.error || 'Failed to import CSV.', false);
    }
  };

  const handleJustInFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = importJustInCSV(content);
        if (result.success) {
          setCardFeedback('just-in', `Successfully uploaded and synced ${result.count} items from ${file.name}!`);
          triggerLanguageMdAlert(`Just In CSV uploaded: ${file.name}`);
        } else {
          setCardFeedback('just-in', `Import error: ${result.error || 'Failed to import CSV.'}`, false);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // -------------------------------------------------------------
  // SECTION 3: SALE CSV HANDLERS
  // -------------------------------------------------------------
  const handleExportSale = () => {
    const csv = exportSaleCSV();
    downloadCsvString(csv, `sale_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
    setCardFeedback('sale', 'Downloaded Sale & Archive catalog CSV.');
  };

  const handleDownloadDefaultSale = () => {
    const csv = getDefaultSectionCSV('sale');
    downloadCsvString(csv, `sale_default_from_page_${new Date().toISOString().slice(0, 10)}.csv`);
    setCardFeedback('sale', 'Generated and downloaded default CSV from existing Sale page!');
  };

  const handleLoadDefaultSaleIntoEditor = () => {
    const csv = getDefaultSectionCSV('sale');
    setSaleCsvText(csv);
    setShowSaleEditor(true);
    setCardFeedback('sale', 'Loaded default Sale page CSV into editor below.');
  };

  const handleApplySaleCsv = () => {
    if (!saleCsvText.trim()) {
      setCardFeedback('sale', 'Please paste or load Sale CSV text first.', false);
      return;
    }
    const result = importSaleCSV(saleCsvText);
    if (result.success) {
      setCardFeedback('sale', `Successfully updated ${result.count} products for the Sale & Archive edit!`);
      setSaleCsvText('');
      setShowSaleEditor(false);
      triggerLanguageMdAlert('Sale CSV imported');
    } else {
      setCardFeedback('sale', result.error || 'Failed to import CSV.', false);
    }
  };

  const handleSaleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = importSaleCSV(content);
        if (result.success) {
          setCardFeedback('sale', `Successfully uploaded and synced ${result.count} items from ${file.name}!`);
          triggerLanguageMdAlert(`Sale CSV uploaded: ${file.name}`);
        } else {
          setCardFeedback('sale', `Import error: ${result.error || 'Failed to import CSV.'}`, false);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // -------------------------------------------------------------
  // SECTION 4: READY TO SHIP CSV HANDLERS
  // -------------------------------------------------------------
  const handleExportRts = () => {
    const csv = exportReadyToShipCSV();
    downloadCsvString(csv, `ready_to_ship_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
    setCardFeedback('ready-to-ship', 'Downloaded Ready to Ship catalog CSV.');
  };

  const handleDownloadDefaultRts = () => {
    const csv = getDefaultSectionCSV('ready-to-ship');
    downloadCsvString(csv, `ready_to_ship_default_from_page_${new Date().toISOString().slice(0, 10)}.csv`);
    setCardFeedback('ready-to-ship', 'Generated and downloaded default CSV from existing Ready to Ship page!');
  };

  const handleLoadDefaultRtsIntoEditor = () => {
    const csv = getDefaultSectionCSV('ready-to-ship');
    setRtsCsvText(csv);
    setShowRtsEditor(true);
    setCardFeedback('ready-to-ship', 'Loaded default Ready to Ship page CSV into editor below.');
  };

  const handleApplyRtsCsv = () => {
    if (!rtsCsvText.trim()) {
      setCardFeedback('ready-to-ship', 'Please paste or load Ready to Ship CSV text first.', false);
      return;
    }
    const result = importReadyToShipCSV(rtsCsvText);
    if (result.success) {
      setCardFeedback('ready-to-ship', `Successfully updated ${result.count} products for Ready to Ship!`);
      setRtsCsvText('');
      setShowRtsEditor(false);
      triggerLanguageMdAlert('Ready to Ship CSV imported');
    } else {
      setCardFeedback('ready-to-ship', result.error || 'Failed to import CSV.', false);
    }
  };

  const handleRtsFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = importReadyToShipCSV(content);
        if (result.success) {
          setCardFeedback('ready-to-ship', `Successfully uploaded and synced ${result.count} items from ${file.name}!`);
          triggerLanguageMdAlert(`Ready to Ship CSV uploaded: ${file.name}`);
        } else {
          setCardFeedback('ready-to-ship', `Import error: ${result.error || 'Failed to import CSV.'}`, false);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filtered Product Lists for each section
  const shoeProducts = products.filter(isShoeProduct);
  const visibleShoesCount = shoeProducts.filter((p) => !p.isHidden).length;
  const hiddenShoesCount = shoeProducts.filter((p) => p.isHidden).length;

  const justInProducts = products.filter(isJustInProduct);
  const saleProducts = products.filter(isSaleProduct);
  const rtsProducts = products.filter(isReadyToShipProduct);

  return (
    <div className="space-y-8">
      {/* 4 CSV Navigation Jump Bar */}
      <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-stone-600 font-semibold mb-0.5">
            <Layers className="w-4 h-4 text-stone-800" />
            <span>4 SEPARATE CATALOG CSVS WITH HIDE &amp; UNCHECK CONTROLS</span>
          </div>
          <h3 className="text-xl font-serif text-stone-900 font-medium">
            Shoes (Master), Just In, Sale &amp; Ready to Ship
          </h3>
          <p className="text-xs text-stone-500">
            Each section has its own separate CSV, default generation from existing storefront pages, upload/download pipelines, and individual hide/uncheck toggles.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveSectionFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeSectionFilter === 'all'
                ? 'bg-stone-900 text-white font-semibold shadow-2xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            Show All 4
          </button>
          <button
            onClick={() => setActiveSectionFilter('shoes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSectionFilter === 'shoes'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-2xs'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-700" />
            <span>1. Shoes (Master CSV)</span>
          </button>
          <button
            onClick={() => setActiveSectionFilter('just-in')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSectionFilter === 'just-in'
                ? 'bg-purple-600 text-white font-semibold shadow-2xs'
                : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            <Megaphone className="w-3 h-3 text-purple-700" />
            <span>2. Just In CSV</span>
          </button>
          <button
            onClick={() => setActiveSectionFilter('sale')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSectionFilter === 'sale'
                ? 'bg-amber-600 text-white font-semibold shadow-2xs'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Tags className="w-3 h-3 text-amber-700" />
            <span>3. Sale CSV</span>
          </button>
          <button
            onClick={() => setActiveSectionFilter('ready-to-ship')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSectionFilter === 'ready-to-ship'
                ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <Truck className="w-3 h-3 text-emerald-700" />
            <span>4. Ready to Ship CSV</span>
          </button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input type="file" ref={shoesFileInputRef} onChange={handleShoesFileUpload} accept=".csv,text/csv" className="hidden" />
      <input type="file" ref={justInFileInputRef} onChange={handleJustInFileUpload} accept=".csv,text/csv" className="hidden" />
      <input type="file" ref={saleFileInputRef} onChange={handleSaleFileUpload} accept=".csv,text/csv" className="hidden" />
      <input type="file" ref={rtsFileInputRef} onChange={handleRtsFileUpload} accept=".csv,text/csv" className="hidden" />

      {/* ========================================================================= */}
      {/* 1. SHOES (MASTER CSV) CARD                                                */}
      {/* ========================================================================= */}
      {(activeSectionFilter === 'all' || activeSectionFilter === 'shoes') && (
        <div id="section-shoes-master-csv" className="p-6 rounded-2xl bg-white border-2 border-stone-300 shadow-sm space-y-5">
          {/* Card Top Header */}
          <div className="pb-4 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                  MASTER CATALOG
                </span>
                <span className="text-xs font-mono text-stone-500">shoes_master_catalog.csv</span>
              </div>
              <h4 className="text-lg font-serif text-stone-900 font-bold mt-1 flex items-center gap-2">
                <span>1. Shoes Master CSV (Core Footwear Atelier)</span>
              </h4>
              <p className="text-xs text-stone-600 mt-0.5 max-w-3xl leading-relaxed">
                Shoes is the <strong>Master CSV</strong> for the store. It defines all core footwear silhouettes (low wedges, high wedges, sculptural block heels, and flats). Use this to upload footwear collections, download the master CSV, generate defaults from the existing Shoes page, and hide/uncheck products from the storefront.
              </p>
            </div>

            {/* Metrics Chips */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <div className="px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-xs">
                <span className="text-stone-500 font-mono text-[10px] block">TOTAL SHOES</span>
                <span className="font-bold text-stone-900 font-serif text-base">{shoeProducts.length}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                <span className="text-emerald-700 font-mono text-[10px] block">VISIBLE</span>
                <span className="font-bold text-emerald-800 font-serif text-base">{visibleShoesCount}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                <span className="text-amber-800 font-mono text-[10px] block">HIDDEN / UNCHECKED</span>
                <span className="font-bold text-amber-900 font-serif text-base">{hiddenShoesCount}</span>
              </div>
            </div>
          </div>

          {/* Feedback message banner */}
          {feedback['shoes'] && (
            <div className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 animate-in fade-in ${
              feedback['shoes'].success ? 'bg-emerald-50 border border-emerald-300 text-emerald-900' : 'bg-rose-50 border border-rose-300 text-rose-900'
            }`}>
              {feedback['shoes'].success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{feedback['shoes'].message}</span>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Upload Shoes CSV */}
              <button
                onClick={() => shoesFileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Upload .csv file with footwear products"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Shoes .CSV</span>
              </button>

              {/* Export Shoes CSV */}
              <button
                onClick={handleExportShoes}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold border border-stone-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Export active shoe catalog as CSV"
              >
                <Download className="w-3.5 h-3.5 text-stone-600" />
                <span>Export Shoes CSV</span>
              </button>

              {/* Create Default CSV from Existing Shoes Page */}
              <button
                onClick={handleDownloadDefaultShoes}
                className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Generate and download default CSV formatted directly from existing Shoes page items"
              >
                <FileText className="w-3.5 h-3.5 text-amber-700" />
                <span>Default CSV from Shoes Page</span>
              </button>

              {/* Load Default Page CSV into Editor */}
              <button
                onClick={handleLoadDefaultShoesIntoEditor}
                className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium border border-stone-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
                <span>Load in Editor</span>
              </button>

              {/* Edit Shoes Page Image & Text */}
              <button
                onClick={() => openAdminPageEditor('shoes')}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-950 text-xs font-bold border border-indigo-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Edit Shoes page banner image, headline, and subtitle"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Edit Shoes Page (Image &amp; Text)</span>
              </button>
            </div>

            {/* Right Quick Controls: Hide / Uncheck All Shoes & Media Tools */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  hideAllShoes();
                  setCardFeedback('shoes', 'All shoes have been unchecked / hidden from live storefront.');
                }}
                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-700 text-xs font-medium border border-stone-200 flex items-center gap-1 transition-colors cursor-pointer"
                title="Set isHidden: true on all footwear products"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide / Uncheck All Shoes</span>
              </button>

              <button
                onClick={() => {
                  selectAllShoes();
                  setCardFeedback('shoes', 'All shoes are now checked & visible on live storefront!');
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-medium border border-emerald-200 flex items-center gap-1 transition-colors cursor-pointer"
                title="Set isHidden: false on all footwear products"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>Show / Check All</span>
              </button>

              <button
                onClick={() => setIsMediaGalleryOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-semibold border border-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                title="Open Studio Media Tools to copy shoe photo URLs"
              >
                <Camera className="w-3.5 h-3.5 text-amber-700" />
                <span>Media Tools</span>
              </button>
            </div>
          </div>

          {/* Expandable Shoes CSV Text Editor */}
          <div>
            <button
              onClick={() => setShowShoesEditor(!showShoesEditor)}
              className="text-xs font-mono text-stone-600 hover:text-stone-900 flex items-center gap-1 font-semibold py-1 cursor-pointer"
            >
              <span>{showShoesEditor ? '▼ Hide Shoes CSV Editor' : '▶ Open Shoes CSV Raw Textarea Editor'}</span>
            </button>

            {showShoesEditor && (
              <div className="mt-2 space-y-3 p-4 rounded-xl bg-stone-50 border border-stone-200 animate-in fade-in">
                <div className="flex items-center justify-between text-xs text-stone-500 font-mono">
                  <span>Paste comma-separated values (CSV) with footwear columns:</span>
                  <span className="text-[10px] text-stone-400">id,title,subtitle,category,collection,priceUSD...</span>
                </div>
                <textarea
                  value={shoesCsvText}
                  onChange={(e) => setShoesCsvText(e.target.value)}
                  rows={6}
                  className="w-full p-3 font-mono text-xs bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  placeholder="Paste or edit raw Shoes CSV text here..."
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShoesCsvText('')}
                    className="px-3 py-1.5 rounded-lg text-xs text-stone-600 hover:bg-stone-200"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleApplyShoesCsv}
                    className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Parse &amp; Apply Shoes CSV</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Shoes Selection & Visibility Table */}
          <div className="pt-2 border-t border-stone-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-stone-700 uppercase">
                  Interactive Shoes Handpicker &amp; Visibility:
                </span>
                <span className="text-xs text-stone-500 font-normal">
                  ({shoeProducts.length} shoe items in master database)
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search footwear title/heel..."
                    value={shoesSearch}
                    onChange={(e) => setShoesSearch(e.target.value)}
                    className="pl-8 pr-3 py-1 rounded-lg border border-stone-300 text-xs w-52 bg-white text-stone-900"
                  />
                </div>

                {selectedShoesIds.length > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-stone-500 font-mono">{selectedShoesIds.length} selected:</span>
                    <button
                      onClick={() => {
                        bulkSetProductVisibility(selectedShoesIds, true); // hide
                        setSelectedShoesIds([]);
                        setCardFeedback('shoes', `Hidden ${selectedShoesIds.length} selected shoes.`);
                      }}
                      className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium"
                    >
                      Hide
                    </button>
                    <button
                      onClick={() => {
                        bulkSetProductVisibility(selectedShoesIds, false); // show
                        setSelectedShoesIds([]);
                        setCardFeedback('shoes', `Made ${selectedShoesIds.length} selected shoes visible!`);
                      }}
                      className="px-2 py-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-medium"
                    >
                      Show
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="max-h-72 overflow-y-auto border border-stone-200 rounded-xl bg-stone-50/50">
              <table className="w-full text-left text-xs text-stone-800">
                <thead className="bg-stone-100 text-[11px] font-mono text-stone-600 sticky top-0 uppercase border-b border-stone-200">
                  <tr>
                    <th className="p-2.5 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={selectedShoesIds.length > 0 && selectedShoesIds.length === shoeProducts.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedShoesIds(shoeProducts.map((p) => p.id));
                          } else {
                            setSelectedShoesIds([]);
                          }
                        }}
                        className="rounded accent-stone-900 cursor-pointer"
                      />
                    </th>
                    <th className="p-2.5">Shoe Item</th>
                    <th className="p-2.5 hidden sm:table-cell">Silhouettes / Collection</th>
                    <th className="p-2.5">Price</th>
                    <th className="p-2.5 text-right">Visibility (Hide / Uncheck)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white">
                  {shoeProducts
                    .filter((p) =>
                      shoesSearch
                        ? p.title.toLowerCase().includes(shoesSearch.toLowerCase()) ||
                          (p.collection || '').toLowerCase().includes(shoesSearch.toLowerCase())
                        : true
                    )
                    .map((p) => {
                      const isSelected = selectedShoesIds.includes(p.id);
                      return (
                        <tr key={p.id} className={`hover:bg-stone-50 transition-colors ${p.isHidden ? 'opacity-60 bg-stone-50/80' : ''}`}>
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedShoesIds([...selectedShoesIds, p.id]);
                                } else {
                                  setSelectedShoesIds(selectedShoesIds.filter((id) => id !== p.id));
                                }
                              }}
                              className="rounded accent-stone-900 cursor-pointer"
                            />
                          </td>
                          <td className="p-2.5">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={p.images?.[0] || 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=80'}
                                alt={p.title}
                                className="w-9 h-9 rounded object-cover border border-stone-200 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-semibold text-stone-900 truncate">{p.title}</div>
                                <div className="text-[10px] text-stone-500 font-mono truncate">{p.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-2.5 hidden sm:table-cell">
                            <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[11px]">
                              {p.collection || 'Shoes Atelier'}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono font-medium">${p.priceUSD}</td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => toggleProductVisibility(p.id)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                                p.isHidden
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                              }`}
                              title={p.isHidden ? 'Click to make visible on storefront' : 'Click to hide or uncheck from storefront'}
                            >
                              {p.isHidden ? (
                                <>
                                  <EyeOff className="w-3 h-3 text-rose-600" />
                                  <span>Hidden (Unchecked)</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3 text-emerald-600" />
                                  <span>Visible (Checked)</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. JUST IN (NEW ARRIVALS CSV) CARD                                        */}
      {/* ========================================================================= */}
      {(activeSectionFilter === 'all' || activeSectionFilter === 'just-in') && (
        <div id="section-justin-csv" className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-5">
          {/* Card Top Header */}
          <div className="pb-4 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                  DEDICATED SECTION CSV
                </span>
                <span className="text-xs font-mono text-stone-500">just_in_catalog.csv</span>
              </div>
              <h4 className="text-lg font-serif text-stone-900 font-bold mt-1 flex items-center gap-2">
                <span>2. Just In CSV (New Arrivals &amp; Seasonal Debuts)</span>
              </h4>
              <p className="text-xs text-stone-600 mt-0.5 max-w-3xl leading-relaxed">
                Manages all items featured in the <strong>Just In</strong> seasonal drops. You can export current Just In items, generate default CSV from the live Just In page, upload a dedicated Just In CSV, and hide or uncheck items.
              </p>
            </div>

            {/* Metrics Chips */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-xs">
                <span className="text-purple-700 font-mono text-[10px] block">JUST IN ITEMS</span>
                <span className="font-bold text-purple-900 font-serif text-base">{justInProducts.length}</span>
              </div>
            </div>
          </div>

          {/* Feedback */}
          {feedback['just-in'] && (
            <div className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 animate-in fade-in ${
              feedback['just-in'].success ? 'bg-emerald-50 border border-emerald-300 text-emerald-900' : 'bg-rose-50 border border-rose-300 text-rose-900'
            }`}>
              {feedback['just-in'].success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{feedback['just-in'].message}</span>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => justInFileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Upload .csv for Just In collection"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Just In .CSV</span>
              </button>

              <button
                onClick={handleExportJustIn}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold border border-stone-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-stone-600" />
                <span>Export Just In CSV</span>
              </button>

              <button
                onClick={handleDownloadDefaultJustIn}
                className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-semibold border border-purple-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Generate default CSV from existing Just In page items"
              >
                <FileText className="w-3.5 h-3.5 text-purple-700" />
                <span>Default CSV from Just In Page</span>
              </button>

              <button
                onClick={handleLoadDefaultJustInIntoEditor}
                className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium border border-stone-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
                <span>Load in Editor</span>
              </button>

              {/* Edit Just In Page Image & Text */}
              <button
                onClick={() => openAdminPageEditor('just-in')}
                className="px-3.5 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-950 text-xs font-bold border border-purple-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Edit Just In page hero image, title, and subtitle"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                <span>Edit Just In Page (Image &amp; Text)</span>
              </button>
            </div>

            {/* Quick Bulk Hide / Select All for Just In */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  hideAllJustIn();
                  setCardFeedback('just-in', 'All products unchecked / removed from Just In.');
                }}
                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-700 text-xs font-medium border border-stone-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide / Uncheck All Just In</span>
              </button>

              <button
                onClick={() => {
                  selectAllJustIn();
                  setCardFeedback('just-in', 'All footwear selected & tagged for Just In!');
                }}
                className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-medium border border-purple-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Megaphone className="w-3.5 h-3.5 text-purple-600" />
                <span>Select / Tag All for Just In</span>
              </button>

              <button
                onClick={() => setIsMediaGalleryOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium border border-stone-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-stone-600" />
                <span>Media Tools</span>
              </button>
            </div>
          </div>

          {/* Expandable Editor */}
          <div>
            <button
              onClick={() => setShowJustInEditor(!showJustInEditor)}
              className="text-xs font-mono text-stone-600 hover:text-stone-900 flex items-center gap-1 font-semibold py-1 cursor-pointer"
            >
              <span>{showJustInEditor ? '▼ Hide Just In CSV Editor' : '▶ Open Just In CSV Raw Textarea Editor'}</span>
            </button>

            {showJustInEditor && (
              <div className="mt-2 space-y-3 p-4 rounded-xl bg-purple-50/50 border border-purple-200 animate-in fade-in">
                <textarea
                  value={justInCsvText}
                  onChange={(e) => setJustInCsvText(e.target.value)}
                  rows={6}
                  className="w-full p-3 font-mono text-xs bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  placeholder="Paste or edit raw Just In CSV text here..."
                />
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setJustInCsvText('')} className="px-3 py-1.5 rounded-lg text-xs text-stone-600 hover:bg-stone-200">
                    Clear
                  </button>
                  <button
                    onClick={handleApplyJustInCsv}
                    className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Parse &amp; Apply Just In CSV</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Handpicker Table */}
          <div className="pt-2 border-t border-stone-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold text-stone-700 uppercase">
                Tag or Uncheck Items in Just In:
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={justInSearch}
                    onChange={(e) => setJustInSearch(e.target.value)}
                    className="pl-8 pr-3 py-1 rounded-lg border border-stone-300 text-xs w-48 bg-white text-stone-900"
                  />
                </div>

                {selectedJustInIds.length > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-stone-500 font-mono">{selectedJustInIds.length} selected:</span>
                    <button
                      onClick={() => {
                        bulkSetJustIn(selectedJustInIds, true);
                        setSelectedJustInIds([]);
                        setCardFeedback('just-in', `Added ${selectedJustInIds.length} items to Just In!`);
                      }}
                      className="px-2 py-1 rounded bg-purple-100 hover:bg-purple-200 text-purple-900 font-medium"
                    >
                      Add to Just In
                    </button>
                    <button
                      onClick={() => {
                        bulkSetJustIn(selectedJustInIds, false);
                        setSelectedJustInIds([]);
                        setCardFeedback('just-in', `Removed ${selectedJustInIds.length} items from Just In.`);
                      }}
                      className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border border-stone-200 rounded-xl bg-stone-50/50">
              <table className="w-full text-left text-xs text-stone-800">
                <thead className="bg-stone-100 text-[11px] font-mono text-stone-600 sticky top-0 uppercase border-b border-stone-200">
                  <tr>
                    <th className="p-2.5 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={selectedJustInIds.length > 0 && selectedJustInIds.length === products.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedJustInIds(products.map((p) => p.id));
                          else setSelectedJustInIds([]);
                        }}
                        className="rounded accent-purple-700 cursor-pointer"
                      />
                    </th>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5 text-right">Just In Status (Allow Hide / Uncheck)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white">
                  {products
                    .filter((p) => (justInSearch ? p.title.toLowerCase().includes(justInSearch.toLowerCase()) : true))
                    .map((p) => {
                      const isJustIn = isJustInProduct(p);
                      const isSelected = selectedJustInIds.includes(p.id);
                      return (
                        <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedJustInIds([...selectedJustInIds, p.id]);
                                else setSelectedJustInIds(selectedJustInIds.filter((id) => id !== p.id));
                              }}
                              className="rounded accent-purple-700 cursor-pointer"
                            />
                          </td>
                          <td className="p-2.5 font-medium text-stone-900">{p.title}</td>
                          <td className="p-2.5 text-stone-500 font-mono text-[11px]">{p.category}</td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => toggleJustIn(p.id)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                                isJustIn
                                  ? 'bg-purple-100 text-purple-900 border border-purple-300 font-semibold'
                                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                              }`}
                            >
                              {isJustIn ? (
                                <>
                                  <Check className="w-3 h-3 text-purple-700" />
                                  <span>In Just In (Checked)</span>
                                </>
                              ) : (
                                <span>Unchecked (Hidden)</span>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SALE (ARCHIVE & CLEARANCE CSV) CARD                                    */}
      {/* ========================================================================= */}
      {(activeSectionFilter === 'all' || activeSectionFilter === 'sale') && (
        <div id="section-sale-csv" className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-5">
          {/* Card Top Header */}
          <div className="pb-4 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                  DEDICATED SECTION CSV
                </span>
                <span className="text-xs font-mono text-stone-500">sale_catalog.csv</span>
              </div>
              <h4 className="text-lg font-serif text-stone-900 font-bold mt-1 flex items-center gap-2">
                <span>3. Sale CSV (Archival Vault &amp; Clearance Values)</span>
              </h4>
              <p className="text-xs text-stone-600 mt-0.5 max-w-3xl leading-relaxed">
                Manages items in the <strong>Sale &amp; Archive</strong> page. Supports separate upload/download, generating default CSV directly from the existing Sale page, and interactive hide/uncheck toggles.
              </p>
            </div>

            {/* Metrics Chips */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                <span className="text-amber-800 font-mono text-[10px] block">SALE &amp; ARCHIVE ITEMS</span>
                <span className="font-bold text-amber-900 font-serif text-base">{saleProducts.length}</span>
              </div>
            </div>
          </div>

          {/* Feedback */}
          {feedback['sale'] && (
            <div className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 animate-in fade-in ${
              feedback['sale'].success ? 'bg-emerald-50 border border-emerald-300 text-emerald-900' : 'bg-rose-50 border border-rose-300 text-rose-900'
            }`}>
              {feedback['sale'].success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{feedback['sale'].message}</span>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => saleFileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Upload .csv for Sale edit"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Sale .CSV</span>
              </button>

              <button
                onClick={handleExportSale}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold border border-stone-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-stone-600" />
                <span>Export Sale CSV</span>
              </button>

              <button
                onClick={handleDownloadDefaultSale}
                className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Generate default CSV from existing Sale page items"
              >
                <FileText className="w-3.5 h-3.5 text-amber-700" />
                <span>Default CSV from Sale Page</span>
              </button>

              <button
                onClick={handleLoadDefaultSaleIntoEditor}
                className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium border border-stone-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
                <span>Load in Editor</span>
              </button>

              {/* Edit Sale Page Image & Text */}
              <button
                onClick={() => openAdminPageEditor('sale')}
                className="px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-bold border border-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Edit Sale page hero image, title, and subtitle"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Edit Sale Page (Image &amp; Text)</span>
              </button>
            </div>

            {/* Quick Bulk Hide / Select All for Sale */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  hideAllSale();
                  setCardFeedback('sale', 'All products unchecked / removed from Sale.');
                }}
                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-700 text-xs font-medium border border-stone-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide / Uncheck All Sale</span>
              </button>

              <button
                onClick={() => {
                  selectAllSale();
                  setCardFeedback('sale', 'All products selected & tagged for Sale!');
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold border border-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Tags className="w-3.5 h-3.5 text-amber-700" />
                <span>Select / Tag All for Sale</span>
              </button>

              <button
                onClick={() => setIsMediaGalleryOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium border border-stone-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-stone-600" />
                <span>Media Tools</span>
              </button>
            </div>
          </div>

          {/* Expandable Editor */}
          <div>
            <button
              onClick={() => setShowSaleEditor(!showSaleEditor)}
              className="text-xs font-mono text-stone-600 hover:text-stone-900 flex items-center gap-1 font-semibold py-1 cursor-pointer"
            >
              <span>{showSaleEditor ? '▼ Hide Sale CSV Editor' : '▶ Open Sale CSV Raw Textarea Editor'}</span>
            </button>

            {showSaleEditor && (
              <div className="mt-2 space-y-3 p-4 rounded-xl bg-amber-50/40 border border-amber-200 animate-in fade-in">
                <textarea
                  value={saleCsvText}
                  onChange={(e) => setSaleCsvText(e.target.value)}
                  rows={6}
                  className="w-full p-3 font-mono text-xs bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  placeholder="Paste or edit raw Sale CSV text here..."
                />
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setSaleCsvText('')} className="px-3 py-1.5 rounded-lg text-xs text-stone-600 hover:bg-stone-200">
                    Clear
                  </button>
                  <button
                    onClick={handleApplySaleCsv}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Parse &amp; Apply Sale CSV</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Handpicker Table */}
          <div className="pt-2 border-t border-stone-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold text-stone-700 uppercase">
                Tag or Uncheck Items in Sale &amp; Archive:
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={saleSearch}
                    onChange={(e) => setSaleSearch(e.target.value)}
                    className="pl-8 pr-3 py-1 rounded-lg border border-stone-300 text-xs w-48 bg-white text-stone-900"
                  />
                </div>

                {selectedSaleIds.length > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-stone-500 font-mono">{selectedSaleIds.length} selected:</span>
                    <button
                      onClick={() => {
                        bulkSetSale(selectedSaleIds, true);
                        setSelectedSaleIds([]);
                        setCardFeedback('sale', `Added ${selectedSaleIds.length} items to Sale!`);
                      }}
                      className="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium"
                    >
                      Add to Sale
                    </button>
                    <button
                      onClick={() => {
                        bulkSetSale(selectedSaleIds, false);
                        setSelectedSaleIds([]);
                        setCardFeedback('sale', `Removed ${selectedSaleIds.length} items from Sale.`);
                      }}
                      className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border border-stone-200 rounded-xl bg-stone-50/50">
              <table className="w-full text-left text-xs text-stone-800">
                <thead className="bg-stone-100 text-[11px] font-mono text-stone-600 sticky top-0 uppercase border-b border-stone-200">
                  <tr>
                    <th className="p-2.5 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={selectedSaleIds.length > 0 && selectedSaleIds.length === products.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedSaleIds(products.map((p) => p.id));
                          else setSelectedSaleIds([]);
                        }}
                        className="rounded accent-amber-600 cursor-pointer"
                      />
                    </th>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5">Price</th>
                    <th className="p-2.5 text-right">Sale Status (Allow Hide / Uncheck)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white">
                  {products
                    .filter((p) => (saleSearch ? p.title.toLowerCase().includes(saleSearch.toLowerCase()) : true))
                    .map((p) => {
                      const isSale = isSaleProduct(p);
                      const isSelected = selectedSaleIds.includes(p.id);
                      return (
                        <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedSaleIds([...selectedSaleIds, p.id]);
                                else setSelectedSaleIds(selectedSaleIds.filter((id) => id !== p.id));
                              }}
                              className="rounded accent-amber-600 cursor-pointer"
                            />
                          </td>
                          <td className="p-2.5 font-medium text-stone-900">{p.title}</td>
                          <td className="p-2.5 font-mono text-stone-600">${p.priceUSD}</td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => toggleSale(p.id)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                                isSale
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
                                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                              }`}
                            >
                              {isSale ? (
                                <>
                                  <Tag className="w-3 h-3 text-amber-700" />
                                  <span>On Sale (Checked)</span>
                                </>
                              ) : (
                                <span>Unchecked (Hidden)</span>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. READY TO SHIP (24H DISPATCH CSV) CARD                                  */}
      {/* ========================================================================= */}
      {(activeSectionFilter === 'all' || activeSectionFilter === 'ready-to-ship') && (
        <div id="section-ready-to-ship-csv" className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-5">
          {/* Card Top Header */}
          <div className="pb-4 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                  DEDICATED SECTION CSV
                </span>
                <span className="text-xs font-mono text-stone-500">ready_to_ship_catalog.csv</span>
              </div>
              <h4 className="text-lg font-serif text-stone-900 font-bold mt-1 flex items-center gap-2">
                <span>4. Ready to Ship CSV (In-Stock Express Dispatch)</span>
              </h4>
              <p className="text-xs text-stone-600 mt-0.5 max-w-3xl leading-relaxed">
                Manages in-stock inventory guaranteed to dispatch within 24 hours. Separate upload/download, default CSV generation from the live Ready to Ship page, and granular hide/uncheck controls.
              </p>
            </div>

            {/* Metrics Chips */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                <span className="text-emerald-800 font-mono text-[10px] block">READY TO SHIP ITEMS</span>
                <span className="font-bold text-emerald-900 font-serif text-base">{rtsProducts.length}</span>
              </div>
            </div>
          </div>

          {/* Feedback */}
          {feedback['ready-to-ship'] && (
            <div className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 animate-in fade-in ${
              feedback['ready-to-ship'].success ? 'bg-emerald-50 border border-emerald-300 text-emerald-900' : 'bg-rose-50 border border-rose-300 text-rose-900'
            }`}>
              {feedback['ready-to-ship'].success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{feedback['ready-to-ship'].message}</span>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => rtsFileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Upload .csv for Ready to Ship items"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Ready to Ship .CSV</span>
              </button>

              <button
                onClick={handleExportRts}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold border border-stone-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-stone-600" />
                <span>Export Ready to Ship CSV</span>
              </button>

              <button
                onClick={handleDownloadDefaultRts}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold border border-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Generate default CSV from existing Ready to Ship page items"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-700" />
                <span>Default CSV from Ready to Ship Page</span>
              </button>

              <button
                onClick={handleLoadDefaultRtsIntoEditor}
                className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium border border-stone-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
                <span>Load in Editor</span>
              </button>

              {/* Edit Ready to Ship Page Image & Text */}
              <button
                onClick={() => openAdminPageEditor('ready-to-ship')}
                className="px-3.5 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-950 text-xs font-bold border border-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Edit Ready to Ship page hero image, title, and subtitle"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                <span>Edit Ready to Ship Page (Image &amp; Text)</span>
              </button>
            </div>

            {/* Quick Bulk Hide / Select All for Ready to Ship */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  hideAllReadyToShip();
                  setCardFeedback('ready-to-ship', 'All products unchecked / removed from Ready to Ship.');
                }}
                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-700 text-xs font-medium border border-stone-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide / Uncheck All Ready to Ship</span>
              </button>

              <button
                onClick={() => {
                  selectAllReadyToShip();
                  setCardFeedback('ready-to-ship', 'All items tagged for Ready to Ship 24H dispatch!');
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-semibold border border-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Select / Tag All for Ready to Ship</span>
              </button>

              <button
                onClick={() => setIsMediaGalleryOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium border border-stone-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-stone-600" />
                <span>Media Tools</span>
              </button>
            </div>
          </div>

          {/* Expandable Editor */}
          <div>
            <button
              onClick={() => setShowRtsEditor(!showRtsEditor)}
              className="text-xs font-mono text-stone-600 hover:text-stone-900 flex items-center gap-1 font-semibold py-1 cursor-pointer"
            >
              <span>{showRtsEditor ? '▼ Hide Ready to Ship CSV Editor' : '▶ Open Ready to Ship CSV Raw Textarea Editor'}</span>
            </button>

            {showRtsEditor && (
              <div className="mt-2 space-y-3 p-4 rounded-xl bg-emerald-50/40 border border-emerald-200 animate-in fade-in">
                <textarea
                  value={rtsCsvText}
                  onChange={(e) => setRtsCsvText(e.target.value)}
                  rows={6}
                  className="w-full p-3 font-mono text-xs bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  placeholder="Paste or edit raw Ready to Ship CSV text here..."
                />
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setRtsCsvText('')} className="px-3 py-1.5 rounded-lg text-xs text-stone-600 hover:bg-stone-200">
                    Clear
                  </button>
                  <button
                    onClick={handleApplyRtsCsv}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Parse &amp; Apply Ready to Ship CSV</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Handpicker Table */}
          <div className="pt-2 border-t border-stone-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold text-stone-700 uppercase">
                Tag or Uncheck Items in Ready to Ship:
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={rtsSearch}
                    onChange={(e) => setRtsSearch(e.target.value)}
                    className="pl-8 pr-3 py-1 rounded-lg border border-stone-300 text-xs w-48 bg-white text-stone-900"
                  />
                </div>

                {selectedRtsIds.length > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-stone-500 font-mono">{selectedRtsIds.length} selected:</span>
                    <button
                      onClick={() => {
                        bulkSetReadyToShip(selectedRtsIds, true);
                        setSelectedRtsIds([]);
                        setCardFeedback('ready-to-ship', `Added ${selectedRtsIds.length} items to Ready to Ship!`);
                      }}
                      className="px-2 py-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-medium"
                    >
                      Add to Ready
                    </button>
                    <button
                      onClick={() => {
                        bulkSetReadyToShip(selectedRtsIds, false);
                        setSelectedRtsIds([]);
                        setCardFeedback('ready-to-ship', `Removed ${selectedRtsIds.length} items from Ready to Ship.`);
                      }}
                      className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border border-stone-200 rounded-xl bg-stone-50/50">
              <table className="w-full text-left text-xs text-stone-800">
                <thead className="bg-stone-100 text-[11px] font-mono text-stone-600 sticky top-0 uppercase border-b border-stone-200">
                  <tr>
                    <th className="p-2.5 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRtsIds.length > 0 && selectedRtsIds.length === products.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedRtsIds(products.map((p) => p.id));
                          else setSelectedRtsIds([]);
                        }}
                        className="rounded accent-emerald-700 cursor-pointer"
                      />
                    </th>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5">Inventory / Sizes</th>
                    <th className="p-2.5 text-right">24H Dispatch Status (Allow Hide / Uncheck)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white">
                  {products
                    .filter((p) => (rtsSearch ? p.title.toLowerCase().includes(rtsSearch.toLowerCase()) : true))
                    .map((p) => {
                      const isRts = isReadyToShipProduct(p);
                      const isSelected = selectedRtsIds.includes(p.id);
                      return (
                        <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedRtsIds([...selectedRtsIds, p.id]);
                                else setSelectedRtsIds(selectedRtsIds.filter((id) => id !== p.id));
                              }}
                              className="rounded accent-emerald-700 cursor-pointer"
                            />
                          </td>
                          <td className="p-2.5 font-medium text-stone-900">{p.title}</td>
                          <td className="p-2.5 text-stone-500 font-mono text-[11px]">
                            {p.sizes?.slice(0, 3).join(', ') || 'Standard Sizes'}
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => toggleReadyToShip(p.id)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                                isRts
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold'
                                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                              }`}
                            >
                              {isRts ? (
                                <>
                                  <PackageCheck className="w-3 h-3 text-emerald-700" />
                                  <span>Ready to Ship (Checked)</span>
                                </>
                              ) : (
                                <span>Unchecked (Hidden)</span>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
