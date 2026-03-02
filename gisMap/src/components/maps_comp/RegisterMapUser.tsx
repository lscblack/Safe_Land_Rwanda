import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2,
  Download,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileText,
  Map,
  Calendar,
  Hash,
  MoreVertical,
  X,
  CheckCircle,
  Layers,
  Upload,
  ArrowUpCircle,
  FileWarning,
  Clock,
} from 'lucide-react';
import api from '../../instance/mainAxios';

interface Mapping {
  id: number;
  upi: string;
  official_registry_polygon: string;
  document_detected_polygon: string;
  status_details: string;
  overlaps: boolean;
  year_of_record: number;
  save_to_buy: boolean;
  property_id: number | null;
  created_at: string;
  updated_at: string;
}

interface StatusDetails {
  official_registry_polygon: any;
  inTransaction: boolean;
  underMortgage: boolean;
  hasCaveat: boolean;
  isProvisional: boolean;
  area: number;
  landUse?: {
    landUseId: number;
    landUseTypeNameEnglish: string;
    landUseTypeNameKinyarwanda: string;
    landUseTypeNameFrench: string;
  };
}

interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'processing' | 'success' | 'error';
  progress?: number;
  result?: any;
  error?: string;
  responseData?: any;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
  isLoading: boolean;
}

