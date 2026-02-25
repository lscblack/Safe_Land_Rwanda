import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Download,
  Eye,
  Trash2,
  ArrowUpCircle,
  FileWarning,
  Clock,
} from 'lucide-react';
import api from '../../instance/mainAxios';

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

interface UploadStats {
  total: number;
  processed: number;
  success: number;
  error: number;
  pending: number;
}

export default function PdfUploader() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats: UploadStats = {
    total: files.length,
    processed: files.filter(f => f.status === 'success' || f.status === 'error').length,
    success: files.filter(f => f.status === 'success').length,
    error: files.filter(f => f.status === 'error').length,
    pending: files.filter(f => f.status === 'pending').length,
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
      // Check if it's a PDF
      if (file.type !== 'application/pdf') {
        alert(`File "${file.name}" is not a PDF. Only PDF files are allowed.`);
        return false;
      }
      // Check if file already exists in the list
      if (files.some(f => f.name === file.name && f.size === file.size)) {
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

    setFiles(prev => [...prev, ...newFiles]);
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }, [files]);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (expandedFile === id) {
      setExpandedFile(null);
    }
  };

  const clearAll = () => {
    if (isProcessing) {
      if (window.confirm('Clear all files? Processing will be stopped.')) {
        setFiles([]);
        setCurrentIndex(-1);
        setIsProcessing(false);
        setExpandedFile(null);
      }
    } else {
      setFiles([]);
      setCurrentIndex(-1);
      setExpandedFile(null);
    }
  };

  const removeCompleted = () => {
    setFiles(prev => prev.filter(f => f.status === 'pending' || f.status === 'processing'));
    setExpandedFile(null);
  };

  const processNext = async () => {
    if (currentIndex >= files.length - 1) {
      setIsProcessing(false);
      setCurrentIndex(-1);
      return;
    }

    const nextIndex = currentIndex + 1;
    const fileToProcess = files[nextIndex];
    
    if (!fileToProcess || fileToProcess.status !== 'pending') {
      // Skip to next pending file
      const nextPendingIndex = files.findIndex((f, idx) => idx > currentIndex && f.status === 'pending');
      if (nextPendingIndex === -1) {
        setIsProcessing(false);
        setCurrentIndex(-1);
        return;
      }
      setCurrentIndex(nextPendingIndex);
      await processFile(files[nextPendingIndex], nextPendingIndex);
    } else {
      setCurrentIndex(nextIndex);
      await processFile(fileToProcess, nextIndex);
    }
  };

  const processFile = async (file: UploadFile, index: number) => {
    // Update status to processing
    setFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, status: 'processing', progress: 0 } : f
    ));

    const formData = new FormData();
    formData.append('file', file.file);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map((f, i) => 
          i === index && f.status === 'processing' 
            ? { ...f, progress: Math.min((f.progress || 0) + 10, 90) } 
            : f
        ));
      }, 500);

      const response = await api.post('/api/mapping/mappings/extract-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setFiles(prev => prev.map((f, i) => 
              i === index ? { ...f, progress: Math.min(percentCompleted, 90) } : f
            ));
          }
        },
      });

      clearInterval(progressInterval);

      // Update with success
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'success', 
          progress: 100,
          responseData: response.data 
        } : f
      ));

      // Process next file
      await processNext();

    } catch (error: any) {
      console.error(`Error processing ${file.name}:`, error);
      
      // Update with error
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'error', 
          error: error.response?.data?.message || error.message || 'Upload failed',
          progress: undefined 
        } : f
      ));

      // Continue with next file even if this one failed
      await processNext();
    }
  };

  const startProcessing = async () => {
    if (files.length === 0) return;
    if (isProcessing) return;
    
    setIsProcessing(true);
    setCurrentIndex(-1);
    await processNext();
  };

  const retryFailed = async () => {
    const failedFiles = files.filter(f => f.status === 'error');
    if (failedFiles.length === 0) return;

    // Reset failed files to pending
    setFiles(prev => prev.map(f => 
      f.status === 'error' ? { ...f, status: 'pending', progress: undefined, error: undefined } : f
    ));

    // Start processing if not already processing
    if (!isProcessing) {
      setIsProcessing(true);
      setCurrentIndex(-1);
      await processNext();
    }
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
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">PDF Document Upload</h2>
        <p className="text-gray-600">
          Upload PDF files for processing. Files will be processed one at a time.
        </p>
      </div>

      {/* Stats Cards */}
      {files.length > 0 && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Total Files</div>
            <div className="text-2xl font-semibold">{stats.total}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Processed</div>
            <div className="text-2xl font-semibold text-blue-600">{stats.processed}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Success</div>
            <div className="text-2xl font-semibold text-green-600">{stats.success}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Failed</div>
            <div className="text-2xl font-semibold text-red-600">{stats.error}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Pending</div>
            <div className="text-2xl font-semibold text-gray-600">{stats.pending}</div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 mb-6 text-center cursor-pointer
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
          size={48} 
          className={`mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} 
        />
        <p className="text-lg font-medium text-gray-700 mb-2">
          {isDragging ? 'Drop your PDFs here' : 'Drag & drop PDF files or click to browse'}
        </p>
        <p className="text-sm text-gray-500">
          Only PDF files are accepted. Multiple files can be uploaded.
        </p>
      </div>

      {/* Action Buttons */}
      {files.length > 0 && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={startProcessing}
            disabled={isProcessing || stats.pending === 0}
            className={`
              px-4 py-2 rounded-lg font-medium flex items-center gap-2
              ${isProcessing || stats.pending === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload size={18} />
                Start Processing ({stats.pending})
              </>
            )}
          </button>

          {stats.error > 0 && (
            <button
              onClick={retryFailed}
              disabled={isProcessing}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 flex items-center gap-2"
            >
              <AlertCircle size={18} />
              Retry Failed ({stats.error})
            </button>
          )}

          <button
            onClick={removeCompleted}
            disabled={isProcessing}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 flex items-center gap-2"
          >
            <CheckCircle size={18} />
            Clear Completed
          </button>

          <button
            onClick={clearAll}
            disabled={isProcessing}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center gap-2 ml-auto"
          >
            <Trash2 size={18} />
            Clear All
          </button>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-700 mb-3">Upload Queue ({files.length})</h3>
          
          {files.map((file, index) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className={`
                border rounded-lg overflow-hidden
                ${getStatusColor(file.status)}
                ${index === currentIndex ? 'ring-2 ring-blue-400' : ''}
              `}
            >
              {/* File Header */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <FileText size={24} className="text-gray-500" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 truncate">
                        {file.name}
                      </span>
                      {index === currentIndex && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          Processing
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{formatFileSize(file.size)}</span>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(file.status)}
                        <span className="capitalize">{file.status}</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    {file.progress !== undefined && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 rounded-full transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 mt-1">
                          {file.progress}% uploaded
                        </span>
                      </div>
                    )}

                    {/* Error Message */}
                    {file.error && (
                      <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                        <FileWarning size={14} className="inline mr-1" />
                        {file.error}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedFile(expandedFile === file.id ? null : file.id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title={expandedFile === file.id ? 'Collapse' : 'Expand'}
                    >
                      {expandedFile === file.id ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    </button>
                    
                    {file.status === 'success' && file.responseData && (
                      <button
                        onClick={() => console.log('View result:', file.responseData)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors text-green-600"
                        title="View Result"
                      >
                        <Eye size={18} />
                      </button>
                    )}
                    
                    {file.status !== 'processing' && (
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors text-red-600"
                        title="Remove"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content (Response Data) */}
              <AnimatePresence>
                {expandedFile === file.id && file.responseData && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-200 bg-gray-50"
                  >
                    <div className="p-4">
                      <h4 className="font-medium text-gray-700 mb-2">Extracted Data</h4>
                      <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-auto max-h-60">
                        {JSON.stringify(file.responseData, null, 2)}
                      </pre>
                      
                      {file.responseData.download_url && (
                        <a
                          href={file.responseData.download_url}
                          download
                          className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          <Download size={14} />
                          Download Result
                        </a>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {files.length === 0 && (
        <div className="text-center py-12">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No files uploaded yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Drag and drop PDF files or click the upload area to get started
          </p>
        </div>
      )}
    </div>
  );
}