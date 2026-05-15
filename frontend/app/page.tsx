'use client';

import { useState, useRef, ChangeEvent, FormEvent, DragEvent } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  UploadCloud, Image as ImageIcon, Info, Microscope, RotateCcw, 
  Activity, CheckCircle2, AlertCircle, ShieldAlert, Network, 
  Database, Server, Loader2, FileCheck2, Target, ScanLine, FlaskConical,
  Download, FileText, BookOpen, AlertTriangle, Lock, Eye, Heart, ShieldCheck
} from 'lucide-react';

interface PredictionResponse {
  classification: string;
  confidence: number;
  confidence_variance: number;
  confidence_std: number;
  probability_healthy: number;
  probability_leukemia: number;
  model_used: string;
  message: string;
  explanation_image: string;
  feature_importance: Record<string, number>;
  csv_export_data: {
    clinical_features: Record<string, number>;
    mc_predictions: number[];
    model_info: {
      model_type: string;
      num_mc_iterations: number;
      mean_prediction: number;
      std_prediction: number;
    };
  };
}

interface FormData {
  WBC_count: string;
  LDH_level: string;
  Hemoglobin: string;
  Platelet_count: string;
  RBC_count: string;
  Hematocrit: string;
  Lymphocyte_percentage: string;
  Neutrophil_percentage: string;
  Uric_acid: string;
}