/* =========================
   DELETE CONFIRMATION MODAL
========================= */
function DeleteConfirmModal({ isOpen, onClose, onConfirm, count, isLoading }: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-100 rounded-full">
            <AlertCircle size={24} style={{ color: '#EF4444' }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>
              Confirm Deletion
            </h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete {count} mapping{count !== 1 ? 's' : ''}?
            </p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-red-700">
            This action cannot be undone. The selected mappings will be permanently removed from the system.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Delete {count}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* =========================
   VIEW DETAILS MODAL
========================= */
interface ViewDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapping: Mapping | null;
}

function ViewDetailsModal({ isOpen, onClose, mapping }: ViewDetailsModalProps) {
  if (!isOpen || !mapping) return null;

  const parseStatusDetails = (details: string): StatusDetails | null => {
    try {
      return JSON.parse(details);
    } catch {
      return null;
    }
  };

  const statusDetails = parseStatusDetails(mapping.status_details);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 bg-opacity-50 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--color-foreground)' }}>
              Mapping Details
            </h2>
            <p className="text-sm text-gray-600 mt-1">ID: {mapping.id} • UPI: {mapping.upi}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-3" style={{ color: 'var(--color-primary)' }}>
                  Basic Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID:</span>
                    <span className="font-medium">{mapping.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">UPI:</span>
                    <span className="font-medium">{mapping.upi}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Year of Record:</span>
                    <span className="font-medium">{mapping.year_of_record}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Property ID:</span>
                    <span className="font-medium">{mapping.property_id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Overlaps:</span>
                    <span className={`font-medium ${mapping.overlaps ? 'text-orange-600' : 'text-green-600'}`}>
                      {mapping.overlaps ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-3" style={{ color: 'var(--color-primary)' }}>
                  Timestamps
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">
                      {new Date(mapping.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Updated:</span>
                    <span className="font-medium">
                      {new Date(mapping.updated_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {statusDetails && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-3" style={{ color: 'var(--color-primary)' }}>
                    Status Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Area:</span>
                      <span className="font-medium">{statusDetails.area} m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">In Transaction:</span>
                      <span className={`font-medium ${statusDetails.inTransaction ? 'text-red-600' : 'text-green-600'}`}>
                        {statusDetails.inTransaction ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Under Mortgage:</span>
                      <span className={`font-medium ${statusDetails.underMortgage ? 'text-orange-600' : 'text-green-600'}`}>
                        {statusDetails.underMortgage ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Has Caveat:</span>
                      <span className={`font-medium ${statusDetails.hasCaveat ? 'text-purple-600' : 'text-green-600'}`}>
                        {statusDetails.hasCaveat ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Is Provisional:</span>
                      <span className={`font-medium ${statusDetails.isProvisional ? 'text-orange-600' : 'text-green-600'}`}>
                        {statusDetails.isProvisional ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                  {/** show gis cordinated offical */}
                  {statusDetails.official_registry_polygon && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <h4 className="font-medium text-sm mb-2">GIS Coordinates</h4>
                      <div className="space-y-1 text-xs">
                        <div>Official Registry Polygon:</div>
                        <div>{statusDetails.official_registry_polygon}</div>
                      </div>
                    </div>
                  )}


                  {statusDetails.landUse && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <h4 className="font-medium text-sm mb-2">Land Use</h4>
                      <div className="space-y-1 text-xs">
                        <div>English: {statusDetails.landUse.landUseTypeNameEnglish}</div>
                        <div>Kinyarwanda: {statusDetails.landUse.landUseTypeNameKinyarwanda}</div>
                        <div>French: {statusDetails.landUse.landUseTypeNameFrench}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* =========================
   PDF UPLOADER COMPONENT
========================= */
interface PdfUploaderProps {
  onUploadComplete?: () => void;
}

function PdfUploader({ onUploadComplete }: PdfUploaderProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const processingRef = useRef<boolean>(false);

  const uploadStats = {
    total: uploadFiles.length,
    processed: uploadFiles.filter(f => f.status === 'success' || f.status === 'error').length,
    success: uploadFiles.filter(f => f.status === 'success').length,
    error: uploadFiles.filter(f => f.status === 'error').length,
    pending: uploadFiles.filter(f => f.status === 'pending').length,
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFiles = (fileList: File[]): File[] => {
    return fileList.filter(file => {
      if (file.type !== 'application/pdf') {
        alert(`File "${file.name}" is not a PDF. Only PDF files are allowed.`);
        return false;
      }
      if (uploadFiles.some(f => f.name === file.name && f.size === file.size)) {
        alert(`File "${file.name}" already exists in the upload list.`);
        return false;
      }
      return true;
    });
  };

  const handleFiles = (fileList: File[]) => {
    const validFiles = validateFiles(Array.from(fileList));

    const newFiles: UploadFile[] = validFiles.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      status: 'pending',
    }));

    setUploadFiles(prev => [...prev, ...newFiles]);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
    if (expandedFile === id) {
      setExpandedFile(null);
    }
  };

  const clearAll = () => {
    // Cancel any ongoing upload
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    if (isProcessing) {
      setUploadFiles([]);
      setCurrentIndex(-1);
      setIsProcessing(false);
      processingRef.current = false;
      setExpandedFile(null);
    } else {
      setUploadFiles([]);
      setCurrentIndex(-1);
      setExpandedFile(null);
    }
  };

  const removeCompleted = () => {
    setUploadFiles(prev => prev.filter(f => f.status === 'pending' || f.status === 'processing'));
    setExpandedFile(null);
  };

  const processFile = async (file: UploadFile, index: number): Promise<void> => {
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    setUploadFiles(prev => prev.map((f, i) =>
      i === index ? { ...f, status: 'processing', progress: 0 } : f
    ));

    const formData = new FormData();
    formData.append('file', file.file);

    try {
      let progressInterval: ReturnType<typeof setInterval> | null = null;
      
      // Only start progress interval if request hasn't been aborted
      if (!abortControllerRef.current.signal.aborted) {
        progressInterval = setInterval(() => {
          setUploadFiles(prev => prev.map((f, i) =>
            i === index && f.status === 'processing'
              ? { ...f, progress: Math.min((f.progress || 0) + 5, 90) }
              : f
          ));
        }, 500);
      }

      const response = await api.post('/api/mappings/extract-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: abortControllerRef.current.signal,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && !abortControllerRef.current?.signal.aborted) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadFiles(prev => prev.map((f, i) =>
              i === index ? { ...f, progress: Math.min(percentCompleted, 90) } : f
            ));
          }
        },
      });

      if (progressInterval) {
        clearInterval(progressInterval);
      }

      // Check if request was aborted during upload
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      // Mark as success with 100% progress
      setUploadFiles(prev => prev.map((f, i) =>
        i === index ? {
          ...f,
          status: 'success',
          progress: 100,
          responseData: response.data
        } : f
      ));

      // Wait a moment to show 100% progress before moving to next file
      await new Promise(resolve => setTimeout(resolve, 500));

      // Process next file only after current one is completely done
      const nextPendingIndex = uploadFiles.findIndex(
        (f, idx) => idx > index && f.status === 'pending'
      );

      if (nextPendingIndex !== -1) {
        setCurrentIndex(nextPendingIndex);
        await processFile(uploadFiles[nextPendingIndex], nextPendingIndex);
      } else {
        // No more pending files, finish processing
        setIsProcessing(false);
        processingRef.current = false;
        setCurrentIndex(-1);
        abortControllerRef.current = null;
        onUploadComplete?.();
      }

    } catch (error: any) {

      console.error(`Error processing ${file.name}:`, error.status);

      // Don't update if request was aborted
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        return;
      }

      setUploadFiles(prev => prev.map((f, i) =>
        i === index
          ? {
              ...f,
              status: 'error',
              error:error.status == 403 ? "You don't have permission to upload other peoples E-titles." : error.response?.data?.message || error.message || "Upload failed",
              progress: undefined,
            }
          : f
      ));

      // Continue with next file even if this one failed
      const nextPendingIndex = uploadFiles.findIndex(
        (f, idx) => idx > index && f.status === 'pending'
      );

      if (nextPendingIndex !== -1) {
        setCurrentIndex(nextPendingIndex);
        await processFile(uploadFiles[nextPendingIndex], nextPendingIndex);
      } else {
        setIsProcessing(false);
        processingRef.current = false;
        setCurrentIndex(-1);
        abortControllerRef.current = null;
        onUploadComplete?.();
      }
    }
  };

  const startProcessing = async () => {
    if (uploadFiles.length === 0) return;
    if (isProcessing || processingRef.current) return;

    const firstPendingIndex = uploadFiles.findIndex(f => f.status === 'pending');
    if (firstPendingIndex === -1) return;

    setIsProcessing(true);
    processingRef.current = true;
    setCurrentIndex(firstPendingIndex);
    
    // Start processing the first pending file
    await processFile(uploadFiles[firstPendingIndex], firstPendingIndex);
  };

  const retryFailed = async () => {
    const failedFiles = uploadFiles.filter(f => f.status === 'error');
    if (failedFiles.length === 0) return;

    // Reset failed files to pending
    setUploadFiles(prev => prev.map(f =>
      f.status === 'error' ? { ...f, status: 'pending', progress: undefined, error: undefined } : f
    ));

    // Start processing if not already processing
    if (!isProcessing && !processingRef.current) {
      const firstPendingIndex = uploadFiles.findIndex(f => f.status === 'pending');
      if (firstPendingIndex !== -1) {
        setIsProcessing(true);
        processingRef.current = true;
        setCurrentIndex(firstPendingIndex);
        await processFile(uploadFiles[firstPendingIndex], firstPendingIndex);
      }
    }
  };

  const stopProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setIsProcessing(false);
    processingRef.current = false;
    setCurrentIndex(-1);
    
    // Reset any processing files back to pending
    setUploadFiles(prev => prev.map(f =>
      f.status === 'processing' ? { ...f, status: 'pending', progress: undefined } : f
    ));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={20} className="text-red-500" />;
      case 'processing':
        return <Loader2 size={20} className="animate-spin text-blue-500" />;
      default:
        return <Clock size={20} className="text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'processing': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
        Upload PDF Documents
      </h3>

      {/* Upload Stats */}
      {uploadFiles.length > 0 && (
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-600">Total</div>
            <div className="text-lg font-semibold">{uploadStats.total}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-600">Processed</div>
            <div className="text-lg font-semibold text-blue-600">{uploadStats.processed}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-600">Success</div>
            <div className="text-lg font-semibold text-green-600">{uploadStats.success}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-600">Failed</div>
            <div className="text-lg font-semibold text-red-600">{uploadStats.error}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-600">Pending</div>
            <div className="text-lg font-semibold text-gray-600">{uploadStats.pending}</div>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-6 mb-4 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => handleFiles(Array.from(e.target.files || []))}
        />
        <ArrowUpCircle
          size={40}
          className={`mx-auto mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}
        />
        <p className="text-sm font-medium text-gray-700 mb-1">
          {isDragging ? 'Drop your PDFs here' : 'Drag & drop PDF files or click to browse'}
        </p>
        <p className="text-xs text-gray-500">
          Only PDF files are accepted. Multiple files can be uploaded and will be processed sequentially.
        </p>
      </div>

      {/* Upload Actions */}
      {uploadFiles.length > 0 && (
        <div className="flex gap-2 mb-4">
          {!isProcessing ? (
            <button
              onClick={startProcessing}
              disabled={uploadStats.pending === 0}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5
                ${uploadStats.pending === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }
              `}
            >
              <Upload size={14} />
              Start ({uploadStats.pending})
            </button>
          ) : (
            <button
              onClick={stopProcessing}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1.5"
            >
              <X size={14} />
              Stop Processing
            </button>
          )}

          {uploadStats.error > 0 && !isProcessing && (
            <button
              onClick={retryFailed}
              className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 flex items-center gap-1.5"
            >
              <AlertCircle size={14} />
              Retry Failed ({uploadStats.error})
            </button>
          )}

          <button
            onClick={removeCompleted}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 flex items-center gap-1.5"
          >
            <CheckCircle size={14} />
            Clear Completed
          </button>

          <button
            onClick={clearAll}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1.5 ml-auto"
          >
            <Trash2 size={14} />
            Clear All
          </button>
        </div>
      )}

      {/* File List */}
      {uploadFiles.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {uploadFiles.map((file, index) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`
                border rounded-lg overflow-hidden
                ${getStatusColor(file.status)}
                ${index === currentIndex ? 'ring-2 ring-blue-400' : ''}
              `}
            >
              <div className="p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <FileText size={18} className="text-gray-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                        {file.name}
                      </span>
                      {index === currentIndex && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full">
                          Processing
                        </span>
                      )}
                      {file.status === 'success' && file.progress === 100 && (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full">
                          Complete
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span>{formatFileSize(file.size)}</span>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(file.status)}
                        <span className="capitalize">
                          {file.status === 'success' && file.progress === 100 ? 'Complete' : file.status}
                        </span>
                      </span>
                    </div>

                    {file.progress !== undefined && (
                      <div className="mt-1.5">
                        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 mt-0.5">
                          {file.progress}% {file.status === 'success' && file.progress === 100 ? 'complete' : 'uploaded'}
                        </span>
                      </div>
                    )}

                    {file.error && (
                      <div className="mt-1.5 text-xs text-red-600 bg-red-50 p-1.5 rounded">
                        <FileWarning size={12} className="inline mr-1" />
                        {file.error}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpandedFile(expandedFile === file.id ? null : file.id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title={expandedFile === file.id ? 'Collapse' : 'Expand'}
                    >
                      {expandedFile === file.id ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                    </button>

                    {file.status !== 'processing' && (
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors text-red-600"
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedFile === file.id && file.responseData && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-2 pt-2 border-t border-gray-200"
                    >
                      <pre className="text-xs bg-white p-2 rounded border border-gray-200 overflow-auto max-h-32">
                        {JSON.stringify(file.responseData, null, 2)}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================
   MAIN COMPONENT
========================= */
export default function MappingsManagerUser({}) {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [filteredMappings, setFilteredMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<Mapping | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [showUploader, setShowUploader] = useState(false);

  /* =========================
     FETCH MAPPINGS
  ========================== */
  const fetchMappings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/mappings/my-mappings');
      setMappings(response.data);
      setFilteredMappings(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.data.length,
        totalPages: Math.ceil(response.data.length / prev.limit),
      }));
    } catch (err: any) {
      console.error('Failed to fetch mappings:', err);
      setError(err.response?.data?.message || 'Failed to load mappings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  /* =========================
     SEARCH FILTER
  ========================== */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMappings(mappings);
      setPagination(prev => ({
        ...prev,
        total: mappings.length,
        totalPages: Math.ceil(mappings.length / prev.limit),
      }));
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = mappings.filter(mapping =>
      mapping.upi.toLowerCase().includes(query) ||
      mapping.id.toString().includes(query) ||
      (mapping.property_id?.toString() || '').includes(query)
    );

    setFilteredMappings(filtered);
    setPagination(prev => ({
      ...prev,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / prev.limit),
      page: 1,
    }));
    setSelectedIds(new Set());
    setSelectAll(false);
  }, [searchQuery, mappings]);

  /* =========================
     PAGINATION
  ========================== */
  const paginatedMappings = useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    return filteredMappings.slice(start, end);
  }, [filteredMappings, pagination.page, pagination.limit]);

  const totalPages = Math.ceil(filteredMappings.length / pagination.limit);

  /* =========================
     SELECTION HANDLERS
  ========================== */
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      const newSelected = new Set<number>();
      paginatedMappings.forEach(m => newSelected.add(m.id));
      setSelectedIds(newSelected);
    }
    setSelectAll(!selectAll);
  };

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setSelectAll(newSelected.size === paginatedMappings.length && paginatedMappings.length > 0);
  };

  /* =========================
     DELETE HANDLERS
  ========================== */
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    setDeleting(true);
    try {
      for (const id of selectedIds) {
        await api.delete(`/api/mappings/${id}`);
      }

      await fetchMappings();
      setSelectedIds(new Set());
      setSelectAll(false);
      setDeleteModalOpen(false);
    } catch (err: any) {
      console.error('Failed to delete mappings:', err);
      alert(err.response?.data?.message || 'Failed to delete selected mappings');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSingle = async (id: number) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return;

    try {
      await api.delete(`/api/mappings/${id}`);
      await fetchMappings();
      if (selectedIds.has(id)) {
        const newSelected = new Set(selectedIds);
        newSelected.delete(id);
        setSelectedIds(newSelected);
      }
    } catch (err: any) {
      console.error('Failed to delete mapping:', err);
      alert(err.response?.data?.message || 'Failed to delete mapping');
    }
  };

  /* =========================
     VIEW HANDLER
  ========================== */
  const handleView = (mapping: Mapping) => {
    setSelectedMapping(mapping);
    setViewModalOpen(true);
  };

  /* =========================
     STATS
  ========================== */
  const stats = {
    total: mappings.length,
    filtered: filteredMappings.length,
    selected: selectedIds.size,
    withOverlaps: mappings.filter(m => m.overlaps).length,
    withProperty: mappings.filter(m => m.property_id).length,
  };

  if (loading && mappings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div className="p-6" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--color-foreground)' }}>
            Mappings Management
          </h1>
          <p className="text-gray-600">
            View and manage property mappings from PDF extraction
          </p>
        </div>
        <button
          onClick={() => setShowUploader(!showUploader)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Upload size={18} />
          {showUploader ? 'Hide Uploader' : 'Upload PDFs'}
        </button>
      </div>

      {/* PDF Uploader */}
      <AnimatePresence>
        {showUploader && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <PdfUploader onUploadComplete={fetchMappings} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total Mappings</div>
          <div className="text-2xl font-semibold" style={{ color: 'var(--color-primary)' }}>
            {stats.total}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Filtered</div>
          <div className="text-2xl font-semibold text-blue-600">{stats.filtered}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Selected</div>
          <div className="text-2xl font-semibold text-purple-600">{stats.selected}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">With Overlaps</div>
          <div className="text-2xl font-semibold text-orange-600">{stats.withOverlaps}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">With Property</div>
          <div className="text-2xl font-semibold text-green-600">{stats.withProperty}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by UPI, ID, Property ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-80"
            />
          </div>

          {/* Selection Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedIds.size} selected
              </span>
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm"
              >
                <Trash2 size={16} />
                Delete Selected
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMappings}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  {selectAll ? (
                    <CheckSquare size={18} style={{ color: 'var(--color-primary)' }} />
                  ) : (
                    <Square size={18} />
                  )}
                  <span className="text-xs font-medium">Select</span>
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                No
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                UPI
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Area
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Year
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Overlaps
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Property
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedMappings.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  No mappings found
                </td>
              </tr>
            ) : (
              paginatedMappings.map((mapping,index) => {
                let statusDetails: StatusDetails | null = null;
                try {
                  statusDetails = JSON.parse(mapping.status_details);
                } catch {
                  // Ignore parsing errors
                }

                return (
                  <tr key={mapping.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleSelect(mapping.id)}
                        className="flex items-center"
                      >
                        {selectedIds.has(mapping.id) ? (
                          <CheckSquare size={18} style={{ color: 'var(--color-primary)' }} />
                        ) : (
                          <Square size={18} className="text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                      {mapping.upi}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {statusDetails?.inTransaction && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                            Transaction
                          </span>
                        )}
                        {statusDetails?.underMortgage && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                            Mortgage
                          </span>
                        )}
                        {statusDetails?.hasCaveat && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                            Caveat
                          </span>
                        )}
                        {!statusDetails?.inTransaction &&
                          !statusDetails?.underMortgage &&
                          !statusDetails?.hasCaveat && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                              Clear
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {statusDetails?.area ? `${statusDetails.area} m²` : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {mapping.year_of_record}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${mapping.overlaps
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                        }`}>
                        {mapping.overlaps ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {mapping.property_id ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                          #{mapping.property_id}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(mapping)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} className="text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteSingle(mapping.id)}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {filteredMappings.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, filteredMappings.length)} of{' '}
              {filteredMappings.length} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {totalPages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === totalPages}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteSelected}
        count={selectedIds.size}
        isLoading={deleting}
      />

      {/* View Details Modal */}
      <ViewDetailsModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        mapping={selectedMapping}
      />
    </div>
  );
}