export default function LeukemiaDiagnosis() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showResults, setShowResults] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'global' | 'alpha' | 'beta'>('global');
  const reportRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<FormData>({
    WBC_count: '', LDH_level: '', Hemoglobin: '', Platelet_count: '',
    RBC_count: '', Hematocrit: '', Lymphocyte_percentage: '',
    Neutrophil_percentage: '', Uric_acid: '',
  });

  const featureLabels: Record<keyof FormData, string> = {
    WBC_count: 'WBC Count (10³/μL)', LDH_level: 'LDH Level (U/L)',
    Hemoglobin: 'Hemoglobin (g/dL)', Platelet_count: 'Platelet Count (10³/μL)',
    RBC_count: 'RBC Count (10⁶/μL)', Hematocrit: 'Hematocrit (%)',
    Lymphocyte_percentage: 'Lymphocyte (%)', Neutrophil_percentage: 'Neutrophil (%)',
    Uric_acid: 'Uric Acid (mg/dL)',
  };

  // --- DEMO DATA AUTOFILL ---
  const demoProfiles = {
    alphaHealthy: {
      WBC_count: '6.29', LDH_level: '288.65', Hemoglobin: '12.40', Platelet_count: '193.66',
      RBC_count: '6.18', Hematocrit: '29.28', Lymphocyte_percentage: '16.63', Neutrophil_percentage: '48.29', Uric_acid: '9.84'
    },
    alphaLeukemia: {
      WBC_count: '29.44', LDH_level: '692.85', Hemoglobin: '9.70', Platelet_count: '120.35',
      RBC_count: '3.37', Hematocrit: '23.65', Lymphocyte_percentage: '71.28', Neutrophil_percentage: '29.02', Uric_acid: '9.36'
    },
    betaHealthy: {
      WBC_count: '16.57', LDH_level: '138.65', Hemoglobin: '13.79', Platelet_count: '197.74',
      RBC_count: '5.07', Hematocrit: '40.38', Lymphocyte_percentage: '52.93', Neutrophil_percentage: '57.90', Uric_acid: '4.99'
    },
    betaLeukemia: {
      WBC_count: '37.88', LDH_level: '678.14', Hemoglobin: '8.86', Platelet_count: '45.67',
      RBC_count: '3.38', Hematocrit: '31.71', Lymphocyte_percentage: '19.39', Neutrophil_percentage: '32.18', Uric_acid: '11.69'
    }
  };

  const handleAutoFill = (profileKey: keyof typeof demoProfiles) => {
    setFormData(demoProfiles[profileKey]);
    toast.success('Clinical profile auto-filled for testing.');
  };

  // --- FILE HANDLING ---
  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) processFile(files[0]);
  };

  const processFile = (file: File) => {
    const validTypes = ['image/bmp', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a BMP, JPG, or PNG image');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    toast.success('Image attached successfully');
  };

  const handleDragEvents = (e: DragEvent<HTMLDivElement>, isDraggingState: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(isDraggingState);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // --- FORM HANDLING ---
  const handleFormChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validateForm = (): boolean => {
    if (Object.values(formData).some((val) => val === '')) {
      toast.error('Please fill in all clinical features');
      return false;
    }
    if (Object.values(formData).map(Number).some((val) => isNaN(val) || val < 0)) {
      toast.error('Please enter valid positive numbers');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedImage) return toast.error('Please upload a blood smear image');
    if (!validateForm()) return;

    setLoading(true);
    setShowResults(false);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', selectedImage);
      formDataToSend.append('model_type', selectedModel);
      Object.entries(formData).forEach(([key, value]) => formDataToSend.append(key, value));

      console.log(process.env.NEXT_PUBLIC_API_URL + '/predict');

      const response = await axios.post<PredictionResponse>(
        process.env.NEXT_PUBLIC_API_URL + '/predict',
        formDataToSend,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setPrediction(response.data);
      setShowResults(true);
      toast.success('Analysis complete');
    } catch (error) {
      toast.error(axios.isAxiosError(error) ? error.response?.data?.detail : 'Server error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setPrediction(null);
    setShowResults(false);
    setFormData(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: '' }), {} as FormData));
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success('Form reset');
  };

  // --- PDF EXPORT ---
  const downloadPDFReport = async () => {
    if (!prediction || !reportRef.current) {
      toast.error('No report available for download');
      return;
    }

    try {
      // Dynamically import html2canvas and jsPDF
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).jsPDF;

      toast.loading('Generating PDF report...');

      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#0B1120',
        scale: 2,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Add metadata
      const timestamp = new Date().toLocaleString();
      pdf.setProperties({
        title: `Leukemia Diagnosis Report - ${timestamp}`,
        author: 'Federated Leukemia Diagnostics System',
        subject: 'Clinical Diagnosis Report',
        keywords: 'leukemia, diagnosis, medical',
      });

      pdf.save(`leukemia_diagnosis_report_${Date.now()}.pdf`);
      toast.success('PDF report downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF report');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 font-sans selection:bg-cyan-500/30 pb-20">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0B1120]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-lg shadow-cyan-500/20">
              <Network className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400">
                Federated Leukemia Diagnostics
              </h1>
              <p className="text-cyan-400 text-xs font-medium tracking-wide uppercase mt-0.5">
                Multimodal AI Pipeline
              </p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <a
              href="/docs"
              className="flex items-center gap-2 text-xs text-slate-300 bg-white/5 hover:bg-white/10 py-2 px-4 rounded-full border border-white/10 hover:border-cyan-500/30 transition-all"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              Documentation
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* 1. Model Selection Tier */}
          <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-500" />
              Select Active AI Model
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'global', name: 'Global Aggregated Model', icon: Network, desc: 'Trained securely across all institutions.' },
                { id: 'alpha', name: 'Institution Alpha (Local)', icon: Server, desc: 'Trained exclusively on Site A data.' },
                { id: 'beta', name: 'Institution Beta (Local)', icon: Server, desc: 'Trained exclusively on Site B data.' }
              ].map((m) => (
                <div 
                  key={m.id}
                  onClick={() => setSelectedModel(m.id as any)}
                  className={`relative cursor-pointer rounded-xl p-4 border transition-all duration-300 ${
                    selectedModel === m.id 
                    ? 'bg-cyan-500/10 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                    : 'bg-white/5 border-transparent hover:border-white/10 hover:bg-white/10'
                  }`}
                >
                  {selectedModel === m.id && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                    </div>
                  )}
                  <m.icon className={`w-6 h-6 mb-3 ${selectedModel === m.id ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <h3 className="font-medium text-slate-200">{m.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{m.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 2. Quick Load Test Profiles Tier */}
          <section className="bg-slate-800/40 border border-white/5 rounded-xl px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <FlaskConical className="w-4 h-4 text-purple-400" />
              Quick Load Test Profiles
            </div>
            <div className="flex flex-wrap gap-3">
              <button 
                type="button" 
                onClick={() => handleAutoFill('alphaHealthy')}
                className="text-[10px] uppercase tracking-wider font-semibold px-3 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all"
              >
                Site A: Healthy
              </button>
              <button 
                type="button" 
                onClick={() => handleAutoFill('alphaLeukemia')}
                className="text-[10px] uppercase tracking-wider font-semibold px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 hover:border-red-500/40 transition-all"
              >
                Site A: Leukemia
              </button>
              <button 
                type="button" 
                onClick={() => handleAutoFill('betaHealthy')}
                className="text-[10px] uppercase tracking-wider font-semibold px-3 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all"
              >
                Site B: Healthy
              </button>
              <button 
                type="button" 
                onClick={() => handleAutoFill('betaLeukemia')}
                className="text-[10px] uppercase tracking-wider font-semibold px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 hover:border-red-500/40 transition-all"
              >
                Site B: Leukemia
              </button>
            </div>
          </section>

          {/* 3. Input Modalities Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
            {/* Left: Image Upload */}
            <div className="space-y-6">
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 h-full">
                <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">1</span>
                  Blood Smear Image
                </h2>
                
                <div
                  onDragEnter={(e) => handleDragEvents(e, true)}
                  onDragLeave={(e) => handleDragEvents(e, false)}
                  onDragOver={(e) => handleDragEvents(e, true)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                    isDragging ? 'border-cyan-400 bg-cyan-500/5' : 'border-slate-700 bg-black/20 hover:border-slate-500'
                  }`}
                >
                  <input ref={fileInputRef} type="file" accept=".bmp,.jpg,.jpeg,.png" onChange={handleFileSelect} className="hidden" />
                  
                  {imagePreview ? (
                    <div className="space-y-4">
                      <div className="relative w-full h-48 rounded-lg overflow-hidden bg-black/40 ring-1 ring-white/10">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 text-sm text-slate-300 bg-white/5 px-3 py-1.5 rounded-full">
                          <FileCheck2 className="w-4 h-4 text-green-400" />
                          <span className="truncate max-w-[200px]">{selectedImage?.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImage(null);
                            setImagePreview(null);
                          }}
                          className="text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-4"
                        >
                          Remove & Upload New
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6">
                      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-200 font-medium">Drag & drop your scan here</p>
                      <p className="text-slate-500 text-sm mt-1">or click to browse local files</p>
                      <div className="flex items-center gap-4 mt-6 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> BMP, JPG, PNG</span>
                        <span>Max 10MB</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-blue-950/20 border border-blue-900/50 rounded-xl p-4 flex items-start gap-3 mt-6">
                  <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-blue-200">Image Requirements</h3>
                    <p className="text-xs text-blue-300/70 mt-1 leading-relaxed">
                      Ensure the blood smear is well-lit, properly stained, and centered. The model automatically crops and scales inputs to 224x224px.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Clinical Features */}
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 h-full">
              <h2 className="text-lg font-semibold text-slate-100 mb-6 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">2</span>
                Clinical Tabular Data
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {Object.keys(formData).map((key) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 tracking-wide">
                      {featureLabels[key as keyof FormData]}
                    </label>
                    <input
                      type="number"
                      name={key}
                      value={formData[key as keyof FormData]}
                      onChange={handleFormChange}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-4 px-6 rounded-xl shadow-lg shadow-cyan-900/50 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Running Inference & XAI...</>
              ) : (
                <><Microscope className="w-5 h-5 group-hover:scale-110 transition-transform" /> Analyze Patient Data</>
              )}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-300 font-semibold py-4 px-8 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </form>

        {/* Results & XAI Section */}
        {showResults && prediction && (
          <div ref={reportRef} className="mt-16 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
            
            {/* PART 1: The Diagnosis */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Activity className="w-6 h-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-slate-100">Diagnostic Report</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Classification Card */}
                <div className={`rounded-2xl p-8 border ${
                    prediction.classification === 'Leukemia'
                      ? 'bg-red-950/20 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.1)]'
                      : 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-1">Result</p>
                      <p className={`text-4xl font-bold ${prediction.classification === 'Leukemia' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {prediction.classification}
                      </p>
                      <p className="text-sm text-slate-500 mt-2">Analyzed via {prediction.model_used.toUpperCase()} Model</p>
                    </div>
                    {prediction.classification === 'Leukemia' 
                      ? <AlertCircle className="w-12 h-12 text-red-400/80" /> 
                      : <CheckCircle2 className="w-12 h-12 text-emerald-400/80" />
                    }
                  </div>
                </div>

                {/* Confidence Card with Uncertainty */}
                <div className="rounded-2xl p-8 bg-slate-900/50 border border-white/5">
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-1">Confidence Score (with Uncertainty)</p>
                  <div className="flex items-end gap-3 mb-4">
                    <span className="text-4xl font-bold text-cyan-400">
                      {(prediction.confidence * 100).toFixed(1)}%
                    </span>
                    <span className="text-sm text-slate-400 mb-1">
                      ± {(prediction.confidence_std * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full bg-black/50 rounded-full h-2.5 overflow-hidden ring-1 ring-white/10 mb-4">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${prediction.confidence * 100}%` }}
                    />
                  </div>
                  
                  {/* Uncertainty Indicator */}
                  <div className={`text-xs p-2.5 rounded-lg ${
                    prediction.confidence_std > 0.1 
                      ? 'bg-yellow-950/30 text-yellow-200 border border-yellow-700/30' 
                      : 'bg-emerald-950/30 text-emerald-200 border border-emerald-700/30'
                  }`}>
                    <div className="flex items-start gap-2">
                      {prediction.confidence_std > 0.1 ? (
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-semibold">Monte Carlo Uncertainty</p>
                        <p className="text-xs opacity-80 mt-0.5">
                          {prediction.confidence_std > 0.1 
                            ? `⚠️ High variance detected (${(prediction.confidence_std * 100).toFixed(2)}%). Model confidence varies across runs. Recommend clinical review.`
                            : `✓ Low variance (${(prediction.confidence_std * 100).toFixed(2)}%). Prediction is stable.`
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-400 space-y-1">
                    <p><span className="text-slate-300">Variance:</span> {(prediction.confidence_variance * 100).toFixed(4)}%</p>
                    <p><span className="text-slate-300">MC Iterations:</span> 10</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Probability Distribution */}
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Probability Distribution</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-slate-300">Probability of Leukemia</span>
                    <span className="text-red-400 font-semibold">{(prediction.probability_leukemia * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-black/50 rounded-full h-2.5 overflow-hidden ring-1 ring-white/10">
                    <div
                      className="bg-red-500 h-full rounded-full"
                      style={{ width: `${prediction.probability_leukemia * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-slate-300">Probability of Healthy</span>
                    <span className="text-emerald-400 font-semibold">{(prediction.probability_healthy * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-black/50 rounded-full h-2.5 overflow-hidden ring-1 ring-white/10">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${prediction.probability_healthy * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* PART 2: Explainable AI (XAI) */}
            <div className="border-t border-slate-700/50 pt-10">
              <div className="flex items-center gap-3 mb-8">
                <ScanLine className="w-6 h-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-slate-100">Model Interpretability (XAI)</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Vision XAI: Grad-CAM Heatmap */}
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-cyan-500" />
                    Visual Attention Map (Grad-CAM)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 text-center uppercase tracking-wider">Original Scan</p>
                      <div className="rounded-lg overflow-hidden border border-white/10 aspect-square">
                        <img src={imagePreview!} alt="Original" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 text-center uppercase tracking-wider">AI Activation</p>
                      <div className="rounded-lg overflow-hidden border border-cyan-500/30 aspect-square relative group">
                        {prediction.explanation_image ? (
                           <img 
                            src={`data:image/jpeg;base64,${prediction.explanation_image}`} 
                            alt="Grad-CAM Heatmap" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center bg-black/50 text-xs text-slate-500">Image XAI Unavailable</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                          <p className="text-[10px] text-cyan-300 leading-tight">Red/hot areas indicate morphological anomalies. Yellow/cool areas indicate normal morphology. This visual attention map shows which regions influenced the diagnosis.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-950/20 border border-blue-900/50 rounded-lg text-xs text-blue-300">
                    <p className="font-semibold mb-1">How to Read:</p>
                    <p>The heatmap overlays model activation on your blood smear image. Brighter (red/hot) colors = more influential regions for diagnosis. Use this to validate the model's focus aligns with clinical observations.</p>
                  </div>
                </div>

                {/* Tabular XAI: Feature Impact Chart */}
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-6 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-500" />
                    Clinical Feature Impact
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(prediction.feature_importance)
                      .sort(([, valA], [, valB]) => Math.abs(valB) - Math.abs(valA))
                      .slice(0, 6)
                      .map(([feature, impact]) => {
                        const isPushingLeukemia = impact > 0;
                        const maxImpact = Math.max(...Object.values(prediction.feature_importance).map(Math.abs));
                        const widthPercentage = maxImpact === 0 ? 0 : Math.max(5, (Math.abs(impact) / maxImpact) * 100);

                        return (
                          <div key={feature} className="relative">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-300">{feature.replace(/_/g, ' ')}</span>
                              <span className={`font-semibold ${isPushingLeukemia ? 'text-red-400' : 'text-emerald-400'}`}>
                                {isPushingLeukemia ? '⬆️ Leukemia Signal' : '⬇️ Health Signal'}
                              </span>
                            </div>
                            <div className="w-full bg-black/40 rounded-full h-2.5">
                              <div
                                className={`h-full rounded-full ${isPushingLeukemia ? 'bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}
                                style={{ width: `${widthPercentage}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">Impact: {impact.toFixed(4)}</p>
                          </div>
                        );
                      })}
                  </div>
                  <div className="mt-4 p-3 bg-purple-950/20 border border-purple-900/50 rounded-lg text-xs text-purple-300">
                    <p className="font-semibold mb-1">Feature Gradients:</p>
                    <p>These values represent how much each clinical input influenced the prediction (using gradient-based attribution). Positive = pushed toward leukemia diagnosis. Negative = pushed toward healthy classification.</p>
                  </div>
                </div>
              </div>

              {/* All Features Detailed Table */}
              <div className="mt-8 bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">All Feature Importances</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-700/50 text-slate-400">
                        <th className="text-left py-2 px-3">Feature</th>
                        <th className="text-right py-2 px-3">Impact Value</th>
                        <th className="text-right py-2 px-3">Direction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(prediction.feature_importance)
                        .sort(([, valA], [, valB]) => Math.abs(valB) - Math.abs(valA))
                        .map(([feature, impact], idx) => (
                          <tr key={feature} className={`border-b border-slate-800 ${idx % 2 === 0 ? 'bg-white/2' : ''}`}>
                            <td className="py-2.5 px-3 text-slate-300">{feature}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-300">{impact.toFixed(6)}</td>
                            <td className="py-2.5 px-3 text-right">
                              <span className={impact > 0 ? 'text-red-400' : 'text-emerald-400'}>
                                {impact > 0 ? '⬆️ Leukemia' : '⬇️ Healthy'}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* PART 3: Clinical Data & Export */}
            <div className="border-t border-slate-700/50 pt-10">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-6 h-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-slate-100">Export & Clinical Data</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <button
                  onClick={downloadPDFReport}
                  className="flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg shadow-cyan-900/50"
                >
                  <Download className="w-5 h-5" />
                  Download Clinical Report (PDF)
                </button>
              </div>

              {/* Input Features Summary */}
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Input Clinical Features</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {Object.entries(prediction.csv_export_data.clinical_features).map(([feature, value]) => (
                    <div key={feature} className="bg-black/40 rounded-lg p-3 border border-white/5">
                      <p className="text-xs text-slate-500 mb-1">{feature}</p>
                      <p className="text-sm font-semibold text-slate-200">{typeof value === 'number' ? value.toFixed(2) : value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Model Info */}
              <div className="mt-6 bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Model & Uncertainty Details</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                    <p className="text-xs text-slate-500 mb-1">Model Type</p>
                    <p className="text-sm font-semibold text-slate-200 capitalize">{prediction.model_used}</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                    <p className="text-xs text-slate-500 mb-1">MC Iterations</p>
                    <p className="text-sm font-semibold text-slate-200">{prediction.csv_export_data.model_info.num_mc_iterations}</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                    <p className="text-xs text-slate-500 mb-1">Mean Prediction</p>
                    <p className="text-sm font-semibold text-slate-200">{(prediction.csv_export_data.model_info.mean_prediction * 100).toFixed(2)}%</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                    <p className="text-xs text-slate-500 mb-1">Std Deviation</p>
                    <p className="text-sm font-semibold text-slate-200">{(prediction.csv_export_data.model_info.std_prediction * 100).toFixed(2)}%</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                    <p className="text-xs text-slate-500 mb-1">Variance</p>
                    <p className="text-sm font-semibold text-slate-200">{(prediction.confidence_variance * 100).toFixed(4)}%</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                    <p className="text-xs text-slate-500 mb-1">Timestamp</p>
                    <p className="text-sm font-semibold text-slate-200">{new Date().toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Trust & Privacy Footer */}
      <footer className="border-t border-white/5 bg-slate-900/30 backdrop-blur-sm mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Three-pillar trust grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            {/* Privacy by Design */}
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20 shrink-0">
                <Lock className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200 mb-1">Privacy by Design</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Built on Federated Learning — raw patient data never leaves institutional boundaries. Only encrypted model gradients are aggregated.
                </p>
              </div>
            </div>

            {/* Clinical Safety */}
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200 mb-1">Clinical Safety</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Monte Carlo Dropout quantifies prediction uncertainty. Grad-CAM ensures visual interpretability for every diagnosis.
                </p>
              </div>
            </div>

            {/* Ethical AI */}
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-purple-500/10 rounded-lg border border-purple-500/20 shrink-0">
                <Eye className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200 mb-1">Transparent & Ethical AI</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every prediction is accompanied by full XAI explanations — feature attributions and visual attention maps — ensuring no black-box decisions.
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/5 pt-8">
            {/* Disclaimer strip */}
            <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl px-5 py-4 flex items-start gap-3 mb-8">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/80 leading-relaxed">
                <span className="font-semibold text-amber-200">Clinical Disclaimer:</span> This system is a CDSS prototype for research and educational purposes only. It is not a substitute for professional medical diagnosis. Always consult a qualified hematologist or oncologist.
              </p>
            </div>

            {/* Bottom bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-md">
                  <Network className="w-3 h-3 text-white" />
                </div>
                <span className="text-slate-400 font-medium">Federated Leukemia Diagnostics</span>
                <span className="text-slate-600">{"\u00B7"}</span>
                <span>Multimodal AI Pipeline</span>
              </div>
              <div className="flex items-center gap-1 text-slate-500">
                {"Built"}{" for safer, privacy-preserving healthcare AI"}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}